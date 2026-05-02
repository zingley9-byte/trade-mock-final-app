/**
 * MobileCandleChart — Full TradingView-style chart for React Native + Web
 * ALL TOOLS WORKING: cursor, hline, trendline, channel, brush, text, emoji, ruler, zoom
 * Toggle tools: magnet (snap to OHLC), eye (hide/show), lock, lockedit
 * Fullscreen via Modal • Binance REST+WS • Pan/Pinch/PriceScale gestures
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  PanResponder, useWindowDimensions, Platform, Modal, Dimensions, StatusBar,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Svg, { Rect, Line, Text as SvgText, G, Polyline } from "react-native-svg";

// ─── Theme ─────────────────────────────────────────────────────────────────
const C = {
  bg: "#131722", panel: "#1e222d", border: "#2a2e39",
  bull: "#26a69a", bear: "#ef5350", dim: "#787b86",
  text: "#d1d4dc", cross: "#758696", gold: "#f0b90b", warn: "#f59e0b",
};

// ─── Layout ────────────────────────────────────────────────────────────────
const TOP_H   = 42;
const BOT_H   = 32;
const LEFT_W  = 44;
const PRICE_W = 70;
const TIME_H  = 24;
const VOL_R   = 0.18;
const MIN_VIS = 15;
const MAX_VIS = 400;
const DEF_VIS = 80;

// ─── Timeframes ────────────────────────────────────────────────────────────
const TF_LIST = [
  {label:"1m",bin:"1m"},{label:"3m",bin:"3m"},{label:"5m",bin:"5m"},
  {label:"15m",bin:"15m"},{label:"30m",bin:"30m"},{label:"1h",bin:"1h"},
  {label:"4h",bin:"4h"},{label:"1D",bin:"1d"},{label:"1W",bin:"1w"},
];

// ─── Types ─────────────────────────────────────────────────────────────────
interface Candle { time:number; open:number; high:number; low:number; close:number; volume:number; }
type WsStatus = "connecting"|"live"|"reconnecting"|"error";
type DrawTool = "cursor"|"trendline"|"hline"|"channel"|"brush"|"text"|"emoji"|"ruler"|"zoom"|null;
type GMode    = "none"|"pan"|"pinch"|"pscale";

type Drawing =
  | { type:"hline";   price:number }
  | { type:"tl";      x1:number; y1:number; x2:number; y2:number }
  | { type:"ch";      x1:number; y1:number; x2:number; y2:number; gap:number }
  | { type:"brush";   pts:number[] }           // flat: x0,y0, x1,y1, ...
  | { type:"txt";     x:number; y:number }
  | { type:"pin";     x:number; y:number }
  | { type:"ruler";   x1:number; y1:number; x2:number; y2:number; p1:number; p2:number };

// ─── Helpers ───────────────────────────────────────────────────────────────
function toBinSym(s: string) {
  const u = s.replace("/","").toUpperCase();
  return u.endsWith("USDT") ? u : u+"USDT";
}
function fmtP(p: number): string {
  if (!p) return "—";
  if (p >= 100000) return p.toFixed(0);
  if (p >= 1000)   return p.toLocaleString("en-US",{minimumFractionDigits:1,maximumFractionDigits:1});
  if (p >= 10)     return p.toFixed(2);
  if (p >= 1)      return p.toFixed(4);
  return p.toFixed(6);
}
function fmtTime(ts:number, bin:string) {
  const d = new Date(ts*1000);
  if (bin==="1d"||bin==="1w") return `${d.getDate()}/${d.getMonth()+1}`;
  return `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
}
function useIST() {
  const [t, setT] = useState("");
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      const ist = new Date(n.getTime()+n.getTimezoneOffset()*60000+5.5*3600000);
      setT(`${ist.getHours().toString().padStart(2,"0")}:${ist.getMinutes().toString().padStart(2,"0")}:${ist.getSeconds().toString().padStart(2,"0")}`);
    };
    tick(); const id=setInterval(tick,1000); return ()=>clearInterval(id);
  },[]);
  return t;
}

// ─── Candle icon (SVG) ─────────────────────────────────────────────────────
function IcCandleRN({color}:{color:string}) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round">
      <Line x1="5" y1="3" x2="5" y2="5"/><Rect x="3.5" y="5" width="3" height="6" rx="0.5" fill="none"/><Line x1="5" y1="11" x2="5" y2="14"/>
      <Line x1="12" y1="2" x2="12" y2="5"/><Rect x="10.5" y="5" width="3" height="9" rx="0.5" fill="none"/><Line x1="12" y1="14" x2="12" y2="17"/>
      <Line x1="19" y1="5" x2="19" y2="8"/><Rect x="17.5" y="8" width="3" height="5" rx="0.5" fill="none"/><Line x1="19" y1="13" x2="19" y2="16"/>
    </Svg>
  );
}

// ─── Left toolbar definition ───────────────────────────────────────────────
// toggle:true → stays active alongside drawing tools (independent state)
const LEFT_TOOLS: Array<{id:string; icon:string; toggle?:boolean} | {id:"sep"}> = [
  {id:"cursor",   icon:"crosshair"},
  {id:"trendline",icon:"trending-up"},
  {id:"hline",    icon:"minus"},
  {id:"channel",  icon:"align-justify"},
  {id:"brush",    icon:"edit-2"},
  {id:"text",     icon:"type"},
  {id:"emoji",    icon:"smile"},
  {id:"ruler",    icon:"tool"},
  {id:"zoom",     icon:"zoom-in"},
  {id:"sep"},
  {id:"magnet",   icon:"anchor",   toggle:true},
  {id:"lockedit", icon:"edit",     toggle:true},
  {id:"lock",     icon:"lock",     toggle:true},
  {id:"eye",      icon:"eye",      toggle:true},
];

// ─── Tool hint strings ─────────────────────────────────────────────────────
const TOOL_HINTS: Record<string,string> = {
  cursor:   "Touch to move crosshair",
  trendline:"Drag to draw trend line",
  hline:    "Tap to place price level",
  channel:  "Drag to draw channel",
  brush:    "Drag to draw freehand",
  text:     "Tap to add text label",
  emoji:    "Tap to add pin marker",
  ruler:    "Drag to measure price",
  zoom:     "Drag to zoom in",
};

// ─── Component ─────────────────────────────────────────────────────────────
export default function MobileCandleChart({
  symbol = "BTCUSDT",
  height = 340,
  onPrice,
}: {
  symbol?:  string;
  height?:  number;
  onPrice?: (p:number)=>void;
}) {
  const {width:SW} = useWindowDimensions();
  const istTime = useIST();

  // ── Fullscreen override ────────────────────────────────────────────────
  const [isFS, setIsFS] = useState(false);
  // fsPad = status-bar height + 12 px breathing room so the toolbar isn't flush against the edge
  const fsPad = isFS ? (StatusBar.currentHeight ?? 0) + 12 : 0;
  const FSW = isFS ? Dimensions.get("window").width  : SW;
  // Subtract fsPad so chartContent height fits exactly within Modal after top padding
  const FSH = isFS ? Dimensions.get("window").height - fsPad : height;

  const chartW = FSW - LEFT_W;
  const plotW  = chartW - PRICE_W;
  const chartH = FSH  - TOP_H - BOT_H;
  const areaH  = chartH - TIME_H;
  const volH   = Math.round(areaH * VOL_R);
  const priceH = areaH - volH;

  // ── Data state ─────────────────────────────────────────────────────────
  const [tf,         setTf]         = useState("5m");
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [wsStatus,   setWsStatus]   = useState<WsStatus>("connecting");
  const [tick,       setTick]       = useState(0);

  // ── Tool state ─────────────────────────────────────────────────────────
  const [drawTool,   setDrawTool]   = useState<DrawTool>(null);
  const [magnetOn,   setMagnetOn]   = useState(false);
  const [lockOn,     setLockOn]     = useState(false);
  const [editLock,   setEditLock]   = useState(false);
  const [showDraw,   setShowDraw]   = useState(true);
  const [showTfMenu, setShowTfMenu] = useState(false);
  const [drawings,   setDrawings]   = useState<Drawing[]>([]);

  // ── Refs ───────────────────────────────────────────────────────────────
  const candlesRef  = useRef<Candle[]>([]);
  const visRef      = useRef(DEF_VIS);
  const offsetRef   = useRef(0);
  const wsRef       = useRef<WebSocket|null>(null);
  const retryTimer  = useRef<ReturnType<typeof setTimeout>|null>(null);
  const retryDelay  = useRef(3000);
  const loadIdRef   = useRef(0);
  const mountedRef  = useRef(true);
  const pricePadRef = useRef(0.08);

  // Synced every render for stable PanResponder callbacks
  const drawToolRef = useRef<DrawTool>(null);
  const magnetRef   = useRef(false);
  const plotWRef    = useRef(plotW);
  const priceHRef   = useRef(priceH);
  const minPRef     = useRef(0);
  const pRangeRef   = useRef(1);
  const visSnapRef  = useRef<Candle[]>([]);
  const candleWRef  = useRef(8);
  const gState      = useRef<{mode:GMode;prevX:number;prevY:number;prevDist:number}>({mode:"none",prevX:0,prevY:0,prevDist:0});
  const curDrawRef  = useRef<any>(null);   // in-progress drawing data
  const crossRef    = useRef<{x:number;y:number}|null>(null);
  const zoomBoxRef  = useRef<{x1:number;y1:number;x2:number;y2:number}|null>(null);

  // Sync refs every render
  drawToolRef.current = drawTool;
  magnetRef.current   = magnetOn;
  plotWRef.current    = plotW;
  priceHRef.current   = priceH;

  const redraw = useCallback(()=>{ if(mountedRef.current) setTick(t=>t+1); },[]);
  useEffect(()=>{ mountedRef.current=true; return ()=>{ mountedRef.current=false; }; },[]);

  // ── WebSocket ──────────────────────────────────────────────────────────
  const connectWS = useCallback((loadId:number, binSym:string, binInterval:string)=>{
    if (!mountedRef.current||loadIdRef.current!==loadId) return;
    if (retryTimer.current){ clearTimeout(retryTimer.current); retryTimer.current=null; }
    wsRef.current?.close(); wsRef.current=null;
    setWsStatus("connecting");
    const ws = new WebSocket(`wss://data-stream.binance.vision/ws/${binSym.toLowerCase()}@kline_${binInterval}`);
    wsRef.current=ws;
    ws.onopen  = ()=>{ if(mountedRef.current&&loadIdRef.current===loadId){ setWsStatus("live"); retryDelay.current=3000; } };
    ws.onmessage = (evt)=>{
      if (!mountedRef.current||loadIdRef.current!==loadId) return;
      try {
        const k = JSON.parse(evt.data).k;
        const nc:Candle = {time:Math.floor(k.t/1000),open:+k.o,high:+k.h,low:+k.l,close:+k.c,volume:+k.v};
        const arr = candlesRef.current;
        if (arr.length&&arr[arr.length-1].time===nc.time) arr[arr.length-1]=nc;
        else { arr.push(nc); if(arr.length>1000) arr.shift(); }
        if (offsetRef.current===0) redraw();
        onPrice?.(nc.close);
      } catch {}
    };
    ws.onerror = ()=>{ if(mountedRef.current&&loadIdRef.current===loadId) setWsStatus("error"); };
    ws.onclose = ()=>{
      if (!mountedRef.current||loadIdRef.current!==loadId) return;
      setWsStatus("reconnecting");
      const d=retryDelay.current; retryDelay.current=Math.min(d*2,30000);
      retryTimer.current=setTimeout(()=>connectWS(loadId,binSym,binInterval),d);
    };
  },[onPrice,redraw]);

  // ── Load ───────────────────────────────────────────────────────────────
  const load = useCallback(async (sym:string, selectedTf:string)=>{
    const loadId = ++loadIdRef.current;
    if (retryTimer.current){ clearTimeout(retryTimer.current); retryTimer.current=null; }
    wsRef.current?.close(); wsRef.current=null;
    retryDelay.current=3000;
    setLoading(true); setFetchError(false);
    const binSym = toBinSym(sym);
    const binInterval = TF_LIST.find(t=>t.label===selectedTf)?.bin??"5m";
    try {
      const res = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${binSym}&interval=${binInterval}&limit=500`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Bad data");
      if (!mountedRef.current||loadIdRef.current!==loadId) return;
      candlesRef.current = data.map((d:any[])=>({time:Math.floor(d[0]/1000),open:+d[1],high:+d[2],low:+d[3],close:+d[4],volume:+d[5]}));
      offsetRef.current=0;
      if (onPrice&&candlesRef.current.length) onPrice(candlesRef.current[candlesRef.current.length-1].close);
      setLoading(false); setFetchError(false); redraw();
    } catch {
      if (mountedRef.current&&loadIdRef.current===loadId){ setLoading(false); setFetchError(true); }
      return;
    }
    connectWS(loadId,binSym,binInterval);
  },[onPrice,redraw,connectWS]);

  useEffect(()=>{
    load(symbol,tf);
    return ()=>{
      if (retryTimer.current) clearTimeout(retryTimer.current);
      wsRef.current?.close(); wsRef.current=null; loadIdRef.current++;
    };
  },[symbol,tf,load]);

  // ── Magnet: snap to nearest OHLC of nearest candle ────────────────────
  function snapCoord(lx:number, ly:number):{x:number;y:number} {
    if (!magnetRef.current||!visSnapRef.current.length) return {x:lx,y:ly};
    const cw = plotWRef.current/Math.max(1,visSnapRef.current.length);
    const idx = Math.min(visSnapRef.current.length-1,Math.max(0,Math.floor(lx/cw)));
    const c = visSnapRef.current[idx];
    if (!c) return {x:lx,y:ly};
    const tY2 = (p:number)=>priceHRef.current*(1-(p-minPRef.current)/pRangeRef.current);
    const cx=(idx+0.5)*cw;
    let nearY=ly, minD=Infinity;
    for (const p of [c.open,c.high,c.low,c.close]) {
      const py=tY2(p);
      if (Math.abs(py-ly)<minD){ minD=Math.abs(py-ly); nearY=py; }
    }
    return {x:cx,y:nearY};
  }

  // ── PanResponder ───────────────────────────────────────────────────────
  const panResponder = useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:        ()=>true,
    onMoveShouldSetPanResponder:         ()=>true,
    onStartShouldSetPanResponderCapture: ()=>true,

    onPanResponderGrant: (evt)=>{
      const raw = {x:evt.nativeEvent.locationX??0, y:evt.nativeEvent.locationY??0};
      const {x,y} = snapCoord(raw.x, raw.y);
      const t = evt.nativeEvent.touches;
      const tool = drawToolRef.current;

      // ── Drawing tools ──────────────────────────────────────────────
      if (tool==="hline") {
        const price=minPRef.current+(1-y/priceHRef.current)*pRangeRef.current;
        setDrawings(d=>[...d,{type:"hline",price}]);
        setDrawTool(null); return;
      }
      if (tool==="trendline"||tool==="channel") {
        curDrawRef.current={type:tool,x1:x,y1:y,x2:x,y2:y};
        redraw(); return;
      }
      if (tool==="brush") {
        curDrawRef.current={type:"brush",pts:[x,y]};
        redraw(); return;
      }
      if (tool==="text") {
        setDrawings(d=>[...d,{type:"txt",x,y}]);
        setDrawTool(null); return;
      }
      if (tool==="emoji") {
        setDrawings(d=>[...d,{type:"pin",x,y}]);
        setDrawTool(null); return;
      }
      if (tool==="ruler") {
        const p1=minPRef.current+(1-y/priceHRef.current)*pRangeRef.current;
        curDrawRef.current={type:"ruler",x1:x,y1:y,x2:x,y2:y,p1,p2:p1};
        redraw(); return;
      }
      if (tool==="cursor") {
        crossRef.current={x,y}; redraw(); return;
      }
      if (tool==="zoom") {
        zoomBoxRef.current={x1:x,y1:y,x2:x,y2:y}; redraw(); return;
      }

      // ── Navigation: pan / pinch / price-scale drag ────────────────
      if (raw.x>plotWRef.current) {
        gState.current={mode:"pscale",prevX:0,prevY:t[0]?.pageY??0,prevDist:0};
      } else if (t.length>=2) {
        const dx=t[1].pageX-t[0].pageX, dy=t[1].pageY-t[0].pageY;
        gState.current={mode:"pinch",prevX:0,prevY:0,prevDist:Math.hypot(dx,dy)};
      } else {
        gState.current={mode:"pan",prevX:t[0]?.pageX??0,prevY:0,prevDist:0};
      }
    },

    onPanResponderMove: (evt)=>{
      const raw = {x:evt.nativeEvent.locationX??0, y:evt.nativeEvent.locationY??0};
      const {x,y} = snapCoord(raw.x, raw.y);
      const t = evt.nativeEvent.touches;
      const gs = gState.current;
      const tool = drawToolRef.current;

      if (tool==="cursor") { crossRef.current={x,y}; redraw(); return; }
      if (tool==="trendline"||tool==="channel") {
        if (curDrawRef.current) { curDrawRef.current={...curDrawRef.current,x2:x,y2:y}; redraw(); }
        return;
      }
      if (tool==="brush") {
        if (curDrawRef.current) { curDrawRef.current={...curDrawRef.current,pts:[...curDrawRef.current.pts,x,y]}; redraw(); }
        return;
      }
      if (tool==="ruler") {
        if (curDrawRef.current) {
          const p2=minPRef.current+(1-y/priceHRef.current)*pRangeRef.current;
          curDrawRef.current={...curDrawRef.current,x2:x,y2:y,p2};
          redraw();
        }
        return;
      }
      if (tool==="zoom") {
        if (zoomBoxRef.current) { zoomBoxRef.current={...zoomBoxRef.current,x2:x,y2:y}; redraw(); }
        return;
      }

      // Navigation
      if (gs.mode==="pscale") {
        const dy=(t[0]?.pageY??0)-gs.prevY;
        if (Math.abs(dy)>0.3) {
          pricePadRef.current=Math.max(0.01,Math.min(3.0,pricePadRef.current*(1+dy*0.006)));
          gs.prevY=t[0]?.pageY??gs.prevY; redraw();
        }
      } else if (t.length>=2&&gs.mode==="pinch") {
        const dx=t[1].pageX-t[0].pageX, dy=t[1].pageY-t[0].pageY;
        const dist=Math.hypot(dx,dy);
        if (gs.prevDist>0) {
          const scale=dist/gs.prevDist;
          if (Math.abs(scale-1)>0.005) {
            visRef.current=Math.max(MIN_VIS,Math.min(MAX_VIS,Math.round(visRef.current/scale)));
            gs.prevDist=dist; redraw();
          }
        } else gs.prevDist=dist;
      } else if (t.length===1&&gs.mode==="pan") {
        const dx=(t[0]?.pageX??0)-gs.prevX;
        const cw=plotWRef.current/Math.max(1,visRef.current);
        const delta=Math.round(-dx/cw);
        if (delta!==0) {
          const maxO=Math.max(0,candlesRef.current.length-visRef.current);
          offsetRef.current=Math.max(0,Math.min(maxO,offsetRef.current+delta));
          gs.prevX=t[0]?.pageX??gs.prevX; redraw();
        }
      }
    },

    onPanResponderRelease: (evt)=>{
      const raw = {x:evt.nativeEvent.locationX??0, y:evt.nativeEvent.locationY??0};
      const {x,y} = snapCoord(raw.x, raw.y);
      const tool = drawToolRef.current;

      if ((tool==="trendline"||tool==="channel")&&curDrawRef.current) {
        const cd=curDrawRef.current;
        if (Math.abs(x-cd.x1)>5||Math.abs(y-cd.y1)>5) {
          if (tool==="trendline") setDrawings(d=>[...d,{type:"tl",x1:cd.x1,y1:cd.y1,x2:x,y2:y}]);
          else                    setDrawings(d=>[...d,{type:"ch",x1:cd.x1,y1:cd.y1,x2:x,y2:y,gap:32}]);
        }
        curDrawRef.current=null; setDrawTool(null);
      }
      else if (tool==="brush"&&curDrawRef.current?.pts?.length>4) {
        setDrawings(d=>[...d,{type:"brush",pts:curDrawRef.current.pts}]);
        curDrawRef.current=null; setDrawTool(null);
      }
      else if (tool==="ruler"&&curDrawRef.current) {
        const cd=curDrawRef.current;
        const p2=minPRef.current+(1-y/priceHRef.current)*pRangeRef.current;
        if (Math.abs(y-cd.y1)>5) setDrawings(d=>[...d,{type:"ruler",x1:cd.x1,y1:cd.y1,x2:x,y2:y,p1:cd.p1,p2}]);
        curDrawRef.current=null; setDrawTool(null);
      }
      else if (tool==="zoom"&&zoomBoxRef.current) {
        const zb=zoomBoxRef.current;
        const bx1=Math.min(zb.x1,zb.x2), bx2=Math.max(zb.x1,zb.x2);
        const newVis=Math.max(MIN_VIS,Math.round((bx2-bx1)/candleWRef.current));
        const startIdx=Math.floor(bx1/candleWRef.current);
        const newOff=Math.max(0,candlesRef.current.length-startIdx-newVis);
        visRef.current=newVis; offsetRef.current=newOff;
        zoomBoxRef.current=null; setDrawTool(null); redraw();
      }
      gState.current.mode="none";
    },
  }),[redraw]);

  // ── Mouse wheel zoom (web) ─────────────────────────────────────────────
  const handleWheel = useCallback((e:any)=>{
    e.preventDefault?.();
    visRef.current=Math.max(MIN_VIS,Math.min(MAX_VIS,Math.round(visRef.current*(e.deltaY>0?1.12:0.88))));
    redraw();
  },[redraw]);

  // ── Derived chart values ───────────────────────────────────────────────
  const all   = candlesRef.current;
  const total = all.length;
  const vc    = Math.min(visRef.current,total);
  const end   = total-offsetRef.current;
  const start = Math.max(0,end-vc);
  const vis   = all.slice(start,end);

  let minP=Infinity, maxP=-Infinity, maxVol=1;
  for (const c of vis) {
    if (c.low<minP) minP=c.low;
    if (c.high>maxP) maxP=c.high;
    if (c.volume>maxVol) maxVol=c.volume;
  }
  if (!vis.length){ minP=0; maxP=1; }
  const pad=(maxP-minP)*pricePadRef.current;
  minP-=pad; maxP+=pad;
  const pRange=maxP-minP||1;
  minPRef.current=minP; pRangeRef.current=pRange;
  visSnapRef.current=vis;

  const toY    = (p:number) => priceH*(1-(p-minP)/pRange);
  const toVolY = (v:number) => volH-(v/maxVol)*volH*0.9;
  const candleW = vis.length>0 ? plotW/vis.length : 8;
  const bodyW   = Math.max(1,candleW*0.68);
  candleWRef.current=candleW;

  const gridLevels = Array.from({length:5},(_,i)=>{ const p=minP+pRange*(i/4); return {price:p,y:toY(p)}; });
  const tfBin = TF_LIST.find(t=>t.label===tf)?.bin??"5m";
  const timeLabelStep = Math.max(1,Math.floor(vis.length/6));
  const timeLabels = vis.filter((_,i)=>i%timeLabelStep===0).map((c,i)=>({x:(i*timeLabelStep+0.5)*candleW,label:fmtTime(c.time,tfBin)}));
  const lastC = vis.length?vis[vis.length-1]:null;

  const crossXY  = drawTool==="cursor" ? crossRef.current : null;
  const crossIdx = crossXY ? Math.min(vis.length-1,Math.max(0,Math.floor(crossXY.x/candleW))) : -1;
  const crossC   = crossIdx>=0 ? vis[crossIdx] : null;

  const wsBadge = wsStatus==="live"?{color:C.bull,label:"● LIVE"}:wsStatus==="reconnecting"?{color:C.warn,label:"↻ Reconnecting…"}:wsStatus==="error"?{color:C.bear,label:"✕ WS Error"}:{color:C.dim,label:"○ Connecting…"};
  const webTouch:any = Platform.OS==="web" ? {touchAction:"none"} : {};

  // Tool active check
  const isActive = (id:string)=>{
    if (id==="magnet")   return magnetOn;
    if (id==="lock")     return lockOn;
    if (id==="lockedit") return editLock;
    if (id==="eye")      return !showDraw;
    return drawTool===id;
  };
  const handleToolPress = (id:string)=>{
    if (id==="magnet")   { setMagnetOn(v=>!v); return; }
    if (id==="lock")     { setLockOn(v=>!v); return; }
    if (id==="lockedit") { setEditLock(v=>!v); return; }
    if (id==="eye")      { setShowDraw(v=>!v); return; }
    setDrawTool(prev=>prev===id?null:id as DrawTool);
  };

  // ── SVG drawing renderers ──────────────────────────────────────────────
  function renderDraw(d:Drawing, i:number) {
    if (d.type==="hline") {
      const py=toY(d.price);
      if (py<-20||py>priceH+20) return null;
      return (
        <G key={`d${i}`}>
          <Line x1={0} y1={py} x2={plotW} y2={py} stroke={C.gold} strokeWidth={1} strokeDasharray="4 2"/>
          <Rect x={plotW+2} y={py-8} width={PRICE_W-4} height={16} rx={3} fill={C.gold+"44"}/>
          <SvgText x={plotW+5} y={py+4} fontSize={9} fill={C.gold}>{fmtP(d.price)}</SvgText>
        </G>
      );
    }
    if (d.type==="tl") return <Line key={`d${i}`} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={C.gold} strokeWidth={1.5}/>;
    if (d.type==="ch") return (
      <G key={`d${i}`}>
        <Line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={C.gold} strokeWidth={1.5}/>
        <Line x1={d.x1} y1={d.y1-d.gap} x2={d.x2} y2={d.y2-d.gap} stroke={C.gold} strokeWidth={1} strokeDasharray="4 2"/>
        <Line x1={d.x1} y1={d.y1+d.gap} x2={d.x2} y2={d.y2+d.gap} stroke={C.gold} strokeWidth={1} strokeDasharray="4 2"/>
      </G>
    );
    if (d.type==="brush") {
      if (d.pts.length<4) return null;
      const ps=[];
      for (let j=0;j<d.pts.length;j+=2) ps.push(`${d.pts[j]},${d.pts[j+1]}`);
      return <Polyline key={`d${i}`} points={ps.join(" ")} stroke={C.gold} strokeWidth={1.5} fill="none"/>;
    }
    if (d.type==="txt")
      return <SvgText key={`d${i}`} x={d.x} y={d.y} fontSize={14} fill={C.gold} fontWeight="bold">A</SvgText>;
    if (d.type==="pin")
      return (
        <G key={`d${i}`}>
          <Rect x={d.x-5} y={d.y-16} width={10} height={14} rx={3} fill={C.gold}/>
          <Line x1={d.x} y1={d.y-2} x2={d.x} y2={d.y+4} stroke={C.gold} strokeWidth={2}/>
        </G>
      );
    if (d.type==="ruler") {
      const diff=Math.abs(d.p2-d.p1);
      const pct=d.p1?(diff/Math.abs(d.p1)*100).toFixed(2):"0.00";
      const mx=(d.x1+d.x2)/2, my=(d.y1+d.y2)/2;
      return (
        <G key={`d${i}`}>
          <Line x1={Math.min(d.x1,d.x2)} y1={d.y1} x2={Math.max(d.x1,d.x2)} y2={d.y1} stroke={C.gold} strokeWidth={1}/>
          <Line x1={d.x2} y1={d.y1} x2={d.x2} y2={d.y2} stroke={C.gold} strokeWidth={1}/>
          <Line x1={Math.min(d.x1,d.x2)} y1={d.y2} x2={Math.max(d.x1,d.x2)} y2={d.y2} stroke={C.gold} strokeWidth={1}/>
          <Rect x={mx-30} y={my-9} width={60} height={18} rx={3} fill={C.panel}/>
          <SvgText x={mx} y={my+4} fontSize={9} fill={C.gold} textAnchor="middle">{fmtP(diff)}</SvgText>
          <SvgText x={mx} y={my-12} fontSize={8} fill={C.dim} textAnchor="middle">{pct}%</SvgText>
        </G>
      );
    }
    return null;
  }

  function renderCurrentDraw() {
    const zb=zoomBoxRef.current;
    if (zb) {
      const x=Math.min(zb.x1,zb.x2), y=Math.min(zb.y1,zb.y2);
      return <Rect x={x} y={y} width={Math.abs(zb.x2-zb.x1)} height={Math.abs(zb.y2-zb.y1)} fill={C.gold+"22"} stroke={C.gold} strokeWidth={1} strokeDasharray="4 2"/>;
    }
    const cd=curDrawRef.current;
    if (!cd) return null;
    if (cd.type==="trendline"||cd.type==="channel") return (
      <G>
        <Line x1={cd.x1} y1={cd.y1} x2={cd.x2} y2={cd.y2} stroke={C.gold} strokeWidth={1} strokeDasharray="4 2"/>
        {cd.type==="channel" && <>
          <Line x1={cd.x1} y1={cd.y1-32} x2={cd.x2} y2={cd.y2-32} stroke={C.gold} strokeWidth={1} strokeDasharray="4 2"/>
          <Line x1={cd.x1} y1={cd.y1+32} x2={cd.x2} y2={cd.y2+32} stroke={C.gold} strokeWidth={1} strokeDasharray="4 2"/>
        </>}
      </G>
    );
    if (cd.type==="brush") {
      const pts=cd.pts as number[];
      if (pts.length<4) return null;
      const ps=[];
      for (let j=0;j<pts.length;j+=2) ps.push(`${pts[j]},${pts[j+1]}`);
      return <Polyline points={ps.join(" ")} stroke={C.gold} strokeWidth={1.5} fill="none" strokeDasharray="4 2"/>;
    }
    if (cd.type==="ruler") return (
      <G>
        <Line x1={Math.min(cd.x1,cd.x2)} y1={cd.y1} x2={Math.max(cd.x1,cd.x2)} y2={cd.y1} stroke={C.gold} strokeWidth={1}/>
        <Line x1={cd.x2} y1={cd.y1} x2={cd.x2} y2={cd.y2} stroke={C.gold} strokeWidth={1}/>
        <Line x1={Math.min(cd.x1,cd.x2)} y1={cd.y2} x2={Math.max(cd.x1,cd.x2)} y2={cd.y2} stroke={C.gold} strokeWidth={1}/>
      </G>
    );
    return null;
  }

  // ── Loading ────────────────────────────────────────────────────────────
  const topBarProps = {tf,setTf,showMenu:showTfMenu,setShowMenu:setShowTfMenu,isFS,onFS:()=>setIsFS(v=>!v)};

  if (loading) return (
    <View style={[ss.root,{height:FSH,width:FSW},webTouch]}>
      <ChartTopBar {...topBarProps}/>
      <View style={ss.center}>
        <ActivityIndicator color={C.bull} size="small"/>
        <Text style={ss.dimTxt}>Loading chart…</Text>
      </View>
    </View>
  );

  if (fetchError&&!vis.length) return (
    <View style={[ss.root,{height:FSH,width:FSW},webTouch]}>
      <ChartTopBar {...topBarProps}/>
      <View style={ss.center}>
        <Text style={{fontSize:24,color:C.warn}}>⚠</Text>
        <Text style={{color:C.text,fontSize:14,fontWeight:"600"}}>Failed to load chart</Text>
        <Text style={ss.dimTxt}>Check your internet connection</Text>
        <TouchableOpacity onPress={()=>load(symbol,tf)} style={ss.retryBtn}>
          <Text style={ss.retryBtnTxt}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const chartAreaProps:any = {
    ...panResponder.panHandlers,
    style:[ss.chartArea,{height:chartH},webTouch],
    ...(Platform.OS==="web"?{onWheel:handleWheel}:{}),
  };

  // ── Main chart content ─────────────────────────────────────────────────
  const chartContent = (
    <View style={[ss.root,{height:FSH,width:FSW},webTouch]}>

      {/* TOP TOOLBAR */}
      <ChartTopBar {...topBarProps}/>

      {/* TF dropdown */}
      {showTfMenu && (
        <View style={ss.menuLayer} pointerEvents="box-none">
          <TouchableOpacity style={ss.backdrop} onPress={()=>setShowTfMenu(false)}/>
          <View style={ss.tfBox}>
            {TF_LIST.map(t=>(
              <TouchableOpacity key={t.label}
                style={[ss.tfItem, tf===t.label&&ss.tfItemActive]}
                onPress={()=>{ setTf(t.label); setShowTfMenu(false); }}>
                <Text style={[ss.tfItemTxt, tf===t.label&&{color:C.bull}]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* WS reconnect strip */}
      {(wsStatus==="reconnecting"||wsStatus==="error") && (
        <View style={ss.reconnStrip}>
          <Text style={[ss.reconnTxt,{color:wsStatus==="error"?C.bear:C.warn}]}>
            {wsStatus==="error"?"WebSocket error · Retrying…":"WS disconnected · Reconnecting…"}
          </Text>
        </View>
      )}

      {/* BODY */}
      <View style={[ss.body,webTouch]}>

        {/* LEFT TOOLBAR */}
        <View style={[ss.leftBar,{borderRightColor:C.border}]}>
          {LEFT_TOOLS.map((t,i)=>{
            if (t.id==="sep") return <View key={`sep${i}`} style={[ss.toolSep,{backgroundColor:C.border}]}/>;
            const tool = t as {id:string;icon:string};
            const active = isActive(tool.id);
            return (
              <TouchableOpacity key={tool.id} onPress={()=>handleToolPress(tool.id)}
                style={[ss.toolBtn, active&&ss.toolBtnActive]}>
                <Feather name={tool.icon as any} size={15} color={active?C.gold:C.dim}/>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CHART SVG */}
        <View {...chartAreaProps}>
          <Svg width={chartW} height={chartH}>

            {/* Grid */}
            {gridLevels.map((gl,i)=><Line key={`g${i}`} x1={0} y1={gl.y} x2={plotW} y2={gl.y} stroke={C.border} strokeWidth={0.5}/>)}

            {/* Candles */}
            {vis.map((c,i)=>{
              const bull=c.close>=c.open, col=bull?C.bull:C.bear;
              const cx=(i+0.5)*candleW;
              const bT=toY(Math.max(c.open,c.close)), bB=toY(Math.min(c.open,c.close));
              return (
                <G key={c.time}>
                  <Line x1={cx} y1={toY(c.high)} x2={cx} y2={bT} stroke={col} strokeWidth={1}/>
                  <Rect x={cx-bodyW/2} y={bT} width={bodyW} height={Math.max(1,bB-bT)} fill={bull?col:"none"} stroke={col} strokeWidth={bull?0:0.8}/>
                  <Line x1={cx} y1={bB} x2={cx} y2={toY(c.low)} stroke={col} strokeWidth={1}/>
                </G>
              );
            })}

            {/* Price axis */}
            <Line x1={plotW} y1={0} x2={plotW} y2={areaH} stroke={C.border} strokeWidth={0.5}/>
            {gridLevels.map((gl,i)=><SvgText key={`pl${i}`} x={plotW+5} y={gl.y+4} fontSize={9} fill={C.dim}>{fmtP(gl.price)}</SvgText>)}

            {/* Live price line + label */}
            {lastC&&(()=>{
              const py=toY(lastC.close), col=lastC.close>=lastC.open?C.bull:C.bear;
              return (
                <G>
                  <Line x1={0} y1={py} x2={plotW} y2={py} stroke={col} strokeWidth={0.6} strokeDasharray="3 2"/>
                  <Rect x={plotW+2} y={py-8} width={PRICE_W-4} height={16} rx={3} fill={col}/>
                  <SvgText x={plotW+PRICE_W/2} y={py+4} fontSize={9} fill="#fff" textAnchor="middle" fontWeight="bold">{fmtP(lastC.close)}</SvgText>
                </G>
              );
            })()}

            {/* OHLCV overlay */}
            {crossC?(
              <SvgText x={4} y={14} fontSize={9.5} fill={crossC.close>=crossC.open?C.bull:C.bear}>
                {`O:${fmtP(crossC.open)}  H:${fmtP(crossC.high)}  L:${fmtP(crossC.low)}  C:${fmtP(crossC.close)}`}
              </SvgText>
            ):lastC?(
              <SvgText x={4} y={14} fontSize={10} fill={lastC.close>=lastC.open?C.bull:C.bear} fontWeight="bold">{fmtP(lastC.close)}</SvgText>
            ):null}

            {/* Volume separator */}
            <Line x1={0} y1={priceH} x2={chartW} y2={priceH} stroke={C.border} strokeWidth={0.5}/>

            {/* Volume bars */}
            <G y={priceH}>
              {vis.map((c,i)=>{
                const cx=(i+0.5)*candleW, vT=toVolY(c.volume);
                return <Rect key={`v${c.time}`} x={cx-bodyW/2} y={vT} width={bodyW} height={Math.max(1,volH-vT)} fill={c.close>=c.open?C.bull+"55":C.bear+"55"}/>;
              })}
              <SvgText x={4} y={14} fontSize={9} fill={C.dim}>Volume</SvgText>
            </G>

            {/* Time axis */}
            <G y={priceH+volH}>
              <Line x1={0} y1={0} x2={chartW} y2={0} stroke={C.border} strokeWidth={0.5}/>
              {timeLabels.map((tl,i)=><SvgText key={`t${i}`} x={tl.x} y={16} fontSize={9} fill={C.dim} textAnchor="middle">{tl.label}</SvgText>)}
            </G>

            {/* Drawings (hidden if eye is toggled off) */}
            {showDraw && drawings.map((d,i)=>renderDraw(d,i))}

            {/* In-progress drawing */}
            {renderCurrentDraw()}

            {/* Crosshair */}
            {drawTool==="cursor"&&crossXY&&(
              <G>
                <Line x1={crossXY.x} y1={0} x2={crossXY.x} y2={areaH} stroke={C.cross} strokeWidth={0.5} strokeDasharray="3 3"/>
                <Line x1={0} y1={crossXY.y} x2={plotW} y2={crossXY.y} stroke={C.cross} strokeWidth={0.5} strokeDasharray="3 3"/>
                {crossXY.y>=0&&crossXY.y<=priceH&&(()=>{
                  const cp=minP+(1-crossXY.y/priceH)*pRange;
                  return (
                    <G>
                      <Rect x={plotW+2} y={crossXY.y-8} width={PRICE_W-4} height={16} rx={3} fill={C.cross+"88"}/>
                      <SvgText x={plotW+PRICE_W/2} y={crossXY.y+4} fontSize={9} fill="#fff" textAnchor="middle">{fmtP(cp)}</SvgText>
                    </G>
                  );
                })()}
              </G>
            )}

            {/* Tool hint — shown when a drawing tool is active but not yet started */}
            {drawTool&&drawTool!=="cursor"&&!curDrawRef.current&&!zoomBoxRef.current&&TOOL_HINTS[drawTool]&&(
              <G>
                <Rect x={plotW/2-72} y={priceH/2-12} width={144} height={24} rx={6} fill={C.panel+"ee"}/>
                <SvgText x={plotW/2} y={priceH/2+5} fontSize={11} fill={C.gold} textAnchor="middle">{TOOL_HINTS[drawTool]}</SvgText>
              </G>
            )}

          </Svg>
        </View>
      </View>

      {/* BOTTOM BAR */}
      <View style={[ss.botBar,{borderTopColor:C.border}]}>
        <Feather name="calendar" size={11} color={C.dim}/>
        <Text style={ss.istTxt}>{istTime} UTC+5:30</Text>
        {drawings.length>0 && (
          <TouchableOpacity onPress={()=>setDrawings([])} style={ss.clearBtn} hitSlop={{top:8,bottom:8,left:8,right:8}}>
            <Feather name="trash-2" size={11} color={C.dim}/>
          </TouchableOpacity>
        )}
        <View style={{flex:1}}/>
        <Text style={[ss.wsBadge,{color:wsBadge.color}]}>{wsBadge.label}</Text>
        <BotBtn label="%"/>
        <BotBtn label="log"/>
        <BotBtn label="auto"/>
      </View>

    </View>
  );

  return isFS ? (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => setIsFS(false)}>
      <View style={{ flex:1, paddingTop: fsPad, backgroundColor: C.bg }}>
        {chartContent}
        {/* Floating exit button — always visible regardless of toolbar state */}
        <TouchableOpacity
          onPress={() => setIsFS(false)}
          style={{
            position:"absolute", bottom:72, right:14,
            backgroundColor: C.panel,
            borderColor: C.gold, borderWidth:1.5,
            borderRadius:22, paddingHorizontal:14, paddingVertical:9,
            flexDirection:"row", alignItems:"center", gap:7,
            zIndex:9999, opacity:0.96,
            shadowColor:"#000", shadowOpacity:0.4, shadowRadius:8, shadowOffset:{width:0,height:2},
            elevation:8,
          }}
        >
          <Feather name="minimize-2" size={15} color={C.gold}/>
          <Text style={{ color:C.gold, fontSize:13, fontWeight:"700", letterSpacing:0.2 }}>Exit</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  ) : chartContent;
}

// ─── Sub-components ────────────────────────────────────────────────────────
function ChartTopBar({tf,setTf,showMenu,setShowMenu,isFS,onFS}:{
  tf:string; setTf:(t:string)=>void;
  showMenu:boolean; setShowMenu:(v:boolean)=>void;
  isFS:boolean; onFS:()=>void;
}) {
  return (
    <View style={[ss.topBar,{borderBottomColor:C.border}]}>
      <TbBtn><Feather name="plus" size={16} color={C.dim}/></TbBtn>
      <View style={[ss.tbSep,{backgroundColor:C.border}]}/>
      <TouchableOpacity style={ss.tfPickerBtn} onPress={()=>setShowMenu(!showMenu)}>
        <Text style={ss.tfPickerTxt}>{tf}</Text>
        <Feather name="chevron-down" size={10} color={C.dim}/>
      </TouchableOpacity>
      <View style={[ss.tbSep,{backgroundColor:C.border}]}/>
      <TbBtn><IcCandleRN color={C.dim}/></TbBtn>
      <TbBtn><Text style={ss.fxTxt}>fx</Text></TbBtn>
      <TbBtn><Feather name="layout" size={15} color={C.dim}/></TbBtn>
      <View style={{flex:1}}/>
      <TbBtn><Feather name="sliders" size={15} color={C.dim}/></TbBtn>
      <TouchableOpacity style={ss.tbBtn} onPress={onFS}>
        <Feather name={isFS?"minimize":"maximize"} size={15} color={isFS?C.gold:C.dim}/>
      </TouchableOpacity>
      <TbBtn><Feather name="camera" size={15} color={C.dim}/></TbBtn>
    </View>
  );
}
function TbBtn({children,onPress}:{children:React.ReactNode;onPress?:()=>void}) {
  return <TouchableOpacity style={ss.tbBtn} onPress={onPress}>{children}</TouchableOpacity>;
}
function BotBtn({label}:{label:string}) {
  const [active,setActive]=React.useState(false);
  return (
    <TouchableOpacity onPress={()=>setActive(v=>!v)}
      style={[ss.botBtnBase,{backgroundColor:active?C.gold+"22":"transparent",borderColor:active?C.gold+"60":C.border}]}>
      <Text style={[ss.botBtnTxt,{color:active?C.gold:C.dim}]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  root:       { backgroundColor:C.bg, overflow:"hidden" },
  center:     { flex:1, alignItems:"center", justifyContent:"center", gap:8 },
  dimTxt:     { color:C.dim, fontSize:12 },
  retryBtn:   { marginTop:4, backgroundColor:C.bull, paddingHorizontal:24, paddingVertical:9, borderRadius:6 },
  retryBtnTxt:{ color:"#fff", fontSize:13, fontWeight:"700" as const },

  topBar:    { height:TOP_H, flexDirection:"row", alignItems:"center", backgroundColor:C.panel, borderBottomWidth:StyleSheet.hairlineWidth, paddingHorizontal:2 },
  tbBtn:     { width:34, height:TOP_H, alignItems:"center", justifyContent:"center" },
  tbSep:     { width:1, height:22, marginHorizontal:3 },
  tfPickerBtn:{ flexDirection:"row", alignItems:"center", gap:3, paddingHorizontal:8, height:TOP_H },
  tfPickerTxt:{ fontSize:12, fontWeight:"700" as const, color:C.dim },
  fxTxt:     { fontSize:12, fontWeight:"700" as const, color:C.dim },

  body:      { flexDirection:"row", flex:1 },
  leftBar:   { width:LEFT_W, backgroundColor:C.panel, borderRightWidth:StyleSheet.hairlineWidth, alignItems:"center", paddingTop:4, paddingBottom:4 },
  toolBtn:   { width:34, height:32, borderRadius:5, alignItems:"center", justifyContent:"center", marginVertical:1 },
  toolBtnActive: { backgroundColor:"#f0b90b22" },
  toolSep:   { width:28, height:1, marginVertical:4 },
  chartArea: { flex:1 },

  botBar:    { height:BOT_H, flexDirection:"row", alignItems:"center", backgroundColor:C.panel, borderTopWidth:StyleSheet.hairlineWidth, paddingHorizontal:8, gap:6 },
  istTxt:    { color:C.dim, fontSize:10 },
  wsBadge:   { fontSize:9, fontWeight:"700" as const, marginRight:4 },
  botBtnBase:{ borderWidth:1, borderRadius:3, paddingHorizontal:7, paddingVertical:2 },
  botBtnTxt: { fontSize:10, fontWeight:"600" as const },
  clearBtn:  { padding:4 },

  menuLayer: { position:"absolute", top:0, right:0, bottom:0, left:0, zIndex:100 },
  backdrop:  { position:"absolute", top:0, right:0, bottom:0, left:0 },
  tfBox:     { position:"absolute", top:TOP_H+2, left:LEFT_W+2, backgroundColor:C.panel, borderRadius:6, borderWidth:1, borderColor:C.border, flexDirection:"row", flexWrap:"wrap", width:130, paddingVertical:4 },
  tfItem:    { width:"50%", paddingVertical:7, paddingHorizontal:10 },
  tfItemActive:{ backgroundColor:"#26a69a18" },
  tfItemTxt: { fontSize:12, fontWeight:"700" as const, color:C.dim },

  reconnStrip:{ flexDirection:"row", alignItems:"center", justifyContent:"center", paddingVertical:3, backgroundColor:C.panel },
  reconnTxt: { fontSize:10, fontWeight:"600" as const },
});
