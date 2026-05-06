import React, { useState, useCallback } from "react";
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

const INITIAL_BALANCE = 50000;
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
  const [toast, setToast]                         = useState<string | null>(null);

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
      return `$${amount.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    }
    const inr = amount * usdToInr;
    return `₹${inr.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
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
      "Balance will be restored to $50,000 and all positions & trade history will be cleared.",
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

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function doConfirmClose() {
    if (confirmCloseId) {
      closePosition(confirmCloseId);
      showToast("Position closed successfully");
    }
    setConfirmCloseId(null);
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
          <View style={[styles.posList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.posListHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>
                Open Positions
              </Text>
              <Text style={[styles.posCount, { backgroundColor: colors.primary + "22", color: colors.primary }]}>
                {positions.length}
              </Text>
            </View>

            {positions.map((pos, idx) => {
              const livePrice = (symbolPrices[pos.symbol.id] && symbolPrices[pos.symbol.id] > 0)
                ? symbolPrices[pos.symbol.id]
                : (pos.symbol.id === selectedSymbol.id && currentPrice > 0 ? currentPrice : pos.entryPrice);
              const priceDiff = pos.side === "buy"
                ? livePrice - pos.entryPrice
                : pos.entryPrice - livePrice;
              const posPnlRaw = Math.max(-pos.margin, priceDiff * pos.quantity);
              const posPnl    = Math.abs(posPnlRaw) < 0.00001 ? 0 : posPnlRaw;
              const isBuy     = pos.side === "buy";
              const pnlColor  = posPnl >= 0 ? colors.bull : colors.bear;
              const isLast    = idx === positions.length - 1;

              return (
                <View
                  key={pos.id}
                  style={[
                    styles.posRow,
                    !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                  ]}
                >
                  {/* Main tappable area → opens detail modal */}
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => setDetailPos(pos)}
                    style={styles.posRowTouchable}
                  >
                    <CoinLogo symbolId={pos.symbol.id} size={38} />
                    <View style={styles.posRowMid}>
                      <Text style={[styles.posRowSymbol, { color: colors.foreground }]}>
                        {pos.symbol.label}
                      </Text>
                      <Text style={[styles.posRowSub, { color: colors.mutedForeground }]}>
                        {pos.quantity} lot{"  ·  "}
                        <Text style={{ color: isBuy ? colors.bull : colors.bear, fontWeight: "700" }}>
                          {isBuy ? "LONG" : "SHORT"}
                        </Text>
                        {"  ·  "}
                        <Text style={{ color: colors.mutedForeground }}>Open</Text>
                      </Text>
                    </View>
                    <View style={styles.posRowRight}>
                      <Text style={[styles.posRowPnl, { color: pnlColor }]}>
                        {posPnl >= 0 ? "+" : ""}{fmt(posPnl)}
                      </Text>
                      <Text style={[styles.posRowChevron, { color: colors.mutedForeground }]}>›</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Quick-exit button */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleClose(pos.id, pos.symbol.label)}
                    style={[styles.exitBtn, { borderColor: colors.bear + "66", backgroundColor: colors.bear + "11" }]}
                  >
                    <Text style={[styles.exitBtnText, { color: colors.bear }]}>Exit</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Banner Ad — shown on native only, hidden on web ──────────── */}
      <AdBanner />

      {/* ── Toast notification ───────────────────────────────────────── */}
      {toast && (
        <View style={[styles.toast, { backgroundColor: colors.bull, pointerEvents: "none" }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

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

  // ── Open Positions list ──────────────────────────────────────────
  posList: { marginHorizontal: 14, borderRadius: 14, borderWidth: 1, overflow: "hidden", marginBottom: 8 },
  posListHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  posCount: { fontSize: 12, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },

  posRow: {
    flexDirection: "row", alignItems: "center",
    paddingRight: 10, paddingVertical: 4,
  },
  posRowTouchable: {
    flex: 1, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10, gap: 12,
  },
  posRowMid: { flex: 1 },
  posRowSymbol: { fontSize: 15, fontWeight: "700", marginBottom: 3 },
  posRowSub: { fontSize: 12 },
  posRowRight: { alignItems: "flex-end", gap: 2 },
  posRowPnl: { fontSize: 15, fontWeight: "700" },
  posRowChevron: { fontSize: 20, lineHeight: 22, fontWeight: "300", opacity: 0.5 },

  exitBtn: {
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
    marginRight: 4,
  },
  exitBtnText: { fontSize: 12, fontWeight: "700" },

  toast: {
    position: "absolute", bottom: 90, left: 24, right: 24,
    paddingVertical: 12, paddingHorizontal: 18,
    borderRadius: 12, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 8,
  },
  toastText: { color: "#fff", fontSize: 14, fontWeight: "700" },

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
