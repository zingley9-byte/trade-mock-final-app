import React, { useState, useMemo } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAlerts, PriceAlert } from "@/context/AlertsContext";
import { useTradingContext } from "@/context/TradingContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AlertsModal({ visible, onClose }: Props) {
  const colors = useColors();
  const { alerts, addAlert, removeAlert, clearTriggered, notifPermission, requestPermission } = useAlerts();
  const { selectedSymbol, symbolPrices, currencyMode, usdToInr } = useTradingContext();

  const [targetInput, setTargetInput] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [pickedSymbolId, setPickedSymbolId] = useState(selectedSymbol.id);
  const [pickedSymbolLabel, setPickedSymbolLabel] = useState(selectedSymbol.label);

  const isUSD = currencyMode === "usd";
  const currentPrice = symbolPrices[pickedSymbolId] ?? 0;
  const displayPrice = isUSD ? currentPrice : currentPrice * usdToInr;
  const priceSym = isUSD ? "$" : "₹";

  const triggeredCount = useMemo(() => alerts.filter((a) => a.triggered).length, [alerts]);

  function handleAdd() {
    Keyboard.dismiss();
    const raw = parseFloat(targetInput.replace(/,/g, ""));
    if (!raw || raw <= 0) {
      Alert.alert("Invalid Price", "Please enter a valid target price.");
      return;
    }
    const targetUSD = isUSD ? raw : raw / usdToInr;
    addAlert({ symbolId: pickedSymbolId, symbolLabel: pickedSymbolLabel, targetPrice: targetUSD, condition });
    setTargetInput("");
  }

  function fmtUSD(usd: number) {
    if (!usd) return "—";
    const v = isUSD ? usd : usd * usdToInr;
    if (v < 0.001) return `${priceSym}${v.toFixed(6)}`;
    if (v < 1)     return `${priceSym}${v.toFixed(4)}`;
    return `${priceSym}${v.toLocaleString(isUSD ? "en-US" : "en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function renderAlert({ item }: { item: PriceAlert }) {
    const sign = item.condition === "above" ? "▲" : "▼";
    const cond = item.condition === "above" ? "above" : "below";
    return (
      <View style={[styles.alertRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.alertBadge, { backgroundColor: item.triggered ? colors.muted : item.condition === "above" ? colors.bullBg : colors.bearBg }]}>
          <Text style={[styles.alertSign, { color: item.triggered ? colors.mutedForeground : item.condition === "above" ? colors.bull : colors.bear }]}>
            {item.triggered ? "✓" : sign}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.alertLabel, { color: item.triggered ? colors.mutedForeground : colors.foreground }]}>
            {item.symbolLabel} {cond} {fmtUSD(item.targetPrice)}
          </Text>
          <Text style={[styles.alertSub, { color: colors.mutedForeground }]}>
            {item.triggered
              ? `Triggered ${new Date(item.triggeredAt!).toLocaleTimeString()}`
              : `Current: ${fmtUSD(symbolPrices[item.symbolId] ?? 0)}`}
          </Text>
        </View>
        <TouchableOpacity onPress={() => removeAlert(item.id)} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => { Keyboard.dismiss(); onClose(); }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kavWrap}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
      <View style={[styles.sheet, { backgroundColor: colors.card }]}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="notifications-outline" size={18} color={colors.foreground} />
            <Text style={[styles.title, { color: colors.foreground }]}>Price Alerts</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close-outline" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Permission banner */}
        {notifPermission !== "granted" && (
          <TouchableOpacity
            style={[styles.permBanner, { backgroundColor: "#f59e0b22", borderColor: "#f59e0b44" }]}
            onPress={requestPermission}
          >
            <Ionicons name="notifications-off-outline" size={14} color="#f59e0b" />
            <Text style={[styles.permText, { color: "#f59e0b" }]}>
              {notifPermission === "denied"
                ? "Notifications blocked — enable in settings"
                : "Tap to enable push notifications"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Add Alert Form */}
        <View style={[styles.form, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>
            {pickedSymbolLabel} — Current: {fmtUSD(currentPrice)}
          </Text>

          {/* Condition toggle */}
          <View style={[styles.condRow, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.condBtn, condition === "above" && { backgroundColor: colors.bullBg }]}
              onPress={() => setCondition("above")}
            >
              <Text style={[styles.condText, { color: condition === "above" ? colors.bull : colors.mutedForeground }]}>
                ▲ Above
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.condBtn, condition === "below" && { backgroundColor: colors.bearBg }]}
              onPress={() => setCondition("below")}
            >
              <Text style={[styles.condText, { color: condition === "below" ? colors.bear : colors.mutedForeground }]}>
                ▼ Below
              </Text>
            </TouchableOpacity>
          </View>

          {/* Price input */}
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.currSym, { color: colors.mutedForeground }]}>{priceSym}</Text>
            <TextInput
              value={targetInput}
              onChangeText={setTargetInput}
              placeholder={`e.g. ${fmtUSD(currentPrice).replace(/[$₹]/g, "")}`}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />
            {currentPrice > 0 && (
              <TouchableOpacity onPress={() => setTargetInput(displayPrice.toFixed(2))} style={[styles.fillBtn, { borderColor: colors.border }]}>
                <Text style={[styles.fillBtnText, { color: colors.mutedForeground }]}>Current</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: condition === "above" ? colors.bull : colors.bear }]}
            onPress={handleAdd}
          >
            <Ionicons name="notifications-outline" size={14} color="#fff" />
            <Text style={styles.addBtnText}>Set Alert</Text>
          </TouchableOpacity>
        </View>

        {/* Alert list */}
        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: colors.foreground }]}>
            Active Alerts ({alerts.length})
          </Text>
          {triggeredCount > 0 && (
            <TouchableOpacity onPress={clearTriggered}>
              <Text style={[styles.clearText, { color: colors.mutedForeground }]}>Clear triggered</Text>
            </TouchableOpacity>
          )}
        </View>

        {alerts.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="notifications-outline" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No alerts set</Text>
          </View>
        ) : (
          <ScrollView style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
            {alerts.map((item) => (
              <View key={item.id}>{renderAlert({ item })}</View>
            ))}
          </ScrollView>
        )}
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  kavWrap:  { position: "absolute", bottom: 0, left: 0, right: 0 },
  sheet: {
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingBottom: 40, maxHeight: "92%",
  },
  header:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 18, paddingTop: 22 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title:      { fontSize: 17, fontWeight: "700" as const },
  permBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 12, padding: 10, borderRadius: 8, borderWidth: 1 },
  permText:   { fontSize: 13, flex: 1 },
  form:       { marginHorizontal: 16, marginBottom: 14, padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  formLabel:  { fontSize: 12 },
  condRow:    { flexDirection: "row", borderRadius: 8, overflow: "hidden" },
  condBtn:    { flex: 1, paddingVertical: 8, alignItems: "center" },
  condText:   { fontSize: 13, fontWeight: "600" as const },
  inputRow:   { flexDirection: "row", alignItems: "center", borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
  currSym:    { fontSize: 16, fontWeight: "600" as const },
  input:      { flex: 1, fontSize: 16, padding: 0 },
  fillBtn:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  fillBtnText:{ fontSize: 11 },
  addBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 8, paddingVertical: 11, gap: 6 },
  addBtnText: { color: "#fff", fontWeight: "700" as const, fontSize: 14 },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 6 },
  listTitle:  { fontSize: 14, fontWeight: "600" as const },
  clearText:  { fontSize: 12 },
  alertRow:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  alertBadge: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  alertSign:  { fontSize: 14, fontWeight: "700" as const },
  alertLabel: { fontSize: 13, fontWeight: "600" as const },
  alertSub:   { fontSize: 11, marginTop: 2 },
  deleteBtn:  { padding: 6 },
  emptyWrap:  { alignItems: "center", paddingVertical: 28, gap: 8 },
  emptyText:  { fontSize: 14 },
});
