import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { MarketSymbol, SYMBOLS, useTradingContext } from "@/context/TradingContext";
import { useColors } from "@/hooks/useColors";

export default function SymbolSelector() {
  const { selectedSymbol, setSelectedSymbol, currentPrice, priceChange24h } =
    useTradingContext();
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const [activeType, setActiveType] = useState<"crypto" | "indian">("crypto");

  const filtered = SYMBOLS.filter((s) => s.type === activeType);
  const isPositive = priceChange24h >= 0;

  function handleSelect(s: MarketSymbol) {
    setSelectedSymbol(s);
    setOpen(false);
  }

  function formatPrice(price: number): string {
    if (price === 0) return "—";
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <View style={styles.symbolInfo}>
          <View style={[styles.badge, { backgroundColor: selectedSymbol.type === "crypto" ? "#f59e0b22" : "#6366f122" }]}>
            <Text style={[styles.badgeText, { color: selectedSymbol.type === "crypto" ? "#f59e0b" : "#6366f1" }]}>
              {selectedSymbol.type === "crypto" ? "CRYPTO" : "IND"}
            </Text>
          </View>
          <View>
            <Text style={[styles.symbolLabel, { color: colors.foreground }]}>
              {selectedSymbol.label}
            </Text>
            <Text style={[styles.symbolName, { color: colors.mutedForeground }]}>
              {selectedSymbol.name}
            </Text>
          </View>
        </View>
        <View style={styles.priceInfo}>
          <Text style={[styles.price, { color: colors.foreground }]}>
            {selectedSymbol.type === "crypto" ? "$" : "₹"}
            {formatPrice(currentPrice)}
          </Text>
          <Text style={[styles.change, { color: isPositive ? colors.bull : colors.bear }]}>
            {isPositive ? "+" : ""}
            {priceChange24h.toFixed(2)}%
          </Text>
        </View>
        <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Select Market</Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={[styles.tabs, { backgroundColor: colors.muted, borderRadius: 10 }]}>
            {(["crypto", "indian"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.tab,
                  activeType === t && { backgroundColor: colors.primary },
                ]}
                onPress={() => setActiveType(t)}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeType === t ? colors.primaryForeground : colors.mutedForeground },
                  ]}
                >
                  {t === "crypto" ? "Crypto" : "Indian Market"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.symbolRow,
                  { borderBottomColor: colors.border },
                  item.id === selectedSymbol.id && { backgroundColor: colors.accent },
                ]}
                onPress={() => handleSelect(item)}
              >
                <View>
                  <Text style={[styles.rowLabel, { color: colors.foreground }]}>{item.label}</Text>
                  <Text style={[styles.rowName, { color: colors.mutedForeground }]}>{item.name}</Text>
                </View>
                {item.id === selectedSymbol.id && (
                  <Feather name="check" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  symbolInfo: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 9, fontWeight: "700" as const, letterSpacing: 0.5 },
  symbolLabel: { fontSize: 15, fontWeight: "700" as const },
  symbolName: { fontSize: 11, marginTop: 1 },
  priceInfo: { alignItems: "flex-end", marginRight: 6 },
  price: { fontSize: 14, fontWeight: "600" as const },
  change: { fontSize: 11, fontWeight: "600" as const },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: "75%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 20,
  },
  sheetTitle: { fontSize: 17, fontWeight: "700" as const },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    padding: 4,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  tabText: { fontSize: 13, fontWeight: "600" as const },
  symbolRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 15, fontWeight: "600" as const },
  rowName: { fontSize: 12, marginTop: 2 },
});
