import React, { useState, useCallback, useRef } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import SvgIcon from "@/components/SvgIcon";
import AdBanner from "@/components/AdBanner";
import interstitialAd from "@/components/InterstitialAdManager";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTradingContext, Position } from "@/context/TradingContext";
import { useColors } from "@/hooks/useColors";
import { usePrivacy } from "@/context/PrivacyContext";
import CoinLogo from "@/components/CoinLogo";
import TradeDetailModal from "@/components/TradeDetailModal";

const INITIAL_BALANCE = 1000000;
const { height: SCREEN_H } = Dimensions.get("window");

export default function PortfolioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { privacy } = usePrivacy();
  const {
    balance,
    positions,
    currentPrice,
    selectedSymbol,
    symbolPrices,
    getRunningPnL,
    getTotalPortfolioValue,
    closePosition,
    modifyPosition,
    resetAccount,
    currencyMode,
    usdToInr,
    refreshPrices,
  } = useTradingContext();

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refreshPrices(); } finally { setRefreshing(false); }
  }, [refreshPrices]);
  const hideBalance = privacy.hideBalance;

  const [modifyTarget, setModifyTarget]   = useState<Position | null>(null);
  const [slInput, setSlInput]             = useState("");
  const [tpInput, setTpInput]             = useState("");
  const [modifyErr, setModifyErr]         = useState("");
  const [confirmCloseId, setConfirmCloseId]       = useState<string | null>(null);
  const [confirmCloseSymbol, setConfirmCloseSymbol] = useState("");
  const [detailPos, setDetailPos]                 = useState<Position | null>(null);

  const runningPnL = getRunningPnL();
  const totalValue = getTotalPortfolioValue();
  const totalPnL   = totalValue - INITIAL_BALANCE;

  const detailLivePrice = detailPos
    ? ((symbolPrices[detailPos.symbol.id] && symbolPrices[detailPos.symbol.id] > 0)
        ? symbolPrices[detailPos.symbol.id]
        : (detailPos.symbol.id === selectedSymbol.id && currentPrice > 0 ? currentPrice : detailPos.entryPrice))
    : 0;
  const totalPnLPct = (totalPnL / INITIAL_BALANCE) * 100;
  const isUSD = currencyMode === "usd";

  function fmt(amount: number, decimals = 2): string {
    if (isUSD) {
      const usd = amount / usdToInr;
      return `$${usd.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    }
    return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }

  function fmtPrice(p: number) {
    if (p >= 10000) return `$${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (p >= 1)     return `$${p.toFixed(4)}`;
    return `$${p.toFixed(6)}`;
  }

  function openModify(pos: Position) {
    setModifyTarget(pos);
    setSlInput(pos.stopLoss ? String(pos.stopLoss) : "");
    setTpInput(pos.takeProfit ? String(pos.takeProfit) : "");
    setModifyErr("");
  }

  function handleSaveModify() {
    if (!modifyTarget) return;
    setModifyErr("");
    const sl = slInput.trim() ? parseFloat(slInput) : undefined;
    const tp = tpInput.trim() ? parseFloat(tpInput) : undefined;
    const entry = modifyTarget.entryPrice;
    const isBuy = modifyTarget.side === "buy";

    if (sl !== undefined && !isNaN(sl)) {
      if (isBuy && sl >= entry) {
        setModifyErr(`Stop Loss must be BELOW entry (${fmtPrice(entry)}) for LONG`);
        return;
      }
      if (!isBuy && sl <= entry) {
        setModifyErr(`Stop Loss must be ABOVE entry (${fmtPrice(entry)}) for SHORT`);
        return;
      }
    }
    if (tp !== undefined && !isNaN(tp)) {
      if (isBuy && tp <= entry) {
        setModifyErr(`Take Profit must be ABOVE entry (${fmtPrice(entry)}) for LONG`);
        return;
      }
      if (!isBuy && tp >= entry) {
        setModifyErr(`Take Profit must be BELOW entry (${fmtPrice(entry)}) for SHORT`);
        return;
      }
    }

    modifyPosition(
      modifyTarget.id,
      sl !== undefined && !isNaN(sl) ? sl : undefined,
      tp !== undefined && !isNaN(tp) ? tp : undefined,
    );
    setModifyTarget(null);
  }

  function handleReset() {
    Alert.alert(
      "Reset Fund",
      "Balance will be restored to ₹10,00,000 and all positions & trade history will be cleared.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            resetAccount();
          },
        },
      ]
    );
  }

  function handleClose(posId: string, symbol: string) {
    setConfirmCloseId(posId);
    setConfirmCloseSymbol(symbol);
  }

  function doConfirmClose() {
    if (confirmCloseId) closePosition(confirmCloseId);
    setConfirmCloseId(null);
    // Show interstitial after position close — policy-safe (3 min cooldown)
    interstitialAd.tryShow();
  }

  return (
    <>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 80 : insets.bottom + 90 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#00c896"]}
            tintColor="#00c896"
          />
        }
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Portfolio</Text>
          <TouchableOpacity
            onPress={handleReset}
            style={[styles.resetBtn, { borderColor: colors.border }]}
          >
            <SvgIcon name="refresh-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.resetText, { color: colors.mutedForeground }]}>
              Reset Fund
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Portfolio card ───────────────────────────────────────────── */}
        <View style={[styles.portfolioCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.portfolioLabel, { color: colors.mutedForeground }]}>Total Portfolio Value</Text>
          <Text style={[styles.portfolioValue, { color: colors.foreground }]}>
            {hideBalance ? "••••••" : fmt(totalValue)}
          </Text>
          <View style={styles.pnlRow}>
            {hideBalance ? (
              <Text style={[styles.totalPnL, { color: colors.mutedForeground }]}>••••••</Text>
            ) : (
              <>
                <Text style={[styles.totalPnL, { color: totalPnL >= 0 ? colors.bull : colors.bear }]}>
                  {totalPnL >= 0 ? "+" : ""}{fmt(totalPnL)}
                </Text>
                <View style={[styles.pnlBadge, { backgroundColor: totalPnL >= 0 ? colors.bullBg : colors.bearBg }]}>
                  <Text style={[styles.pnlBadgeText, { color: totalPnL >= 0 ? colors.bull : colors.bear }]}>
                    {totalPnLPct >= 0 ? "+" : ""}{totalPnLPct.toFixed(2)}%
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── Open Positions ───────────────────────────────────────────── */}
        {positions.length === 0 ? (
          <View style={styles.emptyPos}>
            <SvgIcon name="file-tray-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No open positions</Text>
          </View>
        ) : (
          <View style={{ marginHorizontal: 14, marginTop: 4 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Open Positions ({positions.length})
            </Text>
            {positions.map((pos) => {
              // Use per-symbol live price (same logic as getRunningPnL in context)
              const livePrice = (symbolPrices[pos.symbol.id] && symbolPrices[pos.symbol.id] > 0)
                ? symbolPrices[pos.symbol.id]
                : (pos.symbol.id === selectedSymbol.id && currentPrice > 0 ? currentPrice : pos.entryPrice);
              const priceDiff = pos.side === "buy"
                ? livePrice - pos.entryPrice
                : pos.entryPrice - livePrice;
              // calcPnL returns USD; convert to INR so fmt() works correctly
              const posPnlUsd = priceDiff * pos.quantity * pos.leverage;
              const posPnlRaw = Math.max(-pos.margin, posPnlUsd * usdToInr);
              // Guard against -0.00 floating-point display artifact
              const posPnl    = Math.abs(posPnlRaw) < 0.005 ? 0 : posPnlRaw;
              const pnlPctRaw = pos.margin > 0 ? (posPnlRaw / pos.margin) * 100 : 0;
              const pnlPct    = Math.abs(pnlPctRaw) < 0.005 ? 0 : pnlPctRaw;
              const isBuy  = pos.side === "buy";
              const accent = isBuy ? colors.bull : colors.bear;

              return (
                <TouchableOpacity
                  key={pos.id}
                  activeOpacity={0.82}
                  onPress={() => setDetailPos(pos)}
                  style={[styles.posCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  {/* Top row: logo + badge + symbol/lev + PnL */}
                  <View style={styles.posTop}>
                    <View style={styles.posLeft}>
                      <CoinLogo symbolId={pos.symbol.id} size={34} />
                      <View style={[styles.sideBadge, { backgroundColor: isBuy ? colors.bullBg : colors.bearBg }]}>
                        <Text style={[styles.sideText, { color: accent }]}>
                          {isBuy ? "▲ LONG" : "▼ SHORT"}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.posSymbol, { color: colors.foreground }]}>{pos.symbol.label}</Text>
                        <Text style={[styles.posLev, { color: colors.primary }]}>×{pos.leverage}  ·  {pos.quantity} lot</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 3 }}>
                      <Text style={[styles.posPnlSmall, { color: posPnl >= 0 ? colors.bull : colors.bear }]}>
                        {posPnl >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
                      </Text>
                      <Text style={[styles.detailsHint, { color: colors.mutedForeground }]}>Details ›</Text>
                    </View>
                  </View>

                  {/* Stats grid */}
                  <View style={[styles.statsGrid, { backgroundColor: colors.muted, borderRadius: 8 }]}>
                    <StatCell label="Entry"   value={fmtPrice(pos.entryPrice)} colors={colors} />
                    <StatCell label="Current" value={fmtPrice(livePrice)}      colors={colors} />
                    <StatCell label="Margin"  value={fmt(pos.margin, 0)}        colors={colors} />
                    <StatCell label="PnL"     value={`${posPnl >= 0 ? "+" : ""}${fmt(posPnl)}`} valueColor={posPnl >= 0 ? colors.bull : colors.bear} colors={colors} />
                  </View>

                  {/* SL / TP row */}
                  <View style={styles.slTpRow}>
                    <View style={styles.slTpItem}>
                      <Text style={[styles.slTpLabel, { color: colors.mutedForeground }]}>Stop Loss</Text>
                      <Text style={[styles.slTpValue, { color: pos.stopLoss ? colors.bear : colors.mutedForeground }]}>
                        {pos.stopLoss ? fmtPrice(pos.stopLoss) : "—"}
                      </Text>
                    </View>
                    <View style={[styles.slTpDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.slTpItem}>
                      <Text style={[styles.slTpLabel, { color: colors.mutedForeground }]}>Take Profit</Text>
                      <Text style={[styles.slTpValue, { color: pos.takeProfit ? colors.bull : colors.mutedForeground }]}>
                        {pos.takeProfit ? fmtPrice(pos.takeProfit) : "—"}
                      </Text>
                    </View>
                  </View>

                  {/* Action buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.btnModify, { borderColor: colors.primary + "66", backgroundColor: colors.primary + "12" }]}
                      onPress={() => openModify(pos)}
                    >
                      <Text style={[styles.btnModifyText, { color: colors.primary }]}>Modify</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btnClose, { borderColor: colors.bear + "66", backgroundColor: colors.bear + "12" }]}
                      onPress={() => handleClose(pos.id, pos.symbol.label)}
                    >
                      <Text style={[styles.btnCloseText, { color: colors.bear }]}>Close Position</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Banner Ad — shown on native only, hidden on web ──────────── */}
      <AdBanner />

      {/* ── Close Position Confirm Modal ──────────────────────────────── */}
      <Modal
        visible={!!confirmCloseId}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmCloseId(null)}
      >
        <Pressable style={styles.confirmOverlay} onPress={() => setConfirmCloseId(null)}>
          <View style={[styles.confirmBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>Close Position</Text>
            <Text style={[styles.confirmMsg, { color: colors.mutedForeground }]}>
              Close {confirmCloseSymbol} position at market price?
            </Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={[styles.confirmCancel, { borderColor: colors.border }]}
                onPress={() => setConfirmCloseId(null)}
              >
                <Text style={[styles.confirmCancelTxt, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmClose, { backgroundColor: colors.bear }]}
                onPress={doConfirmClose}
              >
                <Text style={styles.confirmCloseTxt}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ── Trade Detail Modal ────────────────────────────────────────── */}
      <TradeDetailModal
        visible={!!detailPos}
        onClose={() => setDetailPos(null)}
        position={detailPos ?? undefined}
        livePrice={detailLivePrice}
        onClosePosition={(id) => {
          setDetailPos(null);
          setTimeout(() => { closePosition(id); interstitialAd.tryShow(); }, 300);
        }}
        onModify={(pos) => {
          setDetailPos(null);
          setTimeout(() => openModify(pos), 350);
        }}
        currencyMode={currencyMode}
        usdToInr={usdToInr}
      />

      {/* ── Modify Bottom Sheet Modal ─────────────────────────────────── */}
      <Modal
        visible={!!modifyTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setModifyTarget(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setModifyTarget(null)} />

          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            {/* Sheet handle */}
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            {/* Sheet header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Modify Position</Text>
                {modifyTarget && (
                  <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>
                    {modifyTarget.symbol.label}  ·  {modifyTarget.side === "buy" ? "LONG" : "SHORT"}  ·  Entry {fmtPrice(modifyTarget.entryPrice)}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setModifyTarget(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.sheetClose, { color: colors.mutedForeground }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Inputs */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
                Stop Loss
                {modifyTarget && (
                  <Text style={{ color: colors.bear, fontSize: 10 }}>
                    {"  "}({modifyTarget.side === "buy" ? "must be below entry" : "must be above entry"})
                  </Text>
                )}
              </Text>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                <Text style={[styles.inputPrefix, { color: colors.mutedForeground }]}>$</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={slInput}
                  onChangeText={(t) => { setSlInput(t); setModifyErr(""); }}
                  placeholder="Leave blank to remove"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                />
                {slInput.length > 0 && (
                  <TouchableOpacity onPress={() => setSlInput("")}>
                    <Text style={{ color: colors.mutedForeground, fontSize: 16, paddingHorizontal: 8 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
                Take Profit
                {modifyTarget && (
                  <Text style={{ color: colors.bull, fontSize: 10 }}>
                    {"  "}({modifyTarget.side === "buy" ? "must be above entry" : "must be below entry"})
                  </Text>
                )}
              </Text>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                <Text style={[styles.inputPrefix, { color: colors.mutedForeground }]}>$</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={tpInput}
                  onChangeText={(t) => { setTpInput(t); setModifyErr(""); }}
                  placeholder="Leave blank to remove"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                />
                {tpInput.length > 0 && (
                  <TouchableOpacity onPress={() => setTpInput("")}>
                    <Text style={{ color: colors.mutedForeground, fontSize: 16, paddingHorizontal: 8 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Error */}
            {modifyErr ? (
              <View style={[styles.errBox, { backgroundColor: colors.bear + "18", borderColor: colors.bear + "44" }]}>
                <Text style={[styles.errText, { color: colors.bear }]}>{modifyErr}</Text>
              </View>
            ) : null}

            {/* Hint */}
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Leaving a field blank will remove that level from the position.
            </Text>

            {/* Buttons */}
            <View style={styles.sheetBtnRow}>
              <TouchableOpacity
                style={[styles.sheetBtnCancel, { borderColor: colors.border }]}
                onPress={() => setModifyTarget(null)}
              >
                <Text style={[styles.sheetBtnCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetBtnSave, { backgroundColor: colors.primary }]}
                onPress={handleSaveModify}
              >
                <Text style={styles.sheetBtnSaveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function StatCell({ label, value, colors, valueColor }: {
  label: string; value: string;
  colors: ReturnType<typeof useColors>;
  valueColor?: string;
}) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor ?? colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 22, fontWeight: "700" },
  resetBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  resetText: { fontSize: 13, fontWeight: "500" },

  portfolioCard: { marginHorizontal: 14, padding: 18, borderRadius: 14, borderWidth: 1, marginBottom: 18, alignItems: "center" },
  portfolioLabel: { fontSize: 12, marginBottom: 6 },
  portfolioValue: { fontSize: 30, fontWeight: "700", letterSpacing: -1 },
  pnlRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  totalPnL: { fontSize: 17, fontWeight: "700" },
  pnlBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pnlBadgeText: { fontSize: 12, fontWeight: "700" },

  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  emptyPos: { alignItems: "center", justifyContent: "center", gap: 8, marginTop: 60 },
  emptyText: { fontSize: 15, fontWeight: "500" },

  posCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  posTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  posLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  sideBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  sideText: { fontSize: 11, fontWeight: "800" },
  posSymbol: { fontSize: 14, fontWeight: "700" },
  posLev: { fontSize: 11, fontWeight: "600", marginTop: 1 },
  posPnlSmall: { fontSize: 15, fontWeight: "800" },
  detailsHint: { fontSize: 11, fontWeight: "600", opacity: 0.65 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 10, gap: 0, marginBottom: 10 },
  statCell: { width: "50%", paddingVertical: 4, paddingHorizontal: 6 },
  statLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  statValue: { fontSize: 13, fontWeight: "600" },

  slTpRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, paddingHorizontal: 2 },
  slTpItem: { flex: 1 },
  slTpDivider: { width: 1, height: 32, marginHorizontal: 12 },
  slTpLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  slTpValue: { fontSize: 13, fontWeight: "700" },

  actionRow: { flexDirection: "row", gap: 10 },
  btnModify: { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1, alignItems: "center" },
  btnModifyText: { fontSize: 13, fontWeight: "700" },
  btnClose: { flex: 1.4, paddingVertical: 9, borderRadius: 8, borderWidth: 1, alignItems: "center" },
  btnCloseText: { fontSize: 13, fontWeight: "700" },

  // Modal / Sheet
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 18, paddingTop: 10 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: "700" },
  sheetSub: { fontSize: 12, marginTop: 3 },
  sheetClose: { fontSize: 18, fontWeight: "600" },

  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: "600", marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.5 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 48 },
  inputPrefix: { fontSize: 15, fontWeight: "600", marginRight: 6 },
  input: { flex: 1, fontSize: 16, fontWeight: "500" },

  errBox: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10 },
  errText: { fontSize: 12, fontWeight: "600" },
  hint: { fontSize: 11, marginBottom: 18, lineHeight: 16 },

  sheetBtnRow: { flexDirection: "row", gap: 10 },
  sheetBtnCancel: { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  sheetBtnCancelText: { fontSize: 14, fontWeight: "600" },
  sheetBtnSave: { flex: 1.6, paddingVertical: 13, borderRadius: 10, alignItems: "center" },
  sheetBtnSaveText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  confirmOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  confirmBox: { width: "100%", maxWidth: 340, borderRadius: 16, borderWidth: 1, padding: 22 },
  confirmTitle: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  confirmMsg: { fontSize: 14, lineHeight: 20, marginBottom: 22 },
  confirmBtns: { flexDirection: "row", gap: 10 },
  confirmCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  confirmCancelTxt: { fontSize: 14, fontWeight: "600" },
  confirmClose: { flex: 1.4, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  confirmCloseTxt: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
