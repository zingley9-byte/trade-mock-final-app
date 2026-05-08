import React, { useEffect, useRef, useState, useCallback } from "react";
import { Platform, View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CandlestickChart from "./CandlestickChart";
import MobileCandleChart from "./MobileCandleChart";
import { Candle } from "@/context/TradingContext";

export type DrawingTool = "hline" | "trendline" | "support" | "resistance" | "fib";

export interface IndicatorConfig {
  ema9: boolean;
  ema20: boolean;
  sma20: boolean;
  bb: boolean;
  rsi: boolean;
  macd: boolean;
  volume: boolean;
}

export interface Props {
  symbol: string;
  symbolType: "crypto";
  timeframe?: string;
  isDark?: boolean;
  height?: number;
  candles?: Candle[];
  onPriceUpdate?: (price: number) => void;
  bullColor?: string;
  bearColor?: string;
  textColor?: string;
  gridColor?: string;
  bgColor?: string;
  chartType?: "candle" | "line" | "area";
  indicators?: IndicatorConfig;
  isFullscreen?: boolean;
  onFullscreenToggle?: () => void;
  drawingTool?: DrawingTool | null;
  onDrawingComplete?: () => void;
  clearDrawingsKey?: number;
}

function buildInterval(tf: string): string {
  const m: Record<string, string> = { "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1h", "1D": "1d" };
  return m[tf] ?? "15m";
}

function calcEMA(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    if (i === period - 1) { result.push(ema); continue; }
    ema = closes[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function calcRSI(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(period).fill(null);
  if (closes.length <= period) return result;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  let avgG = gains / period, avgL = losses / period;
  result.push(100 - 100 / (1 + avgG / (avgL || 0.0001)));
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgG = (avgG * (period - 1) + Math.max(0, d)) / period;
    avgL = (avgL * (period - 1) + Math.max(0, -d)) / period;
    result.push(100 - 100 / (1 + avgG / (avgL || 0.0001)));
  }
  return result;
}

function calcSMA(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    return closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
  });
}

function calcBB(closes: number[], period = 20, mult = 2) {
  const mid = calcSMA(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { upper.push(null); lower.push(null); continue; }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean  = mid[i]!;
    const std   = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    upper.push(mean + mult * std);
    lower.push(mean - mult * std);
  }
  return { mid, upper, lower };
}

function calcMACD(closes: number[], fast = 12, slow = 26, sig = 9) {
  const fk = 2 / (fast + 1), sk = 2 / (slow + 1), sigk = 2 / (sig + 1);
  let fema = closes[0], sema = closes[0];
  const macdLine: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    fema = closes[i] * fk + fema * (1 - fk);
    sema = closes[i] * sk + sema * (1 - sk);
    macdLine.push(i >= slow - 1 ? fema - sema : null);
  }
  const valid = macdLine.filter((v) => v !== null) as number[];
  let sige = valid[0] ?? 0;
  const signalLine: (number | null)[] = new Array(slow - 1).fill(null);
  for (let i = 0; i < valid.length; i++) {
    if (i < sig - 1) { signalLine.push(null); sige = valid[i]; continue; }
    if (i === sig - 1) { sige = valid.slice(0, sig).reduce((a, b) => a + b) / sig; signalLine.push(sige); continue; }
    sige = valid[i] * sigk + sige * (1 - sigk);
    signalLine.push(sige);
  }
  const histogram = macdLine.map((m, i) => {
    const s = signalLine[i];
    return m !== null && s !== null ? m - s : null;
  });
  return { macdLine, signalLine, histogram };
}

type DrawingEntry =
  | { type: "priceline"; seriesRef: any; line: any }
  | { type: "series"; series: any };

interface ChartState {
  chart: any;
  lc: any;
  series: {
    candle: any; vol: any;
    ema9: any; ema20: any; sma20: any;
    bbMid: any; bbUp: any; bbLow: any;
    rsi: any; macdL: any; macdS: any; macdH: any;
  };
  data: any[];
  drawings: DrawingEntry[];
}

function WebChart({
  symbol, symbolType, timeframe = "15m", isDark = true, height = 320,
  onPriceUpdate, chartType = "candle", indicators,
  isFullscreen = false, onFullscreenToggle,
  drawingTool, onDrawingComplete, clearDrawingsKey,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const st = useRef<ChartState>({
    chart: null, lc: null,
    series: { candle: null, vol: null, ema9: null, ema20: null, sma20: null, bbMid: null, bbUp: null, bbLow: null, rsi: null, macdL: null, macdS: null, macdH: null },
    data: [],
    drawings: [],
  });
  const wsRef = useRef<WebSocket | null>(null);
  const ivRef = useRef<any>(null);
  const indicatorsRef = useRef(indicators);
  const drawingToolRef = useRef(drawingTool);
  const drawingClicksRef = useRef<{ time: any; price: number }[]>([]);
  const onDrawingCompleteRef = useRef(onDrawingComplete);
  const [legend, setLegend] = useState<{ o?: string; h?: string; l?: string; c?: string } | null>(null);

  useEffect(() => { indicatorsRef.current = indicators; }, [indicators]);
  useEffect(() => { drawingToolRef.current = drawingTool; drawingClicksRef.current = []; }, [drawingTool]);

  // Disable chart pan/scale while a drawing tool is active (prevents accidental scroll during drawing)
  useEffect(() => {
    if (!st.current.chart) return;
    try {
      st.current.chart.applyOptions({
        handleScroll: !drawingTool,
        handleScale: !drawingTool,
      });
    } catch {}
  }, [drawingTool]);
  useEffect(() => { onDrawingCompleteRef.current = onDrawingComplete; }, [onDrawingComplete]);

  const bg = isDark ? "#0b0e17" : "#ffffff";
  const tc = isDark ? "#94a3b8" : "#374151";
  const gc = isDark ? "#1e293b" : "#e2e8f0";
  const up = "#00c896", dn = "#ff4d4d";

  const clearDrawings = useCallback(() => {
    const s = st.current;
    if (!s.chart) return;
    for (const d of s.drawings) {
      try {
        if (d.type === "priceline") d.seriesRef.removePriceLine(d.line);
        else s.chart.removeSeries(d.series);
      } catch {}
    }
    s.drawings = [];
  }, []);

  useEffect(() => {
    clearDrawings();
  }, [clearDrawingsKey, clearDrawings]);

  const removeAllIndicators = useCallback(() => {
    const s = st.current;
    if (!s.chart) return;
    (["ema9", "ema20", "sma20", "bbMid", "bbUp", "bbLow", "rsi", "macdL", "macdS", "macdH", "vol"] as const).forEach((k) => {
      if (s.series[k]) { try { s.chart.removeSeries(s.series[k]); } catch {} s.series[k] = null; }
    });
  }, []);

  const syncIndicators = useCallback(() => {
    const s = st.current;
    if (!s.chart || !s.lc || !s.data.length) return;
    const ind = indicatorsRef.current;
    const { LineSeries, HistogramSeries } = s.lc;
    const closes = s.data.map((c: any) => c.close);
    const times  = s.data.map((c: any) => c.time);

    removeAllIndicators();

    const hasVolume = ind?.volume ?? true;
    s.chart.priceScale("right").applyOptions({
      scaleMargins: { top: 0.06, bottom: hasVolume ? 0.22 : 0.04 },
    });

    if (hasVolume) {
      const volSeries = s.chart.addSeries(HistogramSeries, {
        color: "#26a69a50", priceScaleId: "vol",
        priceFormat: { type: "volume" },
      });
      s.chart.priceScale("vol").applyOptions({
        scaleMargins: { top: 0.82, bottom: 0 }, visible: false,
      });
      volSeries.setData(s.data.map((c: any) => ({
        time: c.time, value: c.volume,
        color: c.close >= c.open ? "#26a69a50" : "#ef444450",
      })));
      s.series.vol = volSeries;
    }

    if (ind?.ema9) {
      const series = s.chart.addSeries(LineSeries, {
        color: "#f59e0b", lineWidth: 1, title: "EMA9",
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      series.setData(calcEMA(closes, 9).map((v, i) => ({ time: times[i], value: v })).filter((d: any) => d.value !== null));
      s.series.ema9 = series;
    }

    if (ind?.ema20) {
      const series = s.chart.addSeries(LineSeries, {
        color: "#a78bfa", lineWidth: 1, title: "EMA20",
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      series.setData(calcEMA(closes, 20).map((v, i) => ({ time: times[i], value: v })).filter((d: any) => d.value !== null));
      s.series.ema20 = series;
    }

    if (ind?.sma20) {
      const series = s.chart.addSeries(LineSeries, {
        color: "#38bdf8", lineWidth: 1, title: "SMA20",
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      series.setData(calcSMA(closes, 20).map((v, i) => ({ time: times[i], value: v })).filter((d: any) => d.value !== null));
      s.series.sma20 = series;
    }

    if (ind?.bb) {
      const { mid, upper, lower } = calcBB(closes, 20, 2);
      const bbMid = s.chart.addSeries(LineSeries, {
        color: "#94a3b8", lineWidth: 1, title: "BB Mid",
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      bbMid.setData(mid.map((v, i) => ({ time: times[i], value: v })).filter((d: any) => d.value !== null));
      s.series.bbMid = bbMid;
      const bbUp = s.chart.addSeries(LineSeries, {
        color: "#3b82f660", lineWidth: 1, title: "BB Upper",
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      bbUp.setData(upper.map((v, i) => ({ time: times[i], value: v })).filter((d: any) => d.value !== null));
      s.series.bbUp = bbUp;
      const bbLow = s.chart.addSeries(LineSeries, {
        color: "#3b82f660", lineWidth: 1, title: "BB Lower",
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      bbLow.setData(lower.map((v, i) => ({ time: times[i], value: v })).filter((d: any) => d.value !== null));
      s.series.bbLow = bbLow;
    }

    let nextPane = 1;

    if (ind?.rsi) {
      const series = s.chart.addSeries(LineSeries, {
        color: "#3b82f6", lineWidth: 1.5, title: "RSI(14)",
        priceLineVisible: false, lastValueVisible: true,
      }, nextPane++);
      series.setData(calcRSI(closes, 14).map((v, i) => ({ time: times[i], value: v })).filter((d: any) => d.value !== null));
      series.applyOptions({ priceFormat: { type: "custom", formatter: (p: number) => p.toFixed(1) } });
      s.series.rsi = series;
    }

    if (ind?.macd) {
      const { macdLine, signalLine, histogram } = calcMACD(closes);
      const pane = nextPane++;
      const macdL = s.chart.addSeries(LineSeries, {
        color: "#3b82f6", lineWidth: 1.5, title: "MACD",
        priceLineVisible: false, lastValueVisible: false,
      }, pane);
      macdL.setData(macdLine.map((v, i) => ({ time: times[i], value: v })).filter((d: any) => d.value !== null));
      s.series.macdL = macdL;
      const macdS = s.chart.addSeries(LineSeries, {
        color: "#f59e0b", lineWidth: 1, title: "Signal",
        priceLineVisible: false, lastValueVisible: false,
      }, pane);
      macdS.setData(signalLine.map((v, i) => ({ time: times[i], value: v })).filter((d: any) => d.value !== null));
      s.series.macdS = macdS;
      const macdH = s.chart.addSeries(HistogramSeries, {
        title: "Histogram", priceLineVisible: false, lastValueVisible: false,
      }, pane);
      macdH.setData(
        histogram.map((v, i) => ({
          time: times[i], value: v,
          color: v !== null ? (v >= 0 ? "#26a69a70" : "#ef444470") : "transparent",
        })).filter((d: any) => d.value !== null)
      );
      s.series.macdH = macdH;
    }
  }, [removeAllIndicators]);

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    async function init() {
      const lc = await import("lightweight-charts");
      const { createChart, CrosshairMode, CandlestickSeries, HistogramSeries, LineSeries, AreaSeries, LineStyle } = lc as any;
      if (destroyed || !containerRef.current) return;

      const chart = createChart(containerRef.current, {
        width: containerRef.current.offsetWidth,
        height,
        layout: { background: { type: "solid" as any, color: bg }, textColor: tc },
        grid: { vertLines: { color: gc }, horzLines: { color: gc } },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: gc, scaleMargins: { top: 0.06, bottom: 0.04 } },
        timeScale: { borderColor: gc, timeVisible: true, secondsVisible: false },
        handleScroll: true,
        handleScale: true,
      });

      st.current.chart = chart;
      st.current.lc = lc;

      let mainSeries: any;
      if (chartType === "candle") {
        mainSeries = chart.addSeries(CandlestickSeries, {
          upColor: up, downColor: dn,
          borderUpColor: up, borderDownColor: dn,
          wickUpColor: up, wickDownColor: dn,
        });
      } else if (chartType === "area") {
        mainSeries = chart.addSeries(AreaSeries, {
          lineColor: up, topColor: up + "55", bottomColor: up + "08", lineWidth: 2,
        });
      } else {
        mainSeries = chart.addSeries(AreaSeries, {
          lineColor: up, topColor: "transparent", bottomColor: "transparent", lineWidth: 2,
        });
      }
      st.current.series.candle = mainSeries;

      chart.subscribeCrosshairMove((param: any) => {
        if (!param?.time || !param?.seriesData) { setLegend(null); return; }
        const d = param.seriesData.get(mainSeries);
        if (!d) return;
        if (chartType === "candle") {
          setLegend({ o: d.open?.toFixed(2), h: d.high?.toFixed(2), l: d.low?.toFixed(2), c: d.close?.toFixed(2) });
        } else {
          setLegend({ c: d.value?.toFixed(2) });
        }
      });

      chart.subscribeClick((param: any) => {
        try {
          const tool = drawingToolRef.current;
          if (!tool || !param?.point || !param?.time || !mainSeries) return;
          const price = mainSeries.coordinateToPrice(param.point.y);
          if (price == null || !Number.isFinite(price)) return;
          const time = param.time;

          if (tool === "hline" || tool === "support" || tool === "resistance") {
            const color = tool === "support" ? "#00c896" : tool === "resistance" ? "#ff4d4d" : "#f59e0b";
            const label = tool === "support" ? "S" : tool === "resistance" ? "R" : "HL";
            const pl = mainSeries.createPriceLine({
              price, color, lineWidth: 1,
              lineStyle: LineStyle.Dashed,
              title: label, axisLabelVisible: true,
            });
            st.current.drawings.push({ type: "priceline", seriesRef: mainSeries, line: pl });
            onDrawingCompleteRef.current?.();
          } else if (tool === "trendline") {
            drawingClicksRef.current.push({ time, price });
            if (drawingClicksRef.current.length === 2) {
              const [p1, p2] = drawingClicksRef.current;
              drawingClicksRef.current = [];
              if (String(p1.time) !== String(p2.time)) {
                const trendSeries = chart.addSeries(LineSeries, {
                  color: "#f59e0b", lineWidth: 1.5,
                  priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
                });
                trendSeries.setData([
                  { time: p1.time, value: p1.price },
                  { time: p2.time, value: p2.price },
                ]);
                st.current.drawings.push({ type: "series", series: trendSeries });
              }
              onDrawingCompleteRef.current?.();
            }
          } else if (tool === "fib") {
            drawingClicksRef.current.push({ time, price });
            if (drawingClicksRef.current.length === 2) {
              const [p1, p2] = drawingClicksRef.current;
              drawingClicksRef.current = [];
              const diff = p2.price - p1.price;
              if (Number.isFinite(diff) && diff !== 0) {
                const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
                const fibColors = ["#94a3b8", "#f59e0b", "#10b981", "#3b82f6", "#10b981", "#f59e0b", "#94a3b8"];
                levels.forEach((level, i) => {
                  const fibPrice = p1.price + diff * level;
                  if (!Number.isFinite(fibPrice)) return;
                  const pl = mainSeries.createPriceLine({
                    price: fibPrice,
                    color: fibColors[i],
                    lineWidth: 1,
                    lineStyle: LineStyle.Dotted,
                    title: `Fib ${(level * 100).toFixed(1)}%`,
                    axisLabelVisible: true,
                  });
                  st.current.drawings.push({ type: "priceline", seriesRef: mainSeries, line: pl });
                });
              }
              onDrawingCompleteRef.current?.();
            }
          }
        } catch (e) {
          console.error("[LightweightChart] Drawing click handler error:", e);
          drawingClicksRef.current = [];
        }
      });

      try {
        const ro = new ResizeObserver(() => {
          try {
            if (containerRef.current && chart) {
              chart.applyOptions({ width: containerRef.current.offsetWidth });
            }
          } catch {}
        });
        if (containerRef.current) ro.observe(containerRef.current);
      } catch (e) {
        console.error("[LightweightChart] ResizeObserver unavailable:", e);
      }

      {
        const sym = symbol.replace("/", "").toUpperCase();
        const final = sym.endsWith("USDT") ? sym : sym + "USDT";
        const interval = buildInterval(timeframe);
        try {
          const res = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${final}&interval=${interval}&limit=500`);
          const data = await res.json();
          if (Array.isArray(data) && !destroyed) {
            const candles = data.map((d: any[]) => ({
              time: Math.floor(d[0] / 1000) as any,
              open: +d[1], high: +d[2], low: +d[3], close: +d[4], volume: +d[5],
            }));
            if (chartType === "candle") mainSeries.setData(candles);
            else mainSeries.setData(candles.map((c: any) => ({ time: c.time, value: c.close })));
            st.current.data = candles;
            const last = candles[candles.length - 1];
            if (last && onPriceUpdate) onPriceUpdate(last.close);
            if (!destroyed) syncIndicators();
          }
        } catch {}

        if (!destroyed) {
          const ws = new WebSocket(`wss://data-stream.binance.vision/ws/${final.toLowerCase()}@kline_${interval}`);
          wsRef.current = ws;
          ws.onmessage = (evt) => {
            if (destroyed) return;
            const k = JSON.parse(evt.data).k;
            const c = { time: Math.floor(k.t / 1000) as any, open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v };
            if (chartType === "candle") st.current.series.candle?.update(c);
            else st.current.series.candle?.update({ time: c.time, value: c.close });
            if (st.current.series.vol) {
              st.current.series.vol.update({ time: c.time, value: c.volume, color: c.close >= c.open ? "#26a69a50" : "#ef444450" });
            }
            if (onPriceUpdate) onPriceUpdate(+k.c);
          };
        }
      }
    }

    init();

    return () => {
      destroyed = true;
      wsRef.current?.close();
      if (ivRef.current) clearInterval(ivRef.current);
      try { st.current.chart?.remove(); } catch {}
      st.current = {
        chart: null, lc: null,
        series: { candle: null, vol: null, ema9: null, ema20: null, sma20: null, bbMid: null, bbUp: null, bbLow: null, rsi: null, macdL: null, macdS: null, macdH: null },
        data: [],
        drawings: [],
      };
    };
  }, [symbol, timeframe, symbolType, chartType, height]);

  useEffect(() => {
    if (!st.current.chart) return;
    st.current.chart.applyOptions({
      layout: { background: { type: "solid", color: bg }, textColor: tc },
      grid: { vertLines: { color: gc }, horzLines: { color: gc } },
    });
  }, [isDark]);

  useEffect(() => {
    if (st.current.chart && st.current.data.length) syncIndicators();
  }, [
    indicators?.ema9, indicators?.ema20, indicators?.sma20,
    indicators?.bb, indicators?.rsi, indicators?.macd, indicators?.volume,
    syncIndicators,
  ]);

  const cursorStyle = drawingTool ? "crosshair" : "default";

  const containerStyle: React.CSSProperties = isFullscreen
    ? { position: "fixed", inset: 0, zIndex: 9999, background: bg, display: "flex", flexDirection: "column" }
    : { width: "100%", height, overflow: "hidden", background: bg, position: "relative" };

  const innerStyle: React.CSSProperties = isFullscreen
    ? { flex: 1, width: "100%", cursor: cursorStyle }
    : { width: "100%", height: "100%", cursor: cursorStyle };

  return (
    <div style={containerStyle}>
      {legend && (
        <div style={{
          position: "absolute", top: 6, left: 8, zIndex: 10,
          display: "flex", gap: 10, fontSize: 11, color: tc,
          pointerEvents: "none", fontFamily: "monospace", userSelect: "none",
        }}>
          {legend.o && <span>O <b>{legend.o}</b></span>}
          {legend.h && <span>H <b style={{ color: up }}>{legend.h}</b></span>}
          {legend.l && <span>L <b style={{ color: dn }}>{legend.l}</b></span>}
          {legend.c && <span>C <b>{legend.c}</b></span>}
        </div>
      )}
      {drawingTool && (
        <div style={{
          position: "absolute", top: 6, right: 8, zIndex: 10,
          background: "#f59e0b22", border: "1px solid #f59e0b60",
          borderRadius: 6, padding: "3px 8px", fontSize: 11, color: "#f59e0b",
          pointerEvents: "none", userSelect: "none",
        }}>
          {drawingTool === "trendline" || drawingTool === "fib"
            ? `${drawingTool.toUpperCase()} — click point ${(drawingClicksRef.current?.length ?? 0) + 1}/2`
            : `${drawingTool.toUpperCase()} — click to place`}
        </div>
      )}
      {isFullscreen && onFullscreenToggle && (
        <div style={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}>
          <button
            onClick={onFullscreenToggle}
            style={{ background: "#ffffff18", border: "1px solid #ffffff30", borderRadius: 8, color: "#fff", padding: "6px 10px", cursor: "pointer", fontSize: 12 }}
          >✕ Exit</button>
        </div>
      )}
      <div ref={containerRef} style={innerStyle} />
    </div>
  );
}

export default function LightweightChart(props: Props) {
  const { height = 300, isFullscreen = false, onFullscreenToggle } = props;

  if (Platform.OS === "web") {
    if (isFullscreen) {
      return <WebChart {...props} height={Dimensions.get("window").height} />;
    }
    return <WebChart {...props} />;
  }

  if (isFullscreen) {
    return (
      <Modal visible animationType="slide" onRequestClose={onFullscreenToggle}>
        <View style={{ flex: 1, backgroundColor: "#131722" }}>
          <TouchableOpacity onPress={onFullscreenToggle} style={styles.fsClose}>
            <Ionicons name="close-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <MobileCandleChart
            symbol={props.symbol}
            height={Dimensions.get("window").height - 60}
          />
        </View>
      </Modal>
    );
  }

  return (
    <MobileCandleChart
      symbol={props.symbol}
      height={height}
    />
  );
}

const styles = StyleSheet.create({
  fsClose: {
    position: "absolute", top: 48, right: 16, zIndex: 10,
    backgroundColor: "#ffffff18", borderRadius: 20,
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
  },
});
