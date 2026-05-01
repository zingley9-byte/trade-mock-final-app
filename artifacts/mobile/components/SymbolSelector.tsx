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
  const { selectedSymbol, setSelectedSymbol, priceChange24h } = useTradingContext();
  const colors = useColors();
  const [open, setOpen] = useState(false);

  const isPositive = priceChange24h >= 0;

  function handleSelect(s: MarketSymbol) {
    setSelectedSymbol(s);
    setOpen(false);
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <View style={[styles.badge, { backgroundColor: "#f59e0b22" }]}>
          <Text style={[styles.badgeText, { color: "#f59e0b" }]}>CRYPTO</Text>
        </View>
        <View>
          <Text style={[styles.symbolLabel, { color: colors.foreground }]}>
            {selectedSymbol.label}
          </Text>
          <Text style={[styles.change, { color: isPositive ? colors.bull : colors.bear }]}>
            {isPositive ? "+" : ""}{priceChange24h.toFixed(2)}%
          </Text>
        </View>
        <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Select Crypto</Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={SYMBOLS}
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
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  badge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 8, fontWeight: "700" as const, letterSpacing: 0.5 },
  symbolLabel: { fontSize: 12, fontWeight: "700" as const },
  change: { fontSize: 10, fontWeight: "600" as const },
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
