/**
 * MobileCandleChart — SVG candlestick chart for React Native + Web
 * • Works on iOS, Android, and browser (react-native-svg runs everywhere in Expo)
 * • Pinch-zoom + pan via PanResponder (no extra native modules)
 * • Live Binance data: REST (500 candles) + WebSocket with auto-retry
 * • WebSocket auto-retry with exponential backoff (3s → 6s → 12s → 30s)
 */
import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, PanResponder, useWindowDimensions,
} from "react-native";
import Svg, { Rect, Line, Text as SvgText, G } from "react-native-svg";

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  bg:     "#131722",
  panel:  "#1e222d",
  border: "#2a2e39",
  bull:   "#26a69a",
  bear:   "#ef5350",
  text:   "#787b86",
  cross:  "#758696",
  warn:   "#f59e0b",
};

// ─── Layout constants ─────────────────────────────────────────────────────────
const PRICE_AXIS_W  = 68;
const TIME_AXIS_H   = 24;
const TF_BAR_H      = 38;
const VOL_RATIO     = 0.20;
const DEFAULT_VIS   = 80;
const MIN_VIS       = 15;
const MAX_VIS       = 400;

const TIMEFRAMES = [
  { label: "1m",  interval: "1m"  },
  { label: "5m",  interval: "5m"  },
  { label: "15m", interval: "15m" },
  { label: "1h",  interval: "1h"  },
  { label: "1D",  interval: "1d"  },
];

type WsStatus = "connecting" | "live" | "reconnecting" | "error";

// ─── Helpers ──────────────────────────────────────────────────────────────────
interface Candle {
  time: number; open: number; high: number;
  low:  number; close: number; volume: number;
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function MobileCandleChart({
  symbol  = "BTCUSDT",
  height  = 340,
  onPrice,
}: {
  symbol?:  string;
  height?:  number;
  onPrice?: (p: number) => void;
}) {
  const { width: SW } = useWindowDimensions();
  const PLOT_W = SW - PRICE_AXIS_W;
  const chartH = height - TF_BAR_H;
  const areaH  = chartH - TIME_AXIS_H;
  const volH   = Math.round(areaH * VOL_RATIO);
  const priceH = areaH - volH;

  // ── State ──────────────────────────────────────────────────────────────────
  const [tf,         setTf]        = useState("5m");
  const [loading,    setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [wsStatus,   setWsStatus]  = useState<WsStatus>("connecting");
  const [tick,       setTick]      = useState(0);
  const [crossIdx,   setCrossIdx]  = useState<number | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const candlesRef    = useRef<Candle[]>([]);
  const visRef        = useRef(DEFAULT_VIS);
  const offsetRef     = useRef(0);
  const wsRef         = useRef<WebSocket | null>(null);
  const retryTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelay    = useRef(3000);
  const loadIdRef     = useRef(0);          // increments on each load call
  const mountedRef    = useRef(true);

  const redraw = useCallback(() => {
    if (mountedRef.current) setTick(t => t + 1);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── WebSocket (extracted so retry can call it independently) ──────────────
  const connectWS = useCallback((loadId: number, binSym: string, binInterval: string) => {
    if (!mountedRef.current || loadIdRef.current !== loadId) return;

    // Clear any pending retry
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }

    // Close stale socket
    wsRef.current?.close();
    wsRef.current = null;

    setWsStatus("connecting");

    const ws = new WebSocket(
      `wss://data-stream.binance.vision/ws/${binSym.toLowerCase()}@kline_${binInterval}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current || loadIdRef.current !== loadId) return;
      setWsStatus("live");
      retryDelay.current = 3000; // reset backoff on success
    };

    ws.onmessage = (evt) => {
      if (!mountedRef.current || loadIdRef.current !== loadId) return;
      try {
        const k  = JSON.parse(evt.data).k;
        const nc: Candle = {
          time:   Math.floor(k.t / 1000),
          open:   +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v,
        };
        const arr = candlesRef.current;
        if (arr.length && arr[arr.length - 1].time === nc.time) {
          arr[arr.length - 1] = nc;
        } else {
          arr.push(nc);
          if (arr.length > 1000) arr.shift();
        }
        if (offsetRef.current === 0) redraw();
        if (onPrice) onPrice(nc.close);
      } catch {}
    };

    ws.onerror = () => {
      if (!mountedRef.current || loadIdRef.current !== loadId) return;
      setWsStatus("error");
      // onerror is always followed by onclose, so retry happens there
    };

    ws.onclose = () => {
      if (!mountedRef.current || loadIdRef.current !== loadId) return;
      setWsStatus("reconnecting");
      const delay = retryDelay.current;
      retryDelay.current = Math.min(delay * 2, 30000); // exponential backoff, cap 30s
      retryTimer.current = setTimeout(() => {
        connectWS(loadId, binSym, binInterval);
      }, delay);
    };
  }, [onPrice, redraw]);

  // ── Load: REST history + start WebSocket ───────────────────────────────────
  const load = useCallback(async (sym: string, selectedTf: string) => {
    const loadId = ++loadIdRef.current;

    // Tear down previous
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    wsRef.current?.close();
    wsRef.current = null;
    retryDelay.current = 3000;

    setLoading(true);
    setFetchError(false);
    setCrossIdx(null);

    const binSym     = toBinSym(sym);
    const binInterval = TIMEFRAMES.find(t => t.label === selectedTf)?.interval ?? "5m";

    // REST: historical candles
    try {
      const res  = await fetch(
        `https://data-api.binance.vision/api/v3/klines?symbol=${binSym}&interval=${binInterval}&limit=500`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Unexpected response");

      if (!mountedRef.current || loadIdRef.current !== loadId) return;

      candlesRef.current = data.map((d: any[]) => ({
        time:   Math.floor(d[0] / 1000),
        open:   +d[1], high: +d[2], low: +d[3], close: +d[4], volume: +d[5],
      }));
      offsetRef.current = 0;
      if (onPrice && candlesRef.current.length) {
        onPrice(candlesRef.current[candlesRef.current.length - 1].close);
      }
      setLoading(false);
      setFetchError(false);
      redraw();
    } catch {
      if (mountedRef.current && loadIdRef.current === loadId) {
        setLoading(false);
        setFetchError(true);
      }
      return; // don't start WS if REST failed
    }

    // WebSocket: live updates
    connectWS(loadId, binSym, binInterval);
  }, [onPrice, redraw, connectWS]);

  useEffect(() => {
    load(symbol, tf);
    return () => {
      // Cleanup: kill WS and timers; don't set mountedRef (that's in its own effect)
      if (retryTimer.current) clearTimeout(retryTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
      loadIdRef.current++; // invalidate in-flight loads
    };
  }, [symbol, tf, load]);

  // ── Gesture: PanResponder for pinch-zoom + pan scroll ─────────────────────
  const gState = useRef({ mode: "none" as "none" | "pan" | "pinch", prevX: 0, prevDist: 0 });

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder:        () => true,
    onMoveShouldSetPanResponder:         () => true,
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
            visRef.current = Math.max(MIN_VIS, Math.min(MAX_VIS, Math.round(visRef.current / scale)));
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
          const total  = candlesRef.current.length;
          const maxOff = Math.max(0, total - visRef.current);
          offsetRef.current = Math.max(0, Math.min(maxOff, offsetRef.current + delta));
          gs.prevX = t[0].pageX;
          setCrossIdx(null);
          redraw();
        }
      }
    },

    onPanResponderRelease: () => { gState.current.mode = "none"; },
  }), [PLOT_W, redraw]);

  // ── Derived chart values ───────────────────────────────────────────────────
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
  const pad    = (maxP - minP) * 0.08;
  minP -= pad; maxP += pad;
  const pRange = maxP - minP || 1;

  const toY    = (p: number) => priceH - ((p - minP) / pRange) * priceH;
  const toVolY = (v: number) => volH   - (v / maxVol) * volH * 0.88;

  const candleW = vis.length > 0 ? PLOT_W / vis.length : 8;
  const bodyW   = Math.max(1, candleW * 0.70);

  const gridLevels = Array.from({ length: 5 }, (_, i) => {
    const price = minP + pRange * (i / 4);
    return { price, y: toY(price) };
  });

  const timeLabelStep = Math.max(1, Math.floor(vis.length / 6));
  const timeLabels    = vis
    .filter((_, i) => i % timeLabelStep === 0)
    .map((c, j) => ({
      x:     (j * timeLabelStep + 0.5) * candleW,
      label: fmtTime(c.time, TIMEFRAMES.find(t => t.label === tf)?.interval ?? "5m"),
    }));

  const lastCandle = vis.length ? vis[vis.length - 1] : null;
  const xhCandle   = crossIdx !== null ? vis[crossIdx] ?? null : null;

  // ── WS status badge config ─────────────────────────────────────────────────
  const wsBadge = wsStatus === "live"
    ? { color: C.bull, label: "● LIVE" }
    : wsStatus === "reconnecting"
    ? { color: C.warn, label: "↻ Reconnecting…" }
    : wsStatus === "error"
    ? { color: C.bear, label: "✕ WS Error" }
    : { color: C.text, label: "○ Connecting…" };

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.root, { height, width: SW }]}>
        <TfBar tf={tf} setTf={setTf} wsStatus={wsStatus} wsBadge={wsBadge} />
        <View style={s.center}>
          <ActivityIndicator color={C.bull} size="small" />
          <Text style={s.dimText}>Loading chart…</Text>
        </View>
      </View>
    );
  }

  // ── Fetch-error screen (shown only when we have no candles at all) ─────────
  if (fetchError && !vis.length) {
    return (
      <View style={[s.root, { height, width: SW }]}>
        <TfBar tf={tf} setTf={setTf} wsStatus={wsStatus} wsBadge={wsBadge} />
        <View style={s.center}>
          <Text style={s.errorIcon}>⚠</Text>
          <Text style={s.errorTitle}>Failed to load chart data</Text>
          <Text style={s.dimText}>Check your internet connection</Text>
          <TouchableOpacity onPress={() => load(symbol, tf)} style={s.retryBtn}>
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main chart ─────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { height, width: SW }]}>

      {/* Timeframe bar + OHLCV/price + WS badge */}
      <TfBar tf={tf} setTf={setTf} wsStatus={wsStatus} wsBadge={wsBadge}>
        {xhCandle ? (
          <Text style={[s.ohlcvText, { color: xhCandle.close >= xhCandle.open ? C.bull : C.bear }]} numberOfLines={1}>
            {`O:${fmtPrice(xhCandle.open)} H:${fmtPrice(xhCandle.high)} L:${fmtPrice(xhCandle.low)} C:${fmtPrice(xhCandle.close)}`}
          </Text>
        ) : lastCandle ? (
          <Text style={[s.ohlcvText, { color: lastCandle.close >= lastCandle.open ? C.bull : C.bear }]} numberOfLines={1}>
            {fmtPrice(lastCandle.close)}
          </Text>
        ) : null}
      </TfBar>

      {/* Reconnecting / fetch-error overlay strip (when we already have data) */}
      {(wsStatus === "reconnecting" || wsStatus === "error") && (
        <View style={s.reconnStrip}>
          <Text style={[s.reconnText, { color: wsStatus === "error" ? C.bear : C.warn }]}>
            {wsStatus === "error"
              ? "WebSocket error · Retrying…"
              : "WebSocket disconnected · Reconnecting…"}
          </Text>
        </View>
      )}
      {fetchError && vis.length > 0 && (
        <View style={s.reconnStrip}>
          <Text style={[s.reconnText, { color: C.warn }]}>Using cached data · </Text>
          <TouchableOpacity onPress={() => load(symbol, tf)}>
            <Text style={[s.reconnText, { color: C.bull }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* SVG chart */}
      <View {...panResponder.panHandlers} style={{ width: SW, height: chartH }}>
        <Svg width={SW} height={chartH}>

          {/* ── Price pane: grid + candles ── */}
          <G>
            {gridLevels.map((gl, i) => (
              <G key={i}>
                <Line x1={0} y1={gl.y} x2={PLOT_W} y2={gl.y} stroke={C.border} strokeWidth={0.5} />
                <SvgText x={PLOT_W + 4} y={gl.y + 4} fontSize={9} fill={C.text}>
                  {fmtPrice(gl.price)}
                </SvgText>
              </G>
            ))}

            {vis.map((c, i) => {
              const isBull = c.close >= c.open;
              const col    = isBull ? C.bull : C.bear;
              const cx     = (i + 0.5) * candleW;
              const bTop   = toY(Math.max(c.open, c.close));
              const bBot   = toY(Math.min(c.open, c.close));
              const bH     = Math.max(1, bBot - bTop);
              return (
                <G key={c.time}>
                  <Line x1={cx} y1={toY(c.high)} x2={cx} y2={bTop} stroke={col} strokeWidth={1} />
                  <Rect
                    x={cx - bodyW / 2} y={bTop} width={bodyW} height={bH}
                    fill={isBull ? col : "none"}
                    stroke={col} strokeWidth={isBull ? 0 : 0.8}
                  />
                  <Line x1={cx} y1={bBot} x2={cx} y2={toY(c.low)} stroke={col} strokeWidth={1} />
                </G>
              );
            })}

            {/* Current price line + label */}
            {lastCandle && (() => {
              const py  = toY(lastCandle.close);
              const col = lastCandle.close >= lastCandle.open ? C.bull : C.bear;
              return (
                <G>
                  <Line x1={0} y1={py} x2={PLOT_W} y2={py} stroke={col} strokeWidth={0.6} strokeDasharray="3 2" />
                  <Rect x={PLOT_W + 2} y={py - 8} width={PRICE_AXIS_W - 4} height={16} rx={3} fill={col} />
                  <SvgText x={PLOT_W + PRICE_AXIS_W / 2} y={py + 4} fontSize={9} fill="#fff" textAnchor="middle" fontWeight="bold">
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

          {/* ── Volume pane ── */}
          <Line x1={0} y1={priceH} x2={SW} y2={priceH} stroke={C.border} strokeWidth={0.5} />
          <G y={priceH}>
            {vis.map((c, i) => {
              const isBull = c.close >= c.open;
              const cx     = (i + 0.5) * candleW;
              const vTop   = toVolY(c.volume);
              return (
                <Rect
                  key={c.time}
                  x={cx - bodyW / 2} y={vTop}
                  width={bodyW} height={Math.max(1, volH - vTop)}
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

          {/* ── Right axis separator ── */}
          <Line x1={PLOT_W} y1={0} x2={PLOT_W} y2={priceH + volH} stroke={C.border} strokeWidth={0.5} />
        </Svg>
      </View>
    </View>
  );
}

// ─── Timeframe bar (shared between loading/error/chart states) ────────────────
function TfBar({
  tf, setTf, wsStatus, wsBadge, children,
}: {
  tf: string;
  setTf: (t: string) => void;
  wsStatus: WsStatus;
  wsBadge: { color: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <View style={[s.tfBar, { borderBottomColor: C.border }]}>
      {TIMEFRAMES.map(t => (
        <TouchableOpacity
          key={t.label}
          onPress={() => setTf(t.label)}
          style={[s.tfBtn, tf === t.label && s.tfBtnActive]}
        >
          <Text style={[s.tfText, tf === t.label && { color: C.bull }]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
      {children ? (
        <View style={{ flex: 1, paddingLeft: 6 }}>{children}</View>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <Text style={[s.wsBadge, { color: wsBadge.color }]}>{wsBadge.label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    backgroundColor: C.bg,
    overflow: "hidden",
  },
  tfBar: {
    height: TF_BAR_H,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    backgroundColor: C.panel,
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
    color: C.text,
    fontSize: 12,
    fontWeight: "700",
  },
  ohlcvText: {
    fontSize: 10,
    fontWeight: "600",
  },
  wsBadge: {
    fontSize: 9,
    fontWeight: "700",
    marginLeft: 4,
  },
  reconnStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 3,
    backgroundColor: "#1e222d",
  },
  reconnText: {
    fontSize: 10,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dimText: {
    color: C.text,
    fontSize: 12,
  },
  errorIcon: {
    fontSize: 24,
    color: C.warn,
  },
  errorTitle: {
    color: "#d1d4dc",
    fontSize: 14,
    fontWeight: "600",
  },
  retryBtn: {
    marginTop: 4,
    backgroundColor: C.bull,
    paddingHorizontal: 24,
    paddingVertical: 9,
    borderRadius: 6,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
