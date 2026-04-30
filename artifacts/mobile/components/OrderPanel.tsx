import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
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
    positions,
    closePosition,
    getRunningPnL,
  } = useTradingContext();
  const colors = useColors();

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("0.01");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const qty = parseFloat(quantity) || 0;
  const margin = qty > 0 && currentPrice > 0 ? (currentPrice * qty) / leverage : 0;
  const symbol = selectedSymbol.type === "crypto" ? "$" : "₹";

  function handleOrder() {
    if (qty <= 0) {
      Alert.alert("Invalid", "Enter a valid quantity");
      return;
    }
    const sl = stopLoss ? parseFloat(stopLoss) : undefined;
    const tp = takeProfit ? parseFloat(takeProfit) : undefined;
    const result = openPosition({ side, quantity: qty, stopLoss: sl, takeProfit: tp });
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStopLoss("");
      setTakeProfit("");
    } else {
      Alert.alert("Order Failed", result.message);
    }
  }

  function formatNum(n: number): string {
    if (n === 0) return "—";
    if (n >= 1000) return n.toFixed(2);
    if (n >= 1) return n.toFixed(4);
    return n.toFixed(6);
  }

  const runningPnL = getRunningPnL();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.surface }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.balanceRow}>
        <View>
          <Text style={[styles.balLabel, { color: colors.mutedForeground }]}>Balance</Text>
          <Text style={[styles.balValue, { color: colors.foreground }]}>
            ₹{balance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </Text>
        </View>
        {positions.length > 0 && (
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.balLabel, { color: colors.mutedForeground }]}>Running P&L</Text>
            <Text
              style={[
                styles.pnlValue,
                { color: runningPnL >= 0 ? colors.bull : colors.bear },
              ]}
            >
              {runningPnL >= 0 ? "+" : ""}₹{runningPnL.toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.sideRow, { backgroundColor: colors.muted, borderRadius: 10 }]}>
        <TouchableOpacity
          style={[
            styles.sideBtn,
            side === "buy" && { backgroundColor: colors.bull },
          ]}
          onPress={() => { setSide("buy"); Haptics.selectionAsync(); }}
        >
          <Text style={[styles.sideBtnText, { color: side === "buy" ? "#fff" : colors.mutedForeground }]}>
            BUY / LONG
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sideBtn,
            side === "sell" && { backgroundColor: colors.bear },
          ]}
          onPress={() => { setSide("sell"); Haptics.selectionAsync(); }}
        >
          <Text style={[styles.sideBtnText, { color: side === "sell" ? "#fff" : colors.mutedForeground }]}>
            SELL / SHORT
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputSection}>
        <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
          Entry Price (Market)
        </Text>
        <View style={[styles.inputBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[styles.inputValue, { color: colors.mutedForeground }]}>
            {symbol}{currentPrice > 0 ? formatNum(currentPrice) : "—"}
          </Text>
        </View>
      </View>

      <View style={styles.inputSection}>
        <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Quantity</Text>
        <View style={[styles.inputBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            style={[styles.input, { color: colors.foreground }]}
            placeholder="0.01"
            placeholderTextColor={colors.mutedForeground}
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

      <View style={styles.inputSection}>
        <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
          Leverage
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.leverageRow}>
            {LEVERAGES.map((lev) => (
              <TouchableOpacity
                key={lev}
                onPress={() => { setLeverage(lev); Haptics.selectionAsync(); }}
                style={[
                  styles.levBtn,
                  {
                    backgroundColor:
                      leverage === lev ? colors.primary : colors.muted,
                    borderColor:
                      leverage === lev ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.levText,
                    { color: leverage === lev ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  x{lev}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <TouchableOpacity
        style={styles.advancedToggle}
        onPress={() => setShowAdvanced(!showAdvanced)}
      >
        <Text style={[styles.advancedLabel, { color: colors.mutedForeground }]}>
          Stop Loss / Take Profit
        </Text>
        <Feather
          name={showAdvanced ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>

      {showAdvanced && (
        <View style={styles.advancedRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.inputLabel, { color: colors.bear }]}>Stop Loss</Text>
            <View style={[styles.inputBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <TextInput
                value={stopLoss}
                onChangeText={setStopLoss}
                keyboardType="decimal-pad"
                style={[styles.input, { color: colors.foreground }]}
                placeholder={`${symbol}...`}
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.inputLabel, { color: colors.bull }]}>Take Profit</Text>
            <View style={[styles.inputBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <TextInput
                value={takeProfit}
                onChangeText={setTakeProfit}
                keyboardType="decimal-pad"
                style={[styles.input, { color: colors.foreground }]}
                placeholder={`${symbol}...`}
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>
        </View>
      )}

      <View style={[styles.summaryBox, { backgroundColor: colors.muted, borderRadius: 10 }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Margin Required</Text>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>
            ₹{margin.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Position Size</Text>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>
            {symbol}{(qty * currentPrice).toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Leverage</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>x{leverage}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.orderBtn,
          { backgroundColor: side === "buy" ? colors.bull : colors.bear },
        ]}
        onPress={handleOrder}
        activeOpacity={0.85}
      >
        <Text style={styles.orderBtnText}>
          {side === "buy" ? "BUY" : "SELL"} {selectedSymbol.label}
        </Text>
      </TouchableOpacity>

      {positions.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Open Positions</Text>
          {positions.map((pos) => {
            const posSymbol = pos.symbol.type === "crypto" ? "$" : "₹";
            const priceDiff =
              pos.side === "buy"
                ? currentPrice - pos.entryPrice
                : pos.entryPrice - currentPrice;
            const posPnl = priceDiff * pos.quantity * pos.leverage;
            const pnlPct = (posPnl / pos.margin) * 100;

            return (
              <View
                key={pos.id}
                style={[
                  styles.posCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.posHeader}>
                  <View style={styles.posLeft}>
                    <View
                      style={[
                        styles.posSideBadge,
                        { backgroundColor: pos.side === "buy" ? colors.bullBg : colors.bearBg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.posSideText,
                          { color: pos.side === "buy" ? colors.bull : colors.bear },
                        ]}
                      >
                        {pos.side === "buy" ? "LONG" : "SHORT"}
                      </Text>
                    </View>
                    <Text style={[styles.posSymbol, { color: colors.foreground }]}>
                      {pos.symbol.label}
                    </Text>
                    <Text style={[styles.posLev, { color: colors.primary }]}>
                      x{pos.leverage}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => { closePosition(pos.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); }}
                    style={[styles.closeBtn, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.closeBtnText, { color: colors.foreground }]}>Close</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.posRow}>
                  <View>
                    <Text style={[styles.posLabel, { color: colors.mutedForeground }]}>Entry</Text>
                    <Text style={[styles.posValue, { color: colors.foreground }]}>
                      {posSymbol}{pos.entryPrice.toFixed(pos.symbol.type === "crypto" ? 4 : 2)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={[styles.posLabel, { color: colors.mutedForeground }]}>Qty</Text>
                    <Text style={[styles.posValue, { color: colors.foreground }]}>
                      {pos.quantity}
                    </Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={[styles.posLabel, { color: colors.mutedForeground }]}>Margin</Text>
                    <Text style={[styles.posValue, { color: colors.foreground }]}>
                      ₹{pos.margin.toFixed(0)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.posLabel, { color: colors.mutedForeground }]}>P&L</Text>
                    <Text
                      style={[
                        styles.posPnl,
                        { color: posPnl >= 0 ? colors.bull : colors.bear },
                      ]}
                    >
                      {posPnl >= 0 ? "+" : ""}₹{posPnl.toFixed(2)}
                    </Text>
                    <Text
                      style={[
                        styles.posPnlPct,
                        { color: posPnl >= 0 ? colors.bull : colors.bear },
                      ]}
                    >
                      ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%)
                    </Text>
                  </View>
                </View>
                {(pos.stopLoss || pos.takeProfit) && (
                  <View style={styles.slTpRow}>
                    {pos.stopLoss && (
                      <Text style={[styles.slText, { color: colors.bear }]}>
                        SL: {posSymbol}{pos.stopLoss.toFixed(2)}
                      </Text>
                    )}
                    {pos.takeProfit && (
                      <Text style={[styles.tpText, { color: colors.bull }]}>
                        TP: {posSymbol}{pos.takeProfit.toFixed(2)}
                      </Text>
                    )}
                    <Text style={[styles.liqText, { color: "#f59e0b" }]}>
                      Liq: {posSymbol}{pos.liquidationPrice.toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 14 },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  balLabel: { fontSize: 11, marginBottom: 2 },
  balValue: { fontSize: 18, fontWeight: "700" as const },
  pnlValue: { fontSize: 17, fontWeight: "700" as const },
  sideRow: {
    flexDirection: "row",
    padding: 4,
    gap: 4,
    marginBottom: 14,
  },
  sideBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  sideBtnText: { fontSize: 13, fontWeight: "700" as const, letterSpacing: 0.5 },
  inputSection: { marginBottom: 12 },
  inputLabel: { fontSize: 12, marginBottom: 5, fontWeight: "500" as const },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  inputValue: { fontSize: 15, flex: 1 },
  input: { flex: 1, fontSize: 15, padding: 0 },
  qtyBtns: { flexDirection: "row", gap: 4 },
  qtyBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  qtyBtnText: { fontSize: 11, fontWeight: "600" as const },
  leverageRow: { flexDirection: "row", gap: 6, paddingVertical: 2 },
  levBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  levText: { fontSize: 13, fontWeight: "600" as const },
  advancedToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    marginBottom: 4,
  },
  advancedLabel: { fontSize: 13, fontWeight: "500" as const },
  advancedRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  summaryBox: { padding: 12, marginBottom: 14 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 13, fontWeight: "600" as const },
  orderBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  orderBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#ffffff",
    letterSpacing: 1,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700" as const, marginBottom: 10 },
  posCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  posHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  posLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  posSideBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  posSideText: { fontSize: 11, fontWeight: "700" as const },
  posSymbol: { fontSize: 14, fontWeight: "700" as const },
  posLev: { fontSize: 12, fontWeight: "600" as const },
  closeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  closeBtnText: { fontSize: 13, fontWeight: "600" as const },
  posRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  posLabel: { fontSize: 10, marginBottom: 2 },
  posValue: { fontSize: 13, fontWeight: "500" as const },
  posPnl: { fontSize: 14, fontWeight: "700" as const },
  posPnlPct: { fontSize: 11, fontWeight: "500" as const },
  slTpRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f033",
  },
  slText: { fontSize: 11, fontWeight: "500" as const },
  tpText: { fontSize: 11, fontWeight: "500" as const },
  liqText: { fontSize: 11, fontWeight: "500" as const },
});
