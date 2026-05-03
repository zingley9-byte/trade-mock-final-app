import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SvgIcon from "@/components/SvgIcon";
import { getFirebaseAuth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

import AppHeader from "@/components/AppHeader";
import TradeFlashOverlay from "@/components/TradeFlashOverlay";
import { useTradingContext } from "@/context/TradingContext";
import { useAdmin } from "@/context/AdminContext";

const TAB_ICONS: Record<string, [string, string]> = {
  index:     ["home",      "home-outline"],
  trade:     ["flash",     "flash-outline"],
  charts:    ["bar-chart", "bar-chart-outline"],
  portfolio: ["briefcase", "briefcase-outline"],
  history:   ["time",      "time-outline"],
};

const ACTIVE_COLOR   = "#00c896";
const INACTIVE_COLOR = "#ffffff";
const TAB_BAR_BG     = "#0d1117";

function UserSyncEffect() {
  const { balance, tradeHistory } = useTradingContext();
  const { registerUserActivity } = useAdmin();
  const [authUser, setAuthUser] = React.useState<{ uid: string; email: string; name: string } | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser({
          uid:   user.uid,
          email: user.email ?? "",
          name:  user.displayName ?? user.email?.split("@")[0] ?? "User",
        });
      } else {
        setAuthUser(null);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!authUser) return;
    const totalPnl   = tradeHistory.reduce((sum, t) => sum + t.pnl, 0);
    const tradeCount = tradeHistory.length;
    registerUserActivity(authUser.uid, authUser.email, authUser.name, balance, tradeCount, totalPnl);
  }, [authUser, balance, tradeHistory]);

  return null;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark      = colorScheme === "dark";
  const isIOS       = Platform.OS === "ios";
  const isAndroid   = Platform.OS === "android";
  const isWeb       = Platform.OS === "web";
  const insets      = useSafeAreaInsets();

  // Android: use actual bottom inset + min 20px buffer so tabs sit above gesture bar
  const androidBottomInset = isAndroid ? Math.max(insets.bottom, 20) : 0;

  // Tab bar total height: content (icon + label) + bottom safe area
  const TAB_CONTENT_H = isWeb ? 56 : 54;
  const tabBarHeight  = TAB_CONTENT_H + (isIOS ? 0 : androidBottomInset) + (isWeb ? 8 : 0);

  // Padding inside the bar so icons sit in the top portion, not the gesture zone
  const tabBarPaddingBottom = isAndroid ? androidBottomInset + 4 : isWeb ? 8 : 6;

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0e1a" }}>
      <AppHeader />
      <TradeFlashOverlay />
      <UserSyncEffect />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor:   ACTIVE_COLOR,
          tabBarInactiveTintColor: INACTIVE_COLOR,
          headerShown: false,
          tabBarStyle: {
            position:        "absolute",
            left:            0,
            right:           0,
            bottom:          0,
            backgroundColor: isIOS ? "transparent" : TAB_BAR_BG,
            borderTopWidth:  StyleSheet.hairlineWidth,
            borderTopColor:  "#1e293b",
            elevation:       20,
            zIndex:          9999,
            shadowColor:     "#000",
            shadowOffset:    { width: 0, height: -2 },
            shadowOpacity:   0.3,
            shadowRadius:    4,
            height:          tabBarHeight,
            paddingBottom:   tabBarPaddingBottom,
            paddingTop:      6,
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView
                intensity={80}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            ) : null,
          tabBarLabelStyle: {
            fontSize:     10,
            fontWeight:   "600" as const,
            marginBottom: 0,
            color:        undefined,
          },
          tabBarItemStyle: {
            minHeight: 44,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ focused }) => (
              <SvgIcon
                name={focused ? TAB_ICONS.index[0] : TAB_ICONS.index[1]}
                size={24}
                color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="trade"
          options={{
            title: "Trade",
            tabBarIcon: ({ focused }) => (
              <SvgIcon
                name={focused ? TAB_ICONS.trade[0] : TAB_ICONS.trade[1]}
                size={24}
                color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="charts"
          options={{
            title: "Charts",
            tabBarIcon: ({ focused }) => (
              <SvgIcon
                name={focused ? TAB_ICONS.charts[0] : TAB_ICONS.charts[1]}
                size={24}
                color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="portfolio"
          options={{
            title: "Portfolio",
            tabBarIcon: ({ focused }) => (
              <SvgIcon
                name={focused ? TAB_ICONS.portfolio[0] : TAB_ICONS.portfolio[1]}
                size={24}
                color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "History",
            tabBarIcon: ({ focused }) => (
              <SvgIcon
                name={focused ? TAB_ICONS.history[0] : TAB_ICONS.history[1]}
                size={24}
                color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
              />
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
