import React, { useEffect, useRef, useState, useCallback } from "react";
import { Platform, View, Text } from "react-native";
import MobileCandleChart from "./MobileCandleChart";
import NativeWebViewChart from "./NativeWebViewChart";
import LoadingCandleAnimation from "./LoadingCandleAnimation";
import { useTradingContext } from "@/context/TradingContext";

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
const IcLine     = () => <Svg size={17}><polyline points="2 17 7 10 12 13 17 6 22 9"/></Svg>;
const IcFile     = () => <Svg><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></Svg>;
const IcRect     = () => <Svg><rect x="3" y="3" width="18" height="18" rx="2"/></Svg>;
const IcHex      = () => <Svg><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/></Svg>;
const IcMax      = () => <Svg><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></Svg>;
const IcMin      = () => <Svg><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></Svg>;
const IcReset    = () => <Svg><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></Svg>;
const IcCalendar = () => <Svg size={14}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="7" y1="14" x2="7.01" y2="14"/><line x1="12" y1="14" x2="17" y2="14"/></Svg>;
const IcChevUp   = () => <Svg size={12}><polyline points="18 15 12 9 6 15"/></Svg>;

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

// ─── Module-level constants (used by both WebChart render and native touch handlers) ──
const THREE_PT_TOOLS = new Set(["channel","longposition","shortposition"]);

// ─── Web Chart ────────────────────────────────────────────────────────────────
function WebChart({ symbol, height }: { symbol: string; height: number }) {
  const { setIsChartFullscreen } = useTradingContext();
  const containerRef   = useRef<HTMLDivElement>(null);
  const chartRef       = useRef<any>(null);
  const candleRef      = useRef<any>(null);
  const volRef         = useRef<any>(null);
  const wsRef          = useRef<WebSocket | null>(null);
  const tfRef          = useRef("5m");
  const symRef         = useRef(symbol);
  const loadIdRef      = useRef(0);
  const retryDelayRef   = useRef(1000);
  const retryTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stalenessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMsgAtRef    = useRef(0);
  const mountedRef      = useRef(true);
  const rawCandlesRef   = useRef<any[]>([]);
  const chartTypeRef    = useRef<"candle"|"line">("candle");

  const [timeframe,    setTfState]    = useState("5m");
  const [chartType,    setChartType]  = useState<"candle"|"line">("candle");
  const [showTfMenu,   setShowTf]     = useState(false);
  const [activeTool,   setActiveTool] = useState<string | null>(null);
  const [ohlcv,        setOhlcv]      = useState<{o:number;h:number;l:number;c:number;v:number;ch:number;chp:number}|null>(null);
  const [volCollapsed, setVolCollapsed] = useState(false);
  const [wsStatus,     setWsStatus]   = useState<"connecting"|"live"|"reconnecting"|"error">("connecting");
  const [dataLoaded,   setDataLoaded]  = useState(false);
  const [webDrawings,  setWebDrawings] = useState<any[]>([]);
  const [webCurrent,   setWebCurrent]  = useState<any>(null);
  const [showWebDraw,  setShowWebDraw] = useState(true);
  const [drawTick,     setDrawTick]    = useState(0);
  const [selectedDrwId,setSelectedDrwId] = useState<string|null>(null);
  const [drwColor,     setDrwColor]    = useState("#f0b90b");
  const [drwWidth,     setDrwWidth]    = useState(1.5);
  const [floatMenu,    setFloatMenu]   = useState<{x:number;y:number;id:string}|null>(null);
  const [subMenu,      setSubMenu]     = useState<string|null>(null);
  const [openSubGroup, setOpenSubGroup]= useState<string|null>(null);
  const [subGroupY,    setSubGroupY]   = useState(0);
  const [isWebFS,      setIsWebFS]     = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const wrapperRef    = useRef<HTMLDivElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const chartAreaRef  = useRef<HTMLDivElement>(null);
  const activeToolRef = useRef<string|null>(null);
  const webDrawingsRef = useRef<any[]>([]);
  const canvasDataRef = useRef({ webDrawings: [] as any[], webCurrent: null as any, showWebDraw: true, selectedDrwId: null as string|null, drwColor: "#f0b90b", drwWidth: 1.5 });
  const drwCurPts   = useRef<any[]>([]);
  const drwFreehand = useRef<number[]>([]);
  const drwMDown    = useRef(false);
  const drwPreview  = useRef<{x:number;y:number}|null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captureRef  = useRef<HTMLDivElement>(null);
  // Stable refs for drawing color/width — needed by native touch handlers (can't close over state)
  const drwColorRef = useRef("#f0b90b");
  const drwWidthRef = useRef(1.5);
  const DRW_KEY = "tm_drw_v2";

  // Load drawings from localStorage on mount
  useEffect(()=>{
    try { const s=localStorage.getItem(DRW_KEY); if(s) setWebDrawings(JSON.parse(s)); } catch{}
  },[]);
  // Save drawings when they change
  useEffect(()=>{
    try { localStorage.setItem(DRW_KEY, JSON.stringify(webDrawings)); } catch{}
  },[webDrawings]);

  // Sync chart fullscreen state into global context so the tab layout can hide AppHeader / tab bar
  useEffect(() => {
    setIsChartFullscreen(isWebFS);
    return () => { if (isWebFS) setIsChartFullscreen(false); };
  }, [isWebFS]);

  // Track browser fullscreen state (native API) + inject sidebar scroll CSS
  useEffect(() => {
    const onFSChange = () => { if (!document.fullscreenElement) setIsWebFS(false); };
    document.addEventListener("fullscreenchange", onFSChange);
    // Hide scrollbar in the web drawing sidebar
    const style = document.createElement("style");
    style.id = "tm-sidebar-scroll";
    style.textContent = ".tm-web-sidebar::-webkit-scrollbar{display:none;}";
    document.head.appendChild(style);
    return () => {
      document.removeEventListener("fullscreenchange", onFSChange);
      document.getElementById("tm-sidebar-scroll")?.remove();
    };
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

    // Click → select drawings in cursor mode (canvas hit-testing)
    try {
      chart.subscribeClick((param: any) => {
        if (!mountedRef.current) return;
        if (activeToolRef.current && activeToolRef.current !== "cursor") return;
        if (!param.point) { setSelectedDrwId(null); setFloatMenu(null); return; }
        const { x, y } = param.point as { x: number; y: number };
        let found: string | null = null;
        for (const d of webDrawingsRef.current) {
          if (d.visible === false) continue;
          if (hitTestDrawing(d, x, y)) { found = d.id; break; }
        }
        setSelectedDrwId(found);
        if (found) {
          const rect = chartAreaRef.current?.getBoundingClientRect() ?? { left:0, top:0 };
          setFloatMenu({ x: rect.left + x, y: rect.top + Math.max(y - 50, 10), id: found });
        } else {
          setFloatMenu(null);
        }
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
      const res  = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binSym}&interval=${binInterval}&limit=1000`);
      const data = await res.json();
      if (Array.isArray(data) && candleRef.current) {
        const candles = data.map((d: any[]) => ({
          time:   Math.floor(d[0]/1000) as any,
          open:   +d[1], high: +d[2], low: +d[3], close: +d[4], volume: +d[5],
        }));
        rawCandlesRef.current = candles;
        if (chartTypeRef.current === "line") {
          candleRef.current.setData(candles.map((c: any) => ({ time: c.time, value: c.close })));
        } else {
          candleRef.current.setData(candles);
        }
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
    } catch {} finally {
      if (mountedRef.current) setDataLoaded(true);
    }

    // WebSocket live — stable stream.binance.com endpoint, staleness guard, REST fallback
    const loadId = ++loadIdRef.current;
    retryDelayRef.current = 1000;

    function stopPoll() {
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
    }

    function startPoll() {
      stopPoll();
      if (!mountedRef.current || loadIdRef.current !== loadId) return;
      pollTimerRef.current = setInterval(async () => {
        if (!mountedRef.current || loadIdRef.current !== loadId) { stopPoll(); return; }
        try {
          const r = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${binSym}&interval=${binInterval}&limit=2`);
          if (!r.ok) return;
          const data = await r.json();
          if (!Array.isArray(data) || !candleRef.current) return;
          const last = data[data.length - 1];
          const c = { time: Math.floor(last[0]/1000) as any, open:+last[1], high:+last[2], low:+last[3], close:+last[4], volume:+last[5] };
          candleRef.current.update(c);
          if (volRef.current) volRef.current.update({ time: c.time, value: c.volume, color: c.close >= c.open ? C.bull+"60" : C.bear+"60" });
        } catch {}
      }, 3000);
    }

    function armStaleness() {
      if (stalenessTimerRef.current) clearTimeout(stalenessTimerRef.current);
      stalenessTimerRef.current = setTimeout(() => {
        if (!mountedRef.current || loadIdRef.current !== loadId) return;
        // No message for 12 s — force reconnect
        wsRef.current?.close();
      }, 12000);
    }

    function connectWS() {
      if (!mountedRef.current || loadIdRef.current !== loadId) return;
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
      if (stalenessTimerRef.current) { clearTimeout(stalenessTimerRef.current); stalenessTimerRef.current = null; }
      wsRef.current?.close();
      wsRef.current = null;

      setWsStatus("connecting");
      // Use the production stream endpoint (more reliable than data-stream.binance.vision)
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binSym.toLowerCase()}@kline_${binInterval}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current || loadIdRef.current !== loadId) return;
        setWsStatus("live");
        retryDelayRef.current = 1000;
        lastMsgAtRef.current = Date.now();
        stopPoll();
        armStaleness();
      };

      ws.onmessage = (evt) => {
        if (!mountedRef.current || loadIdRef.current !== loadId) return;
        lastMsgAtRef.current = Date.now();
        armStaleness();
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
      };

      ws.onclose = () => {
        if (!mountedRef.current || loadIdRef.current !== loadId) return;
        if (stalenessTimerRef.current) { clearTimeout(stalenessTimerRef.current); stalenessTimerRef.current = null; }
        setWsStatus("reconnecting");
        startPoll();   // keep chart fresh via REST while reconnecting
        const delay = retryDelayRef.current;
        retryDelayRef.current = Math.min(delay * 2, 15000);
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
      setDataLoaded(false);
      if (retryTimerRef.current)   { clearTimeout(retryTimerRef.current);   retryTimerRef.current   = null; }
      if (stalenessTimerRef.current){ clearTimeout(stalenessTimerRef.current); stalenessTimerRef.current = null; }
      if (pollTimerRef.current)    { clearInterval(pollTimerRef.current);    pollTimerRef.current    = null; }
      wsRef.current?.close();
      wsRef.current = null;
      loadIdRef.current++;
      try { chartRef.current?.remove(); } catch {}
      chartRef.current = null;
    };
  }, [symbol, timeframe, initChart]);

  // ── Drawing helpers ───────────────────────────────────────────────────────
  const isDrawActive = !!(activeTool && activeTool !== "cursor" && activeTool !== "delete");
  const WEB_TOOL_GROUPS = [
    { id:"cursor", label:"Cursor", icon:"⊕", items:[] },
    { id:"lines",  label:"Lines",  icon:"⟋", items:[
      {id:"trendline",label:"Trend Line"},{id:"arrow",label:"Arrow"},{id:"ray",label:"Ray"},
      {id:"hline",label:"Horizontal Line"},{id:"vline",label:"Vertical Line"},{id:"channel",label:"Parallel Channel"},
    ]},
    { id:"fib",    label:"Fib",    icon:"≡", items:[{id:"fibretracement",label:"Fib Retracement"}] },
    { id:"shapes", label:"Shapes", icon:"□", items:[{id:"rectangle",label:"Rectangle"},{id:"circle",label:"Circle"}] },
    { id:"brush",  label:"Brush",  icon:"✏", items:[{id:"brush",label:"Brush"},{id:"highlighter",label:"Highlighter"}] },
    { id:"text",   label:"Text",   icon:"T", items:[{id:"text",label:"Text"},{id:"note",label:"Note"},{id:"pricelabel",label:"Price Label"}] },
    { id:"measure",label:"Measure",icon:"⊙", items:[
      {id:"longposition",label:"Long Position"},{id:"shortposition",label:"Short Position"},
      {id:"daterange",label:"Date Range"},{id:"pricerange",label:"Price Range"},
    ]},
  ];
  const WEB_TOGGLE_TOOLS = [
    { id:"hide",   label:"Hide/Show", icon:"👁" },
    { id:"lock",   label:"Lock All",  icon:"🔒" },
    { id:"delete", label:"Delete",    icon:"🗑" },
  ];

  function getToolPts(id: string) {
    for (const g of WEB_TOOL_GROUPS) for (const it of g.items) if (it.id===id) return (it as any).pts ?? 2;
    return 2;
  }

  function getSvgXY(e: { clientX: number; clientY: number }) {
    const rect = chartAreaRef.current?.getBoundingClientRect() ?? {left:0,top:0};
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function svgToData(x: number, y: number) {
    const time = chartRef.current?.timeScale().coordinateToTime(x) ?? null;
    const price = candleRef.current?.coordinateToPrice(y) ?? null;
    return { time, price };
  }
  function dataToSvgXY(price: number, time: number) {
    const x = chartRef.current?.timeScale().timeToCoordinate(time) ?? null;
    const y = candleRef.current?.priceToCoordinate(price) ?? null;
    return { x, y };
  }
  function fmtPrc(p: number) {
    if (p>=10000) return p.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
    if (p>=1) return p.toFixed(4); return p.toFixed(6);
  }
  function genDrwId() { return "drw_"+Date.now()+"_"+Math.random().toString(36).slice(2,6); }

  function handleToolClick(id: string) {
    console.log("[DrawTools] tool selected:", id);
    if (id==="hide") { setShowWebDraw(v=>!v); return; }
    if (id==="lock") {
      setWebDrawings(ds=>{ const allLk=ds.every(d=>d.locked); return ds.map(d=>({...d,locked:!allLk})); });
      return;
    }
    if (id==="delete") {
      setWebDrawings([]); setSelectedDrwId(null); setFloatMenu(null); return;
    }
    setActiveTool(prev => prev===id ? null : id);
    setSelectedDrwId(null); setFloatMenu(null);
    drwCurPts.current=[]; drwFreehand.current=[]; setWebCurrent(null);
    setOpenSubGroup(null);
  }
  async function toggleChartType() {
    if (!chartRef.current || !candleRef.current) return;
    const newType = chartTypeRef.current === "candle" ? "line" : "candle";
    chartTypeRef.current = newType;
    setChartType(newType);
    const lc = await import("lightweight-charts") as any;
    const { CandlestickSeries, LineSeries } = lc;
    try { chartRef.current.removeSeries(candleRef.current); } catch {}
    if (newType === "line") {
      const ls = chartRef.current.addSeries(LineSeries, {
        color: C.bull, lineWidth: 2,
        lastValueVisible: true, priceLineVisible: true,
        priceLineColor: C.bull, priceLineStyle: 2, priceLineWidth: 1,
      });
      ls.setData(rawCandlesRef.current.map((c: any) => ({ time: c.time, value: c.close })));
      candleRef.current = ls;
    } else {
      const cs = chartRef.current.addSeries(CandlestickSeries, {
        upColor: C.bull, downColor: C.bear,
        borderUpColor: C.bull, borderDownColor: C.bear,
        wickUpColor: C.bull, wickDownColor: C.bear,
        lastValueVisible: true, priceLineVisible: true,
        priceLineColor: C.bull, priceLineStyle: 2, priceLineWidth: 1,
      });
      cs.setData(rawCandlesRef.current);
      candleRef.current = cs;
    }
  }

  function handleFullscreen() {
    if (isWebFS) {
      // Exit: try native first, then fall back to CSS fullscreen toggle
      if (document.fullscreenElement) document.exitFullscreen?.();
      else setIsWebFS(false);
      return;
    }
    // Enter: try native fullscreen; if blocked (e.g. iframe), use CSS fullscreen
    const el = wrapperRef.current;
    if (!el) return;
    if (document.fullscreenEnabled) {
      el.requestFullscreen?.().then(() => setIsWebFS(true)).catch(() => setIsWebFS(true));
    } else {
      setIsWebFS(true);
    }
  }

  // ── SVG Pointer handlers — DRAG model ─────────────────────────────────────

  function onSvgPointerDown(e: React.PointerEvent<Element>) {
    console.log("[DrawTools] pointerdown — tool:", activeTool, "pointerId:", e.pointerId);
    if (!activeTool || activeTool==="cursor") { setSelectedDrwId(null); setFloatMenu(null); return; }
    if (activeTool==="delete") return;
    e.preventDefault();
    const {x,y} = getSvgXY(e);

    // Freehand
    if (activeTool==="brush"||activeTool==="highlighter") {
      drwMDown.current=true; drwFreehand.current=[x,y];
      setWebCurrent({type:activeTool,free:[x,y]});
      try { (e.currentTarget as any).setPointerCapture(e.pointerId); } catch(_){}
      return;
    }

    const pt = svgToData(x,y);
    if (pt.price==null) return; // chart not ready

    // 3-point tool awaiting 3rd click
    if (THREE_PT_TOOLS.has(activeTool) && drwCurPts.current.length===2) {
      const newPts=[...drwCurPts.current,pt];
      setWebDrawings(ds=>[...ds,{id:genDrwId(),type:activeTool,pts:newPts,color:drwColor,width:drwWidth,visible:true,locked:false}]);
      drwCurPts.current=[]; setWebCurrent(null); return;
    }

    // Single-click tools
    if (activeTool==="hline") {
      setWebDrawings(ds=>[...ds,{id:genDrwId(),type:"hline",pts:[{price:pt.price,time:pt.time??0}],color:drwColor,width:drwWidth,visible:true,locked:false}]);
      return;
    }
    if (activeTool==="vline") {
      if (!pt.time) return;
      setWebDrawings(ds=>[...ds,{id:genDrwId(),type:"vline",pts:[{price:pt.price,time:pt.time}],color:drwColor,width:drwWidth,visible:true,locked:false}]);
      return;
    }
    if (activeTool==="pricelabel") {
      setWebDrawings(ds=>[...ds,{id:genDrwId(),type:"pricelabel",pts:[{price:pt.price,time:pt.time??0}],color:drwColor,width:drwWidth,visible:true,locked:false}]);
      return;
    }
    if (activeTool==="text"||activeTool==="note") {
      const txt = window.prompt("Enter "+(activeTool==="text"?"text":"note")+":", activeTool==="text"?"Text":"Note");
      if (txt==null) return;
      setWebDrawings(ds=>[...ds,{id:genDrwId(),type:activeTool,pts:[{price:pt.price,time:pt.time??0}],color:drwColor,width:drwWidth,text:txt,visible:true,locked:false}]);
      return;
    }

    // Drag-to-draw: start with 2 identical pts, second updates as mouse moves
    drwMDown.current=true;
    drwCurPts.current=[pt,pt];
    setWebCurrent({type:activeTool,pts:[pt,pt],preview:{x,y}});
    try { (e.currentTarget as any).setPointerCapture(e.pointerId); } catch(_){}
  }

  function onSvgPointerMove(e: React.PointerEvent<Element>) {
    e.preventDefault();
    const {x,y}=getSvgXY(e);

    // Freehand
    if (activeTool==="brush"||activeTool==="highlighter") {
      if (!drwMDown.current) return;
      drwFreehand.current=[...drwFreehand.current,x,y];
      setWebCurrent((c:any)=>c?{...c,free:[...drwFreehand.current]}:null);
      return;
    }

    // Live drag: update second point
    if (drwMDown.current && drwCurPts.current.length>=2) {
      const pt=svgToData(x,y);
      if (pt.price!=null) drwCurPts.current[1]=pt;
      setWebCurrent((c:any)=>c?{...c,pts:[...drwCurPts.current],preview:{x,y}}:null);
      return;
    }

    // 3-pt tool hover preview of 3rd point
    if (!drwMDown.current && activeTool && THREE_PT_TOOLS.has(activeTool) && drwCurPts.current.length===2) {
      setWebCurrent((c:any)=>c?{...c,preview:{x,y}}:null);
    }
  }

  function onSvgPointerUp(e: React.PointerEvent<Element>) {
    if (!drwMDown.current) return;
    drwMDown.current=false;
    const {x,y}=getSvgXY(e);

    // Freehand finish
    if (activeTool==="brush"||activeTool==="highlighter") {
      const fp=drwFreehand.current;
      if (fp.length>=4) {
        const pts:any[]=[];
        for (let i=0;i<fp.length;i+=2) { const pt=svgToData(fp[i],fp[i+1]); if(pt.price!=null) pts.push(pt); }
        if (pts.length>=2) setWebDrawings(ds=>[...ds,{id:genDrwId(),type:activeTool,pts,color:drwColor,width:drwWidth,visible:true,locked:false}]);
      }
      drwFreehand.current=[]; setWebCurrent(null); return;
    }

    // Drag-to-draw finish
    if (drwCurPts.current.length>=2) {
      const pt=svgToData(x,y);
      if (pt.price!=null) drwCurPts.current[1]=pt;
      const pts=drwCurPts.current;

      if (activeTool && THREE_PT_TOOLS.has(activeTool)) {
        // Keep in-progress for 3rd click
        setWebCurrent({type:activeTool,pts:[...pts],preview:null});
      } else {
        // Save if actually dragged
        const svgP1=dataToSvgXY(pts[0].price,pts[0].time);
        const svgP2=dataToSvgXY(pts[1].price,pts[1].time);
        const moved=svgP1.x!=null&&svgP2.x!=null&&(Math.abs((svgP2.x??0)-(svgP1.x??0))>4||Math.abs((svgP2.y??0)-(svgP1.y??0))>4);
        if (moved) {
          setWebDrawings(ds=>[...ds,{id:genDrwId(),type:activeTool,pts:[...pts],color:drwColor,width:drwWidth,visible:true,locked:false}]);
        }
        drwCurPts.current=[]; setWebCurrent(null);
      }
    }
  }

  // Show the float/settings menu for a drawing at a given screen position.
  // Called by both right-click (desktop) and 480ms long-press (touch/mobile).
  function showFloatMenuAt(id: string, x: number, y: number) {
    const d = webDrawings.find(xd => xd.id === id);
    if (!d || d.locked) return;
    setSelectedDrwId(id);
    setFloatMenu({ x, y, id });
  }

  function onDrawingClick(id: string, e: React.MouseEvent) {
    if (activeTool==="delete") { setWebDrawings(ds=>ds.filter(d=>d.id!==id)); return; }
    if (!activeTool||activeTool==="cursor") {
      const d=webDrawings.find(x=>x.id===id); if(!d||d.locked) return;
      setSelectedDrwId(id);
      // Single click: select only (no menu) — right-click / long-press opens the menu
      setFloatMenu(null);
    }
  }
  function onHandlePointerDown(did: string, idx: number, e: React.PointerEvent) {
    e.stopPropagation();
    const d=webDrawings.find(x=>x.id===did); if(!d||d.locked) return;
    setSelectedDrwId(did);
    const onMove=(ev:PointerEvent)=>{
      const rect=chartAreaRef.current?.getBoundingClientRect()??{left:0,top:0};
      const x=ev.clientX-rect.left,y=ev.clientY-rect.top;
      const pt=svgToData(x,y); if(!pt.time&&pt.time!==0) return;
      setWebDrawings(ds=>ds.map(dr=>{
        if(dr.id!==did) return dr;
        const newPts=[...dr.pts];
        if(dr.type==="rectangle"){
          if(idx===0) newPts[0]={price:pt.price,time:pt.time};
          else if(idx===3) newPts[1]={price:pt.price,time:pt.time};
          else if(idx===1) { newPts[0]={...newPts[0],time:pt.time}; newPts[1]={...newPts[1],price:(newPts[0]||{}).price}; }
          else { newPts[0]={...newPts[0],time:pt.time}; if(newPts[1]) newPts[1]={...newPts[1],price:pt.price}; }
        } else if(newPts[idx]!==undefined) newPts[idx]={price:pt.price,time:pt.time};
        return {...dr,pts:newPts};
      }));
    };
    const onUp=()=>{ document.removeEventListener("pointermove",onMove); document.removeEventListener("pointerup",onUp); };
    document.addEventListener("pointermove",onMove); document.addEventListener("pointerup",onUp);
  }

  // ── Canvas drawing system (replaces SVG overlay) ─────────────────────────
  // Sync refs used inside chart.subscribeClick (outside React lifecycle)
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { webDrawingsRef.current = webDrawings; }, [webDrawings]);
  useEffect(() => { drwColorRef.current = drwColor; }, [drwColor]);
  useEffect(() => { drwWidthRef.current = drwWidth; }, [drwWidth]);

  // Disable/enable lw-charts pointer interaction when a drawing tool is active.
  // lw-charts installs native listeners and calls setPointerCapture which would
  // consume our pointer events — blocking the container prevents that entirely.
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.pointerEvents = isDrawActive ? "none" : "";
    }
    if (chartRef.current) {
      try {
        chartRef.current.applyOptions({
          handleScroll: !isDrawActive,
          handleScale:  !isDrawActive,
        });
      } catch (_) {}
    }
    console.log("[DrawTools] isDrawActive:", isDrawActive, "— tool:", activeToolRef.current);
  }, [isDrawActive]);

  // Keep canvasDataRef fresh so renderCanvas() always has latest state
  useEffect(() => {
    canvasDataRef.current = { webDrawings, webCurrent, showWebDraw, selectedDrwId, drwColor, drwWidth };
    renderCanvas();
  }, [webDrawings, webCurrent, showWebDraw, selectedDrwId, drawTick, drwColor, drwWidth]);

  // Native touch handler — {passive:false} required to call preventDefault on mobile browsers.
  // This is BOTH a scroll-prevention fallback AND a full drawing fallback for browsers where
  // React synthetic pointer events are blocked by lw-charts' own native listeners.
  // Touch events call preventDefault which also cancels the corresponding pointer events,
  // so there is no double-firing: touch path runs on mobile, pointer path runs on desktop.
  useEffect(() => {
    const el = captureRef.current;
    if (!el) return;

    function getXY(t: Touch) {
      const rect = chartAreaRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    function toData(x: number, y: number) {
      return {
        time:  chartRef.current?.timeScale().coordinateToTime(x) ?? null,
        price: candleRef.current?.coordinateToPrice(y) ?? null,
      };
    }
    function makeId() { return "drw_"+Date.now()+"_"+Math.random().toString(36).slice(2,6); }

    function onTouchStart(e: TouchEvent) {
      const tool = activeToolRef.current;
      if (!tool || tool === "cursor") return;
      e.preventDefault();
      console.log("[DrawTools] touchstart — tool:", tool);
      const t = e.touches[0]; if (!t) return;
      const { x, y } = getXY(t);
      if (tool === "delete") return;
      if (tool === "brush" || tool === "highlighter") {
        drwMDown.current = true; drwFreehand.current = [x, y];
        setWebCurrent({ type: tool, free: [x, y] });
        console.log("[DrawTools] drawing started (freehand touch)");
        return;
      }
      const pt = toData(x, y);
      if (pt.price == null) return;
      if (tool === "hline") {
        setWebDrawings(ds => [...ds, { id:makeId(), type:"hline", pts:[{ price:pt.price, time:pt.time??0 }], color:drwColorRef.current, width:drwWidthRef.current, visible:true, locked:false }]);
        console.log("[DrawTools] drawing saved (hline touch)"); return;
      }
      if (tool === "vline" && pt.time) {
        setWebDrawings(ds => [...ds, { id:makeId(), type:"vline", pts:[{ price:pt.price, time:pt.time }], color:drwColorRef.current, width:drwWidthRef.current, visible:true, locked:false }]);
        console.log("[DrawTools] drawing saved (vline touch)"); return;
      }
      if (tool === "pricelabel") {
        setWebDrawings(ds => [...ds, { id:makeId(), type:"pricelabel", pts:[{ price:pt.price, time:pt.time??0 }], color:drwColorRef.current, width:drwWidthRef.current, visible:true, locked:false }]);
        console.log("[DrawTools] drawing saved (pricelabel touch)"); return;
      }
      if (THREE_PT_TOOLS.has(tool) && drwCurPts.current.length === 2) {
        const newPts = [...drwCurPts.current, pt];
        setWebDrawings(ds => [...ds, { id:makeId(), type:tool, pts:newPts, color:drwColorRef.current, width:drwWidthRef.current, visible:true, locked:false }]);
        drwCurPts.current = []; setWebCurrent(null);
        console.log("[DrawTools] drawing saved (3pt touch)"); return;
      }
      drwMDown.current = true;
      drwCurPts.current = [pt, pt];
      setWebCurrent({ type: tool, pts: [pt, pt], preview: { x, y } });
      console.log("[DrawTools] drawing started —", tool, "(touch)");
    }

    function onTouchMove(e: TouchEvent) {
      const tool = activeToolRef.current;
      if (!tool || tool === "cursor") return;
      e.preventDefault();
      const t = e.touches[0]; if (!t || !drwMDown.current) return;
      const { x, y } = getXY(t);
      if (tool === "brush" || tool === "highlighter") {
        drwFreehand.current = [...drwFreehand.current, x, y];
        setWebCurrent((c: any) => c ? { ...c, free: [...drwFreehand.current] } : null);
        return;
      }
      if (drwCurPts.current.length >= 2) {
        const pt = toData(x, y);
        if (pt.price != null) drwCurPts.current[1] = pt;
        setWebCurrent((c: any) => c ? { ...c, pts: [...drwCurPts.current], preview: { x, y } } : null);
      }
    }

    function onTouchEnd(e: TouchEvent) {
      const tool = activeToolRef.current;
      if (!tool || tool === "cursor") return;
      if (!drwMDown.current) return;
      e.preventDefault();
      drwMDown.current = false;
      const t = e.changedTouches[0];
      if (!t) { drwFreehand.current = []; setWebCurrent(null); return; }
      const { x, y } = getXY(t);
      // Freehand finish
      if (tool === "brush" || tool === "highlighter") {
        const fp = drwFreehand.current;
        if (fp.length >= 4) {
          const pts: any[] = [];
          for (let i = 0; i < fp.length; i += 2) {
            const p2 = toData(fp[i], fp[i+1]);
            if (p2.price != null) pts.push(p2);
          }
          if (pts.length >= 2) {
            setWebDrawings(ds => [...ds, { id:makeId(), type:tool, pts, color:drwColorRef.current, width:drwWidthRef.current, visible:true, locked:false }]);
            console.log("[DrawTools] drawing saved (freehand touch)");
          }
        }
        drwFreehand.current = []; setWebCurrent(null); return;
      }
      // Drag-to-draw finish
      if (drwCurPts.current.length >= 2) {
        const pt = toData(x, y);
        if (pt.price != null) drwCurPts.current[1] = pt;
        const pts = drwCurPts.current;
        if (THREE_PT_TOOLS.has(tool)) {
          setWebCurrent({ type: tool, pts: [...pts], preview: null });
        } else {
          const sv1 = { x: chartRef.current?.timeScale().timeToCoordinate(pts[0].time) ?? null, y: candleRef.current?.priceToCoordinate(pts[0].price) ?? null };
          const sv2 = { x: chartRef.current?.timeScale().timeToCoordinate(pts[1].time) ?? null, y: candleRef.current?.priceToCoordinate(pts[1].price) ?? null };
          const moved = sv1.x != null && sv2.x != null && (Math.abs((sv2.x??0)-(sv1.x??0)) > 4 || Math.abs((sv2.y??0)-(sv1.y??0)) > 4);
          if (moved) {
            setWebDrawings(ds => [...ds, { id:makeId(), type:tool, pts:[...pts], color:drwColorRef.current, width:drwWidthRef.current, visible:true, locked:false }]);
            console.log("[DrawTools] drawing saved —", tool, "(touch)");
          }
          drwCurPts.current = []; setWebCurrent(null);
        }
      }
    }

    el.addEventListener("touchstart",  onTouchStart, { passive: false });
    el.addEventListener("touchmove",   onTouchMove,  { passive: false });
    el.addEventListener("touchend",    onTouchEnd,   { passive: false });
    el.addEventListener("touchcancel", onTouchEnd,   { passive: false });
    return () => {
      el.removeEventListener("touchstart",  onTouchStart);
      el.removeEventListener("touchmove",   onTouchMove);
      el.removeEventListener("touchend",    onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  // Size canvas pixels to match CSS size (ResizeObserver keeps them in sync)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(() => {
      if (!canvasRef.current) return;
      canvasRef.current.width  = parent.clientWidth;
      canvasRef.current.height = parent.clientHeight;
      renderCanvas();
    });
    ro.observe(parent);
    canvas.width  = parent.clientWidth;
    canvas.height = parent.clientHeight;
    return () => ro.disconnect();
  }, []);

  function renderCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { webDrawings: wds, webCurrent: wc, showWebDraw: swd, selectedDrwId: sid, drwColor: dc, drwWidth: dw } = canvasDataRef.current;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (!swd) return;
    for (const d of wds) { if (d.visible === false) continue; drawOnCanvas(ctx, d, d.id === sid, W, H); }
    if (wc) drawCurrentOnCanvas(ctx, wc, dc, dw, W, H);
  }

  function canvHandle(ctx: CanvasRenderingContext2D, x: number|null, y: number|null) {
    if (x==null||y==null||isNaN(x)||isNaN(y)) return;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2);
    ctx.fillStyle="#fff"; ctx.fill();
    ctx.strokeStyle="#2962FF"; ctx.lineWidth=2; ctx.stroke();
  }

  function drawOnCanvas(ctx: CanvasRenderingContext2D, d: any, sel: boolean, W: number, H: number) {
    const c=d.color||C.gold, lw=d.width||1.5, sc=sel?"#2962FF":c;
    ctx.save(); ctx.lineCap="round"; ctx.lineJoin="round";

    if (d.type==="trendline"||d.type==="arrow"||d.type==="ray") {
      if (!d.pts||d.pts.length<2) { ctx.restore(); return; }
      const p1=dataToSvgXY(d.pts[0].price,d.pts[0].time), p2=dataToSvgXY(d.pts[1].price,d.pts[1].time);
      if (p1.x==null||p2.x==null) { ctx.restore(); return; }
      let x1=p1.x!, y1=p1.y!, x2=p2.x!, y2=p2.y!;
      if (d.type==="ray") { const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy)||1; x2=x1+(dx/len)*6000; y2=y1+(dy/len)*6000; }
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.strokeStyle=sc; ctx.lineWidth=lw; ctx.stroke();
      if (d.type==="arrow") {
        const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy)||1,nx=dx/len,ny=dy/len;
        ctx.beginPath(); ctx.moveTo(x2,y2); ctx.lineTo(x2-nx*12-ny*6,y2-ny*12+nx*6); ctx.lineTo(x2-nx*12+ny*6,y2-ny*12-nx*6);
        ctx.closePath(); ctx.fillStyle=sc; ctx.fill();
      }
      if (sel) { canvHandle(ctx,p1.x,p1.y); canvHandle(ctx,p2.x,p2.y); }
      ctx.restore(); return;
    }

    if (d.type==="hline") {
      if (!d.pts?.length) { ctx.restore(); return; }
      const y=candleRef.current?.priceToCoordinate(d.pts[0].price); if(y==null){ctx.restore();return;}
      ctx.setLineDash([6,3]); ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.strokeStyle=sc; ctx.lineWidth=lw; ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle=C.panel; ctx.strokeStyle=sc; ctx.lineWidth=1;
      ctx.beginPath(); ctx.roundRect(W-84,y-11,80,22,3); ctx.fill(); ctx.stroke();
      ctx.fillStyle=sc; ctx.font="10px monospace"; ctx.textAlign="center"; ctx.fillText(fmtPrc(d.pts[0].price),W-44,y+4);
      if (sel) canvHandle(ctx,W/2,y);
      ctx.restore(); return;
    }

    if (d.type==="vline") {
      if (!d.pts?.length) { ctx.restore(); return; }
      const x=chartRef.current?.timeScale().timeToCoordinate(d.pts[0].time as any); if(x==null){ctx.restore();return;}
      ctx.setLineDash([6,3]); ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.strokeStyle=sc; ctx.lineWidth=lw; ctx.stroke(); ctx.setLineDash([]);
      if (sel) canvHandle(ctx,x,H/2);
      ctx.restore(); return;
    }

    if (d.type==="channel") {
      if (!d.pts||d.pts.length<3) { ctx.restore(); return; }
      const p1=dataToSvgXY(d.pts[0].price,d.pts[0].time),p2=dataToSvgXY(d.pts[1].price,d.pts[1].time),p3=dataToSvgXY(d.pts[2].price,d.pts[2].time);
      if (p1.x==null||p2.x==null||p3.x==null) { ctx.restore(); return; }
      const dyo=p3.y!-p1.y!, q1y=p1.y!+dyo, q2y=p2.y!+dyo;
      ctx.fillStyle=sc+"22"; ctx.beginPath(); ctx.moveTo(p1.x!,p1.y!); ctx.lineTo(p2.x!,p2.y!); ctx.lineTo(p2.x!,q2y); ctx.lineTo(p1.x!,q1y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=sc; ctx.lineWidth=lw;
      ctx.beginPath(); ctx.moveTo(p1.x!,p1.y!); ctx.lineTo(p2.x!,p2.y!); ctx.stroke();
      ctx.setLineDash([5,3]); ctx.beginPath(); ctx.moveTo(p1.x!,q1y); ctx.lineTo(p2.x!,q2y); ctx.stroke(); ctx.setLineDash([]);
      if (sel) { canvHandle(ctx,p1.x,p1.y); canvHandle(ctx,p2.x,p2.y); canvHandle(ctx,p3.x,p3.y); }
      ctx.restore(); return;
    }

    if (d.type==="fibretracement") {
      if (!d.pts||d.pts.length<2) { ctx.restore(); return; }
      const p1=dataToSvgXY(d.pts[0].price,d.pts[0].time),p2=dataToSvgXY(d.pts[1].price,d.pts[1].time);
      if (p1.x==null||p2.x==null) { ctx.restore(); return; }
      const range=d.pts[1].price-d.pts[0].price, x0=Math.min(p1.x!,p2.x!);
      const LEVS=[0,0.236,0.382,0.5,0.618,0.786,1], LCLR=["#26a69a","#f59e0b","#ef5350","#787b86","#3b82f6","#8b5cf6","#26a69a"];
      LEVS.forEach((lv,i)=>{
        const price=d.pts[0].price+range*lv, fy=candleRef.current?.priceToCoordinate(price); if(fy==null)return;
        const lc=sel?"#2962FF":LCLR[i];
        ctx.globalAlpha=0.8; ctx.setLineDash([4,2]); ctx.beginPath(); ctx.moveTo(x0,fy); ctx.lineTo(W,fy);
        ctx.strokeStyle=lc; ctx.lineWidth=1; ctx.stroke(); ctx.globalAlpha=1; ctx.setLineDash([]);
        ctx.fillStyle=lc; ctx.font="9px monospace"; ctx.textAlign="left"; ctx.fillText(`${(lv*100).toFixed(1)}%  ${fmtPrc(price)}`,x0+4,fy-3);
      });
      ctx.beginPath(); ctx.moveTo(p1.x!,p1.y!); ctx.lineTo(p2.x!,p2.y!); ctx.strokeStyle=sc; ctx.lineWidth=lw; ctx.stroke();
      if (sel) { canvHandle(ctx,p1.x,p1.y); canvHandle(ctx,p2.x,p2.y); }
      ctx.restore(); return;
    }

    if (d.type==="brush"||d.type==="highlighter") {
      if (!d.pts||d.pts.length<2) { ctx.restore(); return; }
      const sw=d.type==="highlighter"?10:lw, op=d.type==="highlighter"?0.35:1;
      ctx.globalAlpha=op; ctx.lineWidth=sw; ctx.strokeStyle=sc;
      ctx.beginPath(); const fp=dataToSvgXY(d.pts[0].price,d.pts[0].time); if(fp.x==null){ctx.restore();return;}
      ctx.moveTo(fp.x!,fp.y!);
      for (let i=1;i<d.pts.length;i++){const p=dataToSvgXY(d.pts[i].price,d.pts[i].time);if(p.x!=null)ctx.lineTo(p.x!,p.y!);}
      ctx.stroke(); ctx.restore(); return;
    }

    if (d.type==="rectangle") {
      if (!d.pts||d.pts.length<2) { ctx.restore(); return; }
      const p1=dataToSvgXY(d.pts[0].price,d.pts[0].time),p2=dataToSvgXY(d.pts[1].price,d.pts[1].time);
      if (p1.x==null||p2.x==null) { ctx.restore(); return; }
      const rx=Math.min(p1.x!,p2.x!),ry=Math.min(p1.y!,p2.y!),rw=Math.abs(p2.x!-p1.x!),rh=Math.abs(p2.y!-p1.y!);
      ctx.fillStyle=sc+"22"; ctx.fillRect(rx,ry,rw,rh); ctx.strokeStyle=sc; ctx.lineWidth=lw; ctx.strokeRect(rx,ry,rw,rh);
      if (sel){canvHandle(ctx,p1.x,p1.y);canvHandle(ctx,p2.x,p1.y);canvHandle(ctx,p1.x,p2.y);canvHandle(ctx,p2.x,p2.y);}
      ctx.restore(); return;
    }

    if (d.type==="circle") {
      if (!d.pts||d.pts.length<2) { ctx.restore(); return; }
      const ctr=dataToSvgXY(d.pts[0].price,d.pts[0].time),edg=dataToSvgXY(d.pts[1].price,d.pts[1].time);
      if (ctr.x==null||edg.x==null) { ctx.restore(); return; }
      const r=Math.sqrt((edg.x!-ctr.x!)**2+(edg.y!-ctr.y!)**2);
      ctx.fillStyle=sc+"22"; ctx.beginPath(); ctx.arc(ctr.x!,ctr.y!,r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=sc; ctx.lineWidth=lw; ctx.stroke();
      if (sel){canvHandle(ctx,ctr.x,ctr.y);canvHandle(ctx,edg.x,edg.y);}
      ctx.restore(); return;
    }

    if (d.type==="text") {
      if (!d.pts?.length){ctx.restore();return;}
      const p=dataToSvgXY(d.pts[0].price,d.pts[0].time); if(p.x==null){ctx.restore();return;}
      ctx.font="bold 14px sans-serif"; ctx.fillStyle=sc; ctx.textAlign="left"; ctx.fillText(d.text||"Text",p.x!,p.y!);
      if (sel) canvHandle(ctx,p.x,p.y);
      ctx.restore(); return;
    }

    if (d.type==="note") {
      if (!d.pts?.length){ctx.restore();return;}
      const p=dataToSvgXY(d.pts[0].price,d.pts[0].time); if(p.x==null){ctx.restore();return;}
      const txt=d.text||"Note", bw=Math.max(60,txt.length*7+20);
      ctx.fillStyle=C.panel; ctx.strokeStyle=sc; ctx.lineWidth=1;
      ctx.beginPath(); ctx.roundRect(p.x!,p.y!-22,bw,26,4); ctx.fill(); ctx.stroke();
      ctx.fillStyle=sc; ctx.font="12px sans-serif"; ctx.textAlign="left"; ctx.fillText(txt,p.x!+8,p.y!-5);
      if (sel) canvHandle(ctx,p.x!+bw/2,p.y!-9);
      ctx.restore(); return;
    }

    if (d.type==="pricelabel") {
      if (!d.pts?.length){ctx.restore();return;}
      const p=dataToSvgXY(d.pts[0].price,d.pts[0].time); if(p.x==null){ctx.restore();return;}
      ctx.setLineDash([3,2]); ctx.beginPath(); ctx.moveTo(p.x!,p.y!); ctx.lineTo(W-88,p.y!);
      ctx.strokeStyle=sc; ctx.lineWidth=1; ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle=sc; ctx.beginPath(); ctx.roundRect(W-88,p.y!-11,84,22,3); ctx.fill();
      ctx.fillStyle="#000"; ctx.font="bold 10px monospace"; ctx.textAlign="center"; ctx.fillText(fmtPrc(d.pts[0].price),W-46,p.y!+4);
      if (sel) canvHandle(ctx,p.x,p.y);
      ctx.restore(); return;
    }

    if (d.type==="longposition"||d.type==="shortposition") {
      if (!d.pts||d.pts.length<2){ctx.restore();return;}
      const entry=dataToSvgXY(d.pts[0].price,d.pts[0].time),tgt=dataToSvgXY(d.pts[1].price,d.pts[1].time);
      if (entry.x==null||tgt.x==null){ctx.restore();return;}
      const X=entry.x!, ey=entry.y!, ty=tgt.y!, RW=W-X;
      const profC="#26a69a", lossC="#ef5350", fillC=ty<ey?profC:lossC;
      ctx.fillStyle=fillC+"44"; ctx.fillRect(X,Math.min(ey,ty),RW,Math.abs(ty-ey));
      ctx.strokeStyle="#d1d4dc"; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(X,ey); ctx.lineTo(W,ey); ctx.stroke();
      ctx.strokeStyle=fillC; ctx.beginPath(); ctx.moveTo(X,ty); ctx.lineTo(W,ty); ctx.stroke();
      ctx.font="9px monospace"; ctx.textAlign="left";
      ctx.fillStyle="#d1d4dc"; ctx.fillText("Entry "+fmtPrc(d.pts[0].price),X+6,ey-4);
      ctx.fillStyle=fillC; ctx.fillText("Target "+fmtPrc(d.pts[1].price),X+6,ty+12);
      if (d.pts.length>=3) {
        const stop=dataToSvgXY(d.pts[2].price,d.pts[2].time);
        if (stop.x!=null){
          const sy=stop.y!;
          ctx.fillStyle=lossC+"44"; ctx.fillRect(X,Math.min(ey,sy),RW,Math.abs(sy-ey));
          ctx.strokeStyle=lossC; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(X,sy); ctx.lineTo(W,sy); ctx.stroke();
          ctx.fillStyle=lossC; ctx.fillText("Stop "+fmtPrc(d.pts[2].price),X+6,sy+12);
          if (sel) canvHandle(ctx,stop.x,stop.y);
        }
      }
      if (sel){canvHandle(ctx,entry.x,entry.y);canvHandle(ctx,tgt.x,tgt.y);}
      ctx.restore(); return;
    }

    if (d.type==="daterange") {
      if (!d.pts||d.pts.length<2){ctx.restore();return;}
      const p1=dataToSvgXY(d.pts[0].price,d.pts[0].time),p2=dataToSvgXY(d.pts[1].price,d.pts[1].time);
      if (p1.x==null||p2.x==null){ctx.restore();return;}
      const x1=Math.min(p1.x!,p2.x!),x2=Math.max(p1.x!,p2.x!);
      ctx.fillStyle=sc+"22"; ctx.fillRect(x1,0,x2-x1,H);
      ctx.setLineDash([4,2]); ctx.strokeStyle=sc; ctx.lineWidth=lw;
      ctx.beginPath(); ctx.moveTo(p1.x!,0); ctx.lineTo(p1.x!,H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p2.x!,0); ctx.lineTo(p2.x!,H); ctx.stroke(); ctx.setLineDash([]);
      if (sel){canvHandle(ctx,p1.x,H/2);canvHandle(ctx,p2.x,H/2);}
      ctx.restore(); return;
    }

    if (d.type==="pricerange") {
      if (!d.pts||d.pts.length<2){ctx.restore();return;}
      const y1=candleRef.current?.priceToCoordinate(d.pts[0].price), y2=candleRef.current?.priceToCoordinate(d.pts[1].price);
      if (y1==null||y2==null){ctx.restore();return;}
      ctx.fillStyle=sc+"22"; ctx.fillRect(0,Math.min(y1,y2),W,Math.abs(y2-y1));
      ctx.setLineDash([4,2]); ctx.strokeStyle=sc; ctx.lineWidth=lw;
      ctx.beginPath(); ctx.moveTo(0,y1); ctx.lineTo(W,y1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,y2); ctx.lineTo(W,y2); ctx.stroke(); ctx.setLineDash([]);
      if (sel){canvHandle(ctx,W/2,y1);canvHandle(ctx,W/2,y2);}
      ctx.restore(); return;
    }

    ctx.restore();
  }

  function drawCurrentOnCanvas(ctx: CanvasRenderingContext2D, cur: any, color: string, lineWidth: number, W: number, _H: number) {
    void W;
    const { type, pts, preview, free } = cur;
    ctx.save(); ctx.lineCap="round"; ctx.lineJoin="round"; ctx.strokeStyle=color; ctx.lineWidth=lineWidth;
    if (type==="brush"||type==="highlighter") {
      if (!free||free.length<4){ctx.restore();return;}
      const sw=type==="highlighter"?10:lineWidth, op=type==="highlighter"?0.35:1;
      ctx.globalAlpha=op; ctx.lineWidth=sw; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(free[0],free[1]);
      for (let i=2;i<free.length;i+=2) ctx.lineTo(free[i],free[i+1]);
      ctx.stroke(); ctx.restore(); return;
    }
    if (!pts||pts.length===0){ctx.restore();return;}
    ctx.setLineDash([5,3]);
    for (let i=0;i<pts.length-1;i++) {
      const a=dataToSvgXY(pts[i].price,pts[i].time),b=dataToSvgXY(pts[i+1].price,pts[i+1].time);
      if (a.x!=null&&b.x!=null){ctx.beginPath();ctx.moveTo(a.x!,a.y!);ctx.lineTo(b.x!,b.y!);ctx.stroke();}
    }
    if (preview&&pts.length>0) {
      const last=pts[pts.length-1],lp=dataToSvgXY(last.price,last.time);
      if (lp.x!=null){ctx.globalAlpha=0.6;ctx.beginPath();ctx.moveTo(lp.x!,lp.y!);ctx.lineTo(preview.x,preview.y);ctx.stroke();ctx.globalAlpha=1;}
    }
    ctx.setLineDash([]); ctx.restore();
  }

  function distSeg(px:number,py:number,ax:number,ay:number,bx:number,by:number):number{
    const dx=bx-ax,dy=by-ay;
    if(dx===0&&dy===0)return Math.sqrt((px-ax)**2+(py-ay)**2);
    const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)));
    return Math.sqrt((px-(ax+t*dx))**2+(py-(ay+t*dy))**2);
  }

  function hitTestDrawing(d: any, px: number, py: number): boolean {
    const T=8;
    if (d.type==="trendline"||d.type==="arrow"){
      if(!d.pts||d.pts.length<2)return false;
      const p1=dataToSvgXY(d.pts[0].price,d.pts[0].time),p2=dataToSvgXY(d.pts[1].price,d.pts[1].time);
      if(p1.x==null||p2.x==null)return false;
      return distSeg(px,py,p1.x!,p1.y!,p2.x!,p2.y!)<T;
    }
    if (d.type==="ray"){
      if(!d.pts||d.pts.length<2)return false;
      const p1=dataToSvgXY(d.pts[0].price,d.pts[0].time),p2=dataToSvgXY(d.pts[1].price,d.pts[1].time);
      if(p1.x==null||p2.x==null)return false;
      const dx=p2.x!-p1.x!,dy=p2.y!-p1.y!,len=Math.sqrt(dx*dx+dy*dy)||1;
      return distSeg(px,py,p1.x!,p1.y!,p1.x!+(dx/len)*6000,p1.y!+(dy/len)*6000)<T;
    }
    if (d.type==="hline"){if(!d.pts?.length)return false;const y=candleRef.current?.priceToCoordinate(d.pts[0].price);return y!=null&&Math.abs(py-y)<T;}
    if (d.type==="vline"){if(!d.pts?.length)return false;const x=chartRef.current?.timeScale().timeToCoordinate(d.pts[0].time as any);return x!=null&&Math.abs(px-x)<T;}
    if (d.type==="rectangle"){
      if(!d.pts||d.pts.length<2)return false;
      const p1=dataToSvgXY(d.pts[0].price,d.pts[0].time),p2=dataToSvgXY(d.pts[1].price,d.pts[1].time);
      if(p1.x==null||p2.x==null)return false;
      const rx=Math.min(p1.x!,p2.x!),ry=Math.min(p1.y!,p2.y!),rw=Math.abs(p2.x!-p1.x!),rh=Math.abs(p2.y!-p1.y!);
      return ((Math.abs(px-rx)<T||Math.abs(px-rx-rw)<T)&&py>=ry&&py<=ry+rh)||((Math.abs(py-ry)<T||Math.abs(py-ry-rh)<T)&&px>=rx&&px<=rx+rw);
    }
    if (d.type==="circle"){
      if(!d.pts||d.pts.length<2)return false;
      const ctr=dataToSvgXY(d.pts[0].price,d.pts[0].time),edg=dataToSvgXY(d.pts[1].price,d.pts[1].time);
      if(ctr.x==null||edg.x==null)return false;
      const r=Math.sqrt((edg.x!-ctr.x!)**2+(edg.y!-ctr.y!)**2);
      return Math.abs(Math.sqrt((px-ctr.x!)**2+(py-ctr.y!)**2)-r)<T;
    }
    if (d.type==="brush"||d.type==="highlighter"){
      if(!d.pts||d.pts.length<2)return false;
      for(let i=0;i<d.pts.length-1;i++){
        const a=dataToSvgXY(d.pts[i].price,d.pts[i].time),b=dataToSvgXY(d.pts[i+1].price,d.pts[i+1].time);
        if(a.x!=null&&b.x!=null&&distSeg(px,py,a.x!,a.y!,b.x!,b.y!)<T*2)return true;
      }
      return false;
    }
    if (d.type==="text"||d.type==="note"||d.type==="pricelabel"){
      if(!d.pts?.length)return false;
      const p=dataToSvgXY(d.pts[0].price,d.pts[0].time);if(p.x==null)return false;
      return Math.abs(px-p.x!)<70&&Math.abs(py-p.y!)<20;
    }
    if (d.type==="fibretracement"||d.type==="channel"){
      if(!d.pts||d.pts.length<2)return false;
      const p1=dataToSvgXY(d.pts[0].price,d.pts[0].time),p2=dataToSvgXY(d.pts[1].price,d.pts[1].time);
      if(p1.x==null||p2.x==null)return false;
      return distSeg(px,py,p1.x!,p1.y!,p2.x!,p2.y!)<T;
    }
    if (d.type==="longposition"||d.type==="shortposition"){
      if(!d.pts||d.pts.length<2)return false;
      const ey=dataToSvgXY(d.pts[0].price,d.pts[0].time).y, ty=dataToSvgXY(d.pts[1].price,d.pts[1].time).y;
      if(ey==null||ty==null)return false;
      return Math.abs(py-ey)<T||Math.abs(py-ty)<T;
    }
    if (d.type==="daterange"){
      if(!d.pts||d.pts.length<2)return false;
      const x1=dataToSvgXY(d.pts[0].price,d.pts[0].time).x,x2=dataToSvgXY(d.pts[1].price,d.pts[1].time).x;
      if(x1==null||x2==null)return false;
      return Math.abs(px-x1)<T||Math.abs(px-x2)<T;
    }
    if (d.type==="pricerange"){
      if(!d.pts||d.pts.length<2)return false;
      const y1=candleRef.current?.priceToCoordinate(d.pts[0].price),y2=candleRef.current?.priceToCoordinate(d.pts[1].price);
      if(y1==null||y2==null)return false;
      return Math.abs(py-y1)<T||Math.abs(py-y2)<T;
    }
    return false;
  }

  function selectTf(tf: string) { setTfState(tf); setShowTf(false); }

  const isPos = (ohlcv?.chp ?? 0) >= 0;
  const ohlcvColor = ohlcv ? (isPos ? C.bull : C.bear) : C.bull;

  return (
    <div ref={wrapperRef} style={{ display:"flex", flexDirection:"column", width: isWebFS ? "100vw" : "100%", height: isWebFS ? "100dvh" : "100%", background:C.bg, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", position: isWebFS ? "fixed" : "relative", top: isWebFS ? 0 : undefined, left: isWebFS ? 0 : undefined, zIndex: isWebFS ? 9999 : undefined, overflow:"hidden" }}>

      {/* ── Loading overlays ── */}
      {!dataLoaded && (
        <LoadingCandleAnimation overlay status="connecting" />
      )}
      {dataLoaded && (wsStatus === "reconnecting" || wsStatus === "error") && (
        <LoadingCandleAnimation overlay transparent size="sm" status={wsStatus as "reconnecting" | "error"} />
      )}

      {/* ── Top toolbar — matches native NativeWebViewChart exactly ── */}
      <div style={{ height: isWebFS ? `calc(${TOP}px + env(safe-area-inset-top, 0px))` : `${TOP}px`, paddingTop: isWebFS ? "env(safe-area-inset-top, 0px)" : 0, display:"flex", alignItems:"center", background:C.panel, borderBottom:`1px solid ${C.border}`, paddingLeft:4, paddingRight:6, gap:2, flexShrink:0 }}>

        {/* 4-dot sidebar toggle */}
        <TBtn
          title={sidebarVisible ? "Hide drawing tools" : "Show drawing tools"}
          active={!sidebarVisible}
          onClick={() => setSidebarVisible(v => !v)}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
        </TBtn>

        <div style={{ width:1, height:22, background:C.border, margin:"0 2px" }}/>

        {/* Timeframe selector with dropdown arrow */}
        <div style={{ position:"relative" }}>
          <button onClick={() => setShowTf(v=>!v)} style={{
            display:"flex", alignItems:"center", gap:4,
            background: showTfMenu ? C.gold+"18" : "none",
            border:"none", color: showTfMenu ? C.gold : C.text,
            padding:"4px 8px", borderRadius:4, cursor:"pointer",
            fontSize:13, fontWeight:"600", lineHeight:"1",
          }}>
            {timeframe}
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {showTfMenu && (
            <div style={{
              position:"absolute", top:34, left:0, zIndex:100,
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

        <div style={{ width:1, height:22, background:C.border, margin:"0 2px" }}/>

        {/* Chart type toggle: candlestick ↔ line */}
        <TBtn
          title={chartType === "candle" ? "Switch to Line chart" : "Switch to Candlestick chart"}
          onClick={toggleChartType}
        >
          {chartType === "candle" ? <IcCandle/> : <IcLine/>}
        </TBtn>

        {/* Spacer — pushes fullscreen to the right, matching native layout */}
        <div style={{ flex:1 }}/>

        {/* Fullscreen */}
        <TBtn title={isWebFS ? "Exit Fullscreen" : "Fullscreen"} onClick={handleFullscreen} active={isWebFS}>
          {isWebFS ? <IcMin/> : <IcMax/>}
        </TBtn>
      </div>

      {/* ── Body: sidebar + chart ── */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* ── Drawing Sidebar ── hidden when sidebarVisible=false (chart expands via flex) */}
        <div className="tm-web-sidebar" style={{ width:44, background:C.panel, borderRight:`1px solid ${C.border}`, display: sidebarVisible ? "flex" : "none", flexDirection:"column", alignItems:"center", padding:"4px 0", gap:1, flexShrink:0, zIndex:20, overflowY:"auto", overflowX:"visible", scrollbarWidth:"none", msOverflowStyle:"none", position:"relative" } as React.CSSProperties}>
          {/* Tool groups */}
          {WEB_TOOL_GROUPS.slice(1).map(g=>{
            const isAct = g.items.some((it:any)=>it.id===activeTool);
            return (
              <div key={g.id} style={{position:"relative"}}>
                <button title={g.label}
                  onPointerDown={(e)=>{ e.currentTarget.releasePointerCapture(e.pointerId); if(g.items.length===1){handleToolClick(g.items[0].id);setOpenSubGroup(null);}else{ const r=(e.currentTarget as HTMLElement).getBoundingClientRect(); setSubGroupY(r.top); setOpenSubGroup(v=>v===g.id?null:g.id);}}}
                  style={{ width:34,height:32,display:"flex",alignItems:"center",justifyContent:"center",background:isAct?"#2962FF22":"none",border:"none",borderRadius:5,cursor:"pointer",color:isAct?"#2962FF":"#787b86",fontSize:13,fontWeight:"bold",position:"relative",touchAction:"manipulation" }}>
                  <SbIcon id={g.id}/>
                  {g.items.length>1&&<span style={{position:"absolute",right:3,bottom:4,width:0,height:0,borderLeft:"3px solid transparent",borderRight:"3px solid transparent",borderTop:`3px solid ${isAct?"#2962FF":"#4a4e5a"}`}}/>}
                </button>
                {openSubGroup===g.id&&(
                  <div style={{ position:"fixed",left:46,top:subGroupY,background:C.panel,border:`1px solid ${C.border}`,borderRadius:7,minWidth:180,padding:"4px 0",zIndex:500,boxShadow:"0 4px 24px #00000090" }}>
                    <div style={{padding:"4px 12px",fontSize:9,fontWeight:"700",color:C.dim,textTransform:"uppercase",letterSpacing:".6px",borderBottom:`1px solid ${C.border}`,marginBottom:2}}>{g.label}</div>
                    {g.items.map((it:any)=>(
                      <button key={it.id} onPointerDown={(e)=>{ e.currentTarget.releasePointerCapture(e.pointerId); handleToolClick(it.id);setOpenSubGroup(null);}}
                        style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",fontSize:12,color:activeTool===it.id?"#2962FF":C.text,cursor:"pointer",border:"none",background:activeTool===it.id?"#2962FF18":"none",width:"100%",textAlign:"left",touchAction:"manipulation" }}>
                        <span style={{width:6,height:6,borderRadius:"50%",background:activeTool===it.id?"#2962FF":"none",border:`1px solid ${activeTool===it.id?"#2962FF":"#3a3e4a"}`,flexShrink:0}}/>
                        {it.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {/* Separator */}
          <div style={{width:28,height:1,background:C.border,margin:"3px 0"}}/>
          {/* Toggle tools */}
          {WEB_TOGGLE_TOOLS.map(t=>(
            <button key={t.id} title={t.label} onPointerDown={(e)=>{ e.currentTarget.releasePointerCapture(e.pointerId); handleToolClick(t.id);}}
              style={{ width:34,height:32,display:"flex",alignItems:"center",justifyContent:"center",background:(activeTool===t.id||(t.id==="hide"&&!showWebDraw))?"#2962FF22":"none",border:"none",borderRadius:5,cursor:"pointer",color:(activeTool===t.id||(t.id==="hide"&&!showWebDraw))?"#2962FF":"#787b86",touchAction:"manipulation" }}>
              <SbIcon id={t.id}/>
            </button>
          ))}
        </div>

        {/* Float menu for selected drawing */}
        {floatMenu&&(()=>{
          const d=webDrawings.find(x=>x.id===floatMenu.id);
          const fmBtnStyle = (clr: string): React.CSSProperties => ({background:"none",border:"none",color:clr,cursor:"pointer",padding:"5px 7px",borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center"});
          return d?<div style={{position:"fixed",left:Math.min(floatMenu.x,window.innerWidth-240),top:Math.max(floatMenu.y-50,50),background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 5px",display:"flex",alignItems:"center",gap:2,zIndex:600,boxShadow:"0 4px 20px #00000090"}}>
            {/* Color */}
            <input type="color" value={d.color||"#f0b90b"} onChange={e=>{setDrwColor(e.target.value);setWebDrawings(ds=>ds.map(x=>x.id===floatMenu.id?{...x,color:e.target.value}:x));}} title="Color" style={{width:24,height:24,border:"2px solid #3a3e4a",borderRadius:4,cursor:"pointer",padding:0,background:"none"}}/>
            <div style={{width:1,height:18,background:C.border,margin:"0 1px"}}/>
            {/* Lock / Unlock */}
            <button title={d.locked?"Unlock":"Lock"} onClick={()=>{setWebDrawings(ds=>ds.map(x=>x.id===floatMenu.id?{...x,locked:!x.locked}:x));setFloatMenu(null);setSelectedDrwId(null);}} style={fmBtnStyle("#f59e0b")}>
              <SbIcon id="lock"/>
            </button>
            <div style={{width:1,height:18,background:C.border,margin:"0 1px"}}/>
            {/* Delete */}
            <button title="Delete" onClick={()=>{setWebDrawings(ds=>ds.filter(x=>x.id!==floatMenu.id));setFloatMenu(null);setSelectedDrwId(null);}} style={fmBtnStyle("#ef5350")}>
              <SbIcon id="delete"/>
            </button>
            <div style={{width:1,height:18,background:C.border,margin:"0 1px"}}/>
            {/* Close */}
            <button title="Deselect" onClick={()=>{setFloatMenu(null);setSelectedDrwId(null);}} style={fmBtnStyle("#787b86")}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>:null;
        })()}

        {/* Backdrop to close submenus */}
        {openSubGroup&&<div style={{position:"fixed",inset:0,zIndex:499}} onClick={()=>setOpenSubGroup(null)}/>}

        {/* Chart container — fills remaining height via flex:1 */}
        <div ref={chartAreaRef} style={{ flex:1, position:"relative", overflow:"hidden", minHeight: 0 }}>

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
              bottom: "22%",
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

          {/* ── Canvas drawing overlay (replaces SVG for better mobile touch compatibility) ── */}
          <canvas
            ref={canvasRef}
            style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:10 }}
          />
          {/* Capture div — always in DOM so native touch listeners persist.
              z-index 200 ensures it sits above all lw-charts internal canvas layers.
              pointer-events toggled: "all" when drawing, "none" (pass-through) when cursor.
              lw-charts container is also set to pointerEvents:none when drawing (see isDrawActive effect),
              so the chart can't steal capture or call stopPropagation on our events. */}
          <div
            ref={captureRef}
            style={{
              position:"absolute", inset:0,
              zIndex: 200,
              pointerEvents: isDrawActive ? "all" : "none",
              touchAction: "none",
              cursor: isDrawActive ? "crosshair" : "auto",
              userSelect: "none",
              WebkitUserSelect: "none",
            } as React.CSSProperties}
            onPointerDown={onSvgPointerDown}
            onPointerMove={onSvgPointerMove}
            onPointerUp={onSvgPointerUp}
            onPointerCancel={onSvgPointerUp}
          />
          {/* Hint pill — bottom of chart (matches native style) */}
          {isDrawActive && !webCurrent && (
            <div style={{
              position:"absolute", bottom:10, left:"50%",
              transform:"translateX(-50%)",
              background:"rgba(41,98,255,0.13)", border:"1px solid rgba(41,98,255,0.45)",
              color:"#93bbff", fontSize:11, fontWeight:"600",
              padding:"5px 16px", borderRadius:20,
              pointerEvents:"none", zIndex:20, letterSpacing:".3px", whiteSpace:"nowrap",
            }}>
              {activeTool==="trendline"||activeTool==="ray"||activeTool==="arrow" ? "Tap first point, drag to second" :
               activeTool==="brush"||activeTool==="highlighter"         ? "Drag to draw freehand" :
               activeTool==="rectangle"                                  ? "Drag to draw rectangle" :
               activeTool==="circle"                                     ? "Drag to draw circle" :
               activeTool==="fibretracement"                             ? "Drag to set Fib range" :
               activeTool==="channel"                                    ? "Drag first line, tap for 3rd point" :
               activeTool==="hline"                                      ? "Tap chart to draw horizontal line" :
               activeTool==="vline"                                      ? "Tap chart to draw vertical line" :
               activeTool==="text"||activeTool==="note"                  ? "Tap chart to place text" :
               activeTool==="pricelabel"                                 ? "Tap chart to place price label" :
               activeTool==="longposition"||activeTool==="shortposition" ? "Drag entry → target, tap for stop" :
               activeTool==="daterange"                                  ? "Drag to mark date range" :
               activeTool==="pricerange"                                 ? "Drag to mark price range" :
               "Tap chart to place"}
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

// ── Sidebar SVG icon set (matches native NativeWebViewChart icons) ────────────
function SbIcon({ id }: { id: string }) {
  const s = { stroke:"currentColor", strokeWidth:"1.8", strokeLinecap:"round" as const, strokeLinejoin:"round" as const, fill:"none" };
  switch (id) {
    case "cursor":
      return <svg viewBox="0 0 24 24" width="16" height="16" {...s}><path d="M5 3l14 9-7 1-3 7z" fill="currentColor" stroke="none"/></svg>;
    case "lines":
      return <svg viewBox="0 0 24 24" width="16" height="16" {...s}><line x1="5" y1="19" x2="19" y2="5"/><circle cx="5" cy="19" r="2.5" fill="currentColor" stroke="none"/><circle cx="19" cy="5" r="1.5"/></svg>;
    case "fib":
      return <svg viewBox="0 0 24 24" width="16" height="16" {...s}><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>;
    case "shapes":
      return <svg viewBox="0 0 24 24" width="16" height="16" {...s}><rect x="3" y="6" width="18" height="12" rx="1.5"/></svg>;
    case "brush":
      return <svg viewBox="0 0 24 24" width="16" height="16" {...s}><path d="M3 14 C5.5 8 7.5 17 10 12 C12.5 7 14.5 16 17 11 C18.5 8 20.5 10 21 10"/></svg>;
    case "text":
      return <svg viewBox="0 0 24 24" width="16" height="16" {...s}><line x1="4" y1="6" x2="20" y2="6"/><line x1="12" y1="6" x2="12" y2="20"/></svg>;
    case "measure":
      return <svg viewBox="0 0 24 24" width="16" height="16" {...s}><line x1="4" y1="12" x2="20" y2="12"/><polyline points="8 7 12 3 16 7" stroke="#22C55E" fill="none"/><line x1="12" y1="3" x2="12" y2="12" stroke="#22C55E"/><polyline points="8 17 12 21 16 17" stroke="#EF4444" fill="none"/><line x1="12" y1="12" x2="12" y2="21" stroke="#EF4444"/></svg>;
    case "hide":
      return <svg viewBox="0 0 24 24" width="16" height="16" {...s}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>;
    case "lock":
      return <svg viewBox="0 0 24 24" width="16" height="16" {...s}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case "delete":
      return <svg viewBox="0 0 24 24" width="16" height="16" {...s}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;
    default:
      return <span style={{fontSize:12,fontWeight:"bold"}}>{id[0]?.toUpperCase()??""}</span>;
  }
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
  if (Platform.OS === "web") {
    return <WebChart symbol={symbol} height={h} />;
  }
  // Android & iOS — WebView-based TradingView-style chart (lightweight-charts via CDN)
  return <NativeWebViewChart symbol={symbol} height={h} />;
}
