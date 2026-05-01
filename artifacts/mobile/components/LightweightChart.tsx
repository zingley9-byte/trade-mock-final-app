import React, { useEffect, useRef } from "react";
import { Platform, View } from "react-native";
import CandlestickChart from "./CandlestickChart";
import { Candle } from "@/context/TradingContext";

interface Props {
  symbol: string;
  symbolType: "crypto" | "indian";
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
  chartType?: "candle" | "line";
}

function buildInterval(tf: string): string {
  const map: Record<string, string> = {
    "1m": "1m", "5m": "5m", "15m": "15m",
    "30m": "30m", "1h": "1h", "1D": "1d",
  };
  return map[tf] ?? "15m";
}

function WebChart({ symbol, symbolType, timeframe = "15m", isDark = true, height = 300, onPriceUpdate }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bg = isDark ? "#0d1117" : "#ffffff";
  const textColor = isDark ? "#94a3b8" : "#374151";
  const gridColor = isDark ? "#1e293b" : "#f1f5f9";
  const up = "#00c896";
  const down = "#ff4d4d";

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;

    async function init() {
      const lc = await import("lightweight-charts");
      const { createChart, CrosshairMode, CandlestickSeries } = lc as any;
      if (destroyed || !containerRef.current) return;

      const chart = createChart(containerRef.current, {
        width: containerRef.current.offsetWidth,
        height,
        layout: {
          background: { type: "solid" as any, color: bg },
          textColor,
        },
        grid: {
          vertLines: { color: gridColor },
          horzLines: { color: gridColor },
        },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: {
          borderColor: gridColor,
          scaleMargins: { top: 0.08, bottom: 0.08 },
        },
        timeScale: {
          borderColor: gridColor,
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: true,
        handleScale: true,
      });

      const series = CandlestickSeries
        ? chart.addSeries(CandlestickSeries, {
            upColor: up, downColor: down,
            borderUpColor: up, borderDownColor: down,
            wickUpColor: up, wickDownColor: down,
          })
        : chart.addCandlestickSeries({
            upColor: up, downColor: down,
            borderUpColor: up, borderDownColor: down,
            wickUpColor: up, wickDownColor: down,
          });

      chartRef.current = chart;
      seriesRef.current = series;

      const observer = new ResizeObserver(() => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: containerRef.current.offsetWidth });
        }
      });
      observer.observe(containerRef.current);

      if (symbolType === "crypto") {
        const binanceSym = symbol.replace("/", "").toUpperCase();
        const finalSym = binanceSym.endsWith("USDT") ? binanceSym : binanceSym + "USDT";
        const interval = buildInterval(timeframe);

        try {
          const res = await fetch(
            `https://data-api.binance.vision/api/v3/klines?symbol=${finalSym}&interval=${interval}&limit=200`
          );
          const data = await res.json();
          if (Array.isArray(data) && !destroyed) {
            const candles = data.map((d: any[]) => ({
              time: Math.floor(d[0] / 1000) as any,
              open: +d[1], high: +d[2], low: +d[3], close: +d[4],
            }));
            series.setData(candles);
            const last = candles[candles.length - 1];
            if (last && onPriceUpdate) onPriceUpdate(last.close);
          }
        } catch {}

        if (!destroyed) {
          const ws = new WebSocket(
            `wss://data-stream.binance.vision/ws/${finalSym.toLowerCase()}@kline_${interval}`
          );
          wsRef.current = ws;
          ws.onmessage = (evt) => {
            const msg = JSON.parse(evt.data);
            const k = msg.k;
            series.update({
              time: Math.floor(k.t / 1000) as any,
              open: +k.o, high: +k.h, low: +k.l, close: +k.c,
            });
            if (onPriceUpdate) onPriceUpdate(+k.c);
          };
        }
      } else {
        const DEMO_BASE: Record<string, number> = {
          NIFTY50: 24500, SENSEX: 80200, BANKNIFTY: 52000, BANKEX: 58000,
        };
        let price = DEMO_BASE[symbol] ?? 24500;
        let demoTime = Math.floor(Date.now() / 1000) - 100 * 60;

        const hist: any[] = [];
        for (let i = 0; i < 100; i++) {
          const open = price;
          const change = (Math.random() - 0.5) * price * 0.003;
          const close = open + change;
          hist.push({
            time: demoTime,
            open, high: Math.max(open, close) + Math.random() * price * 0.001,
            low: Math.min(open, close) - Math.random() * price * 0.001, close,
          });
          price = close;
          demoTime += 60;
        }
        series.setData(hist);
        if (onPriceUpdate) onPriceUpdate(price);

        const iv = setInterval(() => {
          if (destroyed || !seriesRef.current) return;
          const open = price;
          const change = (Math.random() - 0.5) * open * 0.002;
          const close = open + change;
          demoTime += 1;
          seriesRef.current.update({
            time: demoTime as any,
            open, high: Math.max(open, close) + Math.random() * open * 0.0005,
            low: Math.min(open, close) - Math.random() * open * 0.0005, close,
          });
          price = close;
          if (onPriceUpdate) onPriceUpdate(close);
        }, 1000);
        intervalRef.current = iv;
      }
    }

    init();

    return () => {
      destroyed = true;
      wsRef.current?.close();
      if (intervalRef.current) clearInterval(intervalRef.current);
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [symbol, symbolType, timeframe]);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      layout: {
        background: { type: "solid", color: bg },
        textColor,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
    });
  }, [isDark]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height, overflow: "hidden", background: bg }}
    />
  );
}

export default function LightweightChart(props: Props) {
  if (Platform.OS === "web") {
    return <WebChart {...props} />;
  }

  return (
    <View style={{ height: props.height ?? 300, width: "100%" }}>
      <CandlestickChart
        candles={props.candles ?? []}
        height={props.height ?? 300}
        chartType={props.chartType ?? "candle"}
        bullColor={props.bullColor ?? "#00c896"}
        bearColor={props.bearColor ?? "#ff4d4d"}
        textColor={props.textColor ?? "#64748b"}
        gridColor={props.gridColor ?? "rgba(100,116,139,0.15)"}
        bgColor={props.bgColor ?? "transparent"}
      />
    </View>
  );
}
