import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import OrderPanel from "@/components/OrderPanel";
import SymbolSelector from "@/components/SymbolSelector";
import PriceBar from "@/components/PriceBar";
import { useColors } from "@/hooks/useColors";

export default function TradeScreen() {
  const colors = useColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.subHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <SymbolSelector />
      </View>
      <PriceBar />
      <View style={{ flex: 1 }}>
        <OrderPanel />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  subHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
