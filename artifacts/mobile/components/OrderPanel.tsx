import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LEVERAGES, useTradingContext } from "@/context/TradingContext";
import { useColors } from "@/hooks/useColors";

export default function OrderPanel() {
  const {
    balance,
    currentPrice,
    selectedSymbol,
    leverage,
    setLeverage,
    openPosition,
    currencyMode,
    usdToInr,
  } = useTradingContext();
  const colors = useColors();

  // ── State ────────────────────────────────────────────────────────────────
  const [side,        setSide]        = useState<"buy" | "sell">("buy");
  const [quantity,    setQuantity]    = useState("0.01");
  const [stopLoss,    setStopLoss]    = useState("");
  const [takeProfit,  setTakeProfit]  = useState("");
  const [priceMode,   setPriceMode]   = useState<"auto" | "manual">("auto");
  const [manualPrice, setManualPrice] = useState("");
  const [orderError,  setOrderError]  = useState("");

  // ── Derived numbers ───────────────────────────────────────────────────────
  const qty           = parseFloat(quantity) || 0;
  const effectivePrice = priceMode === "manual" && manualPrice
    ? parseFloat(manualPrice) || currentPrice
    : currentPrice;
  const priceForMargin = effectivePrice * usdToInr;
  const margin  = qty > 0 && priceForMargin > 0
    ? (priceForMargin * qty) / leverage
    : 0;
  const symbol = "$";

  // ── Formatters ───────────────────────────────────────────────────────────
  function formatBalance(amount: number): string {
    if (currencyMode === "usd") {
      const usd = amount / usdToInr;
      return `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatNum(n: number): string {
    if (n === 0) return "—";
    if (n >= 1000) return n.toFixed(2);
    if (n >= 1)    return n.toFixed(4);
    return n.toFixed(6);
  }

  // ── Order handler ─────────────────────────────────────────────────────────
  function handleOrder() {
    setOrderError("");
    if (qty <= 0) { setOrderError("Enter a valid quantity"); return; }
    if (priceMode === "manual" && (!manualPrice || parseFloat(manualPrice) <= 0)) {
      setOrderError("Enter a valid entry price"); return;
    }

    const entryRef = priceMode === "manual" && manualPrice
      ? parseFloat(manualPrice)
      : effectivePrice;

    const sl = stopLoss   ? parseFloat(stopLoss)   : undefined;
    const tp = takeProfit ? parseFloat(takeProfit) : undefined;

    // ── SL/TP direction guard ───────────────────────────────────────────────
    if (sl !== undefined && entryRef > 0) {
      if (side === "buy" && sl >= entryRef) {
        setOrderError(`Stop Loss (${symbol}${sl.toFixed(2)}) must be BELOW entry price (${symbol}${entryRef.toFixed(2)}) for a BUY trade`);
        return;
      }
      if (side === "sell" && sl <= entryRef) {
        setOrderError(`Stop Loss (${symbol}${sl.toFixed(2)}) must be ABOVE entry price (${symbol}${entryRef.toFixed(2)}) for a SELL trade`);
        return;
      }
    }
    if (tp !== undefined && entryRef > 0) {
      if (side === "buy" && tp <= entryRef) {
        setOrderError(`Target Price (${symbol}${tp.toFixed(2)}) must be ABOVE entry price (${symbol}${entryRef.toFixed(2)}) for a BUY trade`);
        return;
      }
      if (side === "sell" && tp >= entryRef) {
        setOrderError(`Target Price (${symbol}${tp.toFixed(2)}) must be BELOW entry price (${symbol}${entryRef.toFixed(2)}) for a SELL trade`);
        return;
      }
    }

    const customEntry = priceMode === "manual" ? parseFloat(manualPrice) : undefined;
    const result = openPosition({ side, quantity: qty, stopLoss: sl, takeProfit: tp, entryPrice: customEntry });
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStopLoss("");
      setTakeProfit("");
      setOrderError("");
    } else {
      setOrderError(result.message);
    }
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.surface }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Balance row ─────────────────────────────────────────────────── */}
      <View style={styles.balanceRow}>
        <View>
          <Text style={[styles.balLabel, { color: colors.mutedForeground }]}>Balance</Text>
          <Text style={[styles.balValue, { color: colors.foreground }]}>{formatBalance(balance)}</Text>
        </View>
      </View>

      {/* ── BUY / SELL toggle ────────────────────────────────────────────── */}
      <View style={[styles.sideRow, { backgroundColor: colors.muted, borderRadius: 10 }]}>
        <TouchableOpacity
          style={[styles.sideBtn, side === "buy" && { backgroundColor: colors.bull }]}
          onPress={() => { setSide("buy"); Haptics.selectionAsync(); }}
        >
          <Text style={[styles.sideBtnText, { color: side === "buy" ? "#fff" : colors.mutedForeground }]}>
            BUY / LONG
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sideBtn, side === "sell" && { backgroundColor: colors.bear }]}
          onPress={() => { setSide("sell"); Haptics.selectionAsync(); }}
        >
          <Text style={[styles.sideBtnText, { color: side === "sell" ? "#fff" : colors.mutedForeground }]}>
            SELL / SHORT
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Entry Price ──────────────────────────────────────────────────── */}
      <View style={styles.inputSection}>
        <View style={styles.labelRow}>
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Entry Price</Text>
          <View style={[styles.modeSwitch, { backgroundColor: colors.muted }]}>
            <TouchableOpacity
              style={[styles.modeBtn, priceMode === "auto" && { backgroundColor: colors.primary }]}
              onPress={() => { setPriceMode("auto"); Haptics.selectionAsync(); }}
            >
              <Ionicons name="flash-outline" size={10} color={priceMode === "auto" ? "#fff" : colors.mutedForeground} style={{ marginRight: 3 }} />
              <Text style={[styles.modeBtnText, { color: priceMode === "auto" ? "#fff" : colors.mutedForeground }]}>Auto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, priceMode === "manual" && { backgroundColor: "#6366f1" }]}
              onPress={() => { setPriceMode("manual"); setManualPrice(currentPrice > 0 ? formatNum(currentPrice) : ""); Haptics.selectionAsync(); }}
            >
              <Ionicons name="pencil-outline" size={10} color={priceMode === "manual" ? "#fff" : colors.mutedForeground} style={{ marginRight: 3 }} />
              <Text style={[styles.modeBtnText, { color: priceMode === "manual" ? "#fff" : colors.mutedForeground }]}>Manual</Text>
            </TouchableOpacity>
          </View>
        </View>
        {priceMode === "auto" ? (
          <View style={[styles.inputBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Ionicons name="flash-outline" size={14} color={colors.primary} />
            <Text style={[styles.inputValue, { color: colors.foreground, flex: 1 }]}>
              {currentPrice > 0 ? `${symbol}${formatNum(currentPrice)}` : "Loading…"}
            </Text>
            <View style={[styles.livePill, { backgroundColor: colors.bullBg }]}>
              <Text style={[styles.livePillText, { color: colors.bull }]}>LIVE</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.inputBox, { backgroundColor: colors.muted, borderColor: "#6366f1", borderWidth: 1.5 }]}>
            <Ionicons name="pencil-outline" size={14} color="#6366f1" />
            <TextInput
              value={manualPrice}
              onChangeText={setManualPrice}
              keyboardType="decimal-pad"
              style={[styles.input, { color: colors.foreground }]}
              placeholder={`${symbol}${currentPrice > 0 ? formatNum(currentPrice) : "0.00"}`}
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />
            <TouchableOpacity onPress={() => { setManualPrice(currentPrice > 0 ? formatNum(currentPrice) : ""); Haptics.selectionAsync(); }}>
              <Text style={[styles.fillMarket, { color: "#6366f1" }]}>Fill Market</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Stop Loss & Target Price ─────────────────────────────────────── */}
      <View style={styles.slTpSection}>
        {/* Stop Loss */}
        <View style={styles.slTpField}>
          <View style={styles.slTpLabelRow}>
            <View style={[styles.slDot, { backgroundColor: colors.bear }]} />
            <Text style={[styles.slTpLabel, { color: colors.bear }]}>Stop Loss</Text>
          </View>
          <View style={[styles.inputBox, { backgroundColor: colors.muted, borderColor: stopLoss ? colors.bear : colors.border }]}>
            <TextInput
              value={stopLoss}
              onChangeText={setStopLoss}
              keyboardType="decimal-pad"
              style={[styles.input, { color: colors.foreground }]}
              placeholder={`${symbol}${currentPrice > 0 ? (side === "buy" ? (currentPrice * 0.98).toFixed(4) : (currentPrice * 1.02).toFixed(4)) : "0.00"}`}
              placeholderTextColor={colors.mutedForeground}
            />
            {stopLoss !== "" && (
              <TouchableOpacity onPress={() => setStopLoss("")}>
                <Ionicons name="close-outline" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.slHint, { color: colors.mutedForeground }]}>
            {side === "buy" ? "↓ below entry" : "↑ above entry"}
          </Text>
        </View>

        {/* Target Price */}
        <View style={styles.slTpField}>
          <View style={styles.slTpLabelRow}>
            <View style={[styles.slDot, { backgroundColor: colors.bull }]} />
            <Text style={[styles.slTpLabel, { color: colors.bull }]}>Target Price</Text>
          </View>
          <View style={[styles.inputBox, { backgroundColor: colors.muted, borderColor: takeProfit ? colors.bull : colors.border }]}>
            <TextInput
              value={takeProfit}
              onChangeText={setTakeProfit}
              keyboardType="decimal-pad"
              style={[styles.input, { color: colors.foreground }]}
              placeholder={`${symbol}${currentPrice > 0 ? (side === "buy" ? (currentPrice * 1.02).toFixed(4) : (currentPrice * 0.98).toFixed(4)) : "0.00"}`}
              placeholderTextColor={colors.mutedForeground}
            />
            {takeProfit !== "" && (
              <TouchableOpacity onPress={() => setTakeProfit("")}>
                <Ionicons name="close-outline" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.slHint, { color: colors.mutedForeground }]}>
            {side === "buy" ? "↑ above entry" : "↓ below entry"}
          </Text>
        </View>
      </View>

      {/* ── Quantity ─────────────────────────────────────────────────────── */}
      <View style={styles.inputSection}>
        <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Quantity</Text>
        <View style={[styles.inputBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[styles.inputPrefix, { color: colors.mutedForeground }]}>$</Text>
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            style={[styles.input, { color: colors.foreground }]}
            placeholder="0.01"
            placeholderTextColor={colors.mutedForeground}
            selectTextOnFocus
          />
          <View style={styles.qtyBtns}>
            {["0.01", "0.1", "1"].map((q) => (
              <TouchableOpacity
                key={q}
                style={[styles.qtyBtn, { backgroundColor: colors.secondary, borderRadius: 6 }]}
                onPress={() => setQuantity(q)}
              >
                <Text style={[styles.qtyBtnText, { color: colors.foreground }]}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* ── Leverage ─────────────────────────────────────────────────────── */}
      <View style={styles.inputSection}>
        <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Leverage</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.leverageRow}>
            {LEVERAGES.map((lev) => (
              <TouchableOpacity
                key={lev}
                onPress={() => { setLeverage(lev); Haptics.selectionAsync(); }}
                style={[
                  styles.levBtn,
                  { backgroundColor: leverage === lev ? colors.primary : colors.muted, borderColor: leverage === lev ? colors.primary : colors.border },
                ]}
              >
                <Text style={[styles.levText, { color: leverage === lev ? colors.primaryForeground : colors.foreground }]}>
                  x{lev}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* ── Order summary ─────────────────────────────────────────────────── */}
      <View style={[styles.summaryBox, { backgroundColor: colors.muted, borderRadius: 10 }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Entry Price</Text>
          <View style={styles.summaryRight}>
            {priceMode === "manual" && (
              <View style={[styles.manualTag, { backgroundColor: "#6366f122" }]}>
                <Text style={[styles.manualTagText, { color: "#6366f1" }]}>Manual</Text>
              </View>
            )}
            <Text style={[styles.summaryValue, { color: priceMode === "manual" ? "#6366f1" : colors.foreground }]}>
              {symbol}{effectivePrice > 0 ? formatNum(effectivePrice) : "—"}
            </Text>
          </View>
        </View>
        {stopLoss !== "" && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Stop Loss</Text>
            <Text style={[styles.summaryValue, { color: colors.bear }]}>{symbol}{stopLoss}</Text>
          </View>
        )}
        {takeProfit !== "" && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Target</Text>
            <Text style={[styles.summaryValue, { color: colors.bull }]}>{symbol}{takeProfit}</Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Quantity</Text>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>{qty}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Margin Required</Text>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>{formatBalance(margin)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Position Size</Text>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>
            {symbol}{(qty * effectivePrice).toFixed(2)}
          </Text>
        </View>
        <View style={[styles.summaryRow, { marginBottom: 0 }]}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Leverage</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>x{leverage}</Text>
        </View>
      </View>

      {/* ── Inline error ──────────────────────────────────────────────────── */}
      {orderError !== "" && (
        <View style={[styles.errorBox, { backgroundColor: "#ef444422", borderColor: "#ef4444" }]}>
          <Ionicons name="alert-circle-outline" size={13} color="#ef4444" />
          <Text style={styles.errorText}>{orderError}</Text>
        </View>
      )}

      {/* ── Place order button ────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.orderBtn, { backgroundColor: side === "buy" ? colors.bull : colors.bear }]}
        onPress={handleOrder}
        activeOpacity={0.85}
      >
        <Text style={styles.orderBtnText}>
          {side === "buy" ? "BUY" : "SELL"} {selectedSymbol.label}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 14 },

  // Balance
  balanceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  balLabel:   { fontSize: 11, marginBottom: 2 },
  balValue:   { fontSize: 18, fontWeight: "700" as const },

  // Side toggle
  sideRow:     { flexDirection: "row", padding: 4, gap: 4, marginBottom: 14 },
  sideBtn:     { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 8 },
  sideBtnText: { fontSize: 13, fontWeight: "700" as const, letterSpacing: 0.5 },

  // Generic input section
  inputSection: { marginBottom: 12 },
  inputLabel:   { fontSize: 12, marginBottom: 5, fontWeight: "500" as const },
  inputBox: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  inputValue:  { fontSize: 15, flex: 1 },
  inputPrefix: { fontSize: 15, fontWeight: "600" as const, marginRight: 2 },
  input:       { flex: 1, fontSize: 15, padding: 0 },
  qtyBtns:    { flexDirection: "row", gap: 4 },
  qtyBtn:     { paddingHorizontal: 8, paddingVertical: 4 },
  qtyBtnText: { fontSize: 11, fontWeight: "600" as const },

  // Stop Loss / Target Price section
  slTpSection:  { flexDirection: "row", gap: 10, marginBottom: 12 },
  slTpField:    { flex: 1 },
  slTpLabelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 5 },
  slDot:        { width: 6, height: 6, borderRadius: 3 },
  slTpLabel:    { fontSize: 12, fontWeight: "600" as const },
  slHint:       { fontSize: 10, marginTop: 3, marginLeft: 2 },

  // Entry price controls
  labelRow:    { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginBottom: 5 },
  modeSwitch:  { flexDirection: "row" as const, padding: 3, borderRadius: 8, gap: 2 },
  modeBtn:     { flexDirection: "row" as const, alignItems: "center" as const, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  modeBtnText: { fontSize: 11, fontWeight: "600" as const },
  livePill:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  livePillText:{ fontSize: 9, fontWeight: "700" as const, letterSpacing: 0.5 },
  fillMarket:  { fontSize: 11, fontWeight: "600" as const },

  // Leverage
  leverageRow: { flexDirection: "row", gap: 6, paddingVertical: 2 },
  levBtn:      { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  levText:     { fontSize: 13, fontWeight: "600" as const },

  // Summary
  summaryBox:   { padding: 12, marginBottom: 14 },
  summaryRow:   { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 12, fontWeight: "600" as const },
  summaryRight: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6 },
  manualTag:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  manualTagText:{ fontSize: 9, fontWeight: "700" as const },

  // Inline error
  errorBox:  { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10 },
  errorText: { color: "#ef4444", fontSize: 13, fontWeight: "500" as const, flex: 1 },

  // Order button
  orderBtn:     { borderRadius: 10, paddingVertical: 15, alignItems: "center", marginBottom: 90 },
  orderBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" as const, letterSpacing: 0.5 },

});
