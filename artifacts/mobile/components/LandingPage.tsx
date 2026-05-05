/**
 * LandingPage — Web-only Binance-style landing page for Trade Mock
 * Only rendered when Platform.OS === "web"
 */
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import LoadingCandleAnimation from "./LoadingCandleAnimation";
import CoinLogo from "./CoinLogo";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:       "#0B0E11",
  surface:  "#1E2026",
  card:     "#181A1E",
  border:   "#2B2F36",
  accent:   "#F0B90B",
  accentDim:"rgba(240,185,11,0.12)",
  green:    "#0ECB81",
  red:      "#F6465D",
  text:     "#EAECEF",
  muted:    "#848E9C",
  white:    "#FFFFFF",
};

// ── Coin config ───────────────────────────────────────────────────────────────
const COINS = [
  { id: "BTC",  name: "Bitcoin",   pair: "BTCUSDT",  color: "#F7931A" },
  { id: "ETH",  name: "Ethereum",  pair: "ETHUSDT",  color: "#627EEA" },
  { id: "BNB",  name: "BNB",       pair: "BNBUSDT",  color: "#F0B90B" },
  { id: "SOL",  name: "Solana",    pair: "SOLUSDT",  color: "#9945FF" },
  { id: "DOGE", name: "Dogecoin",  pair: "DOGEUSDT", color: "#C2A633" },
];

const NEWS = [
  { title: "Bitcoin Holds Strong Above $78K Amid Market Consolidation", time: "2h ago" },
  { title: "Ethereum Layer-2 Activity Hits New All-Time High",           time: "4h ago" },
  { title: "Solana DEX Volume Surges 40% This Week",                     time: "6h ago" },
  { title: "Crypto Market Cap Crosses $3 Trillion Milestone",            time: "1d ago" },
];

const FEATURES = [
  { icon: "📊", title: "Real Market Data",    desc: "Live prices from top exchanges" },
  { icon: "📈", title: "Advanced Charts",     desc: "Professional TradingView-style charts" },
  { icon: "💰", title: "Mock Trading",        desc: "Practice with ₹10,00,000 virtual funds" },
  { icon: "🗂",  title: "Portfolio Tracking", desc: "Track performance & history" },
  { icon: "🔒", title: "Secure & Private",    desc: "Your data is encrypted & safe" },
];

const NAV  = ["Markets", "Trade", "Features", "Pricing", "Learn"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtPrice(p: number): string {
  if (!p) return "—";
  if (p >= 10000) return `$${p.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (p >= 1)     return `$${p.toFixed(2)}`;
  return `$${p.toFixed(5)}`;
}
function fmtChg(c: number): string {
  return `${c >= 0 ? "+" : ""}${c.toFixed(2)}%`;
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function NavBar({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  return (
    // sticky via inline style — not inside StyleSheet.create
    <View style={[nb.bar, { position: "sticky" as any, top: 0, zIndex: 100 }]}>
      <View style={nb.inner}>
        <View style={nb.logo}>
          <Image source={require("@/assets/images/logo.png")} style={nb.logoImg} />
          <Text style={nb.logoTxt}>TRADE MOCK</Text>
        </View>
        <View style={nb.links}>
          {NAV.map((l) => (
            <TouchableOpacity key={l} style={nb.link}>
              <Text style={nb.linkTxt}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={nb.right}>
          <TouchableOpacity style={nb.loginBtn} onPress={onLogin}>
            <Text style={nb.loginTxt}>Log In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={nb.startBtn} onPress={onSignup}>
            <Text style={nb.startTxt}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
const nb = StyleSheet.create({
  bar:      { backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  inner:    { maxWidth: 1280, alignSelf: "center" as any, width: "100%", flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingVertical: 14, gap: 32 },
  logo:     { flexDirection: "row", alignItems: "center", gap: 10 },
  logoImg:  { width: 32, height: 32, borderRadius: 8 },
  logoTxt:  { color: C.white, fontSize: 16, fontWeight: "800" as const, letterSpacing: 1.5 },
  links:    { flex: 1, flexDirection: "row", gap: 4 },
  link:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  linkTxt:  { color: C.muted, fontSize: 14, fontWeight: "500" as const },
  right:    { flexDirection: "row", gap: 10, alignItems: "center" },
  loginBtn: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 6, borderWidth: 1, borderColor: C.border },
  loginTxt: { color: C.text, fontSize: 14, fontWeight: "600" as const },
  startBtn: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 6, backgroundColor: C.accent },
  startTxt: { color: "#000", fontSize: 14, fontWeight: "700" as const },
});

// ── Coin card ─────────────────────────────────────────────────────────────────
function CoinCard({ prices, changes }: { prices: Record<string, number>; changes: Record<string, number> }) {
  return (
    <View style={cc.card}>
      <View style={cc.hdr}>
        <View style={cc.tabs}>
          <View style={cc.tabActive}><Text style={cc.tabActiveTxt}>Popular</Text></View>
          <TouchableOpacity style={cc.tab}><Text style={cc.tabTxt}>New Listing</Text></TouchableOpacity>
        </View>
        <TouchableOpacity><Text style={cc.viewAll}>View All 350+ →</Text></TouchableOpacity>
      </View>
      {COINS.map((c) => {
        const p  = prices[c.id]  ?? 0;
        const ch = changes[c.id] ?? 0;
        return (
          <TouchableOpacity key={c.id} style={cc.row} onPress={() => router.replace("/(tabs)")}>
            <CoinLogo symbolId={c.pair} size={34} />
            <View style={{ flex: 1 }}>
              <Text style={cc.coinId}>{c.id}</Text>
              <Text style={cc.coinName}>{c.name}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={cc.price}>{fmtPrice(p)}</Text>
              <Text style={[cc.chg, { color: ch >= 0 ? C.green : C.red }]}>{fmtChg(ch)}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const cc = StyleSheet.create({
  card:        { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  hdr:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  tabs:        { flexDirection: "row", gap: 4 },
  tabActive:   { backgroundColor: C.accentDim, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  tabActiveTxt:{ color: C.accent, fontSize: 13, fontWeight: "700" as const },
  tab:         { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  tabTxt:      { color: C.muted, fontSize: 13, fontWeight: "600" as const },
  viewAll:     { color: C.accent, fontSize: 12, fontWeight: "600" as const },
  row:         { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border + "44" },
  coinId:      { color: C.text, fontSize: 13, fontWeight: "700" as const },
  coinName:    { color: C.muted, fontSize: 11, marginTop: 1 },
  price:       { color: C.text, fontSize: 13, fontWeight: "600" as const },
  chg:         { fontSize: 12, fontWeight: "600" as const, marginTop: 2 },
});

// ── News card ─────────────────────────────────────────────────────────────────
function NewsCard() {
  return (
    <View style={nw.card}>
      <View style={nw.hdr}>
        <Text style={nw.hdrTxt}>News</Text>
        <TouchableOpacity><Text style={nw.viewAll}>View All News →</Text></TouchableOpacity>
      </View>
      {NEWS.map((n, i) => (
        <View key={i} style={[nw.row, i === NEWS.length - 1 && { borderBottomWidth: 0 }]}>
          <View style={nw.dot} />
          <Text style={nw.title} numberOfLines={2}>{n.title}</Text>
          <Text style={nw.time}>{n.time}</Text>
        </View>
      ))}
    </View>
  );
}
const nw = StyleSheet.create({
  card:    { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginTop: 14, overflow: "hidden" },
  hdr:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border },
  hdrTxt:  { color: C.text, fontSize: 14, fontWeight: "700" as const },
  viewAll: { color: C.accent, fontSize: 12, fontWeight: "600" as const },
  row:     { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border + "55" },
  dot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent, marginTop: 5, flexShrink: 0 },
  title:   { flex: 1, color: C.muted, fontSize: 12, lineHeight: 17 },
  time:    { color: C.muted, fontSize: 11, flexShrink: 0, marginTop: 2, minWidth: 40 },
});

// ── Stat badge ────────────────────────────────────────────────────────────────
function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={st.wrap}>
      <Text style={st.icon}>{icon}</Text>
      <View>
        <Text style={st.value}>{value}</Text>
        <Text style={st.label}>{label}</Text>
      </View>
    </View>
  );
}
const st = StyleSheet.create({
  wrap:  { flexDirection: "row", alignItems: "center", gap: 10 },
  icon:  { fontSize: 26 },
  value: { color: C.white, fontSize: 20, fontWeight: "800" as const },
  label: { color: C.muted, fontSize: 11, marginTop: 1 },
});

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  const cols = [
    {
      head: "Company",
      items: [
        { label: "About Us",   route: "/legal/about"   },
        { label: "Contact",    route: "/legal/contact" },
      ],
    },
    {
      head: "Legal",
      items: [
        { label: "Privacy Policy",    route: "/legal/privacy"    },
        { label: "Terms & Conditions", route: "/legal/terms"      },
        { label: "Disclaimer",        route: "/legal/disclaimer" },
      ],
    },
  ];
  return (
    <View style={ft.wrap}>
      <View style={ft.inner}>
        <View style={ft.brand}>
          <View style={ft.brandRow}>
            <Image source={require("@/assets/images/logo.png")} style={ft.logo} />
            <Text style={ft.brandName}>TRADE MOCK</Text>
          </View>
          <Text style={ft.tagline}>Practice crypto trading without risk.{"\n"}Build confidence before real markets.</Text>
          <Text style={ft.trust}>Trusted by traders worldwide</Text>
        </View>
        {cols.map((col) => (
          <View key={col.head} style={ft.col}>
            <Text style={ft.colHead}>{col.head}</Text>
            {col.items.map((item) => (
              <TouchableOpacity key={item.label} onPress={() => router.push(item.route as any)}>
                <Text style={ft.colLink}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
      <View style={ft.bottom}>
        <Text style={ft.copy}>© 2025 Trade Mock Pro. All rights reserved.</Text>
        <View style={ft.btmLinks}>
          {[
            { label: "Privacy Policy", route: "/legal/privacy"    },
            { label: "Terms",          route: "/legal/terms"      },
            { label: "Disclaimer",     route: "/legal/disclaimer" },
            { label: "Contact",        route: "/legal/contact"    },
          ].map((item, i) => (
            <React.Fragment key={item.label}>
              {i > 0 && <Text style={ft.sep}>·</Text>}
              <TouchableOpacity onPress={() => router.push(item.route as any)}>
                <Text style={ft.btmLink}>{item.label}</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </View>
    </View>
  );
}
const ft = StyleSheet.create({
  wrap:     { backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 48, paddingBottom: 24 },
  inner:    { maxWidth: 1280, alignSelf: "center" as any, width: "100%", flexDirection: "row", gap: 48, paddingHorizontal: 24, flexWrap: "wrap" },
  brand:    { minWidth: 220, flex: 2 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  logo:     { width: 28, height: 28, borderRadius: 7 },
  brandName:{ color: C.white, fontSize: 15, fontWeight: "800" as const, letterSpacing: 1.2 },
  tagline:  { color: C.muted, fontSize: 13, lineHeight: 20 },
  trust:    { color: C.muted, fontSize: 12, marginTop: 16 },
  col:      { flex: 1, minWidth: 120, gap: 10 },
  colHead:  { color: C.text, fontSize: 13, fontWeight: "700" as const, marginBottom: 4 },
  colLink:  { color: C.muted, fontSize: 13 },
  bottom:   { maxWidth: 1280, alignSelf: "center" as any, width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, marginTop: 36, paddingTop: 20, borderTopWidth: 1, borderTopColor: C.border, flexWrap: "wrap", gap: 10 },
  copy:     { color: C.muted, fontSize: 12 },
  btmLinks: { flexDirection: "row", gap: 8, alignItems: "center" },
  btmLink:  { color: C.muted, fontSize: 12 },
  sep:      { color: C.border, fontSize: 12 },
});

// ── Main component ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [prices,       setPrices]       = useState<Record<string, number>>({});
  const [changes,      setChanges]      = useState<Record<string, number>>({});
  const [pricesLoaded, setPricesLoaded] = useState(false);

  useEffect(() => {
    // Fallback: show page after max 2.5s even if API is slow
    const fallback = setTimeout(() => setPricesLoaded(true), 2500);

    function fetchPrices() {
      // Use same-origin api-server proxy — no CORS issues
      fetch("/api/market/prices")
        .then((r) => r.json())
        .then((data: Record<string, { price: number; change24h: number }>) => {
          const p: Record<string, number> = {};
          const ch: Record<string, number> = {};
          Object.entries(data).forEach(([pair, v]) => {
            const id = pair.replace("USDT", "");
            p[id]  = v.price;
            ch[id] = v.change24h;
          });
          setPrices(p);
          setChanges(ch);
          setPricesLoaded(true);
          clearTimeout(fallback);
        })
        .catch(() => { setPricesLoaded(true); clearTimeout(fallback); });
    }
    fetchPrices();
    const t = setInterval(fetchPrices, 10000);
    return () => { clearInterval(t); clearTimeout(fallback); };
  }, []);

  const goDashboard = () => router.replace("/(tabs)");
  const goAuth      = () => router.push("/auth");

  if (!pricesLoaded) {
    return <LoadingCandleAnimation status="connecting" />;
  }

  return (
    // Use web-native scroll — outer View fills viewport, inner ScrollView scrolls
    <View style={s.root}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Navbar */}
        <NavBar onLogin={goAuth} onSignup={goAuth} />

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroRow}>
            {/* Left */}
            <View style={s.heroLeft}>
              <View style={s.badge}>
                <View style={s.badgePulse} />
                <Text style={s.badgeTxt}>Live Market Data · Free to Use</Text>
              </View>
              <Text style={s.h1}>
                Practice Trading{"\n"}
                <Text style={s.h1Yellow}>Without Risk</Text>
              </Text>
              <Text style={s.sub}>
                Trade Mock Pro is a crypto trading simulation app for educational purposes only. We do not provide financial advice. Practice with live charts, mock balance, portfolio, and history — risk free.
              </Text>
              <View style={s.ctaRow}>
                <TouchableOpacity style={s.btnPrimary} onPress={goAuth}>
                  <Text style={s.btnPrimaryTxt}>Get Started →</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnSecondary} onPress={goDashboard}>
                  <Text style={s.btnSecondaryTxt}>Try Demo</Text>
                </TouchableOpacity>
              </View>
              <View style={s.statsRow}>
                <Stat icon="👥" value="50,000+" label="Users"       />
                <View style={s.statDiv} />
                <Stat icon="🪙" value="100+"    label="Coins"       />
                <View style={s.statDiv} />
                <Stat icon="📡" value="Live"    label="Market Data" />
              </View>
            </View>
            {/* Right */}
            <View style={s.heroRight}>
              <CoinCard prices={prices} changes={changes} />
              <NewsCard />
            </View>
          </View>
        </View>

        {/* Features strip */}
        <View style={s.features}>
          <View style={s.featInner}>
            {FEATURES.map((f) => (
              <View key={f.title} style={s.featCard}>
                <Text style={s.featIcon}>{f.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.featTitle}>{f.title}</Text>
                  <Text style={s.featDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <Footer />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  scroll:      { flex: 1 },
  scrollContent:{ flexGrow: 1 },

  hero:      { paddingTop: 64, paddingBottom: 72, paddingHorizontal: 24, backgroundColor: C.bg },
  heroRow:   { maxWidth: 1280, alignSelf: "center" as any, width: "100%", flexDirection: "row", gap: 48, flexWrap: "wrap" },
  heroLeft:  { flex: 2, minWidth: 300, justifyContent: "center" },
  heroRight: { flex: 1.4, minWidth: 300 },

  badge:       { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(240,185,11,0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: "flex-start" as any, marginBottom: 20, borderWidth: 1, borderColor: "rgba(240,185,11,0.3)" },
  badgePulse:  { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  badgeTxt:    { color: C.accent, fontSize: 12, fontWeight: "600" as const },

  h1:          { fontSize: 54, fontWeight: "900" as const, color: C.white, lineHeight: 64, marginBottom: 18 },
  h1Yellow:    { color: C.accent },
  sub:         { fontSize: 16, color: C.muted, lineHeight: 26, maxWidth: 480, marginBottom: 32 },

  ctaRow:       { flexDirection: "row", gap: 14, flexWrap: "wrap" as any, marginBottom: 44 },
  btnPrimary:   { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 8, backgroundColor: C.accent },
  btnPrimaryTxt:{ color: "#000", fontSize: 15, fontWeight: "800" as const },
  btnSecondary: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 8, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface },
  btnSecondaryTxt:{ color: C.text, fontSize: 15, fontWeight: "700" as const },

  statsRow:  { flexDirection: "row", alignItems: "center", gap: 24, flexWrap: "wrap" as any },
  statDiv:   { width: 1, height: 36, backgroundColor: C.border },

  features:  { backgroundColor: C.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border, paddingVertical: 36, paddingHorizontal: 24 },
  featInner: { maxWidth: 1280, alignSelf: "center" as any, width: "100%", flexDirection: "row", gap: 24, flexWrap: "wrap" as any, justifyContent: "space-between" },
  featCard:  { flexDirection: "row", alignItems: "flex-start", gap: 14, flex: 1, minWidth: 180, maxWidth: 240 },
  featIcon:  { fontSize: 28, marginTop: 2 },
  featTitle: { color: C.text, fontSize: 14, fontWeight: "700" as const, marginBottom: 3 },
  featDesc:  { color: C.muted, fontSize: 12, lineHeight: 17 },
});
