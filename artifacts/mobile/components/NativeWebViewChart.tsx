/**
 * NativeWebViewChart — Full TradingView-style chart for Android & iOS
 * Uses react-native-webview + lightweight-charts (bundled inline) + Binance REST+WS
 * Identical look to the web chart: dark theme, candles, volume, crosshair,
 * timeframe picker, drawing toolbar, fullscreen, OHLCV tooltip, IST clock.
 */
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View, StyleSheet, ActivityIndicator, TouchableOpacity, Text,
  Modal, StatusBar, useWindowDimensions, Platform, BackHandler,
} from "react-native";
import LoadingCandleAnimation from "./LoadingCandleAnimation";
import { WebView } from "react-native-webview";
import { LWC_SCRIPT } from "../lib/lwcScript";

interface Props {
  symbol?: string;
  height?: number;
}

function buildHtml(symbol: string, initialFS = false): string {
  const bin = symbol.replace("/","").toUpperCase().endsWith("USDT")
    ? symbol.replace("/","").toUpperCase()
    : symbol.replace("/","").toUpperCase() + "USDT";

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
html,body{width:100%;height:100%;background:#131722;overflow:hidden;margin:0;padding:0;}
#root{position:fixed;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;}

/* ── Top toolbar ── */
#topbar{
  display:flex;align-items:center;background:#1e222d;
  border-bottom:1px solid #2a2e39;height:42px;flex-shrink:0;
  padding:0 4px;gap:2px;
}
.tb-btn{
  width:32px;height:36px;display:flex;align-items:center;justify-content:center;
  background:none;border:none;color:#787b86;border-radius:5px;cursor:pointer;
  font-size:13px;font-weight:700;flex-shrink:0;
}
.tb-btn:active{background:#ffffff18;}
.tb-btn.active{color:#f0b90b;background:#f0b90b18;}
#tf-btn{
  display:flex;align-items:center;gap:3px;padding:0 8px;height:36px;
  background:none;border:none;color:#787b86;font-size:12px;font-weight:700;cursor:pointer;
}
.tb-sep{width:1px;height:22px;background:#2a2e39;flex-shrink:0;margin:0 2px;}

/* ── TF Dropdown ── */
#tf-menu{
  position:fixed;top:42px;left:44px;
  background:#1e222d;border:1px solid #2a2e39;border-radius:6px;
  display:flex;flex-wrap:wrap;width:140px;padding:4px;z-index:200;
}
#tf-menu.hidden{display:none;}
.tf-item{
  width:50%;padding:7px 10px;font-size:12px;font-weight:700;
  color:#787b86;border-radius:4px;cursor:pointer;
}
.tf-item:active,.tf-item.active{background:#26a69a18;color:#26a69a;}

/* ── Drawing sidebar ── */
#sidebar{
  width:44px;background:#1e222d;border-right:1px solid #2a2e39;
  display:flex;flex-direction:column;align-items:center;
  padding:4px 0;overflow-y:auto;flex-shrink:0;
}
#sidebar.collapsed{width:10px;overflow:hidden;}
.side-btn{
  width:34px;height:32px;display:flex;align-items:center;justify-content:center;
  background:none;border:none;border-radius:5px;cursor:pointer;
  color:#787b86;margin:1px 0;flex-shrink:0;position:relative;
}
.side-btn:active,.side-btn.active{background:#f0b90b18;color:#f0b90b;}
.side-btn svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;}
.sep-line{width:28px;height:1px;background:#2a2e39;margin:4px 0;flex-shrink:0;}
.corner-tri{position:absolute;right:3px;bottom:4px;width:0;height:0;
  border-left:3px solid transparent;border-right:3px solid transparent;border-top:3px solid #4a4e5a;}
.side-btn.active .corner-tri{border-top-color:#f0b90b;}

/* ── Sub-tool dropdown ── */
#tool-menu{
  position:fixed;left:46px;
  background:#1e222d;border:1px solid #2a2e39;border-radius:7px;
  width:188px;z-index:200;padding:4px 0;
  box-shadow:0 4px 20px #00000070;
}
#tool-menu.hidden{display:none;}
.tool-menu-title{
  padding:5px 12px;font-size:10px;font-weight:700;color:#787b86;
  text-transform:uppercase;letter-spacing:.6px;
  border-bottom:1px solid #2a2e39;margin-bottom:2px;
}
.tool-item{
  display:flex;align-items:center;gap:8px;
  padding:9px 12px;font-size:12px;color:#d1d4dc;cursor:pointer;
}
.tool-item:active{background:#ffffff08;}
.tool-item.active{color:#f0b90b;background:#f0b90b12;}
.tool-dot{width:6px;height:6px;border-radius:3px;border:1px solid #2a2e39;flex-shrink:0;}
.tool-item.active .tool-dot{background:#f0b90b;border-color:#f0b90b;}

/* ── Body / chart area ── */
#body{display:flex;flex:1;min-height:0;}
#chart-wrap{flex:1;position:relative;min-width:0;}
#chart{width:100%;height:100%;}

/* ── OHLCV tooltip ── */
#ohlcv{
  position:absolute;top:6px;left:6px;z-index:10;
  display:flex;align-items:center;flex-wrap:wrap;gap:8px;
  font-size:12px;color:#d1d4dc;pointer-events:none;line-height:1.3;
}
#ohlcv.hidden{display:none;}

/* ── Volume label ── */
#vol-label{
  position:absolute;bottom:22%;left:6px;z-index:10;
  display:flex;align-items:center;gap:4px;
}
.vol-txt{font-size:11px;color:#787b86;}
.vol-btn{
  background:#1e222d;border:1px solid #2a2e39;border-radius:3px;
  color:#787b86;cursor:pointer;padding:1px 5px;display:flex;align-items:center;font-size:11px;
}

/* ── Bottom bar ── */
#botbar{
  height:32px;display:flex;align-items:center;gap:8px;
  background:#1e222d;border-top:1px solid #2a2e39;
  padding:0 8px;flex-shrink:0;font-size:12px;color:#787b86;
}
#ist-time{font-size:10px;color:#d1d4dc;font-variant-numeric:tabular-nums;}
#ws-badge{font-size:9px;font-weight:700;margin-left:auto;}
.bot-btn{
  border:1px solid #2a2e39;border-radius:3px;padding:2px 8px;
  font-size:10px;font-weight:600;color:#787b86;background:none;cursor:pointer;
}
.bot-btn.active{color:#f0b90b;background:#f0b90b18;border-color:#f0b90b60;}

/* ── WS reconnect strip ── */
#ws-strip{
  padding:3px 8px;text-align:center;font-size:10px;font-weight:600;
  background:#1e222d;flex-shrink:0;
}
#ws-strip.hidden{display:none;}

/* ── Backdrop ── */
#backdrop{position:fixed;inset:0;z-index:100;display:none;}
#backdrop.show{display:block;}
</style>
</head>
<body>
<div id="root">

  <!-- TOP TOOLBAR -->
  <div id="topbar">
    <button class="tb-btn" title="Add indicator">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    </button>
    <div class="tb-sep"></div>
    <button id="tf-btn" onclick="toggleTfMenu()">
      <span id="tf-label">5m</span>
      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>
    <div class="tb-sep"></div>
    <button class="tb-btn" title="Candles">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
        <line x1="5" y1="3" x2="5" y2="5"/><rect x="3.5" y="5" width="3" height="6" rx=".5"/>
        <line x1="5" y1="11" x2="5" y2="14"/><line x1="12" y1="2" x2="12" y2="5"/>
        <rect x="10.5" y="5" width="3" height="9" rx=".5"/><line x1="12" y1="14" x2="12" y2="17"/>
        <line x1="19" y1="5" x2="19" y2="8"/><rect x="17.5" y="8" width="3" height="5" rx=".5"/>
        <line x1="19" y1="13" x2="19" y2="16"/>
      </svg>
    </button>
    <button class="tb-btn" title="Indicators" style="font-size:11px;font-weight:700;">fx</button>
    <button class="tb-btn" title="Grid">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    </button>
    <div style="flex:1"></div>
    <button class="tb-btn" title="Settings">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/>
      </svg>
    </button>
    <button class="tb-btn" id="fs-btn" title="Fullscreen" onclick="toggleFS()">
      ${initialFS
        ? `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>`
        : `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>`
      }
    </button>
    <button class="tb-btn" title="Screenshot">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
    </button>
  </div>

  <!-- TF Dropdown -->
  <div id="tf-menu" class="hidden">
    <div class="tf-item active" onclick="selectTf('1m')">1m</div>
    <div class="tf-item" onclick="selectTf('3m')">3m</div>
    <div class="tf-item" onclick="selectTf('5m')">5m</div>
    <div class="tf-item" onclick="selectTf('15m')">15m</div>
    <div class="tf-item" onclick="selectTf('30m')">30m</div>
    <div class="tf-item" onclick="selectTf('1h')">1h</div>
    <div class="tf-item" onclick="selectTf('2h')">2h</div>
    <div class="tf-item" onclick="selectTf('4h')">4h</div>
    <div class="tf-item" onclick="selectTf('1D')">1D</div>
    <div class="tf-item" onclick="selectTf('1W')">1W</div>
  </div>

  <!-- WS reconnect strip -->
  <div id="ws-strip" class="hidden"></div>

  <!-- BODY -->
  <div id="body">

    <!-- Drawing sidebar -->
    <div id="sidebar">
      <!-- Collapse toggle -->
      <button class="side-btn" id="collapse-btn" onclick="toggleSidebar()" style="margin-bottom:2px;" title="Toggle sidebar">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <!-- Tool buttons injected by JS -->
    </div>

    <!-- Chart area -->
    <div id="chart-wrap">
      <div id="ohlcv" class="hidden"></div>
      <div id="vol-label">
        <span class="vol-txt">Volume</span>
        <button class="vol-btn" onclick="toggleVol()">&#8963;</button>
      </div>
      <div id="chart"></div>
    </div>
  </div>

  <!-- Sub-tool dropdown -->
  <div id="tool-menu" class="hidden"></div>

  <!-- Backdrop for menus -->
  <div id="backdrop" onclick="closeAllMenus()"></div>

  <!-- BOTTOM BAR -->
  <div id="botbar">
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#787b86" stroke-width="1.8" stroke-linecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
    <span id="ist-time">--:--:-- UTC+5:30</span>
    <span id="ws-badge">○ Connecting…</span>
    <button class="bot-btn" id="pct-btn" onclick="this.classList.toggle('active')">%</button>
    <button class="bot-btn" id="log-btn" onclick="this.classList.toggle('active')">log</button>
    <button class="bot-btn" id="auto-btn" onclick="this.classList.toggle('active')">auto</button>
  </div>
</div>

<!-- lightweight-charts bundled inline — no CDN dependency -->
<script>${LWC_SCRIPT}</script>

<script>
// ── Constants ───────────────────────────────────────────────────────────────
const SYMBOL   = '${bin}';
const TF_MAP   = {
  '1m':'1m','3m':'3m','5m':'5m','15m':'15m','30m':'30m',
  '1h':'1h','2h':'2h','4h':'4h','1D':'1d','1W':'1w',
};
let currentTf  = '5m';
let chart, candleSeries, volSeries;
let ws, retryTimer, retryDelay = 3000;
let loadId = 0;
let volCollapsed = false;
let isFS = ${initialFS ? 'true' : 'false'};

// ── IST Clock ───────────────────────────────────────────────────────────────
function tickIST() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset()*60000;
  const ist = new Date(utcMs + 5.5*3600000);
  const pad = n => String(n).padStart(2,'0');
  document.getElementById('ist-time').textContent =
    pad(ist.getHours())+':'+pad(ist.getMinutes())+':'+pad(ist.getSeconds())+' UTC+5:30';
}
setInterval(tickIST, 1000); tickIST();

// ── WS badge ────────────────────────────────────────────────────────────────
function setWsBadge(status) {
  const el = document.getElementById('ws-badge');
  const strip = document.getElementById('ws-strip');
  if (status === 'live') {
    el.textContent = '● LIVE'; el.style.color = '#26a69a';
    strip.classList.add('hidden');
  } else if (status === 'reconnecting') {
    el.textContent = '↻ Reconnecting…'; el.style.color = '#f59e0b';
    strip.textContent = 'WS disconnected · Reconnecting…';
    strip.style.color = '#f59e0b'; strip.classList.remove('hidden');
  } else if (status === 'error') {
    el.textContent = '✕ WS Error'; el.style.color = '#ef5350';
    strip.textContent = 'WebSocket error · Retrying…';
    strip.style.color = '#ef5350'; strip.classList.remove('hidden');
  } else {
    el.textContent = '○ Connecting…'; el.style.color = '#787b86';
    strip.classList.add('hidden');
  }
}

// ── Vol toggle ───────────────────────────────────────────────────────────────
function toggleVol() {
  volCollapsed = !volCollapsed;
  if (volSeries) volSeries.applyOptions({ visible: !volCollapsed });
  document.getElementById('vol-label').style.bottom = volCollapsed ? '6px' : '22%';
}

// ── RN bridge helper — retries on Android where bridge may not be ready ──────
function postRN(payload) {
  var msg = JSON.stringify(payload);
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(msg);
    return;
  }
  // Android: bridge sometimes not ready yet — poll up to 10× / 50ms
  var attempts = 0;
  var t = setInterval(function() {
    attempts++;
    if (window.ReactNativeWebView) {
      clearInterval(t);
      window.ReactNativeWebView.postMessage(msg);
    } else if (attempts >= 10) {
      clearInterval(t);
    }
  }, 50);
}

// ── Fullscreen (React Native bridge) ────────────────────────────────────────
function toggleFS() {
  isFS = !isFS;
  var btn = document.getElementById('fs-btn');
  if (isFS) {
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>';
  } else {
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
  }
  postRN({ type: 'toggleFS', value: isFS });
  setTimeout(resizeChart, 80);
}

// ── Chart init ───────────────────────────────────────────────────────────────
function initChart() {
  if (chart) { try { chart.remove(); } catch(_){} chart = null; candleSeries = null; volSeries = null; }
  const el = document.getElementById('chart');
  const w = el.offsetWidth || 300;
  const h = el.offsetHeight || 400;
  chart = LightweightCharts.createChart(el, {
    width: w, height: h,
    layout: { background: { type: 'solid', color: '#131722' }, textColor: '#787b86' },
    grid: { vertLines: { color: '#1e222d' }, horzLines: { color: '#1e222d' } },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: { color: '#758696', labelBackgroundColor: '#1e222d' },
      horzLine: { color: '#758696', labelBackgroundColor: '#26a69a' },
    },
    rightPriceScale: { borderColor: '#2a2e39' },
    timeScale: { borderColor: '#2a2e39', timeVisible: true, secondsVisible: false },
    handleScroll: true,
    handleScale: true,
  });

  candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
    upColor: '#26a69a', downColor: '#ef5350',
    borderUpColor: '#26a69a', borderDownColor: '#ef5350',
    wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    lastValueVisible: true, priceLineVisible: true,
  });

  volSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
    color: '#26a69a', priceFormat: { type: 'volume' },
    priceScaleId: 'vol', lastValueVisible: false, priceLineVisible: false,
  });
  chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

  // OHLCV crosshair tooltip
  chart.subscribeCrosshairMove(param => {
    const ohlcvEl = document.getElementById('ohlcv');
    if (!param || !param.time || !param.seriesData) {
      ohlcvEl.classList.add('hidden'); return;
    }
    const d = param.seriesData.get(candleSeries);
    if (!d) { ohlcvEl.classList.add('hidden'); return; }
    const isUp = d.close >= d.open;
    const c = isUp ? '#26a69a' : '#ef5350';
    const fmtP = v => {
      if (!v) return '—';
      if (v >= 1000) return v.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2});
      if (v >= 1) return v.toFixed(4);
      return v.toFixed(6);
    };
    const fmtV = v => {
      if (v >= 1e9) return (v/1e9).toFixed(2)+'B';
      if (v >= 1e6) return (v/1e6).toFixed(2)+'M';
      if (v >= 1e3) return (v/1e3).toFixed(2)+'K';
      return v.toFixed(0);
    };
    const vd = param.seriesData.get(volSeries);
    const chg = d.close - d.open;
    const chgPct = d.open ? ((chg/d.open)*100).toFixed(2) : '0.00';
    const sign = chg >= 0 ? '+' : '';
    ohlcvEl.innerHTML =
      '<span style="color:'+c+';font-weight:700;font-size:14px">'+fmtP(d.close)+'</span>'+
      '<span style="color:#787b86">O <b style="color:#d1d4dc">'+fmtP(d.open)+'</b></span>'+
      '<span style="color:#787b86">H <b style="color:#26a69a">'+fmtP(d.high)+'</b></span>'+
      '<span style="color:#787b86">L <b style="color:#ef5350">'+fmtP(d.low)+'</b></span>'+
      '<span style="color:#787b86">C <b style="color:#d1d4dc">'+fmtP(d.close)+'</b></span>'+
      (vd ? '<span style="color:#787b86">V <b style="color:#d1d4dc">'+fmtV(vd.value)+'</b></span>' : '')+
      '<span style="color:'+c+';font-weight:600">'+sign+fmtP(chg)+' ('+sign+chgPct+'%)</span>';
    ohlcvEl.classList.remove('hidden');
  });

  // Resize observer
  const ro = new ResizeObserver(() => resizeChart());
  ro.observe(el);
}

function resizeChart() {
  if (!chart) return;
  const el = document.getElementById('chart');
  chart.resize(el.offsetWidth, el.offsetHeight);
}

// ── Data loading ─────────────────────────────────────────────────────────────
async function loadData(sym, tf) {
  const id = ++loadId;
  const interval = TF_MAP[tf] || '5m';
  try {
    const res = await fetch(
      'https://api.binance.com/api/v3/klines?symbol='+sym+'&interval='+interval+'&limit=500'
    );
    if (!res.ok || loadId !== id) return;
    const data = await res.json();
    const candles = data.map(k => ({
      time: Math.floor(k[0]/1000),
      open: parseFloat(k[1]), high: parseFloat(k[2]),
      low: parseFloat(k[3]), close: parseFloat(k[4]),
    }));
    const vols = data.map(k => ({
      time: Math.floor(k[0]/1000),
      value: parseFloat(k[5]),
      color: parseFloat(k[4]) >= parseFloat(k[1]) ? '#26a69a55' : '#ef535055',
    }));
    if (loadId !== id) return;
    candleSeries.setData(candles);
    volSeries.setData(vols);
    chart.timeScale().fitContent();
    connectWS(sym, tf, id);
  } catch(e) {
    if (loadId !== id) return;
    setWsBadge('error');
    retryTimer = setTimeout(() => loadData(sym, tf), retryDelay);
    retryDelay = Math.min(retryDelay*2, 30000);
  }
}

// ── WebSocket ────────────────────────────────────────────────────────────────
function connectWS(sym, tf, id) {
  if (ws) { try { ws.close(); } catch(_){} ws = null; }
  clearTimeout(retryTimer);
  const interval = TF_MAP[tf] || '5m';
  const url = 'wss://stream.binance.com:9443/ws/'+sym.toLowerCase()+'@kline_'+interval;
  setWsBadge('connecting');
  ws = new WebSocket(url);

  ws.onopen = () => { if (loadId !== id) return; retryDelay = 3000; setWsBadge('live'); };

  ws.onmessage = e => {
    if (loadId !== id) return;
    try {
      const msg = JSON.parse(e.data);
      const k = msg.k;
      const candle = {
        time: Math.floor(k.t/1000),
        open: parseFloat(k.o), high: parseFloat(k.h),
        low: parseFloat(k.l), close: parseFloat(k.c),
      };
      const vol = {
        time: Math.floor(k.t/1000),
        value: parseFloat(k.v),
        color: parseFloat(k.c) >= parseFloat(k.o) ? '#26a69a55' : '#ef535055',
      };
      candleSeries.update(candle);
      volSeries.update(vol);
    } catch(_){}
  };

  ws.onerror = () => { if (loadId !== id) return; setWsBadge('error'); };

  ws.onclose = () => {
    if (loadId !== id) return;
    setWsBadge('reconnecting');
    retryTimer = setTimeout(() => connectWS(sym, tf, loadId), retryDelay);
    retryDelay = Math.min(retryDelay*2, 30000);
  };
}

// ── Timeframe menu ───────────────────────────────────────────────────────────
function toggleTfMenu() {
  const m = document.getElementById('tf-menu');
  const b = document.getElementById('backdrop');
  const isHidden = m.classList.contains('hidden');
  closeAllMenus();
  if (isHidden) {
    m.classList.remove('hidden');
    b.classList.add('show');
  }
}

function selectTf(tf) {
  currentTf = tf;
  document.getElementById('tf-label').textContent = tf;
  document.querySelectorAll('.tf-item').forEach(el => {
    el.classList.toggle('active', el.textContent === tf);
  });
  closeAllMenus();
  if (ws) { try { ws.close(); } catch(_){} ws = null; }
  clearTimeout(retryTimer);
  loadData(SYMBOL, tf);
}

// ── Drawing toolbar ──────────────────────────────────────────────────────────
const TOOL_GROUPS = [
  { id:'cursor',   icon:'<circle cx="12" cy="12" r="3"/><line x1="12" y1="1" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="1" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="23" y2="12"/>', label:'Cursor',
    items:[{id:null,label:'Default cursor'},{id:'crosshair',label:'Crosshair'}]},
  { id:'lines',    icon:'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>', label:'Trend Line Tools',
    items:[{id:'trendline',label:'Trend line'},{id:'trendline',label:'Ray'},{id:'hline',label:'Horizontal line'},{id:'hline',label:'Vertical line'}]},
  { id:'fib',      icon:'<line x1="3" y1="5" x2="21" y2="5"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="3" y1="20" x2="21" y2="20"/>', label:'Fibonacci Tools',
    items:[{id:'trendline',label:'Fib retracement'},{id:'trendline',label:'Fib extension'},{id:'trendline',label:'Fib channel'}]},
  { id:'patterns', icon:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>', label:'Pattern Tools',
    items:[{id:'brush',label:'XABCD pattern'},{id:'brush',label:'Triangle pattern'},{id:'brush',label:'Head & shoulders'}]},
  { id:'forecast', icon:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="8"/><line x1="22" y1="12" x2="16" y2="12"/>', label:'Forecast & Measure',
    items:[{id:'ruler',label:'Long position'},{id:'ruler',label:'Short position'},{id:'ruler',label:'Price range'}]},
  { id:'brush',    icon:'<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L3 14.67V21h6.33l10.06-10.06a5.5 5.5 0 0 0 0-7.78z"/>', label:'Brush Tools',
    items:[{id:'brush',label:'Brush'},{id:'brush',label:'Highlighter'},{id:'brush',label:'Arrow'}]},
  { id:'text',     icon:'<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>', label:'Text Tools',
    items:[{id:'text',label:'Text'},{id:'text',label:'Note'},{id:'text',label:'Price label'}]},
  { id:'emoji',    icon:'<circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>', label:'Emoji & Icons',
    items:[{id:'emoji',label:'Emoji'},{id:'emoji',label:'Flag marker'},{id:'emoji',label:'Star marker'}]},
  { id:'ruler',    icon:'<path d="M2 20L20 2"/><line x1="7" y1="17" x2="7" y2="14"/><line x1="10" y1="14" x2="10" y2="11"/><line x1="13" y1="11" x2="13" y2="8"/>', label:'Ruler Tools',
    items:[{id:'ruler',label:'Measure distance'},{id:'ruler',label:'Measure price change'}]},
  { id:'zoom',     icon:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>', label:'Zoom Tools',
    items:[{id:'zoom',label:'Zoom in'},{id:'zoom',label:'Zoom out'},{id:null,label:'Reset zoom'}]},
  'sep',
  { id:'magnet',   icon:'<path d="M6 15A6 6 0 1 0 18 15"/><line x1="6" y1="15" x2="6" y2="20"/><line x1="18" y1="15" x2="18" y2="20"/><line x1="3" y1="20" x2="9" y2="20"/><line x1="15" y1="20" x2="21" y2="20"/>', label:'Magnet Mode', toggle:true,
    items:[{id:'magnet',label:'Strong magnet'},{id:null,label:'Magnet off'}]},
  { id:'lock',     icon:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', label:'Lock Drawings', toggle:true,
    items:[{id:'lock',label:'Lock all drawings'},{id:null,label:'Unlock all'}]},
  { id:'eye',      icon:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>', label:'Visibility', toggle:true,
    items:[{id:'eye',label:'Hide drawings'},{id:'eye',label:'Show drawings'},{id:'clear',label:'Delete all drawings'}]},
];

let openGroupId = null;
let sidebarCollapsed = false;

function buildSidebar() {
  const sb = document.getElementById('sidebar');
  // Keep the collapse button (first child)
  while (sb.children.length > 1) sb.removeChild(sb.lastChild);

  TOOL_GROUPS.forEach((g, i) => {
    if (g === 'sep') {
      const sep = document.createElement('div'); sep.className = 'sep-line'; sb.appendChild(sep); return;
    }
    const btn = document.createElement('button');
    btn.className = 'side-btn';
    btn.title = g.label;
    btn.dataset.id = g.id;
    btn.innerHTML = '<svg viewBox="0 0 24 24">'+g.icon+'</svg><div class="corner-tri"></div>';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openToolMenu(g.id, btn);
    });
    sb.appendChild(btn);
  });
}

function openToolMenu(groupId, btnEl) {
  const menu = document.getElementById('tool-menu');
  const backdrop = document.getElementById('backdrop');
  if (openGroupId === groupId) { closeAllMenus(); return; }
  openGroupId = groupId;

  const group = TOOL_GROUPS.find(g => g !== 'sep' && g.id === groupId);
  if (!group || group === 'sep') return;

  // Position
  const rect = btnEl.getBoundingClientRect();
  menu.style.top = rect.top + 'px';

  // Build items
  menu.innerHTML = '<div class="tool-menu-title">'+group.label+'</div>';
  group.items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'tool-item';
    el.innerHTML = '<div class="tool-dot"></div><span>'+item.label+'</span>';
    el.addEventListener('click', () => {
      closeAllMenus();
    });
    menu.appendChild(el);
  });

  menu.classList.remove('hidden');
  backdrop.classList.add('show');

  // Highlight active sidebar button
  document.querySelectorAll('.side-btn').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');
}

function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  const sb = document.getElementById('sidebar');
  const btn = document.getElementById('collapse-btn');
  if (sidebarCollapsed) {
    sb.classList.add('collapsed');
    btn.querySelector('svg').innerHTML = '<polyline points="9 18 15 12 9 6"/>';
  } else {
    sb.classList.remove('collapsed');
    btn.querySelector('svg').innerHTML = '<polyline points="15 18 9 12 15 6"/>';
  }
  setTimeout(resizeChart, 50);
}

function closeAllMenus() {
  document.getElementById('tf-menu').classList.add('hidden');
  document.getElementById('tool-menu').classList.add('hidden');
  document.getElementById('backdrop').classList.remove('show');
  openGroupId = null;
  document.querySelectorAll('.side-btn').forEach(b => b.classList.remove('active'));
}

// ── Boot ──────────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  initChart();
  buildSidebar();
  loadData(SYMBOL, currentTf);
});

window.addEventListener('resize', resizeChart);
</script>
</body>
</html>`;
}

function ChartWebView({
  html, binKey, h, onLoad, onError, onMsg,
}: {
  html: string; binKey: string; h: number;
  onLoad: () => void; onError: () => void; onMsg: (e: any) => void;
}) {
  return (
    <WebView
      key={`${binKey}-${h}`}
      source={{ html, baseUrl: Platform.OS === "android" ? "file:///android_asset/" : "" }}
      style={styles.webview}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      allowFileAccess
      allowUniversalAccessFromFileURLs
      allowFileAccessFromFileURLs
      mixedContentMode="always"
      onLoad={onLoad}
      onError={onError}
      onHttpError={onError}
      onMessage={onMsg}
      bounces={false}
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
      nestedScrollEnabled={false}
      onShouldStartLoadWithRequest={() => true}
      androidHardwareAccelerationDisabled={false}
      renderToHardwareTextureAndroid
    />
  );
}

export default function NativeWebViewChart({ symbol = "BTCUSDT", height = 480 }: Props) {
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fsLoading,    setFsLoading]    = useState(false);
  const { width: screenW, height: screenH } = useWindowDimensions();

  const bin = symbol.replace("/","").toUpperCase().endsWith("USDT")
    ? symbol.replace("/","").toUpperCase()
    : symbol.replace("/","").toUpperCase() + "USDT";

  const html   = buildHtml(bin, false);
  const htmlFS = buildHtml(bin, true);

  // Android: intercept hardware back button when fullscreen is open
  // prevents the back event from leaking to the Charts screen and opening the coin picker
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isFullscreen) {
        setIsFullscreen(false);
        return true; // consumed — do NOT propagate
      }
      return false; // let Expo Router handle it normally
    });
    return () => handler.remove();
  }, [isFullscreen]);

  const onLoad    = useCallback(() => { setLoading(false); setFsLoading(false); }, []);
  const onError   = useCallback(() => { setLoading(false); setFsLoading(false); setError(true); }, []);
  const retry     = useCallback(() => {
    setError(false); setLoading(true);
    setIsFullscreen(false);
  }, []);

  const onMessage = useCallback((e: any) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === "toggleFS") {
        if (data.value) {
          setFsLoading(true);
          setIsFullscreen(true);
        } else {
          setIsFullscreen(false);
        }
      }
    } catch (_) {}
  }, []);

  return (
    <>
      {/* ── Normal view ── */}
      <View style={[styles.root, { height }]}>
        {loading && !isFullscreen && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#26a69a" size="small" />
            <Text style={styles.loadingTxt}>Loading chart…</Text>
          </View>
        )}
        {!isFullscreen && (
          error ? (
            <View style={styles.errBox}>
              <Text style={styles.errIcon}>⚠</Text>
              <Text style={styles.errTitle}>Chart failed to load</Text>
              <Text style={styles.errSub}>Check internet connection</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={retry}>
                <Text style={styles.retryTxt}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ChartWebView
              html={html}
              binKey={`${bin}-normal`}
              h={height}
              onLoad={onLoad}
              onError={onError}
              onMsg={onMessage}
            />
          )
        )}
      </View>

      {/* ── Fullscreen Modal — uses htmlFS (initialFS=true) so exit works ── */}
      <Modal
        visible={isFullscreen}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setIsFullscreen(false)}
        supportedOrientations={["portrait", "landscape"]}
      >
        <StatusBar hidden backgroundColor="#131722" />
        <View style={[styles.fsRoot, { width: screenW, height: screenH }]}>
          {fsLoading && (
            <LoadingCandleAnimation overlay status="connecting" message="Loading chart" size="sm" />
          )}
          <ChartWebView
            html={htmlFS}
            binKey={`${bin}-fs`}
            h={screenH}
            onLoad={onLoad}
            onError={onError}
            onMsg={onMessage}
          />
          {/* Small ✕ exit — bottom-center */}
          <TouchableOpacity
            style={styles.fsExitBtn}
            onPress={() => setIsFullscreen(false)}
            activeOpacity={0.75}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.fsExitIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root:           { backgroundColor: "#131722", overflow: "hidden" },
  fsRoot:         { backgroundColor: "#131722", flex: 1 },
  webview:        { flex: 1, backgroundColor: "#131722" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#131722",
    alignItems: "center", justifyContent: "center", gap: 8, zIndex: 10,
  },
  loadingTxt: { color: "#787b86", fontSize: 12 },
  errBox:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  errIcon:    { fontSize: 28, color: "#f59e0b" },
  errTitle:   { color: "#d1d4dc", fontSize: 14, fontWeight: "700" },
  errSub:     { color: "#787b86", fontSize: 12 },
  retryBtn:   { marginTop: 4, backgroundColor: "#26a69a", paddingHorizontal: 24, paddingVertical: 9, borderRadius: 6 },
  retryTxt:   { color: "#fff", fontSize: 13, fontWeight: "700" },
  fsExitBtn: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    left: "50%" as any,
    transform: [{ translateX: -14 }],
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(30,34,47,0.88)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  fsExitIcon: { color: "#9598a1", fontSize: 13, fontWeight: "700" as const, lineHeight: 16 },
});
