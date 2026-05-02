import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import AppHeader from "@/components/AppHeader";
import TradeFlashOverlay from "@/components/TradeFlashOverlay";
import { useColors } from "@/hooks/useColors";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_ICONS: Record<string, [IoniconsName, IoniconsName]> = {
  index:     ["home",      "home-outline"],
  trade:     ["flash",     "flash-outline"],
  charts:    ["bar-chart", "bar-chart-outline"],
  portfolio: ["briefcase", "briefcase-outline"],
  history:   ["time",      "time-outline"],
};

export default function TabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader />
      <TradeFlashOverlay />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
          headerShown: false,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: isIOS ? "transparent" : colors.tabBar,
            borderTopWidth: isWeb ? 1 : StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
            elevation: 0,
            height: isWeb ? 64 : undefined,
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView
                intensity={80}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            ) : null,
          tabBarLabelStyle: { fontSize: 10, fontWeight: "600" as const, marginBottom: 2 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? TAB_ICONS.index[0] : TAB_ICONS.index[1]} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="trade"
          options={{
            title: "Trade",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? TAB_ICONS.trade[0] : TAB_ICONS.trade[1]} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="charts"
          options={{
            title: "Charts",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? TAB_ICONS.charts[0] : TAB_ICONS.charts[1]} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="portfolio"
          options={{
            title: "Portfolio",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? TAB_ICONS.portfolio[0] : TAB_ICONS.portfolio[1]} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "History",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? TAB_ICONS.history[0] : TAB_ICONS.history[1]} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{ href: null }}
        />
      </Tabs>
    </View>
  );
}
