import React, { useEffect, useRef, useState, useCallback } from "react";
import { Platform, View, Text } from "react-native";
import MobileCandleChart from "./MobileCandleChart";
import NativeWebViewChart from "./NativeWebViewChart";
import LoadingCandleAnimation from "./LoadingCandleAnimation";

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
const IcCamera   = () => <Svg><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></Svg>;
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
  const [isWebFS,      setIsWebFS]     = useState(false);
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const svgRef      = useRef<SVGSVGElement>(null);
  const drwCurPts   = useRef<any[]>([]);
  const drwFreehand = useRef<number[]>([]);
  const drwMDown    = useRef(false);
  const drwPreview  = useRef<{x:number;y:number}|null>(null);
  const DRW_KEY = "tm_drw_v2";

  // Load drawings from localStorage on mount
  useEffect(()=>{
    try { const s=localStorage.getItem(DRW_KEY); if(s) setWebDrawings(JSON.parse(s)); } catch{}
  },[]);
  // Save drawings when they change
  useEffect(()=>{
    try { localStorage.setItem(DRW_KEY, JSON.stringify(webDrawings)); } catch{}
  },[webDrawings]);

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
    } catch {} finally {
      if (mountedRef.current) setDataLoaded(true);
    }

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
      setDataLoaded(false);
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
      wsRef.current?.close();
      wsRef.current = null;
      loadIdRef.current++; // invalidate in-flight connectWS callbacks
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

  function getSvgXY(e: React.MouseEvent | React.TouchEvent | Touch, isTouchObj=false) {
    const rect = svgRef.current?.getBoundingClientRect() ?? {left:0,top:0};
    const clientX = isTouchObj ? (e as Touch).clientX : (e as React.MouseEvent).clientX;
    const clientY = isTouchObj ? (e as Touch).clientY : (e as React.MouseEvent).clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
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
    if (id==="hide") { setShowWebDraw(v=>!v); return; }
    if (id==="lock") {
      setWebDrawings(ds=>{ const allLk=ds.every(d=>d.locked); return ds.map(d=>({...d,locked:!allLk})); });
      return;
    }
    setActiveTool(prev => prev===id ? null : id);
    setSelectedDrwId(null); setFloatMenu(null);
    drwCurPts.current=[]; drwFreehand.current=[]; setWebCurrent(null);
    setOpenSubGroup(null);
  }
  function handleFullscreen() {
    const el = wrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(()=>{});
    else document.exitFullscreen?.();
  }

  // ── SVG Pointer handlers ───────────────────────────────────────────────────
  function onSvgPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (!activeTool || activeTool==="cursor") { setSelectedDrwId(null); setFloatMenu(null); return; }
    const {x,y} = getSvgXY(e);
    drwMDown.current = true;
    (e.currentTarget as any).setPointerCapture?.(e.pointerId);

    if (activeTool==="delete") return;
    if (activeTool==="brush"||activeTool==="highlighter") {
      drwFreehand.current=[x,y]; setWebCurrent({type:activeTool,free:[x,y]}); return;
    }
    const pt = svgToData(x,y);
    if (!pt.time && pt.time!==0) return;
    // single-click tools
    if (activeTool==="hline") {
      setWebDrawings(ds=>[...ds,{id:genDrwId(),type:"hline",pts:[{price:pt.price,time:pt.time}],color:drwColor,width:drwWidth,visible:true,locked:false}]);
      return;
    }
    if (activeTool==="vline") {
      setWebDrawings(ds=>[...ds,{id:genDrwId(),type:"vline",pts:[{price:pt.price,time:pt.time}],color:drwColor,width:drwWidth,visible:true,locked:false}]);
      return;
    }
    if (activeTool==="pricelabel") {
      setWebDrawings(ds=>[...ds,{id:genDrwId(),type:"pricelabel",pts:[{price:pt.price,time:pt.time}],color:drwColor,width:drwWidth,visible:true,locked:false}]);
      return;
    }
    if (activeTool==="text"||activeTool==="note") {
      const txt = window.prompt("Enter "+(activeTool==="text"?"text":"note")+":", activeTool==="text"?"Text":"Note");
      if (txt==null) return;
      setWebDrawings(ds=>[...ds,{id:genDrwId(),type:activeTool,pts:[{price:pt.price,time:pt.time}],color:drwColor,width:drwWidth,text:txt,visible:true,locked:false}]);
      return;
    }
    // multi-point tools
    if (drwCurPts.current.length===0) {
      drwCurPts.current=[pt]; setWebCurrent({type:activeTool,pts:[pt],preview:null});
    } else {
      const newPts=[...drwCurPts.current,pt];
      const needed=getToolPts(activeTool)||2;
      if (newPts.length>=needed) {
        setWebDrawings(ds=>[...ds,{id:genDrwId(),type:activeTool,pts:newPts,color:drwColor,width:drwWidth,visible:true,locked:false}]);
        drwCurPts.current=[]; setWebCurrent(null);
      } else {
        drwCurPts.current=newPts; setWebCurrent({type:activeTool,pts:newPts,preview:null});
      }
    }
  }
  function onSvgPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drwMDown.current) return;
    const {x,y}=getSvgXY(e);
    if (activeTool==="brush"||activeTool==="highlighter") {
      drwFreehand.current=[...drwFreehand.current,x,y];
      setWebCurrent((c:any)=>c?{...c,free:[...drwFreehand.current]}:null);
      return;
    }
    if (drwCurPts.current.length>0) {
      drwPreview.current={x,y};
      setWebCurrent((c:any)=>c?{...c,preview:{x,y}}:null);
    }
  }
  function onSvgPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    drwMDown.current=false;
    if (activeTool==="brush"||activeTool==="highlighter") {
      const fp=drwFreehand.current;
      if (fp.length>=4) {
        const pts:any[]=[];
        for (let i=0;i<fp.length;i+=2) { const pt=svgToData(fp[i],fp[i+1]); if(pt.time) pts.push(pt); }
        if (pts.length>=2) setWebDrawings(ds=>[...ds,{id:genDrwId(),type:activeTool,pts,color:drwColor,width:drwWidth,visible:true,locked:false}]);
      }
      drwFreehand.current=[]; setWebCurrent(null);
    }
  }
  function handleSvgDown(e: React.MouseEvent<SVGSVGElement>) { onSvgPointerDown(e as any); }
  function handleSvgMove(e: React.MouseEvent<SVGSVGElement>) { onSvgPointerMove(e as any); }
  function handleSvgUp(e: React.MouseEvent<SVGSVGElement>)   { onSvgPointerUp(e as any); }
  function handleSvgTouchStart(e: React.TouchEvent<SVGSVGElement>) {
    e.preventDefault(); const t=e.changedTouches[0]; onSvgPointerDown({clientX:t.clientX,clientY:t.clientY,currentTarget:e.currentTarget,pointerId:0,setPointerCapture:()=>{}} as any);
  }
  function handleSvgTouchMove(e: React.TouchEvent<SVGSVGElement>) {
    e.preventDefault(); const t=e.changedTouches[0]; onSvgPointerMove({clientX:t.clientX,clientY:t.clientY,currentTarget:e.currentTarget} as any);
  }
  function handleSvgTouchEnd(e: React.TouchEvent<SVGSVGElement>) {
    e.preventDefault(); onSvgPointerUp({} as any);
  }

  function onDrawingClick(id: string, e: React.MouseEvent) {
    if (activeTool==="delete") { setWebDrawings(ds=>ds.filter(d=>d.id!==id)); return; }
    if (!activeTool||activeTool==="cursor") {
      const d=webDrawings.find(x=>x.id===id); if(!d||d.locked) return;
      setSelectedDrwId(id); setFloatMenu({x:e.clientX,y:e.clientY,id});
    }
  }
  function onHandlePointerDown(did: string, idx: number, e: React.PointerEvent) {
    e.stopPropagation();
    const d=webDrawings.find(x=>x.id===did); if(!d||d.locked) return;
    setSelectedDrwId(did);
    const onMove=(ev:PointerEvent)=>{
      const rect=svgRef.current?.getBoundingClientRect()??{left:0,top:0};
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

  // ── Render each drawing type ────────────────────────────────────────────────
  function H(x:any,y:any,did:string,idx:number) {
    if (x==null||y==null||isNaN(x)||isNaN(y)) return null;
    return <circle key={"h"+idx} cx={x} cy={y} r={5} fill="#fff" stroke="#2962FF" strokeWidth={2} style={{cursor:"move"}} onPointerDown={ev=>{ev.stopPropagation();onHandlePointerDown(did,idx,ev);}}/>;
  }

  function renderOneDraw(d: any, sel: boolean) {
    void drawTick;
    const c=d.color||C.gold, w=d.width||1.5, sc=sel?"#2962FF":c;
    const hitProps = { style:{cursor:"move"} as any, onClick:(e:React.MouseEvent)=>{e.stopPropagation();onDrawingClick(d.id,e);} };

    if (d.type==="trendline"||d.type==="arrow"||d.type==="ray") {
      if (!d.pts||d.pts.length<2) return null;
      const p1=dataToSvgXY(d.pts[0].price,d.pts[0].time),p2=dataToSvgXY(d.pts[1].price,d.pts[1].time);
      if (p1.x==null||p2.x==null) return null;
      let x1=p1.x,y1=p1.y!,x2=p2.x,y2=p2.y!;
      if (d.type==="ray") { const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy)||1; x2=x1+(dx/len)*5000; y2=y1+(dy/len)*5000; }
      const arrow=d.type==="arrow";
      return <g key={d.id}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={14} {...hitProps}/>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={sc} strokeWidth={w} strokeLinecap="round"/>
        {arrow&&(()=>{const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy)||1,nx=dx/len,ny=dy/len;return<polygon points={`${x2},${y2} ${x2-nx*10-ny*5},${y2-ny*10+nx*5} ${x2-nx*10+ny*5},${y2-ny*10-nx*5}`} fill={sc}/>;})()}
        {sel&&[H(p1.x,p1.y,d.id,0),H(p2.x,p2.y,d.id,1)]}
      </g>;
    }
    if (d.type==="hline") {
      if (!d.pts||d.pts.length<1) return null;
      const y=candleRef.current?.priceToCoordinate(d.pts[0].price);
      if (y==null) return null;
      const svgW=svgRef.current?.clientWidth??3000;
      return <g key={d.id}>
        <line x1={0} y1={y} x2={svgW} y2={y} stroke="transparent" strokeWidth={14} {...hitProps}/>
        <line x1={0} y1={y} x2={svgW} y2={y} stroke={sc} strokeWidth={w} strokeDasharray="5 3"/>
        <rect x={svgW-84} y={y-11} width={80} height={22} rx={3} fill={C.panel} stroke={sc} strokeWidth={1}/>
        <text x={svgW-44} y={y+4} textAnchor="middle" style={{fontSize:10,fill:sc,fontFamily:"monospace"}}>{fmtPrc(d.pts[0].price)}</text>
        {sel&&H(svgW/2,y,d.id,0)}
      </g>;
    }
    if (d.type==="vline") {
      if (!d.pts||d.pts.length<1) return null;
      const x=chartRef.current?.timeScale().timeToCoordinate(d.pts[0].time);
      if (x==null) return null;
      const svgH=svgRef.current?.clientHeight??1000;
      return <g key={d.id}>
        <line x1={x} y1={0} x2={x} y2={svgH} stroke="transparent" strokeWidth={14} {...hitProps}/>
        <line x1={x} y1={0} x2={x} y2={svgH} stroke={sc} strokeWidth={w} strokeDasharray="5 3"/>
        {sel&&H(x,svgH/2,d.id,0)}
      </g>;
    }
    if (d.type==="channel") {
      if (!d.pts||d.pts.length<3) return null;
      const p1=dataToSvgXY(d.pts[0].price,d.pts[0].time),p2=dataToSvgXY(d.pts[1].price,d.pts[1].time),p3=dataToSvgXY(d.pts[2].price,d.pts[2].time);
      if (p1.x==null) return null;
      const dy=p3.y!-p1.y!, q1y=p1.y!+dy, q2y=p2.y!+dy;
      return <g key={d.id}>
        <polygon points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p2.x},${q2y} ${p1.x},${q1y}`} fill={sc+"22"} {...hitProps}/>
        <line x1={p1.x} y1={p1.y!} x2={p2.x!} y2={p2.y!} stroke={sc} strokeWidth={w}/>
        <line x1={p1.x} y1={q1y} x2={p2.x!} y2={q2y} stroke={sc} strokeWidth={w} strokeDasharray="5 3"/>
        {sel&&[H(p1.x,p1.y,d.id,0),H(p2.x,p2.y,d.id,1),H(p3.x,p3.y,d.id,2)]}
      </g>;
    }
    if (d.type==="fibretracement") {
      if (!d.pts||d.pts.length<2) return null;
      const p1=dataToSvgXY(d.pts[0].price,d.pts[0].time),p2=dataToSvgXY(d.pts[1].price,d.pts[1].time);
      if (p1.x==null) return null;
      const range=d.pts[1].price-d.pts[0].price;
      const LEVS=[0,0.236,0.382,0.5,0.618,0.786,1];
      const LCLR=["#26a69a","#f59e0b","#ef5350","#787b86","#3b82f6","#8b5cf6","#26a69a"];
      const svgW=svgRef.current?.clientWidth??3000;
      const x0=Math.min(p1.x!,p2.x!);
      return <g key={d.id}>
        <line x1={p1.x!} y1={p1.y!} x2={p2.x!} y2={p2.y!} stroke={sc} strokeWidth={w} {...hitProps}/>
        {LEVS.map((lv,i)=>{
          const price=d.pts[0].price+range*lv;
          const fy=candleRef.current?.priceToCoordinate(price);
          if (fy==null) return null;
          const lc=sel?"#2962FF":LCLR[i];
          return <g key={i}>
            <line x1={x0} y1={fy} x2={svgW} y2={fy} stroke={lc} strokeWidth={1} strokeDasharray="4 2" opacity={0.8}/>
            <text x={x0+4} y={fy-3} style={{fontSize:9,fill:lc,fontFamily:"monospace"}}>{(lv*100).toFixed(1)}%  {fmtPrc(price)}</text>
          </g>;
        })}
        {sel&&[H(p1.x,p1.y,d.id,0),H(p2.x,p2.y,d.id,1)]}
      </g>;
    }
    if (d.type==="brush"||d.type==="highlighter") {
      if (!d.pts||d.pts.length<2) return null;
      const sw=d.type==="highlighter"?10:w, op=d.type==="highlighter"?0.4:1;
      const ptStr=d.pts.map((pt:any)=>{const px=dataToSvgXY(pt.price,pt.time);return px.x!=null?`${px.x!.toFixed(1)},${px.y!.toFixed(1)}`:null;}).filter(Boolean).join(" ");
      if (!ptStr) return null;
      return <g key={d.id}>
        <polyline points={ptStr} stroke="transparent" strokeWidth={16} fill="none" {...hitProps}/>
        <polyline points={ptStr} stroke={sc} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={op}/>
      </g>;
    }
    if (d.type==="rectangle") {
      if (!d.pts||d.pts.length<2) return null;
      const p1=dataToSvgXY(d.pts[0].price,d.pts[0].time),p2=dataToSvgXY(d.pts[1].price,d.pts[1].time);
      if (p1.x==null) return null;
      const rx=Math.min(p1.x!,p2.x!),ry=Math.min(p1.y!,p2.y!),rw=Math.abs(p2.x!-p1.x!),rh=Math.abs(p2.y!-p1.y!);
      return <g key={d.id}>
        <rect x={rx} y={ry} width={rw} height={rh} stroke="transparent" strokeWidth={8} fill="transparent" {...hitProps}/>
        <rect x={rx} y={ry} width={rw} height={rh} stroke={sc} strokeWidth={w} fill={sc+"22"}/>
        {sel&&[H(p1.x,p1.y,d.id,0),H(p2.x,p1.y,d.id,1),H(p1.x,p2.y,d.id,2),H(p2.x,p2.y,d.id,3)]}
      </g>;
    }
    if (d.type==="circle") {
      if (!d.pts||d.pts.length<2) return null;
      const ctr=dataToSvgXY(d.pts[0].price,d.pts[0].time),edg=dataToSvgXY(d.pts[1].price,d.pts[1].time);
      if (ctr.x==null) return null;
      const r=Math.sqrt(Math.pow(edg.x!-ctr.x!,2)+Math.pow(edg.y!-ctr.y!,2));
      return <g key={d.id}>
        <circle cx={ctr.x!} cy={ctr.y!} r={r} stroke="transparent" strokeWidth={10} fill="transparent" {...hitProps}/>
        <circle cx={ctr.x!} cy={ctr.y!} r={r} stroke={sc} strokeWidth={w} fill={sc+"22"}/>
        {sel&&[H(ctr.x,ctr.y,d.id,0),H(edg.x,edg.y,d.id,1)]}
      </g>;
    }
    if (d.type==="text") {
      if (!d.pts||d.pts.length<1) return null;
      const p=dataToSvgXY(d.pts[0].price,d.pts[0].time); if(p.x==null) return null;
      const textHit={onClick:(e:React.MouseEvent)=>{e.stopPropagation();onDrawingClick(d.id,e);}};
      return <g key={d.id}><text x={p.x!} y={p.y!} style={{fontSize:14,fill:sc,fontWeight:"bold",fontFamily:"sans-serif",cursor:"move"}} {...textHit}>{d.text||"Text"}</text>{sel&&H(p.x,p.y,d.id,0)}</g>;
    }
    if (d.type==="note") {
      if (!d.pts||d.pts.length<1) return null;
      const p=dataToSvgXY(d.pts[0].price,d.pts[0].time); if(p.x==null) return null;
      const txt=d.text||"Note", bw=Math.max(60,txt.length*7+20);
      return <g key={d.id}>
        <rect x={p.x!} y={p.y!-22} width={bw} height={26} rx={4} fill={C.panel} stroke={sc} strokeWidth={1} {...hitProps}/>
        <text x={p.x!+8} y={p.y!-5} style={{fontSize:12,fill:sc,fontFamily:"sans-serif"}}>{txt}</text>
        {sel&&H(p.x!+bw/2,p.y!-9,d.id,0)}
      </g>;
    }
    if (d.type==="pricelabel") {
      if (!d.pts||d.pts.length<1) return null;
      const p=dataToSvgXY(d.pts[0].price,d.pts[0].time); if(p.x==null) return null;
      const svgW=svgRef.current?.clientWidth??3000;
      return <g key={d.id}>
        <line x1={p.x!} y1={p.y!} x2={svgW-86} y2={p.y!} stroke={sc} strokeWidth={1} strokeDasharray="3 2" {...hitProps}/>
        <rect x={svgW-86} y={p.y!-11} width={82} height={22} rx={3} fill={sc}/>
        <text x={svgW-45} y={p.y!+4} textAnchor="middle" style={{fontSize:10,fill:"#000",fontWeight:"bold",fontFamily:"monospace"}}>{fmtPrc(d.pts[0].price)}</text>
        {sel&&H(p.x,p.y,d.id,0)}
      </g>;
    }
    if (d.type==="longposition"||d.type==="shortposition") {
      if (!d.pts||d.pts.length<2) return null;
      const entry=dataToSvgXY(d.pts[0].price,d.pts[0].time),tgt=dataToSvgXY(d.pts[1].price,d.pts[1].time);
      if (entry.x==null) return null;
      const svgW=svgRef.current?.clientWidth??3000;
      const X=entry.x!,W2=svgW-X,ey=entry.y!,ty=tgt.y!;
      const profC="#26a69a",lossC="#ef5350",fillC=ty<ey?profC:lossC;
      return <g key={d.id}>
        <rect x={X} y={Math.min(ey,ty)} width={W2} height={Math.abs(ty-ey)} fill={fillC+"44"} {...hitProps}/>
        <line x1={X} y1={ey} x2={svgW} y2={ey} stroke="#d1d4dc" strokeWidth={1.5}/>
        <line x1={X} y1={ty} x2={svgW} y2={ty} stroke={fillC} strokeWidth={1.5}/>
        <text x={X+6} y={ey-4} style={{fontSize:9,fill:"#d1d4dc",fontFamily:"monospace"}}>Entry {fmtPrc(d.pts[0].price)}</text>
        <text x={X+6} y={ty+12} style={{fontSize:9,fill:fillC,fontFamily:"monospace"}}>Target {fmtPrc(d.pts[1].price)}</text>
        {d.pts.length>=3&&(()=>{const stop=dataToSvgXY(d.pts[2].price,d.pts[2].time);if(!stop.x) return null;const sy=stop.y!;return<g><rect x={X} y={Math.min(ey,sy)} width={W2} height={Math.abs(sy-ey)} fill={lossC+"44"}/><line x1={X} y1={sy} x2={svgW} y2={sy} stroke={lossC} strokeWidth={1.5}/><text x={X+6} y={sy+12} style={{fontSize:9,fill:lossC,fontFamily:"monospace"}}>Stop {fmtPrc(d.pts[2].price)}</text>{sel&&H(stop.x,stop.y,d.id,2)}</g>;})()}
        {sel&&[H(entry.x,entry.y,d.id,0),H(tgt.x,tgt.y,d.id,1)]}
      </g>;
    }
    if (d.type==="daterange") {
      if (!d.pts||d.pts.length<2) return null;
      const p1=dataToSvgXY(d.pts[0].price,d.pts[0].time),p2=dataToSvgXY(d.pts[1].price,d.pts[1].time);
      if (p1.x==null) return null;
      const svgH=svgRef.current?.clientHeight??1000, x1=Math.min(p1.x!,p2.x!),x2=Math.max(p1.x!,p2.x!);
      return <g key={d.id}>
        <rect x={x1} y={0} width={x2-x1} height={svgH} fill={sc+"22"} {...hitProps}/>
        <line x1={p1.x!} y1={0} x2={p1.x!} y2={svgH} stroke={sc} strokeWidth={w} strokeDasharray="4 2"/>
        <line x1={p2.x!} y1={0} x2={p2.x!} y2={svgH} stroke={sc} strokeWidth={w} strokeDasharray="4 2"/>
        {sel&&[H(p1.x,svgH/2,d.id,0),H(p2.x,svgH/2,d.id,1)]}
      </g>;
    }
    if (d.type==="pricerange") {
      if (!d.pts||d.pts.length<2) return null;
      const y1=candleRef.current?.priceToCoordinate(d.pts[0].price),y2=candleRef.current?.priceToCoordinate(d.pts[1].price);
      if (y1==null||y2==null) return null;
      const svgW=svgRef.current?.clientWidth??3000;
      return <g key={d.id}>
        <rect x={0} y={Math.min(y1,y2)} width={svgW} height={Math.abs(y2-y1)} fill={sc+"22"} {...hitProps}/>
        <line x1={0} y1={y1} x2={svgW} y2={y1} stroke={sc} strokeWidth={w} strokeDasharray="4 2"/>
        <line x1={0} y1={y2} x2={svgW} y2={y2} stroke={sc} strokeWidth={w} strokeDasharray="4 2"/>
        {sel&&[H(svgW/2,y1,d.id,0),H(svgW/2,y2,d.id,1)]}
      </g>;
    }
    return null;
  }

  function renderWebDraw(d: any, i: number) {
    void drawTick;
    if (d.visible===false) return null;
    return renderOneDraw(d, d.id===selectedDrwId);
  }
  function renderWebCurrent() {
    if (!webCurrent) return null;
    const {type, pts, preview, free} = webCurrent;
    // freehand in progress
    if (type==="brush"||type==="highlighter") {
      if (!free||free.length<4) return null;
      const sw=type==="highlighter"?10:drwWidth, op=type==="highlighter"?0.4:1;
      let ptStr="";
      for (let i=0;i<free.length;i+=2) ptStr+=`${free[i].toFixed(1)},${free[i+1].toFixed(1)} `;
      return <polyline points={ptStr} stroke={drwColor} strokeWidth={sw} fill="none" strokeLinecap="round" opacity={op}/>;
    }
    // multi-point in progress
    if (!pts||pts.length===0) return null;
    const lines:React.ReactNode[]=[];
    for (let i=0;i<pts.length-1;i++) {
      const a=dataToSvgXY(pts[i].price,pts[i].time),b=dataToSvgXY(pts[i+1].price,pts[i+1].time);
      if (a.x!=null&&b.x!=null) lines.push(<line key={i} x1={a.x!} y1={a.y!} x2={b.x!} y2={b.y!} stroke={drwColor} strokeWidth={drwWidth} strokeDasharray="4 2"/>);
    }
    if (preview && pts.length>0) {
      const last=pts[pts.length-1], lp=dataToSvgXY(last.price,last.time);
      if (lp.x!=null) lines.push(<line key="prev" x1={lp.x!} y1={lp.y!} x2={preview.x} y2={preview.y} stroke={drwColor} strokeWidth={drwWidth} strokeDasharray="4 2" opacity={0.6}/>);
    }
    return <g>{lines}</g>;
  }

  function selectTf(tf: string) { setTfState(tf); setShowTf(false); }

  const isPos = (ohlcv?.chp ?? 0) >= 0;
  const ohlcvColor = ohlcv ? (isPos ? C.bull : C.bear) : C.bull;

  return (
    <div ref={wrapperRef} style={{ display:"flex", flexDirection:"column", width:"100%", height: isWebFS ? "100dvh" : "100%", background:C.bg, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", position:"relative", overflow:"hidden" }}>

      {/* ── Loading overlays ── */}
      {!dataLoaded && (
        <LoadingCandleAnimation overlay status="connecting" />
      )}
      {dataLoaded && (wsStatus === "reconnecting" || wsStatus === "error") && (
        <LoadingCandleAnimation overlay transparent size="sm" status={wsStatus as "reconnecting" | "error"} />
      )}

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

        {/* ── Drawing Sidebar ── */}
        <div style={{ width:44, background:C.panel, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", alignItems:"center", padding:"4px 0", gap:1, flexShrink:0, zIndex:20, overflow:"visible", position:"relative" }}>
          {/* Cursor */}
          <button title="Cursor" onClick={()=>handleToolClick("cursor")}
            style={{ width:34,height:32,display:"flex",alignItems:"center",justifyContent:"center",background:(!activeTool||activeTool==="cursor")?"#2962FF22":"none",border:"none",borderRadius:5,cursor:"pointer",color:(!activeTool||activeTool==="cursor")?"#2962FF":"#787b86",fontSize:14 }}>
            ⊕
          </button>
          {/* Tool groups */}
          {WEB_TOOL_GROUPS.slice(1).map(g=>{
            const isAct = g.items.some((it:any)=>it.id===activeTool);
            return (
              <div key={g.id} style={{position:"relative"}}>
                <button title={g.label}
                  onClick={()=>{ if(g.items.length===1){handleToolClick(g.items[0].id);setOpenSubGroup(null);}else{setOpenSubGroup(v=>v===g.id?null:g.id);}}}
                  style={{ width:34,height:32,display:"flex",alignItems:"center",justifyContent:"center",background:isAct?"#2962FF22":"none",border:"none",borderRadius:5,cursor:"pointer",color:isAct?"#2962FF":"#787b86",fontSize:13,fontWeight:"bold",position:"relative" }}>
                  {g.icon}
                  {g.items.length>1&&<span style={{position:"absolute",right:3,bottom:4,width:0,height:0,borderLeft:"3px solid transparent",borderRight:"3px solid transparent",borderTop:`3px solid ${isAct?"#2962FF":"#4a4e5a"}`}}/>}
                </button>
                {openSubGroup===g.id&&(
                  <div style={{ position:"fixed",left:46,background:C.panel,border:`1px solid ${C.border}`,borderRadius:7,minWidth:180,padding:"4px 0",zIndex:500,boxShadow:"0 4px 24px #00000090" }}>
                    <div style={{padding:"4px 12px",fontSize:9,fontWeight:"700",color:C.dim,textTransform:"uppercase",letterSpacing:".6px",borderBottom:`1px solid ${C.border}`,marginBottom:2}}>{g.label}</div>
                    {g.items.map((it:any)=>(
                      <button key={it.id} onClick={()=>{handleToolClick(it.id);setOpenSubGroup(null);}}
                        style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",fontSize:12,color:activeTool===it.id?"#2962FF":C.text,cursor:"pointer",border:"none",background:activeTool===it.id?"#2962FF18":"none",width:"100%",textAlign:"left" }}>
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
            <button key={t.id} title={t.label} onClick={()=>handleToolClick(t.id)}
              style={{ width:34,height:32,display:"flex",alignItems:"center",justifyContent:"center",background:(activeTool===t.id||(t.id==="hide"&&!showWebDraw))?"#2962FF22":"none",border:"none",borderRadius:5,cursor:"pointer",color:(activeTool===t.id||(t.id==="hide"&&!showWebDraw))?"#2962FF":"#787b86",fontSize:13 }}>
              {t.icon}
            </button>
          ))}
        </div>

        {/* Float menu for selected drawing */}
        {floatMenu&&(()=>{
          const d=webDrawings.find(x=>x.id===floatMenu.id);
          return d?<div style={{position:"fixed",left:Math.min(floatMenu.x,window.innerWidth-220),top:Math.max(floatMenu.y-70,50),background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 6px",display:"flex",alignItems:"center",gap:4,zIndex:600,boxShadow:"0 4px 20px #00000090"}}>
            <button onClick={()=>{setWebDrawings(ds=>ds.filter(x=>x.id!==floatMenu.id));setFloatMenu(null);setSelectedDrwId(null);}} style={{background:"none",border:"none",color:"#ef5350",cursor:"pointer",padding:"4px 8px",fontSize:11,borderRadius:4,display:"flex",alignItems:"center",gap:4}}>🗑 Delete</button>
            <div style={{width:1,height:18,background:C.border}}/>
            <input type="color" value={d.color||"#f0b90b"} onChange={e=>{setDrwColor(e.target.value);setWebDrawings(ds=>ds.map(x=>x.id===floatMenu.id?{...x,color:e.target.value}:x));}} style={{width:22,height:22,border:"2px solid #3a3e4a",borderRadius:4,cursor:"pointer",padding:0,background:"none"}}/>
            <div style={{width:1,height:18,background:C.border}}/>
            <button onClick={()=>{setWebDrawings(ds=>ds.map(x=>x.id===floatMenu.id?{...x,locked:!x.locked}:x));setFloatMenu(null);setSelectedDrwId(null);}} style={{background:"none",border:"none",color:"#f59e0b",cursor:"pointer",padding:"4px 8px",fontSize:11,borderRadius:4}}>
              {d.locked?"🔓 Unlock":"🔒 Lock"}
            </button>
            <button onClick={()=>{setFloatMenu(null);setSelectedDrwId(null);}} style={{background:"none",border:"none",color:"#787b86",cursor:"pointer",padding:"4px 8px",fontSize:12}}>✕</button>
          </div>:null;
        })()}

        {/* Backdrop to close submenus */}
        {openSubGroup&&<div style={{position:"fixed",inset:0,zIndex:499}} onClick={()=>setOpenSubGroup(null)}/>}

        {/* Chart container — fills remaining height via flex:1 */}
        <div style={{ flex:1, position:"relative", overflow:"hidden", minHeight: 0 }}>

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

          {/* ── SVG drawing overlay ── */}
          <svg
            ref={svgRef}
            style={{
              position:"absolute", top:0, left:0, width:"100%", height:"100%", overflow:"visible",
              pointerEvents: isDrawActive ? "all" : "none",
              cursor: isDrawActive ? "crosshair" : "default",
              touchAction: isDrawActive ? "none" : "auto",
            }}
            onMouseDown={handleSvgDown}
            onMouseMove={handleSvgMove}
            onMouseUp={handleSvgUp}
            onTouchStart={handleSvgTouchStart}
            onTouchMove={handleSvgTouchMove}
            onTouchEnd={handleSvgTouchEnd}
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
  if (Platform.OS === "web") {
    return <WebChart symbol={symbol} height={h} />;
  }
  // Android & iOS — WebView-based TradingView-style chart (lightweight-charts via CDN)
  return <NativeWebViewChart symbol={symbol} height={h} />;
}
