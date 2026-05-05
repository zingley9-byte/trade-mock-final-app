import AsyncStorage from "@react-native-async-storage/async-storage";
import { TM_AUTH_KEY } from "@/constants/authKeys";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
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
const TAB_BG         = "rgba(20, 24, 33, 0.97)";
const NAV_CONTENT_H  = 68;

function UserSyncEffect() {
  const { balance, tradeHistory, resetAccount, addAdminBonus } = useTradingContext();
  const { registerUserActivity, checkAndApplyAdminReset, checkAndApplyAdminFundAdd } = useAdmin();
  const [authUser, setAuthUser] = React.useState<{ uid: string; email: string; name: string } | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        const u = {
          uid:   user.uid,
          email: user.email ?? "",
          name:  user.displayName ?? user.email?.split("@")[0] ?? "User",
        };
        setAuthUser(u);
        // Keep TM_AUTH_KEY fresh so next app open skips login screen
        AsyncStorage.setItem(TM_AUTH_KEY, JSON.stringify(u)).catch(() => {});
        checkAndApplyAdminReset(user.uid, () => {
          resetAccount();
        });
        checkAndApplyAdminFundAdd(user.uid, (amount) => {
          addAdminBonus(amount);
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

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={[
      styles.iconWrap,
      focused && styles.iconWrapActive,
    ]}>
      <SvgIcon
        name={name}
        size={26}
        color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
      />
    </View>
  );
}

export default function TabLayout() {
  const insets   = useSafeAreaInsets();
  const isIOS    = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";

  const bottomInset = isIOS
    ? insets.bottom
    : isAndroid
      ? Math.max(insets.bottom, 16)
      : 0;

  const tabBarHeight    = NAV_CONTENT_H + bottomInset;
  const paddingBottom   = bottomInset + 2;

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
            position:              "absolute",
            left:                  0,
            right:                 0,
            bottom:                0,
            backgroundColor:       isIOS ? "transparent" : TAB_BG,
            borderTopWidth:        0,
            borderTopLeftRadius:   18,
            borderTopRightRadius:  18,
            elevation:             24,
            zIndex:                9999,
            shadowColor:           "#000",
            shadowOffset:          { width: 0, height: -6 },
            shadowOpacity:         0.35,
            shadowRadius:          12,
            height:                tabBarHeight,
            paddingBottom:         paddingBottom,
            paddingTop:            8,
            overflow:              "hidden" as const,
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView
                intensity={90}
                tint="dark"
                style={[
                  StyleSheet.absoluteFill,
                  {
                    borderTopLeftRadius:  18,
                    borderTopRightRadius: 18,
                    overflow:             "hidden",
                  },
                ]}
              />
            ) : null,
          tabBarLabelStyle: {
            fontSize:     12,
            fontWeight:   "600" as const,
            marginTop:    2,
            marginBottom: 0,
          },
          tabBarItemStyle: {
            paddingTop:    4,
            paddingBottom: 0,
            gap:           2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name={focused ? TAB_ICONS.index[0] : TAB_ICONS.index[1]}
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="trade"
          options={{
            title: "Trade",
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name={focused ? TAB_ICONS.trade[0] : TAB_ICONS.trade[1]}
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="charts"
          options={{
            title: "Charts",
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name={focused ? TAB_ICONS.charts[0] : TAB_ICONS.charts[1]}
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="portfolio"
          options={{
            title: "Portfolio",
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name={focused ? TAB_ICONS.portfolio[0] : TAB_ICONS.portfolio[1]}
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "History",
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name={focused ? TAB_ICONS.history[0] : TAB_ICONS.history[1]}
                focused={focused}
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

const styles = StyleSheet.create({
  iconWrap: {
    width:          44,
    height:         34,
    alignItems:     "center",
    justifyContent: "center",
    borderRadius:   12,
  },
  iconWrapActive: {
    backgroundColor: "rgba(0, 200, 150, 0.14)",
    shadowColor:     "#00c896",
    shadowOffset:    { width: 0, height: 0 },
    shadowOpacity:   0.7,
    shadowRadius:    8,
    elevation:       6,
  },
});
