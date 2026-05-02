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

// ─── Left toolbar definition ──────────────────────────────────────────────────
const LEFT_TOOLS = [
  { id:"crosshair", Icon: IcCrosshair },
  { id:"trendline", Icon: IcTrend },
  { id:"hline",     Icon: IcHLine },
  { id:"pattern",   Icon: IcPattern },
  { id:"nodes",     Icon: IcNodes },
  { id:"brush",     Icon: IcBrush },
  { id:"text",      Icon: () => <span style={{fontSize:14,fontWeight:"700",fontFamily:"serif",lineHeight:"1"}}>T</span> },
  { id:"smile",     Icon: () => <span style={{fontSize:13}}>☺</span> },
  { id:"ruler",     Icon: IcRuler },
  { id:"zoom",      Icon: IcZoomIn },
  { id:"sep" } as any,
  { id:"magnet",    Icon: IcMagnet },
  { id:"lockedit",  Icon: IcLockEdit },
  { id:"lock",      Icon: IcLock },
  { id:"eye",       Icon: IcEye },
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

  const [timeframe,  setTfState]  = useState("5m");
  const [showTfMenu, setShowTf]   = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [ohlcv, setOhlcv]         = useState<{o:number;h:number;l:number;c:number;v:number;ch:number;chp:number}|null>(null);
  const [volCollapsed, setVolCollapsed] = useState(false);

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

    // WebSocket live
    const ws = new WebSocket(`wss://data-stream.binance.vision/ws/${binSym.toLowerCase()}@kline_${binInterval}`);
    wsRef.current = ws;
    ws.onmessage = (evt) => {
      const k = JSON.parse(evt.data).k;
      if (!candleRef.current) return;
      const c = { time: Math.floor(k.t/1000) as any, open:+k.o, high:+k.h, low:+k.l, close:+k.c, volume:+k.v };
      candleRef.current.update(c);
      if (volRef.current) {
        volRef.current.update({ time: c.time, value: c.volume, color: c.close >= c.open ? C.bull+"60" : C.bear+"60" });
      }
    };
  }, [volCollapsed]);

  // Reinit on symbol/timeframe change
  useEffect(() => {
    symRef.current = symbol;
    tfRef.current  = timeframe;
    initChart(symbol, timeframe);
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
      try { chartRef.current?.remove(); } catch {}
      chartRef.current = null;
    };
  }, [symbol, timeframe, initChart]);

  function selectTf(tf: string) { setTfState(tf); setShowTf(false); }

  const isPos = (ohlcv?.chp ?? 0) >= 0;
  const ohlcvColor = ohlcv ? (isPos ? C.bull : C.bear) : C.bull;

  return (
    <div style={{ display:"flex", flexDirection:"column", width:"100%", height, background:C.bg, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", position:"relative", overflow:"hidden" }}>

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
        <TBtn title="Fullscreen"><IcMax/></TBtn>
        <TBtn title="Take snapshot"><IcCamera/></TBtn>
      </div>

      {/* ── Body: sidebar + chart ── */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* Left sidebar */}
        <div style={{
          width:LEFT, background:C.panel, borderRight:`1px solid ${C.border}`,
          display:"flex", flexDirection:"column", alignItems:"center",
          paddingTop:6, paddingBottom:6, gap:1, flexShrink:0, overflowY:"auto",
        }}>
          {LEFT_TOOLS.map((t,i) => {
            if (t.id === "sep") return <div key={i} style={{ width:28, height:1, background:C.border, margin:"4px 0" }}/>;
            const Icon = t.Icon!;
            const active = activeTool === t.id;
            return (
              <button key={t.id} onClick={()=>setActiveTool(active?null:t.id)} title={t.id} style={{
                width:34, height:32, background: active ? C.gold+"22" : "none",
                border:"none", borderRadius:5, cursor:"pointer",
                color: active ? C.gold : C.dim,
                display:"flex", alignItems:"center", justifyContent:"center",
                transition:"color .15s,background .15s",
              }}
              onMouseEnter={e=>{ if(!active)(e.currentTarget as HTMLButtonElement).style.color=C.text; }}
              onMouseLeave={e=>{ if(!active)(e.currentTarget as HTMLButtonElement).style.color=C.dim; }}
              >
                <Icon/>
              </button>
            );
          })}
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

          {/* lightweight-charts mount point */}
          <div ref={containerRef} style={{ width:"100%", height:"100%" }}/>
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
function TBtn({ children, title, active }: { children: React.ReactNode; title?: string; active?: boolean }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      title={title}
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
