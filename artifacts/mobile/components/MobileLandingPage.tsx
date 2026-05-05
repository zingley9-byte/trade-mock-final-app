/**
 * MobileLandingPage — Mobile web browser landing page for Trade Mock
 * Only rendered when Platform.OS === "web" && screen width < 768
 */
import React, { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import LoadingCandleAnimation from "./LoadingCandleAnimation";
import CoinLogo from "./CoinLogo";

const C = {
  bg:       "#0A0A0A",
  surface:  "#111111",
  card:     "#161616",
  border:   "#222222",
  accent:   "#F0B90B",
  accentDim:"rgba(240,185,11,0.13)",
  green:    "#0ECB81",
  red:      "#F6465D",
  text:     "#EAECEF",
  muted:    "#848E9C",
  white:    "#FFFFFF",
};

const COINS = [
  { id: "BTC",  name: "Bitcoin",   pair: "BTCUSDT",  color: "#F7931A" },
  { id: "ETH",  name: "Ethereum",  pair: "ETHUSDT",  color: "#627EEA" },
  { id: "BNB",  name: "BNB",       pair: "BNBUSDT",  color: "#F0B90B" },
  { id: "SOL",  name: "Solana",    pair: "SOLUSDT",  color: "#9945FF" },
  { id: "DOGE", name: "Dogecoin",  pair: "DOGEUSDT", color: "#C2A633" },
];

const NEWS = [
  { icon: "✕", title: "XRP's Leverage Ratio Stabilizes Amid Market Developments", time: "2h ago" },
  { icon: "💳", title: "Crypto Payment Card Monthly Spending Hits $1B Million",    time: "4h ago" },
];

const FEATURES = [
  { icon: "📊", title: "Real Market Data",    desc: "Live data from top exchanges" },
  { icon: "📈", title: "Advanced Charts",     desc: "Professional charts with multiple indicators" },
  { icon: "💰", title: "Mock Trading",        desc: "Practice with virtual funds in real market" },
  { icon: "🗂",  title: "Portfolio Tracking", desc: "Track your performance and improve" },
];

const PARTNERS = ["BINANCE", "coinbase", "OKX", "BYB!T", "KuCoin"];

function fmtPrice(p: number): string {
  if (!p) return "—";
  if (p >= 10000) return `$${p.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (p >= 1)     return `$${p.toFixed(2)}`;
  return `$${p.toFixed(5)}`;
}
function fmtChg(c: number): string {
  return `${c >= 0 ? "+" : ""}${c.toFixed(2)}%`;
}

// ── Mini sparkline using View bars ────────────────────────────────────────────
function Sparkline({ up }: { up: boolean }) {
  const heights = up
    ? [4, 6, 5, 8, 7, 10, 9, 12, 11, 14]
    : [14, 11, 13, 10, 12, 8, 10, 6, 7, 4];
  const color = up ? C.green : C.red;
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 1.5, height: 20, width: 52 }}>
      {heights.map((h, i) => (
        <View key={i} style={{ width: 3, height: h, backgroundColor: color, borderRadius: 1, opacity: 0.85 }} />
      ))}
    </View>
  );
}

// ── Phone mockup card ─────────────────────────────────────────────────────────
function PhoneMockup({ btcPrice, btcChg }: { btcPrice: number; btcChg: number }) {
  const pos = btcChg >= 0;
  return (
    <View style={pm.outer}>
      <View style={pm.phone}>
        {/* Top bar */}
        <View style={pm.topBar}>
          <Text style={pm.time}>3:41</Text>
          <Text style={pm.pair}>BTC/USDT</Text>
          <Text style={pm.timeframe}>1H</Text>
        </View>
        {/* Price */}
        <Text style={pm.price}>{btcPrice ? btcPrice.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "78,463.25"}</Text>
        <Text style={[pm.chg, { color: pos ? C.green : C.red }]}>
          {pos ? "+" : ""}{btcChg.toFixed(2)}%
        </Text>
        {/* Fake chart bars */}
        <View style={pm.chartArea}>
          {[30, 55, 40, 70, 50, 80, 60, 90, 75, 95, 65, 85, 70, 88, 72].map((h, i) => (
            <View
              key={i}
              style={[pm.bar, {
                height: h * 0.5,
                backgroundColor: i % 3 === 0 ? C.red : C.green,
              }]}
            />
          ))}
        </View>
        {/* Portfolio */}
        <View style={pm.portfolio}>
          <Text style={pm.portfolioLabel}>Portfolio Value</Text>
          <Text style={pm.portfolioVal}>₹1,25,430.50</Text>
          <Text style={[pm.portfolioChg, { color: C.green }]}>+12.36%</Text>
        </View>
      </View>
      {/* BTC coin glow */}
      <View style={pm.coinWrap}>
        <View style={pm.coinGlow} />
        <View style={pm.coin}>
          <Text style={pm.coinTxt}>₿</Text>
        </View>
      </View>
    </View>
  );
}
const pm = StyleSheet.create({
  outer:        { width: "100%", alignItems: "center", position: "relative", marginBottom: 8 },
  phone:        { width: 170, backgroundColor: "#0d0d0d", borderRadius: 18, borderWidth: 1.5, borderColor: "#333", padding: 12, zIndex: 2 },
  topBar:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  time:         { color: C.muted, fontSize: 9 },
  pair:         { color: C.text, fontSize: 10, fontWeight: "700" as const },
  timeframe:    { color: C.accent, fontSize: 9, fontWeight: "700" as const },
  price:        { color: C.white, fontSize: 18, fontWeight: "800" as const, marginBottom: 2 },
  chg:          { fontSize: 11, fontWeight: "700" as const, marginBottom: 8 },
  chartArea:    { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 44, marginBottom: 8 },
  bar:          { width: 6, borderRadius: 2, opacity: 0.9 },
  portfolio:    { backgroundColor: "#1a1a1a", borderRadius: 8, padding: 8 },
  portfolioLabel:{ color: C.muted, fontSize: 9 },
  portfolioVal: { color: C.white, fontSize: 13, fontWeight: "700" as const, marginTop: 2 },
  portfolioChg: { fontSize: 10, fontWeight: "700" as const, marginTop: 1 },
  coinWrap:     { position: "absolute", right: 20, bottom: -18, zIndex: 3 },
  coinGlow:     { position: "absolute", width: 64, height: 64, borderRadius: 32, backgroundColor: "#F7931A22", top: -4, left: -4 },
  coin:         { width: 56, height: 56, borderRadius: 28, backgroundColor: "#F7931A", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#F0B90B" },
  coinTxt:      { color: "#fff", fontSize: 24, fontWeight: "900" as const },
});

// ── Main component ────────────────────────────────────────────────────────────
export default function MobileLandingPage() {
  const [prices,       setPrices]       = useState<Record<string, number>>({});
  const [changes,      setChanges]      = useState<Record<string, number>>({});
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [pricesLoaded, setPricesLoaded] = useState(false);

  useEffect(() => {
    // Fallback: show page after max 2.5s even if API is slow
    const fallback = setTimeout(() => setPricesLoaded(true), 2500);

    function fetchPrices() {
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
    <View style={s.root}>
      {/* ── Sticky Navbar ── */}
      <View style={[s.navbar, { position: "sticky" as any, top: 0, zIndex: 100 }]}>
        <View style={s.navInner}>
          <View style={s.navLogo}>
            <Image source={require("@/assets/images/logo.png")} style={s.navLogoImg} />
            <Text style={s.navLogoTxt}>TRADE MOCK</Text>
          </View>
          <TouchableOpacity style={s.hamburger} onPress={() => setMenuOpen(!menuOpen)}>
            <View style={s.hLine} />
            <View style={s.hLine} />
            <View style={s.hLine} />
          </TouchableOpacity>
        </View>
        {menuOpen && (
          <View style={s.menuDropdown}>
            {["Markets", "Trade", "Features", "Pricing", "Learn"].map((l) => (
              <TouchableOpacity key={l} style={s.menuItem}>
                <Text style={s.menuItemTxt}>{l}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.menuLoginBtn} onPress={goAuth}>
              <Text style={s.menuLoginTxt}>Log In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.menuStartBtn} onPress={goAuth}>
              <Text style={s.menuStartTxt}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={s.hero}>
          {/* Badge */}
          <View style={s.badge}>
            <Text style={s.badgeStar}>★</Text>
            <Text style={s.badgeTxt}>PRACTICE · LEARN · GROW</Text>
          </View>

          {/* Hero layout: text left + phone right */}
          <View style={s.heroRow}>
            <View style={s.heroLeft}>
              <Text style={s.h1}>Practice Trading{"\n"}<Text style={s.h1Yellow}>Without Risk</Text></Text>
              <Text style={s.sub}>Trade Mock Pro is a crypto trading simulation app for educational purposes only. We do not provide financial advice. Practice risk-free with live charts and virtual funds.</Text>
              <TouchableOpacity style={s.btnPrimary} onPress={goAuth}>
                <Text style={s.btnPrimaryTxt}>Get Started →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSecondary} onPress={goDashboard}>
                <Text style={s.btnSecondaryTxt}>▶  Try Demo</Text>
              </TouchableOpacity>
            </View>
            <View style={s.heroRight}>
              <PhoneMockup btcPrice={prices.BTC ?? 0} btcChg={changes.BTC ?? 0} />
            </View>
          </View>
        </View>

        {/* ── Stats strip ── */}
        <View style={s.statsStrip}>
          <View style={s.statItem}>
            <Text style={s.statIcon}>👥</Text>
            <View>
              <Text style={s.statVal}>50,000+</Text>
              <Text style={s.statLabel}>Users</Text>
            </View>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statIcon}>🪙</Text>
            <View>
              <Text style={s.statVal}>100+</Text>
              <Text style={s.statLabel}>Coins</Text>
            </View>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statIcon}>📡</Text>
            <View>
              <Text style={s.statVal}>Live</Text>
              <Text style={s.statLabel}>Market Data</Text>
            </View>
          </View>
        </View>

        {/* ── Market Overview ── */}
        <View style={s.section}>
          <View style={s.sectionHdr}>
            <Text style={s.sectionTitle}>Market Overview</Text>
            <TouchableOpacity onPress={goDashboard}>
              <Text style={s.viewAll}>View All Coins →</Text>
            </TouchableOpacity>
          </View>
          {COINS.map((c) => {
            const p  = prices[c.id]  ?? 0;
            const ch = changes[c.id] ?? 0;
            const pos = ch >= 0;
            return (
              <TouchableOpacity key={c.id} style={s.coinRow} onPress={goDashboard}>
                <CoinLogo symbolId={c.pair} size={36} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.coinId}>{c.id}</Text>
                  <Text style={s.coinName}>{c.name}</Text>
                </View>
                <Text style={s.coinPrice}>{fmtPrice(p)}</Text>
                <Text style={[s.coinChg, { color: pos ? C.green : C.red, marginHorizontal: 10 }]}>{fmtChg(ch)}</Text>
                <Sparkline up={pos} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Why Choose ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Why Choose Trade Mock Pro?</Text>
          <View style={s.featGrid}>
            {FEATURES.map((f) => (
              <View key={f.title} style={s.featCard}>
                <View style={s.featIconWrap}>
                  <Text style={s.featIcon}>{f.icon}</Text>
                </View>
                <Text style={s.featTitle}>{f.title}</Text>
                <Text style={s.featDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Latest News ── */}
        <View style={s.section}>
          <View style={s.sectionHdr}>
            <Text style={s.sectionTitle}>Latest News</Text>
            <TouchableOpacity><Text style={s.viewAll}>View All News →</Text></TouchableOpacity>
          </View>
          {NEWS.map((n, i) => (
            <TouchableOpacity key={i} style={s.newsRow}>
              <View style={s.newsIconWrap}>
                <Text style={s.newsIcon}>{n.icon}</Text>
              </View>
              <Text style={s.newsTxt} numberOfLines={2}>{n.title}</Text>
              <Text style={s.newsTime}>{n.time}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Trusted by ── */}
        <View style={s.partners}>
          <Text style={s.partnersTxt}>Trusted by traders worldwide</Text>
          <View style={s.partnersRow}>
            {PARTNERS.map((p) => (
              <Text key={p} style={s.partnerName}>{p}</Text>
            ))}
          </View>
        </View>

        {/* ── Legal Links ── */}
        <View style={s.legalSection}>
          <View style={s.legalRow}>
            {[
              { label: "Privacy Policy", route: "/legal/privacy"    },
              { label: "Terms",          route: "/legal/terms"      },
              { label: "Disclaimer",     route: "/legal/disclaimer" },
            ].map((item, i) => (
              <React.Fragment key={item.label}>
                {i > 0 && <Text style={s.legalSep}>·</Text>}
                <TouchableOpacity onPress={() => router.push(item.route as any)}>
                  <Text style={s.legalLink}>{item.label}</Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
          <View style={s.legalRow}>
            {[
              { label: "Contact Us", route: "/legal/contact" },
              { label: "About",      route: "/legal/about"   },
            ].map((item, i) => (
              <React.Fragment key={item.label}>
                {i > 0 && <Text style={s.legalSep}>·</Text>}
                <TouchableOpacity onPress={() => router.push(item.route as any)}>
                  <Text style={s.legalLink}>{item.label}</Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
          <Text style={s.legalCopy}>© 2025 Trade Mock Pro. All rights reserved.</Text>
        </View>

        {/* ── Bottom CTA banner ── */}
        <View style={s.ctaBanner}>
          <View style={s.ctaBannerLeft}>
            <Text style={s.ctaBannerIcon}>🎁</Text>
            <View>
              <Text style={s.ctaBannerTitle}>Up to ₹10L Mock Balance Today!</Text>
              <Text style={s.ctaBannerSub}>Start your trading journey risk-free.</Text>
            </View>
          </View>
          <TouchableOpacity style={s.ctaBannerBtn} onPress={goAuth}>
            <Text style={s.ctaBannerBtnTxt}>Get Started →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 0 },

  // Navbar
  navbar:      { backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  navInner:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  navLogo:     { flexDirection: "row", alignItems: "center", gap: 8 },
  navLogoImg:  { width: 28, height: 28, borderRadius: 7 },
  navLogoTxt:  { color: C.accent, fontSize: 15, fontWeight: "900" as const, letterSpacing: 1.5 },
  hamburger:   { gap: 5, padding: 4 },
  hLine:       { width: 22, height: 2, backgroundColor: C.text, borderRadius: 1 },
  menuDropdown:{ backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  menuItem:    { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border + "55" },
  menuItemTxt: { color: C.text, fontSize: 15, fontWeight: "600" as const },
  menuLoginBtn:{ marginTop: 8, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: "center" },
  menuLoginTxt:{ color: C.text, fontSize: 14, fontWeight: "600" as const },
  menuStartBtn:{ marginTop: 8, marginBottom: 8, paddingVertical: 12, borderRadius: 8, backgroundColor: C.accent, alignItems: "center" },
  menuStartTxt:{ color: "#000", fontSize: 14, fontWeight: "700" as const },

  // Hero
  hero:      { backgroundColor: "#0A0A0A", paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12 },
  badge:     { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
  badgeStar: { color: C.accent, fontSize: 12 },
  badgeTxt:  { color: C.muted, fontSize: 11, fontWeight: "600" as const, letterSpacing: 1 },
  heroRow:   { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  heroLeft:  { flex: 1 },
  heroRight: { width: 160, alignItems: "center" },
  h1:        { fontSize: 26, fontWeight: "900" as const, color: C.white, lineHeight: 33, marginBottom: 10 },
  h1Yellow:  { color: C.accent },
  sub:       { fontSize: 12, color: C.muted, lineHeight: 18, marginBottom: 16 },
  btnPrimary:   { backgroundColor: C.accent, paddingVertical: 13, borderRadius: 8, alignItems: "center", marginBottom: 10 },
  btnPrimaryTxt:{ color: "#000", fontSize: 14, fontWeight: "800" as const },
  btnSecondary: { backgroundColor: "transparent", paddingVertical: 12, borderRadius: 8, alignItems: "center", borderWidth: 1.5, borderColor: C.border },
  btnSecondaryTxt: { color: C.text, fontSize: 14, fontWeight: "700" as const },

  // Stats strip
  statsStrip:  { flexDirection: "row", alignItems: "center", justifyContent: "space-evenly", backgroundColor: C.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border, paddingVertical: 16, marginTop: 8 },
  statItem:    { flexDirection: "row", alignItems: "center", gap: 8 },
  statIcon:    { fontSize: 22 },
  statVal:     { color: C.white, fontSize: 16, fontWeight: "800" as const },
  statLabel:   { color: C.muted, fontSize: 10, marginTop: 1 },
  statDivider: { width: 1, height: 32, backgroundColor: C.border },

  // Section
  section:      { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  sectionHdr:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { color: C.white, fontSize: 16, fontWeight: "800" as const },
  viewAll:      { color: C.accent, fontSize: 12, fontWeight: "600" as const },

  // Coin row
  coinRow:       { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border + "44" },
  coinAvatar:    { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginRight: 10 },
  coinAvatarTxt: { fontSize: 14, fontWeight: "900" as const },
  coinId:        { color: C.text, fontSize: 13, fontWeight: "700" as const },
  coinName:      { color: C.muted, fontSize: 10, marginTop: 1 },
  coinPrice:     { color: C.text, fontSize: 12, fontWeight: "600" as const, minWidth: 72, textAlign: "right" as const },
  coinChg:       { fontSize: 11, fontWeight: "700" as const, minWidth: 52, textAlign: "right" as const },

  // Features grid
  featGrid: { flexDirection: "row", flexWrap: "wrap" as any, gap: 10, marginTop: 14 },
  featCard: { flex: 1, minWidth: "44%" as any, backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, alignItems: "center" },
  featIconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  featIcon:  { fontSize: 22 },
  featTitle: { color: C.text, fontSize: 12, fontWeight: "700" as const, textAlign: "center" as const, marginBottom: 4 },
  featDesc:  { color: C.muted, fontSize: 10, textAlign: "center" as const, lineHeight: 14 },

  // News
  newsRow:     { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border + "44" },
  newsIconWrap:{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  newsIcon:    { fontSize: 18 },
  newsTxt:     { flex: 1, color: C.text, fontSize: 12, lineHeight: 17 },
  newsTime:    { color: C.muted, fontSize: 10, flexShrink: 0 },

  // Partners
  partners:    { paddingHorizontal: 16, paddingVertical: 20, alignItems: "center" },
  partnersTxt: { color: C.muted, fontSize: 11, marginBottom: 12 },
  partnersRow: { flexDirection: "row", gap: 16, flexWrap: "wrap" as any, justifyContent: "center" },
  partnerName: { color: C.muted, fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.5 },

  // Legal footer
  legalSection: { paddingHorizontal: 16, paddingVertical: 20, alignItems: "center", gap: 8 },
  legalRow:     { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" as any, justifyContent: "center" },
  legalLink:    { color: "#848E9C", fontSize: 12, fontWeight: "600" as const },
  legalSep:     { color: "#333", fontSize: 12 },
  legalCopy:    { color: "#555", fontSize: 11, marginTop: 4 },

  // Bottom CTA banner
  ctaBanner:      { backgroundColor: "#1a1400", borderTopWidth: 1, borderTopColor: C.accent + "44", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, flexWrap: "wrap" as any, gap: 10 },
  ctaBannerLeft:  { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  ctaBannerIcon:  { fontSize: 24 },
  ctaBannerTitle: { color: C.white, fontSize: 13, fontWeight: "700" as const },
  ctaBannerSub:   { color: C.muted, fontSize: 11, marginTop: 2 },
  ctaBannerBtn:   { backgroundColor: C.accent, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  ctaBannerBtnTxt:{ color: "#000", fontSize: 13, fontWeight: "800" as const },
});
