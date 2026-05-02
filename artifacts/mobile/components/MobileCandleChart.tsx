/**
 * MobileCandleChart — lightweight-charts-style chart for React Native
 * Uses react-native-svg (Expo SDK built-in) + PanResponder for gestures.
 * Fetches live BTCUSDT data from Binance public API + WebSocket.
 */
import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, PanResponder, useWindowDimensions,
} from "react-native";
import Svg, {
  Rect, Line, Path, Text as SvgText, G, Defs,
  LinearGradient, Stop,
} from "react-native-svg";

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  bg:     "#131722",
  panel:  "#1e222d",
  border: "#2a2e39",
  bull:   "#26a69a",
  bear:   "#ef5350",
  text:   "#787b86",
  cross:  "#758696",
  white:  "#d1d4dc",
};

// ─── Constants ────────────────────────────────────────────────────────────────
const PRICE_AXIS_W = 68;
const TIME_AXIS_H  = 24;
const TF_BAR_H     = 38;
const VOL_RATIO    = 0.20;
const DEFAULT_VISIBLE = 80;
const MIN_VISIBLE  = 15;
const MAX_VISIBLE  = 400;

const TIMEFRAMES = [
  { label: "1m",  interval: "1m"  },
  { label: "5m",  interval: "5m"  },
  { label: "15m", interval: "15m" },
  { label: "1h",  interval: "1h"  },
  { label: "1D",  interval: "1d"  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
interface Candle {
  time: number; open: number; high: number; low: number; close: number; volume: number;
}

function toBinSym(sym: string): string {
  const s = sym.replace("/", "").toUpperCase();
  return s.endsWith("USDT") ? s : s + "USDT";
}

function fmtPrice(p: number): string {
  if (p >= 100000) return p.toFixed(0);
  if (p >= 1000)   return p.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (p >= 10)     return p.toFixed(2);
  if (p >= 1)      return p.toFixed(4);
  return p.toFixed(6);
}

function fmtTime(ts: number, interval: string): string {
  const d = new Date(ts * 1000);
  if (interval === "1d" || interval === "1w") {
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MobileCandleChart({
  symbol   = "BTCUSDT",
  height   = 340,
  onPrice,
}: {
  symbol?:  string;
  height?:  number;
  onPrice?: (p: number) => void;
}) {
  const { width: SW } = useWindowDimensions();
  const PLOT_W  = SW - PRICE_AXIS_W;
  const chartH  = height - TF_BAR_H;
  const areaH   = chartH - TIME_AXIS_H;          // price + volume
  const volH    = Math.round(areaH * VOL_RATIO);
  const priceH  = areaH - volH;

  // ── State (refs for perf-critical values) ─────────────────────────────────
  const [tf,        setTf]       = useState("5m");
  const [loading,   setLoading]  = useState(true);
  const [tick,      setTick]     = useState(0);   // force re-render
  const [crossIdx,  setCrossIdx] = useState<number | null>(null);

  const candlesRef   = useRef<Candle[]>([]);
  const visRef       = useRef(DEFAULT_VISIBLE);   // visible count
  const offsetRef    = useRef(0);                 // candles from right end
  const wsRef        = useRef<WebSocket | null>(null);
  const destroyedRef = useRef(false);

  const redraw = useCallback(() => {
    if (!destroyedRef.current) setTick(t => t + 1);
  }, []);

  // ── Data loading ──────────────────────────────────────────────────────────
  const load = useCallback(async (sym: string, tf: string) => {
    destroyedRef.current = false;
    setLoading(true);
    setCrossIdx(null);
    wsRef.current?.close();
    wsRef.current = null;

    const binSym     = toBinSym(sym);
    const binInterval = TIMEFRAMES.find(t => t.label === tf)?.interval ?? "5m";

    // REST: historical candles
    try {
      const res  = await fetch(
        `https://data-api.binance.vision/api/v3/klines?symbol=${binSym}&interval=${binInterval}&limit=500`
      );
      const data = await res.json();
      if (Array.isArray(data) && !destroyedRef.current) {
        candlesRef.current = data.map((d: any[]) => ({
          time:   Math.floor(d[0] / 1000),
          open:   +d[1], high: +d[2], low: +d[3], close: +d[4], volume: +d[5],
        }));
        offsetRef.current = 0;
        if (onPrice && candlesRef.current.length) {
          onPrice(candlesRef.current[candlesRef.current.length - 1].close);
        }
        setLoading(false);
        redraw();
      }
    } catch {
      if (!destroyedRef.current) setLoading(false);
    }

    // WebSocket: live candle updates
    if (destroyedRef.current) return;
    const ws = new WebSocket(
      `wss://data-stream.binance.vision/ws/${binSym.toLowerCase()}@kline_${binInterval}`
    );
    wsRef.current = ws;
    ws.onmessage = (evt) => {
      if (destroyedRef.current) return;
      const k  = JSON.parse(evt.data).k;
      const nc: Candle = {
        time: Math.floor(k.t / 1000),
        open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v,
      };
      const arr = candlesRef.current;
      if (arr.length && arr[arr.length - 1].time === nc.time) {
        arr[arr.length - 1] = nc;
      } else {
        arr.push(nc);
        if (arr.length > 1000) arr.shift();
        // keep view pinned to right edge while following live
        if (offsetRef.current === 0) redraw();
      }
      if (offsetRef.current === 0) redraw();
      if (onPrice) onPrice(nc.close);
    };
    ws.onerror = () => {};
  }, [onPrice, redraw]);

  useEffect(() => {
    load(symbol, tf);
    return () => {
      destroyedRef.current = true;
      wsRef.current?.close();
    };
  }, [symbol, tf, load]);

  // ── Gesture (PanResponder — no extra packages needed) ────────────────────
  const gState = useRef({ mode: "none" as "none" | "pan" | "pinch", prevX: 0, prevDist: 0 });

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder:       () => true,
    onMoveShouldSetPanResponder:        () => true,
    onStartShouldSetPanResponderCapture: () => false,

    onPanResponderGrant: (evt) => {
      const t = evt.nativeEvent.touches;
      if (t.length >= 2) {
        const dx = t[1].pageX - t[0].pageX;
        const dy = t[1].pageY - t[0].pageY;
        gState.current = { mode: "pinch", prevX: 0, prevDist: Math.hypot(dx, dy) };
      } else {
        gState.current = { mode: "pan", prevX: t[0].pageX, prevDist: 0 };
      }
    },

    onPanResponderMove: (evt) => {
      const t  = evt.nativeEvent.touches;
      const gs = gState.current;

      if (t.length >= 2 && gs.mode === "pinch") {
        const dx   = t[1].pageX - t[0].pageX;
        const dy   = t[1].pageY - t[0].pageY;
        const dist = Math.hypot(dx, dy);
        if (gs.prevDist > 0) {
          const scale = dist / gs.prevDist;
          if (Math.abs(scale - 1) > 0.01) {
            const next = Math.round(visRef.current / scale);
            visRef.current = Math.max(MIN_VISIBLE, Math.min(MAX_VISIBLE, next));
            gs.prevDist = dist;
            redraw();
          }
        } else {
          gs.prevDist = dist;
        }

      } else if (t.length === 1 && gs.mode === "pan") {
        const dx      = t[0].pageX - gs.prevX;
        const candleW = PLOT_W / visRef.current;
        const delta   = Math.round(-dx / candleW);
        if (delta !== 0) {
          const total    = candlesRef.current.length;
          const maxOff   = Math.max(0, total - visRef.current);
          offsetRef.current = Math.max(0, Math.min(maxOff, offsetRef.current + delta));
          gs.prevX = t[0].pageX;
          setCrossIdx(null);
          redraw();
        }
      }
    },

    onPanResponderRelease: () => { gState.current.mode = "none"; },
  }), [PLOT_W, redraw]);

  // ── Computed values for render ────────────────────────────────────────────
  const allCandles = candlesRef.current;
  const total      = allCandles.length;
  const vc         = Math.min(visRef.current, total);
  const endIdx     = total - offsetRef.current;
  const startIdx   = Math.max(0, endIdx - vc);
  const vis        = allCandles.slice(startIdx, endIdx);

  // Price range
  let minP = Infinity, maxP = -Infinity, maxVol = 1;
  for (const c of vis) {
    if (c.low  < minP) minP = c.low;
    if (c.high > maxP) maxP = c.high;
    if (c.volume > maxVol) maxVol = c.volume;
  }
  if (!vis.length) { minP = 0; maxP = 1; }
  const pPad  = (maxP - minP) * 0.08;
  minP -= pPad; maxP += pPad;
  const pRange = maxP - minP || 1;

  function toY(price: number): number {
    return priceH - ((price - minP) / pRange) * priceH;
  }
  function toVolY(vol: number): number {
    return volH - (vol / maxVol) * volH * 0.88;
  }

  const candleW = vis.length > 0 ? PLOT_W / vis.length : 8;
  const bodyW   = Math.max(1, candleW * 0.7);

  // Grid lines (5 horizontal)
  const gridLevels = Array.from({ length: 5 }, (_, i) => {
    const price = minP + (pRange * (i / 4));
    return { price, y: toY(price) };
  });

  // Time labels (~6 evenly spaced)
  const timeLabelStep = Math.max(1, Math.floor(vis.length / 6));
  const timeLabels = vis
    .filter((_, i) => i % timeLabelStep === 0)
    .map((c, j) => ({
      x:     (j * timeLabelStep + 0.5) * candleW,
      label: fmtTime(c.time, TIMEFRAMES.find(t => t.label === tf)?.interval ?? "5m"),
    }));

  const lastCandle = vis.length ? vis[vis.length - 1] : null;
  const xhCandle   = crossIdx !== null && vis[crossIdx] ? vis[crossIdx] : null;

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.root, { height, width: SW }]}>
        {/* Timeframe bar still shows */}
        <View style={[styles.tfBar, { borderBottomColor: C.border }]}>
          {TIMEFRAMES.map(t => (
            <TouchableOpacity key={t.label} onPress={() => setTf(t.label)}
              style={[styles.tfBtn, tf === t.label && styles.tfBtnActive]}>
              <Text style={[styles.tfText, tf === t.label && { color: C.bull }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.loadWrap}>
          <ActivityIndicator color={C.bull} size="small" />
          <Text style={styles.loadText}>Loading chart…</Text>
        </View>
      </View>
    );
  }

  // ── Chart ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { height, width: SW }]}>

      {/* Timeframe + OHLCV bar */}
      <View style={[styles.tfBar, { borderBottomColor: C.border }]}>
        {TIMEFRAMES.map(t => (
          <TouchableOpacity key={t.label} onPress={() => setTf(t.label)}
            style={[styles.tfBtn, tf === t.label && styles.tfBtnActive]}>
            <Text style={[styles.tfText, tf === t.label && { color: C.bull }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
        {xhCandle && (
          <Text style={styles.ohlcvText} numberOfLines={1}>
            <Text style={{ color: xhCandle.close >= xhCandle.open ? C.bull : C.bear }}>
              {`O:${fmtPrice(xhCandle.open)} H:${fmtPrice(xhCandle.high)} L:${fmtPrice(xhCandle.low)} C:${fmtPrice(xhCandle.close)}`}
            </Text>
          </Text>
        )}
        {!xhCandle && lastCandle && (
          <Text style={[styles.ohlcvText, { color: lastCandle.close >= lastCandle.open ? C.bull : C.bear }]} numberOfLines={1}>
            {fmtPrice(lastCandle.close)}
          </Text>
        )}
      </View>

      {/* Chart canvas */}
      <View {...panResponder.panHandlers} style={{ width: SW, height: chartH }}>
        <Svg width={SW} height={chartH}>
          <Defs>
            <LinearGradient id="volGreen" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={C.bull} stopOpacity="0.5" />
              <Stop offset="100%" stopColor={C.bull} stopOpacity="0.05" />
            </LinearGradient>
            <LinearGradient id="volRed" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={C.bear} stopOpacity="0.5" />
              <Stop offset="100%" stopColor={C.bear} stopOpacity="0.05" />
            </LinearGradient>
          </Defs>

          {/* ── Price pane ── */}
          <G>
            {/* Horizontal grid lines + price labels */}
            {gridLevels.map((gl, i) => (
              <G key={i}>
                <Line
                  x1={0} y1={gl.y} x2={PLOT_W} y2={gl.y}
                  stroke={C.border} strokeWidth={0.5}
                />
                <SvgText
                  x={PLOT_W + 4} y={gl.y + 4}
                  fontSize={9} fill={C.text}
                >
                  {fmtPrice(gl.price)}
                </SvgText>
              </G>
            ))}

            {/* Candles */}
            {vis.map((c, i) => {
              const isBull = c.close >= c.open;
              const col    = isBull ? C.bull : C.bear;
              const cx     = (i + 0.5) * candleW;
              const bTop   = toY(Math.max(c.open, c.close));
              const bBot   = toY(Math.min(c.open, c.close));
              const bH     = Math.max(1, bBot - bTop);
              return (
                <G key={c.time}>
                  {/* Upper wick */}
                  <Line x1={cx} y1={toY(c.high)} x2={cx} y2={bTop} stroke={col} strokeWidth={1} />
                  {/* Body */}
                  <Rect
                    x={cx - bodyW / 2} y={bTop} width={bodyW} height={bH}
                    fill={isBull ? col : "none"}
                    stroke={col} strokeWidth={isBull ? 0 : 0.8}
                  />
                  {/* Lower wick */}
                  <Line x1={cx} y1={bBot} x2={cx} y2={toY(c.low)} stroke={col} strokeWidth={1} />
                </G>
              );
            })}

            {/* Current price dashed line + label */}
            {lastCandle && (() => {
              const py     = toY(lastCandle.close);
              const isBull = lastCandle.close >= lastCandle.open;
              const col    = isBull ? C.bull : C.bear;
              return (
                <G>
                  <Line
                    x1={0} y1={py} x2={PLOT_W} y2={py}
                    stroke={col} strokeWidth={0.6}
                    strokeDasharray="3 2"
                  />
                  <Rect
                    x={PLOT_W + 2} y={py - 8}
                    width={PRICE_AXIS_W - 4} height={16}
                    rx={3} fill={col}
                  />
                  <SvgText
                    x={PLOT_W + PRICE_AXIS_W / 2} y={py + 4}
                    fontSize={9} fill="#fff" textAnchor="middle" fontWeight="bold"
                  >
                    {fmtPrice(lastCandle.close)}
                  </SvgText>
                </G>
              );
            })()}

            {/* Crosshair */}
            {crossIdx !== null && xhCandle && (() => {
              const cx = (crossIdx + 0.5) * candleW;
              const py = toY(xhCandle.close);
              return (
                <G>
                  <Line x1={cx} y1={0} x2={cx} y2={priceH} stroke={C.cross} strokeWidth={0.5} strokeDasharray="3 3" />
                  <Line x1={0} y1={py} x2={PLOT_W} y2={py} stroke={C.cross} strokeWidth={0.5} strokeDasharray="3 3" />
                </G>
              );
            })()}
          </G>

          {/* ── Volume separator ── */}
          <Line x1={0} y1={priceH} x2={SW} y2={priceH} stroke={C.border} strokeWidth={0.5} />

          {/* ── Volume pane ── */}
          <G y={priceH}>
            {vis.map((c, i) => {
              const isBull = c.close >= c.open;
              const cx     = (i + 0.5) * candleW;
              const vTop   = toVolY(c.volume);
              const vH     = Math.max(1, volH - vTop);
              return (
                <Rect
                  key={c.time}
                  x={cx - bodyW / 2} y={vTop}
                  width={bodyW} height={vH}
                  fill={isBull ? C.bull + "55" : C.bear + "55"}
                />
              );
            })}
          </G>

          {/* ── Time axis ── */}
          <G y={priceH + volH}>
            <Line x1={0} y1={0} x2={SW} y2={0} stroke={C.border} strokeWidth={0.5} />
            {timeLabels.map((tl, i) => (
              <SvgText key={i} x={tl.x} y={16} fontSize={9} fill={C.text} textAnchor="middle">
                {tl.label}
              </SvgText>
            ))}
          </G>

          {/* ── Vertical axis separator ── */}
          <Line x1={PLOT_W} y1={0} x2={PLOT_W} y2={priceH + volH} stroke={C.border} strokeWidth={0.5} />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#131722",
    overflow: "hidden",
  },
  tfBar: {
    height: TF_BAR_H,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    backgroundColor: "#1e222d",
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  tfBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 4,
  },
  tfBtnActive: {
    backgroundColor: "#26a69a18",
  },
  tfText: {
    color: "#787b86",
    fontSize: 12,
    fontWeight: "700",
  },
  ohlcvText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
    color: "#d1d4dc",
    paddingLeft: 8,
  },
  loadWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadText: {
    color: "#787b86",
    fontSize: 12,
  },
});
