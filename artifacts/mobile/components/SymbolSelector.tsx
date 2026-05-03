import React, { useState, useMemo } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import SvgIcon from "@/components/SvgIcon";
import { MarketSymbol, SYMBOLS, useTradingContext } from "@/context/TradingContext";
import { useColors } from "@/hooks/useColors";
import CoinLogo from "@/components/CoinLogo";

export default function SymbolSelector() {
  const {
    selectedSymbol,
    setSelectedSymbol,
    priceChange24h,
    symbolPrices,
    symbolChanges,
    currencyMode,
    usdToInr,
  } = useTradingContext();
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const isPositive = priceChange24h >= 0;
  const isUSD = currencyMode === "usd";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SYMBOLS;
    return SYMBOLS.filter(
      (s) => s.label.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [query]);

  function fmtPrice(usdPrice: number): string {
    if (!usdPrice) return "—";
    if (isUSD) {
      if (usdPrice < 0.0001) return `$${usdPrice.toExponential(2)}`;
      if (usdPrice < 1) return `$${usdPrice.toFixed(6)}`;
      return `$${usdPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      const inr = usdPrice * usdToInr;
      if (inr < 0.01) return `₹${inr.toFixed(6)}`;
      return `₹${inr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  function handleSelect(s: MarketSymbol) {
    setSelectedSymbol(s);
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <CoinLogo symbolId={selectedSymbol.id} size={28} />
        <View>
          <Text style={[styles.symbolLabel, { color: colors.foreground }]}>
            {selectedSymbol.label}
          </Text>
          <Text style={[styles.change, { color: isPositive ? colors.bull : colors.bear }]}>
            {isPositive ? "+" : ""}{priceChange24h.toFixed(2)}%
          </Text>
        </View>
        <SvgIcon name="chevron-down-outline" size={14} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => { setOpen(false); setQuery(""); }}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => { setOpen(false); setQuery(""); }} />
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Select Crypto</Text>
            <TouchableOpacity onPress={() => { setOpen(false); setQuery(""); }}>
              <SvgIcon name="close-outline" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <SvgIcon name="search-outline" size={15} color={colors.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search coins…"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground }]}
              autoCorrect={false}
              autoCapitalize="none"
              selectTextOnFocus
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")}>
                <SvgIcon name="close-circle-outline" size={15} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.countLabel, { color: colors.mutedForeground }]}>
            {filtered.length} coin{filtered.length !== 1 ? "s" : ""}
          </Text>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const price  = symbolPrices[item.id] ?? 0;
              const chg    = symbolChanges[item.id] ?? 0;
              const pos    = chg >= 0;
              const isSelected = item.id === selectedSymbol.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.symbolRow,
                    { borderBottomColor: colors.border },
                    isSelected && { backgroundColor: colors.accent },
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <CoinLogo symbolId={item.id} size={36} />
                  <View style={styles.rowLeft}>
                    <Text style={[styles.rowLabel, { color: colors.foreground }]}>{item.label}</Text>
                    <Text style={[styles.rowName, { color: colors.mutedForeground }]}>{item.name}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowPrice, { color: colors.foreground }]}>{fmtPrice(price)}</Text>
                    <Text style={[styles.rowChg, { color: pos ? colors.bull : colors.bear }]}>
                      {pos ? "+" : ""}{chg.toFixed(2)}%
                    </Text>
                  </View>
                  {isSelected && (
                    <SvgIcon name="checkmark-outline" size={16} color={colors.primary} style={{ marginLeft: 8 }} />
                  )}
                </TouchableOpacity>
              );
            }}
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
  badge:      { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  badgeText:  { fontSize: 8, fontWeight: "700" as const, letterSpacing: 0.5 },
  symbolLabel:{ fontSize: 12, fontWeight: "700" as const },
  change:     { fontSize: 10, fontWeight: "600" as const },
  backdrop:   { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: "82%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 20,
  },
  sheetTitle: { fontSize: 17, fontWeight: "700" as const },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  countLabel:  { fontSize: 11, marginHorizontal: 16, marginBottom: 4 },
  symbolRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft:  { flex: 1 },
  rowRight: { alignItems: "flex-end" },
  rowLabel: { fontSize: 14, fontWeight: "600" as const },
  rowName:  { fontSize: 11, marginTop: 1 },
  rowPrice: { fontSize: 13, fontWeight: "600" as const },
  rowChg:   { fontSize: 11, marginTop: 1 },
});
