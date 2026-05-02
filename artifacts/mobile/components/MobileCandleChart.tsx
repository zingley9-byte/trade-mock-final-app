/**
 * MobileCandleChart — TradingView-style SVG chart for React Native + Web
 * Full toolbars • Binance REST+WS • Pan/Pinch/PriceScale gestures
 * Drawing tools (hline, trendline, crosshair) • Mouse-wheel zoom on web
 */
import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, PanResponder, useWindowDimensions, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Svg, { Rect, Line, Text as SvgText, G } from "react-native-svg";

// ─── Theme ─────────────────────────────────────────────────────────────────
const C = {
  bg:     "#131722",
  panel:  "#1e222d",
  border: "#2a2e39",
  bull:   "#26a69a",
  bear:   "#ef5350",
  dim:    "#787b86",
  text:   "#d1d4dc",
  cross:  "#758696",
  gold:   "#f0b90b",
  warn:   "#f59e0b",
};

// ─── Layout ────────────────────────────────────────────────────────────────
const TOP_H    = 42;
const BOT_H    = 32;
const LEFT_W   = 44;
const PRICE_W  = 70;
const TIME_H   = 24;
const VOL_RATIO = 0.18;
const MIN_VIS  = 15;
const MAX_VIS  = 400;
const DEF_VIS  = 80;

// ─── Timeframes ────────────────────────────────────────────────────────────
const TF_LIST = [
  { label: "1m",  bin: "1m"  },
  { label: "3m",  bin: "3m"  },
  { label: "5m",  bin: "5m"  },
  { label: "15m", bin: "15m" },
  { label: "30m", bin: "30m" },
  { label: "1h",  bin: "1h"  },
  { label: "4h",  bin: "4h"  },
  { label: "1D",  bin: "1d"  },
  { label: "1W",  bin: "1w"  },
];

// ─── Types ─────────────────────────────────────────────────────────────────
interface Candle { time: number; open: number; high: number; low: number; close: number; volume: number; }
type WsStatus = "connecting" | "live" | "reconnecting" | "error";
interface HLineD  { type: "hline";     price: number; }
interface TLineD  { type: "trendline"; x1: number; y1: number; x2: number; y2: number; }
type Drawing = HLineD | TLineD;
type GestureMode = "none" | "pan" | "pinch" | "pscale";

// ─── Helpers ───────────────────────────────────────────────────────────────
function toBinSym(sym: string) {
  const s = sym.replace("/", "").toUpperCase();
  return s.endsWith("USDT") ? s : s + "USDT";
}
function fmtP(p: number): string {
  if (!p) return "—";
  if (p >= 100000) return p.toFixed(0);
  if (p >= 1000)   return p.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (p >= 10)     return p.toFixed(2);
  if (p >= 1)      return p.toFixed(4);
  return p.toFixed(6);
}
function fmtTime(ts: number, bin: string) {
  const d = new Date(ts * 1000);
  if (bin === "1d" || bin === "1w")
    return `${d.getDate()}/${d.getMonth() + 1}`;
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}
function useIST() {
  const [t, setT] = useState("");
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      const ist = new Date(n.getTime() + n.getTimezoneOffset() * 60000 + 5.5 * 3600000);
      setT(`${ist.getHours().toString().padStart(2,"0")}:${ist.getMinutes().toString().padStart(2,"0")}:${ist.getSeconds().toString().padStart(2,"0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

// ─── Candle icon (react-native-svg) ────────────────────────────────────────
function IcCandleRN({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round">
      <Line x1="5" y1="3" x2="5" y2="5"/><Rect x="3.5" y="5" width="3" height="6" rx="0.5" fill="none"/><Line x1="5" y1="11" x2="5" y2="14"/>
      <Line x1="12" y1="2" x2="12" y2="5"/><Rect x="10.5" y="5" width="3" height="9" rx="0.5" fill="none"/><Line x1="12" y1="14" x2="12" y2="17"/>
      <Line x1="19" y1="5" x2="19" y2="8"/><Rect x="17.5" y="8" width="3" height="5" rx="0.5" fill="none"/><Line x1="19" y1="13" x2="19" y2="16"/>
    </Svg>
  );
}

// ─── Left toolbar definition ───────────────────────────────────────────────
const LEFT_TOOLS: Array<{ id: string; icon?: string } | { id: "sep" }> = [
  { id: "cursor",   icon: "crosshair"     },
  { id: "trendline",icon: "trending-up"   },
  { id: "hline",    icon: "minus"         },
  { id: "channel",  icon: "align-justify" },
  { id: "brush",    icon: "edit-2"        },
  { id: "text",     icon: "type"          },
  { id: "emoji",    icon: "smile"         },
  { id: "ruler",    icon: "tool"          },
  { id: "zoom",     icon: "zoom-in"       },
  { id: "sep" },
  { id: "magnet",   icon: "anchor"        },
  { id: "lockedit", icon: "edit"          },
  { id: "lock",     icon: "lock"          },
  { id: "eye",      icon: "eye"           },
];

// ─── Main Component ─────────────────────────────────────────────────────────
export default function MobileCandleChart({
  symbol = "BTCUSDT",
  height = 340,
  onPrice,
}: {
  symbol?:  string;
  height?:  number;
  onPrice?: (p: number) => void;
}) {
  const { width: SW } = useWindowDimensions();
  const istTime = useIST();

  // Derived layout
  const chartW = SW - LEFT_W;
  const plotW  = chartW - PRICE_W;
  const chartH = height - TOP_H - BOT_H;
  const areaH  = chartH - TIME_H;
  const volH   = Math.round(areaH * VOL_RATIO);
  const priceH = areaH - volH;

  // ── State ──────────────────────────────────────────────────────────────
  const [tf,         setTf]         = useState("5m");
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [wsStatus,   setWsStatus]   = useState<WsStatus>("connecting");
  const [tick,       setTick]       = useState(0);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [showTfMenu, setShowTfMenu] = useState(false);
  const [drawings,   setDrawings]   = useState<Drawing[]>([]);

  // ── Refs ───────────────────────────────────────────────────────────────
  const candlesRef    = useRef<Candle[]>([]);
  const visRef        = useRef(DEF_VIS);
  const offsetRef     = useRef(0);
  const wsRef         = useRef<WebSocket | null>(null);
  const retryTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelay    = useRef(3000);
  const loadIdRef     = useRef(0);
  const mountedRef    = useRef(true);
  // These are updated every render so PanResponder (which is memoised) can read fresh values:
  const activeToolRef = useRef<string | null>(null);
  const pricePadRef   = useRef(0.08);
  const plotWRef      = useRef(plotW);
  const priceHRef     = useRef(priceH);
  const minPRef       = useRef(0);
  const pRangeRef     = useRef(1);
  const gState        = useRef<{ mode: GestureMode; prevX: number; prevY: number; prevDist: number }>(
    { mode: "none", prevX: 0, prevY: 0, prevDist: 0 }
  );
  const curDrawRef    = useRef<Partial<TLineD> | null>(null);
  const crossRef      = useRef<{ x: number; y: number } | null>(null);

  // Sync refs every render (safe because render is synchronous)
  activeToolRef.current = activeTool;
  plotWRef.current      = plotW;
  priceHRef.current     = priceH;

  const redraw = useCallback(() => { if (mountedRef.current) setTick(t => t + 1); }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── WebSocket ──────────────────────────────────────────────────────────
  const connectWS = useCallback((loadId: number, binSym: string, binInterval: string) => {
    if (!mountedRef.current || loadIdRef.current !== loadId) return;
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    wsRef.current?.close(); wsRef.current = null;
    setWsStatus("connecting");

    const ws = new WebSocket(`wss://data-stream.binance.vision/ws/${binSym.toLowerCase()}@kline_${binInterval}`);
    wsRef.current = ws;
    ws.onopen = () => { if (mountedRef.current && loadIdRef.current === loadId) { setWsStatus("live"); retryDelay.current = 3000; } };
    ws.onmessage = (evt) => {
      if (!mountedRef.current || loadIdRef.current !== loadId) return;
      try {
        const k = JSON.parse(evt.data).k;
        const nc: Candle = { time: Math.floor(k.t / 1000), open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v };
        const arr = candlesRef.current;
        if (arr.length && arr[arr.length - 1].time === nc.time) arr[arr.length - 1] = nc;
        else { arr.push(nc); if (arr.length > 1000) arr.shift(); }
        if (offsetRef.current === 0) redraw();
        onPrice?.(nc.close);
      } catch {}
    };
    ws.onerror = () => { if (mountedRef.current && loadIdRef.current === loadId) setWsStatus("error"); };
    ws.onclose = () => {
      if (!mountedRef.current || loadIdRef.current !== loadId) return;
      setWsStatus("reconnecting");
      const d = retryDelay.current;
      retryDelay.current = Math.min(d * 2, 30000);
      retryTimer.current = setTimeout(() => connectWS(loadId, binSym, binInterval), d);
    };
  }, [onPrice, redraw]);

  // ── Load ───────────────────────────────────────────────────────────────
  const load = useCallback(async (sym: string, selectedTf: string) => {
    const loadId = ++loadIdRef.current;
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    wsRef.current?.close(); wsRef.current = null;
    retryDelay.current = 3000;
    setLoading(true); setFetchError(false);

    const binSym     = toBinSym(sym);
    const binInterval = TF_LIST.find(t => t.label === selectedTf)?.bin ?? "5m";
    try {
      const res = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${binSym}&interval=${binInterval}&limit=500`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Bad data");
      if (!mountedRef.current || loadIdRef.current !== loadId) return;
      candlesRef.current = data.map((d: any[]) => ({
        time: Math.floor(d[0] / 1000), open: +d[1], high: +d[2], low: +d[3], close: +d[4], volume: +d[5],
      }));
      offsetRef.current = 0;
      if (onPrice && candlesRef.current.length) onPrice(candlesRef.current[candlesRef.current.length - 1].close);
      setLoading(false); setFetchError(false); redraw();
    } catch {
      if (mountedRef.current && loadIdRef.current === loadId) { setLoading(false); setFetchError(true); }
      return;
    }
    connectWS(loadId, binSym, binInterval);
  }, [onPrice, redraw, connectWS]);

  useEffect(() => {
    load(symbol, tf);
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      wsRef.current?.close(); wsRef.current = null;
      loadIdRef.current++;
    };
  }, [symbol, tf, load]);

  // ── PanResponder ───────────────────────────────────────────────────────
  // All mutable state is read through refs so this memo only needs [redraw]
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder:        () => true,
    onMoveShouldSetPanResponder:         () => true,
    // ↓ Capture from the start — prevents parent ScrollView from stealing touch
    onStartShouldSetPanResponderCapture: () => true,

    onPanResponderGrant: (evt) => {
      const t    = evt.nativeEvent.touches;
      const lx   = evt.nativeEvent.locationX ?? 0;
      const ly   = evt.nativeEvent.locationY ?? 0;
      const tool = activeToolRef.current;

      if (tool === "hline") {
        const price = minPRef.current + (1 - ly / priceHRef.current) * pRangeRef.current;
        setDrawings(d => [...d, { type: "hline", price } as HLineD]);
        setActiveTool(null);
        return;
      }
      if (tool === "trendline") {
        curDrawRef.current = { type: "trendline", x1: lx, y1: ly };
        return;
      }
      if (tool === "cursor") {
        crossRef.current = { x: lx, y: ly };
        redraw();
        return;
      }

      // Regular pan / pinch / price-scale drag
      if (lx > plotWRef.current) {
        gState.current = { mode: "pscale", prevX: 0, prevY: t[0]?.pageY ?? 0, prevDist: 0 };
      } else if (t.length >= 2) {
        const dx = t[1].pageX - t[0].pageX;
        const dy = t[1].pageY - t[0].pageY;
        gState.current = { mode: "pinch", prevX: 0, prevY: 0, prevDist: Math.hypot(dx, dy) };
      } else {
        gState.current = { mode: "pan", prevX: t[0]?.pageX ?? 0, prevY: 0, prevDist: 0 };
      }
    },

    onPanResponderMove: (evt) => {
      const t    = evt.nativeEvent.touches;
      const lx   = evt.nativeEvent.locationX ?? 0;
      const ly   = evt.nativeEvent.locationY ?? 0;
      const gs   = gState.current;
      const tool = activeToolRef.current;

      if (tool === "cursor") {
        crossRef.current = { x: lx, y: ly };
        redraw(); return;
      }
      if (tool === "trendline") {
        if (curDrawRef.current) curDrawRef.current = { ...curDrawRef.current, x2: lx, y2: ly };
        redraw(); return;
      }

      if (gs.mode === "pscale") {
        const dy = (t[0]?.pageY ?? 0) - gs.prevY;
        if (Math.abs(dy) > 0.3) {
          pricePadRef.current = Math.max(0.01, Math.min(3.0, pricePadRef.current * (1 + dy * 0.006)));
          gs.prevY = t[0]?.pageY ?? gs.prevY;
          redraw();
        }
      } else if (t.length >= 2 && gs.mode === "pinch") {
        const dx   = t[1].pageX - t[0].pageX;
        const dy   = t[1].pageY - t[0].pageY;
        const dist = Math.hypot(dx, dy);
        if (gs.prevDist > 0) {
          const scale = dist / gs.prevDist;
          if (Math.abs(scale - 1) > 0.005) {
            visRef.current = Math.max(MIN_VIS, Math.min(MAX_VIS, Math.round(visRef.current / scale)));
            gs.prevDist = dist;
            redraw();
          }
        } else gs.prevDist = dist;
      } else if (t.length === 1 && gs.mode === "pan") {
        const dx    = (t[0]?.pageX ?? 0) - gs.prevX;
        const cw    = plotWRef.current / Math.max(1, visRef.current);
        const delta = Math.round(-dx / cw);
        if (delta !== 0) {
          const total = candlesRef.current.length;
          const maxO  = Math.max(0, total - visRef.current);
          offsetRef.current = Math.max(0, Math.min(maxO, offsetRef.current + delta));
          gs.prevX = t[0]?.pageX ?? gs.prevX;
          redraw();
        }
      }
    },

    onPanResponderRelease: (evt) => {
      const tool = activeToolRef.current;
      const lx   = evt.nativeEvent.locationX ?? 0;
      const ly   = evt.nativeEvent.locationY ?? 0;
      if (tool === "trendline" && curDrawRef.current?.x1 !== undefined) {
        const cd = curDrawRef.current;
        setDrawings(d => [...d, { type: "trendline", x1: cd.x1!, y1: cd.y1!, x2: lx, y2: ly } as TLineD]);
        curDrawRef.current = null;
        setActiveTool(null);
      }
      gState.current.mode = "none";
    },
  }), [redraw]);

  // ── Mouse wheel (web only) ─────────────────────────────────────────────
  const handleWheel = useCallback((e: any) => {
    e.preventDefault?.();
    visRef.current = Math.max(MIN_VIS, Math.min(MAX_VIS,
      Math.round(visRef.current * (e.deltaY > 0 ? 1.12 : 0.88))
    ));
    redraw();
  }, [redraw]);

  // ── Derived chart values ───────────────────────────────────────────────
  const all   = candlesRef.current;
  const total = all.length;
  const vc    = Math.min(visRef.current, total);
  const end   = total - offsetRef.current;
  const start = Math.max(0, end - vc);
  const vis   = all.slice(start, end);

  let minP = Infinity, maxP = -Infinity, maxVol = 1;
  for (const c of vis) {
    if (c.low    < minP)   minP   = c.low;
    if (c.high   > maxP)   maxP   = c.high;
    if (c.volume > maxVol) maxVol = c.volume;
  }
  if (!vis.length) { minP = 0; maxP = 1; }
  const pad    = (maxP - minP) * pricePadRef.current;
  minP -= pad; maxP += pad;
  const pRange = maxP - minP || 1;
  minPRef.current   = minP;
  pRangeRef.current = pRange;

  const toY    = (p: number) => priceH * (1 - (p - minP) / pRange);
  const toVolY = (v: number) => volH - (v / maxVol) * volH * 0.9;

  const candleW = vis.length > 0 ? plotW / vis.length : 8;
  const bodyW   = Math.max(1, candleW * 0.68);

  const gridLevels = Array.from({ length: 5 }, (_, i) => {
    const price = minP + pRange * (i / 4);
    return { price, y: toY(price) };
  });
  const tfBin         = TF_LIST.find(t => t.label === tf)?.bin ?? "5m";
  const timeLabelStep = Math.max(1, Math.floor(vis.length / 6));
  const timeLabels    = vis
    .filter((_, i) => i % timeLabelStep === 0)
    .map((c, i) => ({ x: (i * timeLabelStep + 0.5) * candleW, label: fmtTime(c.time, tfBin) }));

  const lastC    = vis.length ? vis[vis.length - 1] : null;
  const crossXY  = activeTool === "cursor" ? crossRef.current : null;
  const crossIdx = crossXY ? Math.min(vis.length - 1, Math.max(0, Math.floor(crossXY.x / candleW))) : -1;
  const crossC   = crossIdx >= 0 ? vis[crossIdx] : null;

  const wsBadge =
    wsStatus === "live"         ? { color: C.bull, label: "● LIVE"          } :
    wsStatus === "reconnecting" ? { color: C.warn, label: "↻ Reconnecting…" } :
    wsStatus === "error"        ? { color: C.bear, label: "✕ WS Error"      } :
                                  { color: C.dim,  label: "○ Connecting…"   };

  // CSS touch-action:none for web prevents browser-level scroll hijack
  const webTouch: any = Platform.OS === "web" ? { touchAction: "none" } : {};

  // ── Loading ────────────────────────────────────────────────────────────
  if (loading) return (
    <View style={[ss.root, { height, width: SW }, webTouch]}>
      <TopBar tf={tf} setTf={setTf} showMenu={showTfMenu} setShowMenu={setShowTfMenu}
        activeTool={activeTool} setActiveTool={setActiveTool} />
      <View style={ss.center}>
        <ActivityIndicator color={C.bull} size="small" />
        <Text style={ss.dimTxt}>Loading chart…</Text>
      </View>
    </View>
  );

  // ── Fetch error ────────────────────────────────────────────────────────
  if (fetchError && !vis.length) return (
    <View style={[ss.root, { height, width: SW }, webTouch]}>
      <TopBar tf={tf} setTf={setTf} showMenu={showTfMenu} setShowMenu={setShowTfMenu}
        activeTool={activeTool} setActiveTool={setActiveTool} />
      <View style={ss.center}>
        <Text style={{ fontSize: 24, color: C.warn }}>⚠</Text>
        <Text style={{ color: C.text, fontSize: 14, fontWeight: "600" }}>Failed to load chart</Text>
        <Text style={ss.dimTxt}>Check your internet connection</Text>
        <TouchableOpacity onPress={() => load(symbol, tf)} style={ss.retryBtn}>
          <Text style={ss.retryBtnTxt}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Chart view props (merge panHandlers + onWheel + style) ─────────────
  const chartAreaProps: any = {
    ...panResponder.panHandlers,
    style: [ss.chartArea, { height: chartH }, webTouch],
    ...(Platform.OS === "web" ? { onWheel: handleWheel } : {}),
  };

  return (
    <View style={[ss.root, { height, width: SW }, webTouch]}>

      {/* ── TOP TOOLBAR ─────────────────────────────────────────────────── */}
      <TopBar tf={tf} setTf={setTf} showMenu={showTfMenu} setShowMenu={setShowTfMenu}
        activeTool={activeTool} setActiveTool={setActiveTool} />

      {/* ── TF DROPDOWN ──────────────────────────────────────────────────── */}
      {showTfMenu && (
        <View style={ss.menuLayer} pointerEvents="box-none">
          <TouchableOpacity style={ss.backdrop} onPress={() => setShowTfMenu(false)} />
          <View style={ss.tfBox}>
            {TF_LIST.map(t => (
              <TouchableOpacity key={t.label}
                style={[ss.tfItem, tf === t.label && ss.tfItemActive]}
                onPress={() => { setTf(t.label); setShowTfMenu(false); }}>
                <Text style={[ss.tfItemTxt, tf === t.label && { color: C.bull }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── Reconnecting strip ───────────────────────────────────────────── */}
      {(wsStatus === "reconnecting" || wsStatus === "error") && (
        <View style={ss.reconnStrip}>
          <Text style={[ss.reconnTxt, { color: wsStatus === "error" ? C.bear : C.warn }]}>
            {wsStatus === "error" ? "WebSocket error · Retrying…" : "WebSocket disconnected · Reconnecting…"}
          </Text>
        </View>
      )}

      {/* ── BODY ─────────────────────────────────────────────────────────── */}
      <View style={[ss.body, webTouch]}>

        {/* ── LEFT TOOLBAR ─────────────────────────────────────────────── */}
        <View style={[ss.leftBar, { borderRightColor: C.border }]}>
          {LEFT_TOOLS.map((t, i) => {
            if (t.id === "sep") return (
              <View key={`sep${i}`} style={[ss.toolSep, { backgroundColor: C.border }]} />
            );
            const tool = t as { id: string; icon: string };
            const isActive = activeTool === tool.id;
            return (
              <TouchableOpacity
                key={tool.id}
                onPress={() => setActiveTool(isActive ? null : tool.id)}
                style={[ss.toolBtn, isActive && ss.toolBtnActive]}
              >
                <Feather name={tool.icon as any} size={15} color={isActive ? C.gold : C.dim} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── CHART AREA ─────────────────────────────────────────────────── */}
        <View {...chartAreaProps}>
          <Svg width={chartW} height={chartH}>

            {/* Grid */}
            {gridLevels.map((gl, i) => (
              <Line key={`gr${i}`} x1={0} y1={gl.y} x2={plotW} y2={gl.y} stroke={C.border} strokeWidth={0.5} />
            ))}

            {/* Candles */}
            {vis.map((c, i) => {
              const isBull = c.close >= c.open;
              const col    = isBull ? C.bull : C.bear;
              const cx     = (i + 0.5) * candleW;
              const bT     = toY(Math.max(c.open, c.close));
              const bB     = toY(Math.min(c.open, c.close));
              const bH     = Math.max(1, bB - bT);
              return (
                <G key={c.time}>
                  <Line x1={cx} y1={toY(c.high)} x2={cx} y2={bT} stroke={col} strokeWidth={1} />
                  <Rect x={cx - bodyW / 2} y={bT} width={bodyW} height={bH}
                    fill={isBull ? col : "none"} stroke={col} strokeWidth={isBull ? 0 : 0.8} />
                  <Line x1={cx} y1={bB} x2={cx} y2={toY(c.low)} stroke={col} strokeWidth={1} />
                </G>
              );
            })}

            {/* Price axis vertical separator */}
            <Line x1={plotW} y1={0} x2={plotW} y2={areaH} stroke={C.border} strokeWidth={0.5} />

            {/* Price axis labels */}
            {gridLevels.map((gl, i) => (
              <SvgText key={`pl${i}`} x={plotW + 5} y={gl.y + 4} fontSize={9} fill={C.dim}>{fmtP(gl.price)}</SvgText>
            ))}

            {/* Live price dashed line + filled label */}
            {lastC && (() => {
              const py  = toY(lastC.close);
              const col = lastC.close >= lastC.open ? C.bull : C.bear;
              return (
                <G>
                  <Line x1={0} y1={py} x2={plotW} y2={py} stroke={col} strokeWidth={0.6} strokeDasharray="3 2" />
                  <Rect x={plotW + 2} y={py - 8} width={PRICE_W - 4} height={16} rx={3} fill={col} />
                  <SvgText x={plotW + PRICE_W / 2} y={py + 4} fontSize={9} fill="#fff" textAnchor="middle" fontWeight="bold">
                    {fmtP(lastC.close)}
                  </SvgText>
                </G>
              );
            })()}

            {/* OHLCV overlay top-left */}
            {crossC ? (
              <SvgText x={4} y={14} fontSize={9.5} fill={crossC.close >= crossC.open ? C.bull : C.bear}>
                {`O:${fmtP(crossC.open)}  H:${fmtP(crossC.high)}  L:${fmtP(crossC.low)}  C:${fmtP(crossC.close)}`}
              </SvgText>
            ) : lastC ? (
              <SvgText x={4} y={14} fontSize={10} fill={lastC.close >= lastC.open ? C.bull : C.bear} fontWeight="bold">
                {fmtP(lastC.close)}
              </SvgText>
            ) : null}

            {/* Volume separator */}
            <Line x1={0} y1={priceH} x2={chartW} y2={priceH} stroke={C.border} strokeWidth={0.5} />

            {/* Volume bars */}
            <G y={priceH}>
              {vis.map((c, i) => {
                const cx = (i + 0.5) * candleW;
                const vT = toVolY(c.volume);
                return (
                  <Rect key={`v${c.time}`} x={cx - bodyW / 2} y={vT} width={bodyW}
                    height={Math.max(1, volH - vT)}
                    fill={c.close >= c.open ? C.bull + "55" : C.bear + "55"} />
                );
              })}
              <SvgText x={4} y={14} fontSize={9} fill={C.dim}>Volume</SvgText>
            </G>

            {/* Time axis */}
            <G y={priceH + volH}>
              <Line x1={0} y1={0} x2={chartW} y2={0} stroke={C.border} strokeWidth={0.5} />
              {timeLabels.map((tl, i) => (
                <SvgText key={`t${i}`} x={tl.x} y={16} fontSize={9} fill={C.dim} textAnchor="middle">{tl.label}</SvgText>
              ))}
            </G>

            {/* Price scale drag hint (right edge) */}
            <Line x1={plotW + PRICE_W - 1} y1={0} x2={plotW + PRICE_W - 1} y2={areaH} stroke={C.border} strokeWidth={0.5} />

            {/* Drawings: horizontal lines */}
            {drawings.filter(d => d.type === "hline").map((d, i) => {
              const hl = d as HLineD;
              const py = toY(hl.price);
              if (py < 0 || py > priceH) return null;
              return (
                <G key={`hl${i}`}>
                  <Line x1={0} y1={py} x2={plotW} y2={py} stroke={C.gold} strokeWidth={1} strokeDasharray="4 2" />
                  <Rect x={plotW + 2} y={py - 8} width={PRICE_W - 4} height={16} rx={3} fill={C.gold + "33"} />
                  <SvgText x={plotW + 5} y={py + 4} fontSize={9} fill={C.gold}>{fmtP(hl.price)}</SvgText>
                </G>
              );
            })}

            {/* Drawings: trendlines */}
            {drawings.filter(d => d.type === "trendline").map((d, i) => {
              const tl = d as TLineD;
              return <Line key={`tl${i}`} x1={tl.x1} y1={tl.y1} x2={tl.x2} y2={tl.y2} stroke={C.gold} strokeWidth={1.5} />;
            })}

            {/* In-progress trendline */}
            {curDrawRef.current?.x1 !== undefined && curDrawRef.current.x2 !== undefined && (
              <Line
                x1={curDrawRef.current.x1} y1={curDrawRef.current.y1!}
                x2={curDrawRef.current.x2} y2={curDrawRef.current.y2!}
                stroke={C.gold} strokeWidth={1} strokeDasharray="4 2"
              />
            )}

            {/* Crosshair */}
            {activeTool === "cursor" && crossXY && (
              <G>
                <Line x1={crossXY.x} y1={0} x2={crossXY.x} y2={areaH} stroke={C.cross} strokeWidth={0.5} strokeDasharray="3 3" />
                <Line x1={0} y1={crossXY.y} x2={plotW} y2={crossXY.y} stroke={C.cross} strokeWidth={0.5} strokeDasharray="3 3" />
              </G>
            )}

          </Svg>
        </View>
      </View>

      {/* ── BOTTOM STATUS BAR ────────────────────────────────────────────── */}
      <View style={[ss.botBar, { borderTopColor: C.border }]}>
        <Feather name="calendar" size={11} color={C.dim} />
        <Text style={ss.istTxt}>{istTime} UTC+5:30</Text>
        <View style={{ flex: 1 }} />
        <Text style={[ss.wsBadge, { color: wsBadge.color }]}>{wsBadge.label}</Text>
        <BotBtn label="%" />
        <BotBtn label="log" />
        <BotBtn label="auto" />
      </View>

    </View>
  );
}

// ─── TopBar ────────────────────────────────────────────────────────────────
function TopBar({
  tf, setTf, showMenu, setShowMenu, activeTool, setActiveTool,
}: {
  tf: string; setTf: (t: string) => void;
  showMenu: boolean; setShowMenu: (v: boolean) => void;
  activeTool: string | null; setActiveTool: (t: string | null) => void;
}) {
  return (
    <View style={[ss.topBar, { borderBottomColor: C.border }]}>
      <TbBtn><Feather name="plus" size={16} color={C.dim} /></TbBtn>
      <View style={[ss.tbSep, { backgroundColor: C.border }]} />

      {/* Timeframe picker */}
      <TouchableOpacity style={ss.tfPickerBtn} onPress={() => setShowMenu(!showMenu)}>
        <Text style={ss.tfPickerTxt}>{tf}</Text>
        <Feather name="chevron-down" size={10} color={C.dim} />
      </TouchableOpacity>

      <View style={[ss.tbSep, { backgroundColor: C.border }]} />
      <TbBtn><IcCandleRN color={C.dim} /></TbBtn>
      <TbBtn><Text style={ss.fxTxt}>fx</Text></TbBtn>
      <TbBtn><Feather name="layout" size={15} color={C.dim} /></TbBtn>
      <View style={{ flex: 1 }} />
      <TbBtn><Feather name="sliders" size={15} color={C.dim} /></TbBtn>
      <TbBtn><Feather name="maximize" size={15} color={C.dim} /></TbBtn>
      <TbBtn><Feather name="camera" size={15} color={C.dim} /></TbBtn>
    </View>
  );
}

function TbBtn({ children }: { children: React.ReactNode }) {
  return <TouchableOpacity style={ss.tbBtn}>{children}</TouchableOpacity>;
}

function BotBtn({ label }: { label: string }) {
  const [active, setActive] = React.useState(false);
  return (
    <TouchableOpacity
      onPress={() => setActive(v => !v)}
      style={[ss.botBtnBase, {
        backgroundColor: active ? C.gold + "22" : "transparent",
        borderColor:      active ? C.gold + "60" : C.border,
      }]}
    >
      <Text style={[ss.botBtnTxt, { color: active ? C.gold : C.dim }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  root: { backgroundColor: C.bg, overflow: "hidden" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  dimTxt: { color: C.dim, fontSize: 12 },
  retryBtn: { marginTop: 4, backgroundColor: C.bull, paddingHorizontal: 24, paddingVertical: 9, borderRadius: 6 },
  retryBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "700" as const },

  topBar: {
    height: TOP_H, flexDirection: "row", alignItems: "center",
    backgroundColor: C.panel, borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 2,
  },
  tbBtn: { width: 34, height: TOP_H, alignItems: "center", justifyContent: "center" },
  tbSep: { width: 1, height: 22, marginHorizontal: 3 },
  tfPickerBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, height: TOP_H },
  tfPickerTxt: { fontSize: 12, fontWeight: "700" as const, color: C.dim },
  fxTxt: { fontSize: 12, fontWeight: "700" as const, color: C.dim },

  body: { flexDirection: "row", flex: 1 },

  leftBar: {
    width: LEFT_W, backgroundColor: C.panel,
    borderRightWidth: StyleSheet.hairlineWidth,
    alignItems: "center", paddingTop: 4, paddingBottom: 4,
  },
  toolBtn: {
    width: 34, height: 32, borderRadius: 5,
    alignItems: "center", justifyContent: "center", marginVertical: 1,
  },
  toolBtnActive: { backgroundColor: "#f0b90b22" },
  toolSep: { width: 28, height: 1, marginVertical: 4 },

  chartArea: { flex: 1 },

  botBar: {
    height: BOT_H, flexDirection: "row", alignItems: "center",
    backgroundColor: C.panel, borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8, gap: 6,
  },
  istTxt:     { color: C.dim, fontSize: 10 },
  wsBadge:    { fontSize: 9, fontWeight: "700" as const, marginRight: 4 },
  botBtnBase: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 7, paddingVertical: 2 },
  botBtnTxt:  { fontSize: 10, fontWeight: "600" as const },

  menuLayer: {
    position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 100,
  },
  backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  tfBox: {
    position: "absolute", top: TOP_H + 2, left: LEFT_W + 2,
    backgroundColor: C.panel, borderRadius: 6,
    borderWidth: 1, borderColor: C.border,
    flexDirection: "row", flexWrap: "wrap", width: 130,
    paddingVertical: 4,
  },
  tfItem:       { width: "50%", paddingVertical: 7, paddingHorizontal: 10 },
  tfItemActive: { backgroundColor: "#26a69a18" },
  tfItemTxt:    { fontSize: 12, fontWeight: "700" as const, color: C.dim },

  reconnStrip: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 3, backgroundColor: C.panel,
  },
  reconnTxt: { fontSize: 10, fontWeight: "600" as const },
});
