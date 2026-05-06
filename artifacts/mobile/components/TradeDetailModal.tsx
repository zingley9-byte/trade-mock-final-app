import React from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CoinLogo from "./CoinLogo";
import { useColors } from "@/hooks/useColors";
import { getLivePositionPnl, Position, TradeHistory } from "@/context/TradingContext";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TradeDetailModalProps {
  visible: boolean;
  onClose: () => void;
  position?: Position;
  trade?: TradeHistory;
  livePrice?: number;
  onClosePosition?: (id: string) => void;
  onModify?: (pos: Position) => void;
  currencyMode: "usd" | "inr";
  usdToInr: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtPrice(p: number): string {
  if (!p || p <= 0) return "—";
  if (p >= 10000) return `$${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (p >= 1)     return `$${p.toFixed(4)}`;
  return `$${p.toFixed(6)}`;
}

function formatTs(ts: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDur(open: number, close: number): string {
  const ms   = close - open;
  const mins = Math.floor(ms / 60000);
  if (mins < 1)  return "<1m";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ${mins % 60}m`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}

function shortId(id: string): string {
  return id.replace(/^pos_|^hist_/, "").slice(-10).toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Row({
  label, value, valueColor, colors,
}: {
  label: string; value: string; valueColor?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: valueColor ?? colors.foreground }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function Div({ colors }: { colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TradeDetailModal({
  visible, onClose,
  position, trade,
  livePrice = 0,
  onClosePosition, onModify,
  currencyMode, usdToInr,
}: TradeDetailModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isUSD  = currencyMode === "usd";

  function fmt(amount: number, decimals = 2): string {
    if (isUSD) {
      return `$${amount.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    }
    const inr = amount * usdToInr;
    return `₹${inr.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }

  const isOpen = !!position;
  const sym    = position?.symbol ?? trade?.symbol;
  const side   = position?.side   ?? trade?.side;
  const isBuy  = side === "buy";
  const qty    = position?.quantity  ?? trade?.quantity  ?? 0;
  const lev    = position?.leverage  ?? trade?.leverage  ?? 1;
  const margin = position?.margin    ?? trade?.margin    ?? 0;
  const entry  = position?.entryPrice ?? trade?.entryPrice ?? 0;

  // ── P&L — uses shared getLivePositionPnl so result always matches portfolio row ──
  let pnl = 0, pnlPct = 0;
  if (position) {
    // livePrice is getBestPrice(position) passed from portfolio.tsx — same source as the row
    pnl    = getLivePositionPnl(position, livePrice);
    pnlPct = margin > 0 ? (pnl / margin) * 100 : 0;
    if (Math.abs(pnlPct) < 0.005) pnlPct = 0;
  } else if (trade) {
    pnl    = trade.pnl;
    pnlPct = trade.pnlPct;
  }

  // ── Estimated charges: ~0.05% of notional (in USD) ─────────────────────────
  const notional = entry * qty;
  const charges  = notional * 0.0005;

  const pnlColor = pnl >= 0 ? colors.bull : colors.bear;
  const pnlBg    = pnl >= 0 ? colors.bullBg : colors.bearBg;
  const accentFg = isBuy ? colors.bull : colors.bear;

  if (!sym) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: Platform.OS === "ios" ? insets.top : 0 }]}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={[styles.backArrow, { color: colors.foreground }]}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <CoinLogo symbolId={sym.id} size={22} />
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>{sym.label}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isOpen ? "#22c55e22" : colors.muted }]}>
            <Text style={[styles.statusText, { color: isOpen ? "#22c55e" : colors.mutedForeground }]}>
              {isOpen ? "● OPEN" : "✓ CLOSED"}
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        >
          {/* ── Net P&L hero ─────────────────────────────────────────────── */}
          <View style={[styles.pnlHero, { backgroundColor: pnlBg }]}>
            <Text style={[styles.pnlHeroLabel, { color: pnlColor }]}>Net P&L</Text>
            <Text style={[styles.pnlHeroAmount, { color: pnlColor }]}>
              {pnl >= 0 ? "+" : ""}{fmt(pnl)}
            </Text>
            <View style={[styles.pnlPctChip, { backgroundColor: pnlColor + "30" }]}>
              <Text style={[styles.pnlPctText, { color: pnlColor }]}>
                {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
              </Text>
            </View>
          </View>

          {/* ── Detail rows ──────────────────────────────────────────────── */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

            <Row label="Instrument"   value={sym.label}                          colors={colors} />
            <Div colors={colors} />
            <Row label="Status"       value={isOpen ? "Open" : "Closed"}          colors={colors} valueColor={isOpen ? "#22c55e" : colors.mutedForeground} />
            <Div colors={colors} />
            <Row label="Side"         value={isBuy ? "▲ LONG" : "▼ SHORT"}       colors={colors} valueColor={accentFg} />
            <Div colors={colors} />
            <Row label="Quantity"     value={`${qty} lot`}                        colors={colors} />
            <Div colors={colors} />
            <Row label="Leverage"     value={`×${lev}`}                           colors={colors} />
            <Div colors={colors} />
            <Row label="Entry Price"  value={fmtPrice(entry)}                     colors={colors} />
            <Div colors={colors} />

            {isOpen && livePrice > 0 ? (
              <>
                <Row label="Current Price" value={fmtPrice(livePrice)} colors={colors} />
                <Div colors={colors} />
              </>
            ) : null}

            {!isOpen && trade ? (
              <>
                <Row label="Exit Price" value={fmtPrice(trade.exitPrice)} colors={colors} />
                <Div colors={colors} />
              </>
            ) : null}

            <Row label="Margin Used"  value={fmt(margin, 0)}                      colors={colors} />
            <Div colors={colors} />
            <Row label="Est. Charges" value={fmt(charges)}                        colors={colors} valueColor={colors.mutedForeground} />
            <Div colors={colors} />

            {position?.stopLoss ? (
              <>
                <Row label="Stop Loss"     value={fmtPrice(position.stopLoss)}   colors={colors} valueColor={colors.bear} />
                <Div colors={colors} />
              </>
            ) : null}
            {position?.takeProfit ? (
              <>
                <Row label="Take Profit"   value={fmtPrice(position.takeProfit)} colors={colors} valueColor={colors.bull} />
                <Div colors={colors} />
              </>
            ) : null}
            {position?.liquidationPrice ? (
              <>
                <Row label="Liquidation"   value={fmtPrice(position.liquidationPrice)} colors={colors} valueColor={colors.bear} />
                <Div colors={colors} />
              </>
            ) : null}

            <Row label="Open Time"    value={formatTs(position?.openedAt ?? trade?.openedAt ?? 0)} colors={colors} />

            {!isOpen && trade ? (
              <>
                <Div colors={colors} />
                <Row label="Close Time" value={formatTs(trade.closedAt)}                         colors={colors} />
                <Div colors={colors} />
                <Row label="Duration"   value={formatDur(trade.openedAt, trade.closedAt)}         colors={colors} />
              </>
            ) : null}

            <Div colors={colors} />
            <Row label="Order ID" value={shortId(position?.id ?? trade?.id ?? "")} colors={colors} valueColor={colors.mutedForeground} />
          </View>

          {/* ── Action buttons (open positions only) ─────────────────────── */}
          {isOpen && position ? (
            <View style={styles.actionRow}>
              {onModify ? (
                <TouchableOpacity
                  style={[styles.btnModify, { borderColor: colors.primary + "66", backgroundColor: colors.primary + "12" }]}
                  onPress={() => { onClose(); setTimeout(() => onModify(position), 350); }}
                >
                  <Text style={[styles.btnModifyText, { color: colors.primary }]}>Modify SL/TP</Text>
                </TouchableOpacity>
              ) : null}
              {onClosePosition ? (
                <TouchableOpacity
                  style={[styles.btnClose, { backgroundColor: colors.bear }]}
                  onPress={() => { onClosePosition(position.id); onClose(); }}
                >
                  <Text style={styles.btnCloseText}>Close Position</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  backBtn:      { paddingRight: 6 },
  backArrow:    { fontSize: 30, lineHeight: 34, fontWeight: "300" },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle:  { fontSize: 17, fontWeight: "700" },
  statusBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText:   { fontSize: 11, fontWeight: "700" },

  pnlHero: {
    marginHorizontal: 16, marginVertical: 16,
    borderRadius: 16, padding: 22,
    alignItems: "center", gap: 6,
  },
  pnlHeroLabel:  { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.2, opacity: 0.8 },
  pnlHeroAmount: { fontSize: 36, fontWeight: "800", letterSpacing: -1 },
  pnlPctChip:    { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, marginTop: 2 },
  pnlPctText:    { fontSize: 14, fontWeight: "700" },

  card: {
    marginHorizontal: 16, borderRadius: 14,
    borderWidth: 1, overflow: "hidden", marginBottom: 20,
  },
  row: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 16, paddingVertical: 14,
  },
  rowLabel:  { fontSize: 13, fontWeight: "500", flex: 1 },
  rowValue:  { fontSize: 13, fontWeight: "700", textAlign: "right", flexShrink: 1, maxWidth: "58%" },
  divider:   { height: StyleSheet.hairlineWidth, marginHorizontal: 0 },

  actionRow:     { flexDirection: "row", gap: 12, marginHorizontal: 16 },
  btnModify:     { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  btnModifyText: { fontSize: 14, fontWeight: "700" },
  btnClose:      { flex: 1.3, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  btnCloseText:  { fontSize: 14, fontWeight: "700", color: "#fff" },
});
