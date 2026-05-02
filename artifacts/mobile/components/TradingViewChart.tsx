import React, { useEffect, useRef, useState, useCallback } from "react";
import { Platform, View, Text } from "react-native";
import MobileCandleChart from "./MobileCandleChart";

// ─── Theme ───────────────────────────────────────────────────────────────────
const C = {
  bg:      "#131722",
  panel:   "#1e222d",
  border:  "#2a2e39",
  bull:    "#26a69a",
  bear:    "#ef5350",
  text:    "#d1d4dc",
  dim:     "#787b86",
  gold:    "#f0b90b",
  priceLabelBg: "#26a69a",
};

// ─── Constants ────────────────────────────────────────────────────────────────
const TIMEFRAMES = ["1m","3m","5m","15m","30m","1h","2h","4h","1D","1W"];
const TF_BINANCE: Record<string,string> = {
  "1m":"1m","3m":"3m","5m":"5m","15m":"15m","30m":"30m",
  "1h":"1h","2h":"2h","4h":"4h","1D":"1d","1W":"1w",
};

// ─── SVG icon helpers ─────────────────────────────────────────────────────────
function Svg({ children, size=18, viewBox="0 0 24 24" }: { children: React.ReactNode; size?: number; viewBox?: string }) {
  return (
    <svg width={size} height={size} viewBox={viewBox} fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

// Top bar icons
const IcPlus     = () => <Svg><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></Svg>;
const IcCandle   = () => <Svg size={17}><line x1="5" y1="3" x2="5" y2="5"/><rect x="3.5" y="5" width="3" height="6" rx="0.5"/><line x1="5" y1="11" x2="5" y2="14"/><line x1="12" y1="2" x2="12" y2="5"/><rect x="10.5" y="5" width="3" height="9" rx="0.5"/><line x1="12" y1="14" x2="12" y2="17"/><line x1="19" y1="5" x2="19" y2="8"/><rect x="17.5" y="8" width="3" height="5" rx="0.5"/><line x1="19" y1="13" x2="19" y2="16"/></Svg>;
const IcFile     = () => <Svg><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></Svg>;
const IcRect     = () => <Svg><rect x="3" y="3" width="18" height="18" rx="2"/></Svg>;
const IcHex      = () => <Svg><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/></Svg>;
const IcMax      = () => <Svg><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></Svg>;
const IcMin      = () => <Svg><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></Svg>;
// Drawing toolbar icons
const IcFib      = () => <Svg size={16}><line x1="3" y1="5" x2="21" y2="5"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="3" y1="20" x2="21" y2="20"/></Svg>;
const IcForecast = () => <Svg size={16}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="8"/><line x1="22" y1="12" x2="16" y2="12"/></Svg>;
const IcZoomOut  = () => <Svg size={16}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></Svg>;
const IcTextT    = () => <Svg size={16}><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></Svg>;
const IcSmileI   = () => <Svg size={16}><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></Svg>;
const IcCamera   = () => <Svg><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></Svg>;

// Left sidebar icons
const IcCrosshair= () => <Svg size={16}><circle cx="12" cy="12" r="3"/><line x1="12" y1="1" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="1" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="23" y2="12"/></Svg>;
const IcTrend    = () => <Svg size={16}><line x1="3" y1="17" x2="17" y2="4"/><polyline points="10 4 17 4 17 11"/></Svg>;
const IcHLine    = () => <Svg size={16}><line x1="2" y1="7" x2="22" y2="7"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="17" x2="22" y2="17"/></Svg>;
const IcPattern  = () => <Svg size={16}><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="6" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="18" r="1.5" fill="currentColor"/><line x1="5" y1="12" x2="12" y2="6"/><line x1="12" y1="6" x2="19" y2="12"/><line x1="19" y1="12" x2="12" y2="18"/><line x1="12" y1="18" x2="5" y2="12"/></Svg>;
const IcNodes    = () => <Svg size={16}><circle cx="5" cy="12" r="1.5" fill="currentColor" strokeDasharray="0"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/><line x1="5" y1="12" x2="12" y2="7" strokeDasharray="2 2"/><line x1="12" y1="7" x2="19" y2="12" strokeDasharray="2 2"/></Svg>;
const IcBrush    = () => <Svg size={16}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L3 14.67V21h6.33l10.06-10.06a5.5 5.5 0 0 0 0-7.78z"/></Svg>;
const IcRuler    = () => <Svg size={16}><path d="M2 20L20 2"/><line x1="7" y1="17" x2="7" y2="14"/><line x1="10" y1="14" x2="10" y2="11"/><line x1="13" y1="11" x2="13" y2="8"/><line x1="16" y1="8" x2="16" y2="5"/></Svg>;
const IcZoomIn   = () => <Svg size={16}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></Svg>;
const IcMagnet   = () => <Svg size={16}><path d="M6 15A6 6 0 1 0 18 15"/><line x1="6" y1="15" x2="6" y2="20"/><line x1="18" y1="15" x2="18" y2="20"/><line x1="3" y1="20" x2="9" y2="20"/><line x1="15" y1="20" x2="21" y2="20"/></Svg>;
const IcLockEdit = () => <Svg size={16}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/><line x1="15" y1="5" x2="19" y2="9"/><rect x="1" y="15" width="6" height="6" rx="1" strokeWidth="1.4" fill="none"/></Svg>;
const IcLock     = () => <Svg size={16}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Svg>;
const IcEye      = () => <Svg size={16}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line x1="2" y1="2" x2="22" y2="22" strokeWidth="1.6"/></Svg>;
const IcCalendar = () => <Svg size={14}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="7" y1="14" x2="7.01" y2="14"/><line x1="12" y1="14" x2="17" y2="14"/></Svg>;
const IcChevUp   = () => <Svg size={12}><polyline points="18 15 12 9 6 15"/></Svg>;

// ─── Drawing toolbar groups ───────────────────────────────────────────────────
type WToolItem  = { id: string|null; label: string };
type WToolGroup = { id:string; label:string; Icon:()=>React.ReactElement; toggle?:boolean; items:WToolItem[] };
const WEB_TOOL_GROUPS: Array<WToolGroup | "sep"> = [
  { id:"cursor",   label:"Cursor",              Icon:IcCrosshair,
    items:[{id:null,label:"Default cursor"},{id:"crosshair",label:"Crosshair"}]},
  { id:"lines",    label:"Trend Line Tools",    Icon:IcTrend,
    items:[{id:"trendline",label:"Trend line"},{id:"trendline",label:"Ray"},{id:"trendline",label:"Extended line"},{id:"hline",label:"Horizontal line"},{id:"hline",label:"Vertical line"},{id:"trendline",label:"Parallel channel"}]},
  { id:"fib",      label:"Fibonacci Tools",     Icon:IcFib,
    items:[{id:"trendline",label:"Fib retracement"},{id:"trendline",label:"Fib extension"},{id:"trendline",label:"Fib channel"},{id:"trendline",label:"Pitchfork"},{id:"trendline",label:"Gann box"}]},
  { id:"patterns", label:"Pattern Tools",       Icon:IcPattern,
    items:[{id:"brush",label:"XABCD pattern"},{id:"brush",label:"Triangle pattern"},{id:"brush",label:"Head & shoulders"},{id:"brush",label:"Elliott wave"},{id:"brush",label:"Cypher pattern"}]},
  { id:"forecast", label:"Forecast & Measure",  Icon:IcForecast,
    items:[{id:"ruler",label:"Long position"},{id:"ruler",label:"Short position"},{id:"ruler",label:"Price range"},{id:"ruler",label:"Date range"},{id:"ruler",label:"Risk reward"}]},
  { id:"brush",    label:"Brush Tools",         Icon:IcBrush,
    items:[{id:"brush",label:"Brush"},{id:"brush",label:"Highlighter"},{id:"brush",label:"Curve"},{id:"brush",label:"Arrow marker"}]},
  { id:"text",     label:"Text Tools",          Icon:IcTextT,
    items:[{id:"text",label:"Text"},{id:"text",label:"Note"},{id:"text",label:"Price label"},{id:"text",label:"Callout"}]},
  { id:"emoji",    label:"Emoji & Icons",       Icon:IcSmileI,
    items:[{id:"smile",label:"Emoji"},{id:"smile",label:"Icon marker"},{id:"smile",label:"Flag marker"},{id:"smile",label:"Star marker"}]},
  { id:"ruler",    label:"Ruler Tools",         Icon:IcRuler,
    items:[{id:"ruler",label:"Measure distance"},{id:"ruler",label:"Measure price change"},{id:"ruler",label:"Measure bars count"}]},
  { id:"zoom",     label:"Zoom Tools",          Icon:IcZoomIn,
    items:[{id:"zoom",label:"Zoom in"},{id:"zoom",label:"Zoom out"},{id:null,label:"Reset zoom"}]},
  "sep",
  { id:"magnet",   label:"Magnet Mode",         Icon:IcMagnet, toggle:true,
    items:[{id:"magnet",label:"Strong magnet"},{id:"magnet",label:"Weak magnet"},{id:null,label:"Magnet off"}]},
  { id:"lock",     label:"Lock Drawings",       Icon:IcLock, toggle:true,
    items:[{id:"lock",label:"Lock all drawings"},{id:"lockedit",label:"Lock & edit"},{id:null,label:"Unlock all"}]},
  { id:"eye",      label:"Visibility",          Icon:IcEye, toggle:true,
    items:[{id:"eye",label:"Hide drawings"},{id:"eye",label:"Show drawings"},{id:"clear",label:"Delete all drawings"}]},
];

// ─── Binance helpers ──────────────────────────────────────────────────────────
function toBinanceSymbol(sym: string) {
  const s = sym.replace("/","").toUpperCase();
  return s.endsWith("USDT") ? s : s+"USDT";
}
function toBinanceInterval(tf: string) { return TF_BINANCE[tf] ?? "5m"; }

// ─── UTC+5:30 clock ───────────────────────────────────────────────────────────
function useIST() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
      const ist = new Date(utcMs + 5.5 * 3600000);
      const h = ist.getHours().toString().padStart(2,"0");
      const m = ist.getMinutes().toString().padStart(2,"0");
      const s = ist.getSeconds().toString().padStart(2,"0");
      setTime(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

// ─── Number format ────────────────────────────────────────────────────────────
function fmt(n: number, dp=2) {
  if (!n) return "—";
  if (n >= 1000) return n.toLocaleString("en-US",{minimumFractionDigits:dp,maximumFractionDigits:dp});
  if (n >= 1)    return n.toFixed(dp);
  return n.toFixed(4);
}
function fmtVol(v: number) {
  if (v >= 1e9) return (v/1e9).toFixed(2)+"B";
  if (v >= 1e6) return (v/1e6).toFixed(2)+"M";
  if (v >= 1e3) return (v/1e3).toFixed(2)+"K";
  return v.toFixed(0);
}

// ─── Web Chart ────────────────────────────────────────────────────────────────
function WebChart({ symbol, height }: { symbol: string; height: number }) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const chartRef       = useRef<any>(null);
  const candleRef      = useRef<any>(null);
  const volRef         = useRef<any>(null);
  const wsRef          = useRef<WebSocket | null>(null);
  const tfRef          = useRef("5m");
  const symRef         = useRef(symbol);
  const loadIdRef      = useRef(0);
  const retryDelayRef  = useRef(3000);
  const retryTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef     = useRef(true);

  const [timeframe,    setTfState]    = useState("5m");
  const [showTfMenu,   setShowTf]     = useState(false);
  const [activeTool,   setActiveTool] = useState<string | null>(null);
  const [ohlcv,        setOhlcv]      = useState<{o:number;h:number;l:number;c:number;v:number;ch:number;chp:number}|null>(null);
  const [volCollapsed, setVolCollapsed] = useState(false);
  const [wsStatus,     setWsStatus]   = useState<"connecting"|"live"|"reconnecting"|"error">("connecting");
  const [webDrawings,  setWebDrawings] = useState<any[]>([]);
  const [webCurrent,   setWebCurrent]  = useState<any>(null);
  const [showWebDraw,  setShowWebDraw] = useState(true);
  const [drawTick,     setDrawTick]    = useState(0);  // bumped on chart pan/zoom so hlines repaint
  const [isWebFS,          setIsWebFS]          = useState(false);
  const [openGroup,        setOpenGroup]        = useState<string|null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [submenuTop,       setSubmenuTop]       = useState(0);
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const sidebarRef  = useRef<HTMLDivElement>(null);

  // Track browser fullscreen state
  useEffect(() => {
    const onFSChange = () => setIsWebFS(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const istTime = useIST();

  const TOP    = 42;
  const BOTTOM = 32;
  const LEFT   = 44;
  const chartH = height - TOP - BOTTOM;
  const contentH = chartH;

  // ── init / reinit chart when symbol or timeframe changes ──
  const initChart = useCallback(async (sym: string, tf: string) => {
    if (!containerRef.current) return;

    // Clean up existing
    wsRef.current?.close();
    wsRef.current = null;
    try { chartRef.current?.remove(); } catch {}
    chartRef.current = null;
    candleRef.current = null;
    volRef.current = null;

    const lc = await import("lightweight-charts") as any;
    const { createChart, CrosshairMode, CandlestickSeries, HistogramSeries } = lc;
    if (!containerRef.current) return;

    const el = containerRef.current;
    const containerHeight = el.offsetHeight || (height - TOP - BOTTOM);
    const chart = createChart(el, {
      width: el.offsetWidth || 300,
      height: containerHeight,
      layout: { background: { type: "solid" as any, color: C.bg }, textColor: C.dim },
      grid: { vertLines: { color: C.border }, horzLines: { color: C.border } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#758696", labelBackgroundColor: "#1e222d" },
        horzLine: { color: "#758696", labelBackgroundColor: "#26a69a" },
      },
      rightPriceScale: {
        borderColor: C.border,
        scaleMargins: { top: 0.06, bottom: volCollapsed ? 0.04 : 0.22 },
      },
      timeScale: { borderColor: C.border, timeVisible: true, secondsVisible: false },
      handleScroll: true,
      handleScale: true,
    });
    chartRef.current = chart;

    // Candle series
    const cs = chart.addSeries(CandlestickSeries, {
      upColor: C.bull, downColor: C.bear,
      borderUpColor: C.bull, borderDownColor: C.bear,
      wickUpColor: C.bull, wickDownColor: C.bear,
      lastValueVisible: true,
      priceLineVisible: true,
      priceLineColor: C.bull,
      priceLineStyle: 2, // dashed
      priceLineWidth: 1,
    });
    candleRef.current = cs;

    // Volume series in pane 0 (bottom scale margin)
    if (!volCollapsed) {
      const vs = chart.addSeries(HistogramSeries, {
        priceScaleId: "vol",
        priceFormat: { type: "volume" },
        lastValueVisible: false,
        priceLineVisible: false,
      });
      chart.priceScale("vol").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 }, visible: false,
      });
      volRef.current = vs;
    }

    // Repaint price-based drawings (hlines) when chart scrolls/zooms
    try {
      chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
        if (mountedRef.current) setDrawTick(t => t + 1);
      });
    } catch {}

    // Crosshair move → OHLCV overlay
    chart.subscribeCrosshairMove((param: any) => {
      if (!param?.time || !param?.seriesData) { setOhlcv(null); return; }
      const d = param.seriesData.get(cs);
      if (!d) return;
      const vd = volRef.current ? param.seriesData.get(volRef.current) : null;
      const prevClose = d.open ?? d.close;
      const ch  = d.close - d.open;
      const chp = prevClose ? (ch / prevClose) * 100 : 0;
      setOhlcv({ o: d.open, h: d.high, l: d.low, c: d.close, v: vd?.value ?? 0, ch, chp });
    });

    // ResizeObserver — update width and height on resize
    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        const w = containerRef.current.offsetWidth;
        const h = containerRef.current.offsetHeight || (height - TOP - BOTTOM);
        chartRef.current.applyOptions({ width: w, height: h });
      }
    });
    ro.observe(el);

    // Fetch historical
    const binSym      = toBinanceSymbol(sym);
    const binInterval = toBinanceInterval(tf);
    try {
      const res  = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${binSym}&interval=${binInterval}&limit=500`);
      const data = await res.json();
      if (Array.isArray(data) && candleRef.current) {
        const candles = data.map((d: any[]) => ({
          time:   Math.floor(d[0]/1000) as any,
          open:   +d[1], high: +d[2], low: +d[3], close: +d[4], volume: +d[5],
        }));
        candleRef.current.setData(candles);
        if (volRef.current) {
          volRef.current.setData(candles.map((c: any) => ({
            time: c.time, value: c.volume,
            color: c.close >= c.open ? C.bull+"60" : C.bear+"60",
          })));
        }
        const last = candles[candles.length-1];
        if (last) setOhlcv({ o:last.open, h:last.high, l:last.low, c:last.close, v:last.volume, ch:last.close-last.open, chp:((last.close-last.open)/last.open)*100 });
        chart.timeScale().fitContent();
      }
    } catch {}

    // WebSocket live — with auto-retry and exponential backoff
    const loadId = ++loadIdRef.current;
    retryDelayRef.current = 3000;

    function connectWS() {
      if (!mountedRef.current || loadIdRef.current !== loadId) return;
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
      wsRef.current?.close();
      wsRef.current = null;

      setWsStatus("connecting");
      const ws = new WebSocket(`wss://data-stream.binance.vision/ws/${binSym.toLowerCase()}@kline_${binInterval}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current || loadIdRef.current !== loadId) return;
        setWsStatus("live");
        retryDelayRef.current = 3000;
      };

      ws.onmessage = (evt) => {
        if (!mountedRef.current || loadIdRef.current !== loadId) return;
        try {
          const k = JSON.parse(evt.data).k;
          if (!candleRef.current) return;
          const c = { time: Math.floor(k.t/1000) as any, open:+k.o, high:+k.h, low:+k.l, close:+k.c, volume:+k.v };
          candleRef.current.update(c);
          if (volRef.current) {
            volRef.current.update({ time: c.time, value: c.volume, color: c.close >= c.open ? C.bull+"60" : C.bear+"60" });
          }
        } catch {}
      };

      ws.onerror = () => {
        if (!mountedRef.current || loadIdRef.current !== loadId) return;
        setWsStatus("error");
        // onclose always follows onerror; retry happens there
      };

      ws.onclose = () => {
        if (!mountedRef.current || loadIdRef.current !== loadId) return;
        setWsStatus("reconnecting");
        const delay = retryDelayRef.current;
        retryDelayRef.current = Math.min(delay * 2, 30000);
        retryTimerRef.current = setTimeout(connectWS, delay);
      };
    }

    connectWS();
  }, [volCollapsed]);

  // Reinit on symbol/timeframe change
  useEffect(() => {
    symRef.current = symbol;
    tfRef.current  = timeframe;
    initChart(symbol, timeframe);
    return () => {
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
      wsRef.current?.close();
      wsRef.current = null;
      loadIdRef.current++; // invalidate in-flight connectWS callbacks
      try { chartRef.current?.remove(); } catch {}
      chartRef.current = null;
    };
  }, [symbol, timeframe, initChart]);

  // ── SVG drawing overlay helpers ──────────────────────────────────────────
  const DRAW_TOOLS = new Set(["crosshair","trendline","hline","brush","text","smile","ruler","zoom","pattern","nodes"]);
  const TOGGLE_TOOLS = new Set(["magnet","lockedit","lock","eye"]);
  const isDrawActive = activeTool && DRAW_TOOLS.has(activeTool) && activeTool !== "crosshair";

  function getSvgXY(e: React.MouseEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function handleToolClick(id: string) {
    if (id === "eye")   { setShowWebDraw(v => !v); return; }
    if (id === "clear") { setWebDrawings([]); return; }
    setActiveTool(prev => prev === id ? null : id);
  }
  function isToolActive(id: string) {
    if (id === "eye") return !showWebDraw;
    return activeTool === id;
  }
  function handleSvgDown(e: React.MouseEvent<SVGSVGElement>) {
    const { x, y } = getSvgXY(e);
    if (activeTool === "hline") {
      const price = candleRef.current?.coordinateToPrice(y);
      if (price != null) setWebDrawings(d => [...d, { type:"hline", price }]);
      setActiveTool(null); return;
    }
    if (activeTool === "trendline" || activeTool === "ruler") {
      setWebCurrent({ type: activeTool, x1:x, y1:y, x2:x, y2:y }); return;
    }
    if (activeTool === "brush") {
      setWebCurrent({ type:"brush", pts:[x,y], x1:x, y1:y, x2:x, y2:y }); return;
    }
    if (activeTool === "text") {
      setWebDrawings(d => [...d, { type:"text", x, y }]);
      setActiveTool(null); return;
    }
    if (activeTool === "smile") {
      setWebDrawings(d => [...d, { type:"emoji", x, y }]);
      setActiveTool(null); return;
    }
  }
  function handleSvgMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!webCurrent) return;
    const { x, y } = getSvgXY(e);
    if (webCurrent.type === "brush") {
      setWebCurrent((c:any) => ({ ...c, x2:x, y2:y, pts:[...c.pts,x,y] }));
    } else {
      setWebCurrent((c:any) => ({ ...c, x2:x, y2:y }));
    }
  }
  function handleSvgUp(e: React.MouseEvent<SVGSVGElement>) {
    if (!webCurrent) return;
    const { x, y } = getSvgXY(e);
    const cd = { ...webCurrent, x2:x, y2:y };
    if (cd.type === "brush") {
      if (cd.pts.length > 4) setWebDrawings(d => [...d, { type:"brush", pts:cd.pts }]);
    } else if (cd.type === "ruler") {
      if (Math.abs(cd.y2 - cd.y1) > 4) setWebDrawings(d => [...d, cd]);
    } else {
      if (Math.abs(cd.x2-cd.x1) > 5 || Math.abs(cd.y2-cd.y1) > 5) setWebDrawings(d => [...d, cd]);
    }
    setWebCurrent(null);
    setActiveTool(null);
  }
  function handleFullscreen() {
    const el = wrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  }
  function renderWebDraw(d: any, i: number) {
    void drawTick; // dependency — causes repaint when chart pans so hlines follow price
    if (d.type === "hline") {
      const py = candleRef.current?.priceToCoordinate(d.price);
      if (py == null || py < -10 || py > chartH + 10) return null;
      return (
        <g key={i}>
          <line x1={0} y1={py} x2={9999} y2={py} stroke={C.gold} strokeWidth={1} strokeDasharray="4 2"/>
          <rect x={4} y={py-9} width={82} height={18} rx={3} fill={C.panel} stroke={C.border}/>
          <text x={8} y={py+4} style={{ fontSize:10, fill:C.gold, fontFamily:"monospace" }}>{fmt(d.price,2)}</text>
        </g>
      );
    }
    if (d.type === "trendline")
      return <line key={i} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={C.gold} strokeWidth={1.5}/>;
    if (d.type === "ruler") {
      const mx=(d.x1+d.x2)/2, my=(d.y1+d.y2)/2;
      const p1 = candleRef.current?.coordinateToPrice(d.y1) ?? 0;
      const p2 = candleRef.current?.coordinateToPrice(d.y2) ?? 0;
      const pct = p1 ? ((Math.abs(p2-p1)/Math.abs(p1))*100).toFixed(2) : "0.00";
      return (
        <g key={i}>
          <line x1={Math.min(d.x1,d.x2)} y1={d.y1} x2={Math.max(d.x1,d.x2)} y2={d.y1} stroke={C.gold} strokeWidth={1}/>
          <line x1={d.x2} y1={d.y1} x2={d.x2} y2={d.y2} stroke={C.gold} strokeWidth={1}/>
          <line x1={Math.min(d.x1,d.x2)} y1={d.y2} x2={Math.max(d.x1,d.x2)} y2={d.y2} stroke={C.gold} strokeWidth={1}/>
          <rect x={mx-30} y={my-9} width={60} height={18} rx={3} fill={C.panel} stroke={C.border}/>
          <text x={mx} y={my+4} style={{ fontSize:10, fill:C.gold, textAnchor:"middle" as const }}>{pct}%</text>
        </g>
      );
    }
    if (d.type === "brush") {
      const pts = d.pts as number[];
      if (pts.length < 4) return null;
      let path = "";
      for (let j=0; j<pts.length; j+=2) path += `${j===0?"M":"L"}${pts[j]},${pts[j+1]} `;
      return <path key={i} d={path.trim()} stroke={C.gold} strokeWidth={1.5} fill="none"/>;
    }
    if (d.type === "text")  return <text key={i} x={d.x} y={d.y} style={{ fontSize:14, fill:C.gold, fontWeight:"bold" }}>A</text>;
    if (d.type === "emoji") return <text key={i} x={d.x} y={d.y} style={{ fontSize:18 }}>★</text>;
    return null;
  }
  function renderWebCurrent() {
    if (!webCurrent) return null;
    const cd = webCurrent;
    if (cd.type === "trendline")
      return <line x1={cd.x1} y1={cd.y1} x2={cd.x2} y2={cd.y2} stroke={C.gold} strokeWidth={1} strokeDasharray="4 2"/>;
    if (cd.type === "ruler") return (
      <g>
        <line x1={Math.min(cd.x1,cd.x2)} y1={cd.y1} x2={Math.max(cd.x1,cd.x2)} y2={cd.y1} stroke={C.gold} strokeWidth={1} strokeDasharray="3 2"/>
        <line x1={cd.x2} y1={cd.y1} x2={cd.x2} y2={cd.y2} stroke={C.gold} strokeWidth={1}/>
        <line x1={Math.min(cd.x1,cd.x2)} y1={cd.y2} x2={Math.max(cd.x1,cd.x2)} y2={cd.y2} stroke={C.gold} strokeWidth={1} strokeDasharray="3 2"/>
      </g>
    );
    if (cd.type === "brush") {
      const pts = cd.pts as number[];
      if (pts.length < 4) return null;
      let path = "";
      for (let j=0; j<pts.length; j+=2) path += `${j===0?"M":"L"}${pts[j]},${pts[j+1]} `;
      return <path d={path.trim()} stroke={C.gold} strokeWidth={1.5} fill="none" strokeDasharray="4 2"/>;
    }
    return null;
  }

  function selectTf(tf: string) { setTfState(tf); setShowTf(false); }

  const isPos = (ohlcv?.chp ?? 0) >= 0;
  const ohlcvColor = ohlcv ? (isPos ? C.bull : C.bear) : C.bull;

  return (
    <div ref={wrapperRef} style={{ display:"flex", flexDirection:"column", width:"100%", height: isWebFS ? "100dvh" : height, background:C.bg, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", position:"relative", overflow:"hidden" }}>

      {/* ── Top toolbar ── */}
      <div style={{ height:TOP, display:"flex", alignItems:"center", background:C.panel, borderBottom:`1px solid ${C.border}`, paddingLeft:4, paddingRight:8, gap:2, flexShrink:0 }}>
        {/* + */}
        <TBtn title="Add indicator"><IcPlus/></TBtn>
        <div style={{ width:1, height:22, background:C.border, margin:"0 3px" }}/>

        {/* Timeframe */}
        <div style={{ position:"relative" }}>
          <button onClick={() => setShowTf(v=>!v)} style={{
            background:"none", border:"none", color: showTfMenu ? C.gold : C.text,
            padding:"4px 8px", borderRadius:4, cursor:"pointer",
            fontSize:13, fontWeight:"600", lineHeight:"1",
            backgroundColor: showTfMenu ? C.gold+"18" : "transparent",
          }}>{timeframe}</button>
          {showTfMenu && (
            <div style={{
              position:"absolute", top:32, left:0, zIndex:100,
              background:C.panel, border:`1px solid ${C.border}`,
              borderRadius:6, padding:"4px 0", boxShadow:"0 8px 24px #00000080",
              display:"flex", flexWrap:"wrap", width:130,
            }}>
              {TIMEFRAMES.map(tf=>(
                <button key={tf} onClick={()=>selectTf(tf)} style={{
                  background: timeframe===tf ? C.gold+"22" : "none",
                  border:"none", color: timeframe===tf ? C.gold : C.text,
                  padding:"7px 12px", cursor:"pointer", fontSize:12, fontWeight:"600",
                  width:"50%", textAlign:"left",
                }}>{tf}</button>
              ))}
            </div>
          )}
        </div>

        <div style={{ width:1, height:22, background:C.border, margin:"0 3px" }}/>
        <TBtn title="Candle type"><IcCandle/></TBtn>
        <TBtn title="Indicators"><span style={{fontSize:12,fontWeight:"700",letterSpacing:"-0.5px",color:"inherit"}}>fx</span></TBtn>
        <TBtn title="Templates"><IcFile/></TBtn>
        <TBtn title="Draw rectangle"><IcRect/></TBtn>
        <div style={{ width:1, height:22, background:C.border, margin:"0 3px" }}/>
        <TBtn title="Chart properties"><IcHex/></TBtn>
        <TBtn title={isWebFS ? "Exit Fullscreen" : "Fullscreen"} onClick={handleFullscreen} active={isWebFS}>
          {isWebFS ? <IcMin/> : <IcMax/>}
        </TBtn>
        <TBtn title="Take snapshot"><IcCamera/></TBtn>
      </div>

      {/* ── Body: sidebar + chart ── */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* ── TradingView-style left drawing toolbar ── */}
        <div
          ref={sidebarRef}
          style={{
            width: sidebarCollapsed ? 14 : LEFT,
            background: C.panel, borderRight: `1px solid ${C.border}`,
            display: "flex", flexDirection: "column", alignItems: "center",
            paddingTop: 4, paddingBottom: 6,
            flexShrink: 0, position: "relative", overflow: "visible",
            transition: "width 0.15s ease", zIndex: 10,
          }}
          onMouseLeave={() => setOpenGroup(null)}
        >
          {/* Collapse / expand toggle */}
          <button
            onClick={() => { setSidebarCollapsed(v => !v); setOpenGroup(null); }}
            title={sidebarCollapsed ? "Expand toolbar" : "Collapse toolbar"}
            style={{
              width: sidebarCollapsed ? 14 : 34, height: 22,
              background: "none", border: "none", cursor: "pointer", color: C.dim,
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 2,
            }}
          >
            <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {sidebarCollapsed
                ? <polyline points="9 18 15 12 9 6"/>
                : <polyline points="15 18 9 12 15 6"/>}
            </svg>
          </button>

          {/* Group icon buttons */}
          {!sidebarCollapsed && WEB_TOOL_GROUPS.map((grp, gi) => {
            if (grp === "sep") return (
              <div key={`sep${gi}`} style={{ width:28, height:1, background:C.border, margin:"3px 0" }}/>
            );
            const g = grp as WToolGroup;
            const isGrpActive = g.items.some(it => it.id !== null && it.id !== "clear" && isToolActive(it.id));
            const Icon = g.Icon;
            return (
              <button
                key={g.id}
                title={g.label}
                onMouseEnter={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const sr   = sidebarRef.current?.getBoundingClientRect();
                  setSubmenuTop(rect.top - (sr?.top ?? 0));
                  setOpenGroup(g.id);
                  if (!isGrpActive) (e.currentTarget as HTMLElement).style.color = C.text;
                }}
                onMouseLeave={(e) => {
                  if (!isGrpActive) (e.currentTarget as HTMLElement).style.color = C.dim;
                }}
                style={{
                  width:34, height:32, position:"relative",
                  background: isGrpActive ? C.gold+"22" : "none",
                  border:"none", borderRadius:5, cursor:"pointer",
                  color: isGrpActive ? C.gold : C.dim,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"color .15s,background .15s",
                }}
              >
                <Icon/>
                <svg width={4} height={3} viewBox="0 0 4 3" style={{position:"absolute",right:3,bottom:5}}
                  fill={isGrpActive ? C.gold : "#4a4e5a"}>
                  <polygon points="0,0 4,0 2,3"/>
                </svg>
              </button>
            );
          })}

          {/* Submenu flyout panel */}
          {openGroup && !sidebarCollapsed && (() => {
            const grp = WEB_TOOL_GROUPS.find(g => typeof g === "object" && (g as WToolGroup).id === openGroup) as WToolGroup | undefined;
            if (!grp) return null;
            return (
              <div
                onMouseEnter={() => setOpenGroup(openGroup)}
                style={{
                  position:"absolute", left:LEFT, top:Math.max(4, submenuTop),
                  background:C.panel, border:`1px solid ${C.border}`,
                  borderRadius:6, minWidth:188, zIndex:1000,
                  boxShadow:"0 6px 24px rgba(0,0,0,0.45)",
                  padding:"4px 0",
                }}
              >
                {/* Group label header */}
                <div style={{
                  padding:"5px 12px 5px", fontSize:10, fontWeight:700,
                  color:C.dim, textTransform:"uppercase" as const, letterSpacing:0.6,
                  borderBottom:`1px solid ${C.border}`, marginBottom:2,
                }}>
                  {grp.label}
                </div>
                {/* Sub-tool items */}
                {grp.items.map((item, ii) => {
                  const active = item.id !== null && item.id !== "clear" && isToolActive(item.id);
                  return (
                    <button key={ii}
                      onClick={() => {
                        if (item.id === "clear") { setWebDrawings([]); }
                        else if (item.id !== null) { handleToolClick(item.id); }
                        else { setActiveTool(null); }
                        setOpenGroup(null);
                      }}
                      onMouseEnter={e => {
                        if (!active) (e.currentTarget as HTMLElement).style.background = "#ffffff0d";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = active ? C.gold+"22" : "none";
                      }}
                      style={{
                        display:"flex", alignItems:"center", width:"100%",
                        padding:"7px 12px",
                        background: active ? C.gold+"22" : "none",
                        border:"none", cursor:"pointer",
                        color: active ? C.gold : item.id === "clear" ? C.bear : C.text,
                        fontSize:12, textAlign:"left" as const, gap:8,
                        transition:"background .1s",
                      }}
                    >
                      <span style={{
                        width:6, height:6, borderRadius:"50%", flexShrink:0,
                        background: active ? C.gold : "transparent",
                        border:`1px solid ${active ? C.gold : C.border}`,
                      }}/>
                      {item.label}
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Chart container — explicit height so lightweight-charts can measure */}
        <div style={{ flex:1, position:"relative", overflow:"hidden", height: contentH }}>

          {/* OHLCV overlay */}
          {ohlcv && (
            <div style={{
              position:"absolute", top:6, left:8, zIndex:10,
              display:"flex", alignItems:"center", gap:10,
              fontSize:12, color:C.text, pointerEvents:"none",
              userSelect:"none", lineHeight:"1.3",
            }}>
              <span style={{ color:ohlcvColor, fontWeight:"700", fontSize:14 }}>{fmt(ohlcv.c)}</span>
              <span style={{ color:C.dim }}>
                O <b style={{color:C.text}}>{fmt(ohlcv.o)}</b>
              </span>
              <span style={{ color:C.dim }}>
                H <b style={{color:C.bull}}>{fmt(ohlcv.h)}</b>
              </span>
              <span style={{ color:C.dim }}>
                L <b style={{color:C.bear}}>{fmt(ohlcv.l)}</b>
              </span>
              <span style={{ color:C.dim }}>
                C <b style={{color:C.text}}>{fmt(ohlcv.c)}</b>
              </span>
              {ohlcv.v > 0 && (
                <span style={{ color:C.dim }}>
                  V <b style={{color:C.text}}>{fmtVol(ohlcv.v)}</b>
                </span>
              )}
              <span style={{ color:ohlcvColor, fontWeight:"600" }}>
                {isPos?"+":""}{fmt(ohlcv.ch)} ({isPos?"+":""}{ohlcv.chp.toFixed(2)}%)
              </span>
            </div>
          )}

          {/* Volume label */}
          {!volCollapsed && (
            <div style={{
              position:"absolute", zIndex:10, pointerEvents:"all",
              top: Math.round(chartH * 0.765),
              left:8,
              display:"flex", alignItems:"center", gap:4,
            }}>
              <span style={{ fontSize:11, color:C.dim, userSelect:"none" }}>Volume</span>
              <button onClick={()=>setVolCollapsed(true)} style={{
                background:C.panel, border:`1px solid ${C.border}`,
                borderRadius:3, color:C.dim, cursor:"pointer",
                padding:"1px 5px", display:"flex", alignItems:"center",
              }}>
                <IcChevUp/>
              </button>
            </div>
          )}

          {volCollapsed && (
            <div style={{
              position:"absolute", zIndex:10, bottom:6, left:8,
              display:"flex", alignItems:"center", gap:4,
            }}>
              <span style={{ fontSize:11, color:C.dim, userSelect:"none" }}>Volume</span>
              <button onClick={()=>setVolCollapsed(false)} style={{
                background:C.panel, border:`1px solid ${C.border}`,
                borderRadius:3, color:C.dim, cursor:"pointer",
                padding:"1px 5px", display:"flex", alignItems:"center",
                transform:"rotate(180deg)",
              }}>
                <IcChevUp/>
              </button>
            </div>
          )}

          {/* lightweight-charts mount point — touch-action:none lets lw-charts own all pointer events */}
          <div ref={containerRef} style={{ width:"100%", height:"100%", touchAction:"none" }}/>

          {/* ── SVG drawing overlay ── */}
          <svg
            style={{
              position:"absolute", top:0, left:0, width:"100%", height:"100%", overflow:"visible",
              pointerEvents: isDrawActive ? "all" : "none",
              cursor: isDrawActive ? "crosshair" : "default",
            }}
            onMouseDown={handleSvgDown}
            onMouseMove={handleSvgMove}
            onMouseUp={handleSvgUp}
          >
            {showWebDraw && webDrawings.map((d,i) => renderWebDraw(d,i))}
            {renderWebCurrent()}
          </svg>
          {/* Hint text — HTML positioned over the SVG overlay */}
          {isDrawActive && !webCurrent && (
            <div style={{
              position:"absolute", top:"50%", left:"50%",
              transform:"translate(-50%,-50%)",
              background:C.panel, border:`1px solid ${C.border}`,
              borderRadius:6, padding:"4px 14px",
              fontSize:11, color:C.gold, pointerEvents:"none",
              whiteSpace:"nowrap", zIndex:20,
            }}>
              {activeTool==="trendline"?"Drag to draw line":activeTool==="ruler"?"Drag to measure":activeTool==="brush"?"Drag to draw freehand":"Click to place"}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom status bar ── */}
      <div style={{
        height:BOTTOM, display:"flex", alignItems:"center",
        background:C.panel, borderTop:`1px solid ${C.border}`,
        paddingLeft:8, paddingRight:8, gap:8, flexShrink:0,
        fontSize:12, color:C.dim,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <IcCalendar/>
          <span style={{ color:C.text, fontVariantNumeric:"tabular-nums" }}>{istTime} UTC+5:30</span>
        </div>
        <div style={{ flex:1 }}/>
        {/* WS status badge */}
        <span style={{
          fontSize:10, fontWeight:"700",
          color: wsStatus==="live" ? C.bull : wsStatus==="reconnecting" ? "#f59e0b" : wsStatus==="error" ? C.bear : C.dim,
        }}>
          {wsStatus==="live" ? "● LIVE" : wsStatus==="reconnecting" ? "↻ Reconnecting…" : wsStatus==="error" ? "✕ WS Error" : "○ Connecting…"}
        </span>
        <BotBtn label="%" />
        <BotBtn label="log" />
        <BotBtn label="auto" />
        <TBtn title="Chart settings"><IcHex/></TBtn>
      </div>

      {/* Backdrop for timeframe menu */}
      {showTfMenu && (
        <div onClick={()=>setShowTf(false)} style={{
          position:"fixed", inset:0, zIndex:50,
        }}/>
      )}
    </div>
  );
}

// ── small reusable button ────────────────────────────────────────────────────
function TBtn({ children, title, active, onClick }: { children: React.ReactNode; title?: string; active?: boolean; onClick?: ()=>void }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        background: active ? C.gold+"22" : hov ? "#ffffff12" : "none",
        border:"none", borderRadius:5, cursor:"pointer",
        color: active ? C.gold : hov ? C.text : C.dim,
        width:32, height:32,
        display:"flex", alignItems:"center", justifyContent:"center",
        transition:"color .15s,background .15s", flexShrink:0,
      }}
    >{children}</button>
  );
}

function BotBtn({ label }: { label: string }) {
  const [active, setActive] = React.useState(false);
  return (
    <button
      onClick={()=>setActive(v=>!v)}
      style={{
        background: active ? C.gold+"22" : "none",
        border:`1px solid ${active ? C.gold+"60" : C.border}`,
        borderRadius:3, cursor:"pointer",
        color: active ? C.gold : C.dim,
        padding:"2px 8px", fontSize:12, fontWeight:"600",
        lineHeight:"1.4",
      }}
    >{label}</button>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
export default function TradingViewChart({ symbol = "BTCUSDT", height }: { symbol?: string; height?: number }) {
  const h = height ?? 480;
  if (Platform.OS !== "web") {
    return <MobileCandleChart symbol={symbol} height={h} />;
  }
  return <WebChart symbol={symbol} height={h} />;
}
