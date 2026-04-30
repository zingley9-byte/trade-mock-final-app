import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Timeframe, TIMEFRAMES, useTradingContext } from "@/context/TradingContext";
import { useColors } from "@/hooks/useColors";

export default function TimeframeSelector() {
  const { timeframe, setTimeframe } = useTradingContext();
  const colors = useColors();

  return (
    <View style={styles.row}>
      {TIMEFRAMES.map((tf) => {
        const active = tf === timeframe;
        return (
          <TouchableOpacity
            key={tf}
            onPress={() => setTimeframe(tf)}
            style={[
              styles.btn,
              active
                ? { backgroundColor: colors.primary }
                : { backgroundColor: "transparent" },
            ]}
          >
            <Text
              style={[
                styles.text,
                { color: active ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {tf}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 4,
  },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
});
