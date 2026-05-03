/**
 * NativeWebViewChart — Full TradingView-style chart for Android & iOS
 * Uses react-native-webview + lightweight-charts (bundled inline) + Binance REST+WS
 * Identical look to the web chart: dark theme, candles, volume, crosshair,
 * timeframe picker, drawing toolbar, fullscreen, OHLCV tooltip, IST clock.
 */
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View, StyleSheet, ActivityIndicator, TouchableOpacity, Text,
  Modal, StatusBar, useWindowDimensions, Platform, BackHandler, Keyboard,
} from "react-native";
import LoadingCandleAnimation from "./LoadingCandleAnimation";
import { WebView } from "react-native-webview";
import { LWC_SCRIPT } from "../lib/lwcScript";
import * as ScreenOrientation from "expo-screen-orientation";

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

/* ── Body / chart area ── */
#body{flex:1;min-height:0;position:relative;}
#chart-wrap{position:absolute;top:0;left:44px;right:0;bottom:0;}
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

/* ── Drawing sidebar ── */
#sidebar{position:absolute;top:0;left:0;width:44px;bottom:0;background:#1e222d;border-right:1px solid #2a2e39;display:flex;flex-direction:column;align-items:center;padding:4px 0;gap:1px;z-index:20;overflow-y:auto;overflow-x:visible;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
#sidebar::-webkit-scrollbar{display:none;}
.sb-btn{width:34px;height:32px;display:flex;align-items:center;justify-content:center;background:none;border:none;border-radius:5px;cursor:pointer;color:#787b86;position:relative;flex-shrink:0;-webkit-tap-highlight-color:transparent;}
.sb-btn.act{background:#2962FF22;color:#2962FF;}
.sb-btn:active{background:#ffffff12;}
.sb-btn svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;}
.sb-tri{position:absolute;right:3px;bottom:4px;width:0;height:0;border-left:3px solid transparent;border-right:3px solid transparent;border-top:3px solid #4a4e5a;}
.sb-btn.act .sb-tri{border-top-color:#2962FF;}
.sb-sep{width:28px;height:1px;background:#2a2e39;flex-shrink:0;margin:3px 0;}
/* Submenu */
#sb-sub{position:fixed;left:46px;background:#1e222d;border:1px solid #2a2e39;border-radius:7px;min-width:180px;padding:4px 0;z-index:500;box-shadow:0 4px 24px #00000090;}
#sb-sub.hidden{display:none;}
.sub-title{padding:4px 12px;font-size:9px;font-weight:700;color:#787b86;text-transform:uppercase;letter-spacing:.6px;border-bottom:1px solid #2a2e39;margin-bottom:2px;}
.sub-item{display:flex;align-items:center;gap:8px;padding:8px 12px;font-size:12px;color:#d1d4dc;cursor:pointer;border:none;background:none;width:100%;text-align:left;-webkit-tap-highlight-color:transparent;}
.sub-item:active,.sub-item.act{background:#2962FF18;color:#2962FF;}
.sub-dot{width:6px;height:6px;border-radius:50%;border:1px solid #3a3e4a;flex-shrink:0;}
.sub-item.act .sub-dot{background:#2962FF;border-color:#2962FF;}
/* Drawing SVG overlay */
#drw-svg{position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible;z-index:5;pointer-events:none;touch-action:none;}
#drw-svg.active{pointer-events:all;cursor:crosshair;touch-action:none;}
#drw-svg.cursor{pointer-events:all;cursor:default;touch-action:none;}
/* Sidebar touch improvements */
.sb-btn{touch-action:manipulation;}
.sub-item{touch-action:manipulation;}
/* Float menu */
#float-menu{position:fixed;background:#1e222d;border:1px solid #2a2e39;border-radius:8px;padding:5px 6px;display:flex;align-items:center;gap:4px;z-index:600;box-shadow:0 4px 20px #00000090;min-width:180px;}
#float-menu.hidden{display:none;}
.fm-btn{background:none;border:none;border-radius:4px;color:#d1d4dc;cursor:pointer;padding:5px 8px;font-size:11px;display:flex;align-items:center;gap:4px;white-space:nowrap;-webkit-tap-highlight-color:transparent;}
.fm-btn:active{background:#ffffff15;}
.fm-del{color:#ef5350;}
.fm-sep{width:1px;height:18px;background:#2a2e39;flex-shrink:0;}
#fm-clr{width:22px;height:22px;border:2px solid #3a3e4a;border-radius:4px;cursor:pointer;padding:0;background:#f0b90b;flex-shrink:0;}
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
    <button class="tb-btn" id="tb-reset" title="Reset Chart">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
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

    <!-- Drawing sidebar — hardcoded so it always shows regardless of JS state -->
    <div id="sidebar">
      <!-- Cursor -->
      <button class="sb-btn" id="sb-cursor" title="Cursor" onclick="setToolGroup('cursor')">
        <svg viewBox="0 0 24 24"><path d="M5 3l14 9-7 1-4 7z"/></svg>
      </button>
      <!-- Lines -->
      <button class="sb-btn" id="sb-lines" title="Lines" onclick="openSubById('lines',this)">
        <svg viewBox="0 0 24 24"><line x1="5" y1="17" x2="19" y2="5"/><polyline points="12 5 19 5 19 12"/></svg>
        <div class="sb-tri"></div>
      </button>
      <!-- Fibonacci -->
      <button class="sb-btn" id="sb-fib" title="Fibonacci" onclick="openSubById('fib',this)">
        <svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        <div class="sb-tri"></div>
      </button>
      <!-- Shapes -->
      <button class="sb-btn" id="sb-shapes" title="Shapes" onclick="openSubById('shapes',this)">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
        <div class="sb-tri"></div>
      </button>
      <!-- Brush -->
      <button class="sb-btn" id="sb-brush" title="Brushes" onclick="openSubById('brush',this)">
        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L3 14.67V21h6.33l10.06-10.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        <div class="sb-tri"></div>
      </button>
      <!-- Text -->
      <button class="sb-btn" id="sb-text" title="Text" onclick="openSubById('text',this)">
        <svg viewBox="0 0 24 24"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
        <div class="sb-tri"></div>
      </button>
      <!-- Measure -->
      <button class="sb-btn" id="sb-measure" title="Measure" onclick="openSubById('measure',this)">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>
        <div class="sb-tri"></div>
      </button>
      <div class="sb-sep"></div>
      <!-- Hide/Show -->
      <button class="sb-btn" id="sb-hide" title="Hide/Show" onclick="toggleHide(this)">
        <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
      <!-- Lock -->
      <button class="sb-btn" id="sb-lock" title="Lock All" onclick="toggleLockAll(this)">
        <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </button>
      <!-- Clear All Drawings -->
      <button class="sb-btn" id="sb-delete" title="Clear All Drawings" onclick="clearAllDrawings()">
        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </button>
    </div>

    <!-- Chart area -->
    <div id="chart-wrap">
      <div id="ohlcv" class="hidden"></div>
      <div id="vol-label">
        <span class="vol-txt">Volume</span>
        <button class="vol-btn" onclick="toggleVol()">&#8963;</button>
      </div>
      <div id="chart"></div>
      <!-- Drawing SVG overlay -->
      <svg id="drw-svg"></svg>
      <!-- Drawing status bar (debug helper) -->
      <div id="drw-status" style="position:absolute;top:4px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.55);color:#fff;font-size:10px;padding:2px 8px;border-radius:8px;pointer-events:none;z-index:600;letter-spacing:.5px;"></div>
    </div>
  </div>

  <!-- Float menu for selected drawing -->
  <div id="float-menu" class="hidden">
    <button class="fm-btn fm-del" onclick="deleteSel()">🗑 Delete</button>
    <div class="fm-sep"></div>
    <input type="color" id="fm-clr" value="#f0b90b" oninput="colorSel(this.value)">
    <div class="fm-sep"></div>
    <button class="fm-btn" id="fm-lck" onclick="lockSel()">🔒 Lock</button>
    <button class="fm-btn" onclick="deselectAll()" style="margin-left:2px;color:#787b86;">✕</button>
  </div>

  <!-- Tool submenu -->
  <div id="sb-sub" class="hidden"></div>

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

function closeAllMenus() {
  document.getElementById('tf-menu').classList.add('hidden');
  document.getElementById('backdrop').classList.remove('show');
}

// ── Boot ──────────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  initChart();
  loadData(SYMBOL, currentTf);
  setTimeout(initDrwEngine, 600);
});

window.addEventListener('resize', () => { resizeChart(); redraw(); });
</script>

<script>
// ╔══════════════════════════════════════════════════════════════╗
// ║                  DRAWING ENGINE v2                          ║
// ╚══════════════════════════════════════════════════════════════╝

const DK = 'tm_drw_v2';
let DRW = [];
let TOOL = null;
let SEL = null;
let HIDE = false;
let CLR = '#f0b90b';
let WID = 1.5;
let SUB_OPEN = null;
let IP = null;
let CUR_PTS = [];
let FREE_PTS = [];
let M_DOWN = false;
let _W = 0, _H = 0;
let _idCtr = Date.now();
function genId() { return 'drw_' + (_idCtr++); }

// ── Tool groups ─────────────────────────────────────────────────
const TOOL_GROUPS = [
  { id:'cursor', label:'Cursor', multi:false,
    icon:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
    items:[] },
  { id:'lines', label:'Lines', multi:true,
    icon:'<line x1="5" y1="17" x2="19" y2="5"/><polyline points="12 5 19 5 19 12"/>',
    items:[
      { id:'trendline', label:'Trend Line', pts:2 },
      { id:'arrow', label:'Arrow', pts:2 },
      { id:'ray', label:'Ray', pts:2 },
      { id:'hline', label:'Horizontal Line', pts:1 },
      { id:'vline', label:'Vertical Line', pts:1 },
      { id:'channel', label:'Parallel Channel', pts:3 },
    ] },
  { id:'fib', label:'Fibonacci', multi:true,
    icon:'<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    items:[{ id:'fibretracement', label:'Fib Retracement', pts:2 }] },
  { id:'shapes', label:'Shapes', multi:true,
    icon:'<rect x="3" y="3" width="18" height="18" rx="2"/>',
    items:[
      { id:'rectangle', label:'Rectangle', pts:2 },
      { id:'circle', label:'Circle', pts:2 },
    ] },
  { id:'brush', label:'Brushes', multi:true,
    icon:'<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L3 14.67V21h6.33l10.06-10.06a5.5 5.5 0 0 0 0-7.78z"/>',
    items:[
      { id:'brush', label:'Brush', pts:0 },
      { id:'highlighter', label:'Highlighter', pts:0 },
    ] },
  { id:'text', label:'Text', multi:true,
    icon:'<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
    items:[
      { id:'text', label:'Text', pts:1 },
      { id:'note', label:'Note', pts:1 },
      { id:'pricelabel', label:'Price Label', pts:1 },
    ] },
  { id:'measure', label:'Measure', multi:true,
    icon:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/>',
    items:[
      { id:'longposition', label:'Long Position', pts:3 },
      { id:'shortposition', label:'Short Position', pts:3 },
      { id:'daterange', label:'Date Range', pts:2 },
      { id:'pricerange', label:'Price Range', pts:2 },
    ] },
  'sep',
  { id:'hide', label:'Hide/Show', multi:false, toggle:true,
    icon:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    items:[] },
  { id:'lock', label:'Lock All', multi:false, toggle:true,
    icon:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    items:[] },
  { id:'delete', label:'Delete Mode', multi:false, toggle:true,
    icon:'<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    items:[] },
];

function getToolPts(toolId) {
  for (const g of TOOL_GROUPS) {
    if (g === 'sep') continue;
    for (const it of g.items) { if (it.id === toolId) return it.pts || 2; }
  }
  return 2;
}

// ── Storage ─────────────────────────────────────────────────────
function loadDrw() { try { DRW = JSON.parse(localStorage.getItem(DK)||'[]'); } catch { DRW=[]; } }
function saveDrw() { try { localStorage.setItem(DK, JSON.stringify(DRW)); } catch {} }

// ── Coordinate helpers ───────────────────────────────────────────
function updateSize() {
  const el = document.getElementById('chart-wrap');
  if (el) { _W = el.offsetWidth; _H = el.offsetHeight; }
}
function clientToSvg(cx, cy) {
  const el = document.getElementById('chart-wrap');
  const r = el.getBoundingClientRect();
  return { x: cx - r.left, y: cy - r.top };
}
function svgToData(x, y) {
  try { return { time: chart.timeScale().coordinateToTime(x), price: candleSeries.coordinateToPrice(y) }; }
  catch { return { time:null, price:null }; }
}
function dataToSvg(price, time) {
  try { return { x: chart.timeScale().timeToCoordinate(time), y: candleSeries.priceToCoordinate(price) }; }
  catch { return { x:null, y:null }; }
}
function fmtP(p) {
  if (!p && p!==0) return '';
  if (p>=10000) return p.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  if (p>=1) return p.toFixed(4);
  return p.toFixed(6);
}

// ── Sidebar ─────────────────────────────────────────────────────
// ── Sidebar active-state refresh (HTML is now hardcoded, just update classes) ──
function buildSidebar() {
  const IDS = {cursor:'sb-cursor',lines:'sb-lines',fib:'sb-fib',shapes:'sb-shapes',brush:'sb-brush',text:'sb-text',measure:'sb-measure',hide:'sb-hide',lock:'sb-lock',delete:'sb-delete'};
  const toolToGroup = {trendline:'lines',arrow:'lines',ray:'lines',hline:'lines',vline:'lines',channel:'lines',fibretracement:'fib',rectangle:'shapes',circle:'shapes',brush:'brush',highlighter:'brush',text:'text',note:'text',pricelabel:'text',longposition:'measure',shortposition:'measure',daterange:'measure',pricerange:'measure'};
  Object.entries(IDS).forEach(([gid,btnId]) => {
    const btn = document.getElementById(btnId); if(!btn) return;
    const isActive = (TOOL===gid) || (toolToGroup[TOOL]===gid) || (gid==='hide'&&HIDE) || (gid==='cursor'&&(!TOOL||TOOL==='cursor'));
    btn.classList.toggle('act', !!isActive);
  });
}

// ── Called from hardcoded HTML buttons ──
function setToolGroup(gid) {
  TOOL = gid==='cursor' ? 'cursor' : null;
  SEL=null; CUR_PTS=[]; FREE_PTS=[]; IP=null;
  hideFM(); updateSvgMode(); buildSidebar(); closeSub(); redraw();
}

function openSubById(gid, btnEl) {
  const g = TOOL_GROUPS.find(x=>x!=='sep'&&x.id===gid);
  if (!g) return;
  if (g.items.length === 1) { setTool(g.items[0].id); return; }
  if (SUB_OPEN === gid) { closeSub(); return; }
  SUB_OPEN = gid;
  const sub = document.getElementById('sb-sub');
  const r = btnEl.getBoundingClientRect();
  sub.style.top = Math.min(r.top, window.innerHeight-200)+'px';
  let html = '<div class="sub-title">'+g.label+'</div>';
  g.items.forEach(it => {
    html += '<button class="sub-item'+(TOOL===it.id?' act':'') + '" data-tid="'+it.id+'"><div class="sub-dot"></div>'+it.label+'</button>';
  });
  sub.innerHTML = html;
  // Attach touchend + click to each sub-item for Android WebView reliability
  sub.querySelectorAll('.sub-item').forEach(function(btn) {
    var tid = btn.getAttribute('data-tid');
    btn.addEventListener('touchend', function(e) { e.preventDefault(); setTool(tid); closeSub(); }, {passive:false});
    btn.addEventListener('click', function() { setTool(tid); closeSub(); });
  });
  sub.classList.remove('hidden');
}

function toggleHide(btnEl) {
  HIDE=!HIDE; buildSidebar(); redraw();
}
function toggleLockAll(btnEl) {
  const allLk = DRW.length>0&&DRW.every(d=>d.locked);
  DRW.forEach(d=>d.locked=!allLk); saveDrw(); buildSidebar();
}
function clearAllDrawings() {
  if (DRW.length===0) return;
  if (!confirm('Saare drawings delete karo?')) return;
  DRW=[]; SEL=null; CUR_PTS=[]; FREE_PTS=[]; IP=null;
  saveDrw(); hideFM(); redraw(); dbg('All cleared');
}

function closeSub() { SUB_OPEN=null; const s=document.getElementById('sb-sub'); if(s) s.classList.add('hidden'); }

// ── Attach sidebar button listeners via JS (touchend + click) ─────────────
// On Android WebView onclick can be unreliable; touchend is always instant.
function initSidebarEvents() {
  function sbBtn(id, fn) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchend', function(e) { e.preventDefault(); fn(el); }, {passive:false});
    el.addEventListener('click', function() { fn(el); });
  }
  sbBtn('sb-cursor',  function()    { setToolGroup('cursor'); });
  sbBtn('sb-lines',   function(el)  { openSubById('lines',   el); });
  sbBtn('sb-fib',     function(el)  { openSubById('fib',     el); });
  sbBtn('sb-shapes',  function(el)  { openSubById('shapes',  el); });
  sbBtn('sb-brush',   function(el)  { openSubById('brush',   el); });
  sbBtn('sb-text',    function(el)  { openSubById('text',    el); });
  sbBtn('sb-measure', function(el)  { openSubById('measure', el); });
  sbBtn('sb-hide',    function(el)  { toggleHide(el); });
  sbBtn('sb-lock',    function(el)  { toggleLockAll(el); });
  sbBtn('sb-delete',  function()    { clearAllDrawings(); });
  // Topbar rotate button — sends message to React Native to open fullscreen landscape
  var resetBtn = document.getElementById('tb-reset');
  if (resetBtn) {
    resetBtn.addEventListener('touchend', function(e) { e.preventDefault(); postRN({type:'rotateFS'}); }, {passive:false});
    resetBtn.addEventListener('click', function() { postRN({type:'rotateFS'}); });
  }
}

function setTool(id) {
  TOOL=id; CUR_PTS=[]; FREE_PTS=[]; IP=null; SEL=null; hideFM(); updateSvgMode(); buildSidebar(); redraw();
}
function updateSvgMode() {
  const svg = document.getElementById('drw-svg');
  if (!svg) return;
  svg.className = (!TOOL||TOOL==='cursor') ? 'cursor' : 'active';
}

// ── Redraw ───────────────────────────────────────────────────────
function redraw() {
  const svg = document.getElementById('drw-svg');
  if (!svg||!chart||!candleSeries) return;
  updateSize();
  svg.setAttribute('viewBox','0 0 '+_W+' '+_H);
  svg.setAttribute('width',_W); svg.setAttribute('height',_H);
  let html = '';
  if (!HIDE) { DRW.forEach(d => { if (d.visible!==false) html+=renderDrawing(d, d.id===SEL); }); }
  if (IP) html += renderIP();
  svg.innerHTML = html;
  // Attach events to hit areas
  svg.querySelectorAll('[data-did]').forEach(el => {
    el.addEventListener('pointerdown', e => { e.stopPropagation(); handleDrawingClick(el.getAttribute('data-did'),e); }, {passive:false});
  });
  svg.querySelectorAll('[data-hdl]').forEach(el => {
    el.addEventListener('pointerdown', e => { e.stopPropagation(); startResize(el.getAttribute('data-did'),parseInt(el.getAttribute('data-hdl')),e); }, {passive:false});
  });
}

function renderDrawing(d, sel) {
  const c=d.color||CLR, w=d.width||WID;
  switch(d.type) {
    case 'trendline': return rLine(d,sel,c,w,false,false);
    case 'arrow':     return rLine(d,sel,c,w,true,false);
    case 'ray':       return rLine(d,sel,c,w,false,true);
    case 'hline':     return rHLine(d,sel,c,w);
    case 'vline':     return rVLine(d,sel,c,w);
    case 'channel':   return rChannel(d,sel,c,w);
    case 'fibretracement': return rFib(d,sel,c,w);
    case 'brush':     return rFreehand(d,sel,c,w,false);
    case 'highlighter': return rFreehand(d,sel,c,w,true);
    case 'rectangle': return rRect(d,sel,c,w);
    case 'circle':    return rCircle(d,sel,c,w);
    case 'text':      return rText(d,sel,c);
    case 'note':      return rNote(d,sel,c,w);
    case 'pricelabel': return rPriceLabel(d,sel,c,w);
    case 'longposition':  return rPosition(d,sel,true);
    case 'shortposition': return rPosition(d,sel,false);
    case 'daterange': return rDateRange(d,sel,c,w);
    case 'pricerange': return rPriceRange(d,sel,c,w);
    default: return '';
  }
}

function H(x,y,did,idx) {
  if (x==null||y==null||isNaN(x)||isNaN(y)) return '';
  return '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="5" fill="#fff" stroke="#2962FF" stroke-width="2" data-hdl="'+idx+'" data-did="'+did+'" style="cursor:move;" />';
}
function hitL(x1,y1,x2,y2,did) {
  return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="transparent" stroke-width="14" data-did="'+did+'" style="cursor:move;" />';
}
function F(n) { return (n||0).toFixed(1); }

// ── Render: Line / Arrow / Ray ───────────────────────────────────
function rLine(d,sel,c,w,arrow,ray) {
  if (!d.pts||d.pts.length<2) return '';
  const p1=dataToSvg(d.pts[0].price,d.pts[0].time), p2=dataToSvg(d.pts[1].price,d.pts[1].time);
  if (p1.x==null||p2.x==null) return '';
  let x1=p1.x,y1=p1.y,x2=p2.x,y2=p2.y;
  if (ray) { const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy)||1; x2=x1+(dx/len)*5000; y2=y1+(dy/len)*5000; }
  const sc=sel?'#2962FF':c;
  let s=hitL(p1.x,p1.y,x2,y2,d.id);
  s+='<line x1="'+F(x1)+'" y1="'+F(y1)+'" x2="'+F(x2)+'" y2="'+F(y2)+'" stroke="'+sc+'" stroke-width="'+w+'" stroke-linecap="round" />';
  if (arrow) {
    const dx=x2-p1.x,dy=y2-p1.y,len=Math.sqrt(dx*dx+dy*dy)||1,nx=dx/len,ny=dy/len;
    const ax=x2-nx*10-ny*5,ay=y2-ny*10+nx*5,bx=x2-nx*10+ny*5,by=y2-ny*10-nx*5;
    s+='<polygon points="'+F(x2)+','+F(y2)+' '+F(ax)+','+F(ay)+' '+F(bx)+','+F(by)+'" fill="'+sc+'" />';
  }
  if (sel) { s+=H(p1.x,p1.y,d.id,0); s+=H(p2.x,p2.y,d.id,1); }
  return s;
}

// ── Render: Horizontal Line ──────────────────────────────────────
function rHLine(d,sel,c,w) {
  if (!d.pts||d.pts.length<1) return '';
  const y=candleSeries.priceToCoordinate(d.pts[0].price);
  if (y==null||isNaN(y)) return '';
  const sc=sel?'#2962FF':c;
  let s='<line x1="0" y1="'+F(y)+'" x2="'+_W+'" y2="'+F(y)+'" stroke="transparent" stroke-width="14" data-did="'+d.id+'" style="cursor:move;" />';
  s+='<line x1="0" y1="'+F(y)+'" x2="'+_W+'" y2="'+F(y)+'" stroke="'+sc+'" stroke-width="'+w+'" stroke-dasharray="5,3" />';
  s+='<rect x="'+(_W-84)+'" y="'+(y-11)+'" width="80" height="22" rx="3" fill="#1e222d" stroke="'+sc+'" stroke-width="1" />';
  s+='<text x="'+(_W-44)+'" y="'+(y+4)+'" text-anchor="middle" font-size="10" fill="'+sc+'" font-family="monospace">'+fmtP(d.pts[0].price)+'</text>';
  if (sel) s+=H(_W/2,y,d.id,0);
  return s;
}

// ── Render: Vertical Line ────────────────────────────────────────
function rVLine(d,sel,c,w) {
  if (!d.pts||d.pts.length<1) return '';
  const x=chart.timeScale().timeToCoordinate(d.pts[0].time);
  if (x==null||isNaN(x)) return '';
  const sc=sel?'#2962FF':c;
  let s='<line x1="'+F(x)+'" y1="0" x2="'+F(x)+'" y2="'+_H+'" stroke="transparent" stroke-width="14" data-did="'+d.id+'" style="cursor:move;" />';
  s+='<line x1="'+F(x)+'" y1="0" x2="'+F(x)+'" y2="'+_H+'" stroke="'+sc+'" stroke-width="'+w+'" stroke-dasharray="5,3" />';
  if (sel) s+=H(x,_H/2,d.id,0);
  return s;
}

// ── Render: Parallel Channel ─────────────────────────────────────
function rChannel(d,sel,c,w) {
  if (!d.pts||d.pts.length<3) return '';
  const p1=dataToSvg(d.pts[0].price,d.pts[0].time),p2=dataToSvg(d.pts[1].price,d.pts[1].time),p3=dataToSvg(d.pts[2].price,d.pts[2].time);
  if (p1.x==null) return '';
  const dy=p3.y-p1.y, q1y=p1.y+dy, q2y=p2.y+dy;
  const sc=sel?'#2962FF':c;
  let s=hitL(p1.x,p1.y,p2.x,p2.y,d.id);
  s+='<polygon points="'+F(p1.x)+','+F(p1.y)+' '+F(p2.x)+','+F(p2.y)+' '+F(p2.x)+','+F(q2y)+' '+F(p1.x)+','+F(q1y)+'" fill="'+sc+'22" />';
  s+='<line x1="'+F(p1.x)+'" y1="'+F(p1.y)+'" x2="'+F(p2.x)+'" y2="'+F(p2.y)+'" stroke="'+sc+'" stroke-width="'+w+'" />';
  s+='<line x1="'+F(p1.x)+'" y1="'+F(q1y)+'" x2="'+F(p2.x)+'" y2="'+F(q2y)+'" stroke="'+sc+'" stroke-width="'+w+'" stroke-dasharray="5,3" />';
  if (sel) { s+=H(p1.x,p1.y,d.id,0); s+=H(p2.x,p2.y,d.id,1); s+=H(p3.x,p3.y,d.id,2); }
  return s;
}

// ── Render: Fibonacci Retracement ────────────────────────────────
function rFib(d,sel,c,w) {
  if (!d.pts||d.pts.length<2) return '';
  const p1=dataToSvg(d.pts[0].price,d.pts[0].time),p2=dataToSvg(d.pts[1].price,d.pts[1].time);
  if (p1.x==null) return '';
  const range=d.pts[1].price-d.pts[0].price;
  const LEVS=[0,0.236,0.382,0.5,0.618,0.786,1];
  const LCLR=['#26a69a','#f59e0b','#ef5350','#787b86','#3b82f6','#8b5cf6','#26a69a'];
  const sc=sel?'#2962FF':null;
  const x0=Math.min(p1.x,p2.x);
  let s=hitL(p1.x,p1.y,p2.x,p2.y,d.id);
  s+='<line x1="'+F(p1.x)+'" y1="'+F(p1.y)+'" x2="'+F(p2.x)+'" y2="'+F(p2.y)+'" stroke="'+(sc||c)+'" stroke-width="'+w+'" />';
  LEVS.forEach((lv,i)=>{
    const price=d.pts[0].price+range*lv;
    const y=candleSeries.priceToCoordinate(price);
    if (y==null||isNaN(y)) return;
    const lc=sc||LCLR[i];
    s+='<line x1="'+F(x0)+'" y1="'+F(y)+'" x2="'+_W+'" y2="'+F(y)+'" stroke="'+lc+'" stroke-width="1" stroke-dasharray="4,2" opacity="0.8" />';
    s+='<text x="'+(x0+4)+'" y="'+(y-3)+'" font-size="9" fill="'+lc+'" font-family="monospace">'+(lv*100).toFixed(1)+'%  '+fmtP(price)+'</text>';
  });
  if (sel) { s+=H(p1.x,p1.y,d.id,0); s+=H(p2.x,p2.y,d.id,1); }
  return s;
}

// ── Render: Brush / Highlighter ──────────────────────────────────
function rFreehand(d,sel,c,w,hilight) {
  if (!d.pts||d.pts.length<2) return '';
  let pts='';
  d.pts.forEach(pt=>{
    const px=dataToSvg(pt.price,pt.time);
    if (px.x!=null&&!isNaN(px.x)) pts+=F(px.x)+','+F(px.y)+' ';
  });
  if (!pts) return '';
  const sc=sel?'#2962FF':c, sw=hilight?10:w, op=hilight?0.4:1;
  let s='<polyline points="'+pts+'" stroke="transparent" stroke-width="16" fill="none" data-did="'+d.id+'" style="cursor:move;" />';
  s+='<polyline points="'+pts+'" stroke="'+sc+'" stroke-width="'+sw+'" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="'+op+'" />';
  return s;
}

// ── Render: Rectangle ────────────────────────────────────────────
function rRect(d,sel,c,w) {
  if (!d.pts||d.pts.length<2) return '';
  const p1=dataToSvg(d.pts[0].price,d.pts[0].time),p2=dataToSvg(d.pts[1].price,d.pts[1].time);
  if (p1.x==null) return '';
  const x=Math.min(p1.x,p2.x),y=Math.min(p1.y,p2.y),rw=Math.abs(p2.x-p1.x),rh=Math.abs(p2.y-p1.y);
  const sc=sel?'#2962FF':c;
  let s='<rect x="'+F(x)+'" y="'+F(y)+'" width="'+F(rw)+'" height="'+F(rh)+'" stroke="transparent" stroke-width="8" fill="transparent" data-did="'+d.id+'" style="cursor:move;" />';
  s+='<rect x="'+F(x)+'" y="'+F(y)+'" width="'+F(rw)+'" height="'+F(rh)+'" stroke="'+sc+'" stroke-width="'+w+'" fill="'+sc+'22" />';
  if (sel) { s+=H(p1.x,p1.y,d.id,0); s+=H(p2.x,p1.y,d.id,1); s+=H(p1.x,p2.y,d.id,2); s+=H(p2.x,p2.y,d.id,3); }
  return s;
}

// ── Render: Circle ───────────────────────────────────────────────
function rCircle(d,sel,c,w) {
  if (!d.pts||d.pts.length<2) return '';
  const ctr=dataToSvg(d.pts[0].price,d.pts[0].time),edg=dataToSvg(d.pts[1].price,d.pts[1].time);
  if (ctr.x==null) return '';
  const r=Math.sqrt(Math.pow(edg.x-ctr.x,2)+Math.pow(edg.y-ctr.y,2));
  const sc=sel?'#2962FF':c;
  let s='<circle cx="'+F(ctr.x)+'" cy="'+F(ctr.y)+'" r="'+F(r)+'" stroke="transparent" stroke-width="10" fill="transparent" data-did="'+d.id+'" style="cursor:move;" />';
  s+='<circle cx="'+F(ctr.x)+'" cy="'+F(ctr.y)+'" r="'+F(r)+'" stroke="'+sc+'" stroke-width="'+w+'" fill="'+sc+'22" />';
  if (sel) { s+=H(ctr.x,ctr.y,d.id,0); s+=H(edg.x,edg.y,d.id,1); }
  return s;
}

// ── Render: Text ─────────────────────────────────────────────────
function rText(d,sel,c) {
  if (!d.pts||d.pts.length<1) return '';
  const p=dataToSvg(d.pts[0].price,d.pts[0].time);
  if (p.x==null) return '';
  const sc=sel?'#2962FF':c, txt=(d.text||'Text').replace(/</g,'&lt;');
  let s='<text x="'+F(p.x)+'" y="'+F(p.y)+'" font-size="14" fill="'+sc+'" font-weight="bold" font-family="sans-serif" data-did="'+d.id+'" style="cursor:move;">'+txt+'</text>';
  if (sel) s+=H(p.x,p.y,d.id,0);
  return s;
}

// ── Render: Note ─────────────────────────────────────────────────
function rNote(d,sel,c,w) {
  if (!d.pts||d.pts.length<1) return '';
  const p=dataToSvg(d.pts[0].price,d.pts[0].time);
  if (p.x==null) return '';
  const sc=sel?'#2962FF':c, txt=(d.text||'Note').replace(/</g,'&lt;'), bw=Math.max(60,txt.length*7+20);
  let s='<rect x="'+F(p.x)+'" y="'+F(p.y-22)+'" width="'+bw+'" height="26" rx="4" fill="#1e222d" stroke="'+sc+'" stroke-width="1" data-did="'+d.id+'" style="cursor:move;" />';
  s+='<text x="'+(p.x+8)+'" y="'+(p.y-5)+'" font-size="12" fill="'+sc+'" font-family="sans-serif">'+txt+'</text>';
  if (sel) s+=H(p.x+bw/2,p.y-9,d.id,0);
  return s;
}

// ── Render: Price Label ──────────────────────────────────────────
function rPriceLabel(d,sel,c,w) {
  if (!d.pts||d.pts.length<1) return '';
  const p=dataToSvg(d.pts[0].price,d.pts[0].time);
  if (p.x==null) return '';
  const sc=sel?'#2962FF':c;
  let s='<line x1="'+F(p.x)+'" y1="'+F(p.y)+'" x2="'+(_W-86)+'" y2="'+F(p.y)+'" stroke="'+sc+'" stroke-width="1" stroke-dasharray="3,2" data-did="'+d.id+'" style="cursor:move;" />';
  s+='<rect x="'+(_W-86)+'" y="'+(p.y-11)+'" width="82" height="22" rx="3" fill="'+sc+'" />';
  s+='<text x="'+(_W-45)+'" y="'+(p.y+4)+'" text-anchor="middle" font-size="10" fill="#000" font-weight="bold" font-family="monospace">'+fmtP(d.pts[0].price)+'</text>';
  if (sel) s+=H(p.x,p.y,d.id,0);
  return s;
}

// ── Render: Long / Short Position ────────────────────────────────
function rPosition(d,sel,isLong) {
  if (!d.pts||d.pts.length<2) return '';
  const entry=dataToSvg(d.pts[0].price,d.pts[0].time),tgt=dataToSvg(d.pts[1].price,d.pts[1].time);
  if (entry.x==null) return '';
  const X=entry.x,W2=_W-X,ey=entry.y,ty=tgt.y;
  const profC='#26a69a',lossC='#ef5350',fillC=ty<ey?profC:lossC;
  let s='<rect x="'+F(X)+'" y="'+F(Math.min(ey,ty))+'" width="'+F(W2)+'" height="'+F(Math.abs(ty-ey))+'" fill="'+fillC+'44" data-did="'+d.id+'" style="cursor:move;" />';
  s+='<line x1="'+F(X)+'" y1="'+F(ey)+'" x2="'+_W+'" y2="'+F(ey)+'" stroke="#d1d4dc" stroke-width="1.5" />';
  s+='<line x1="'+F(X)+'" y1="'+F(ty)+'" x2="'+_W+'" y2="'+F(ty)+'" stroke="'+fillC+'" stroke-width="1.5" />';
  s+='<text x="'+(X+6)+'" y="'+(ey-4)+'" font-size="9" fill="#d1d4dc" font-family="monospace">Entry '+fmtP(d.pts[0].price)+'</text>';
  s+='<text x="'+(X+6)+'" y="'+(ty+12)+'" font-size="9" fill="'+fillC+'" font-family="monospace">Target '+fmtP(d.pts[1].price)+'</text>';
  if (d.pts.length>=3) {
    const stop=dataToSvg(d.pts[2].price,d.pts[2].time);
    if (stop.x!=null) {
      const sy=stop.y;
      s+='<rect x="'+F(X)+'" y="'+F(Math.min(ey,sy))+'" width="'+F(W2)+'" height="'+F(Math.abs(sy-ey))+'" fill="'+lossC+'44" />';
      s+='<line x1="'+F(X)+'" y1="'+F(sy)+'" x2="'+_W+'" y2="'+F(sy)+'" stroke="'+lossC+'" stroke-width="1.5" />';
      s+='<text x="'+(X+6)+'" y="'+(sy+12)+'" font-size="9" fill="'+lossC+'" font-family="monospace">Stop '+fmtP(d.pts[2].price)+'</text>';
      if (sel) s+=H(stop.x,stop.y,d.id,2);
    }
  }
  if (sel) { s+=H(entry.x,entry.y,d.id,0); s+=H(tgt.x,tgt.y,d.id,1); }
  return s;
}

// ── Render: Date Range ───────────────────────────────────────────
function rDateRange(d,sel,c,w) {
  if (!d.pts||d.pts.length<2) return '';
  const p1=dataToSvg(d.pts[0].price,d.pts[0].time),p2=dataToSvg(d.pts[1].price,d.pts[1].time);
  if (p1.x==null) return '';
  const sc=sel?'#2962FF':c,x1=Math.min(p1.x,p2.x),x2=Math.max(p1.x,p2.x);
  let s='<rect x="'+F(x1)+'" y="0" width="'+F(x2-x1)+'" height="'+_H+'" fill="'+sc+'22" data-did="'+d.id+'" style="cursor:move;" />';
  s+='<line x1="'+F(p1.x)+'" y1="0" x2="'+F(p1.x)+'" y2="'+_H+'" stroke="'+sc+'" stroke-width="'+w+'" stroke-dasharray="4,2" />';
  s+='<line x1="'+F(p2.x)+'" y1="0" x2="'+F(p2.x)+'" y2="'+_H+'" stroke="'+sc+'" stroke-width="'+w+'" stroke-dasharray="4,2" />';
  if (sel) { s+=H(p1.x,_H/2,d.id,0); s+=H(p2.x,_H/2,d.id,1); }
  return s;
}

// ── Render: Price Range ──────────────────────────────────────────
function rPriceRange(d,sel,c,w) {
  if (!d.pts||d.pts.length<2) return '';
  const y1=candleSeries.priceToCoordinate(d.pts[0].price),y2=candleSeries.priceToCoordinate(d.pts[1].price);
  if (y1==null||y2==null||isNaN(y1)||isNaN(y2)) return '';
  const sc=sel?'#2962FF':c,mn=Math.min(y1,y2),mx=Math.max(y1,y2);
  let s='<rect x="0" y="'+F(mn)+'" width="'+_W+'" height="'+F(mx-mn)+'" fill="'+sc+'22" data-did="'+d.id+'" style="cursor:move;" />';
  s+='<line x1="0" y1="'+F(y1)+'" x2="'+_W+'" y2="'+F(y1)+'" stroke="'+sc+'" stroke-width="'+w+'" stroke-dasharray="4,2" />';
  s+='<line x1="0" y1="'+F(y2)+'" x2="'+_W+'" y2="'+F(y2)+'" stroke="'+sc+'" stroke-width="'+w+'" stroke-dasharray="4,2" />';
  if (sel) { s+=H(_W/2,y1,d.id,0); s+=H(_W/2,y2,d.id,1); }
  return s;
}

// ── Render in-progress ───────────────────────────────────────────
function renderIP() {
  if (!IP) return '';
  if ((IP==='brush'||IP==='highlighter')&&FREE_PTS.length>=4) {
    let pts='';
    for (let i=0;i<FREE_PTS.length;i+=2) pts+=F(FREE_PTS[i])+','+F(FREE_PTS[i+1])+' ';
    const sw=IP==='highlighter'?10:WID, op=IP==='highlighter'?0.4:1;
    return '<polyline points="'+pts+'" stroke="'+CLR+'" stroke-width="'+sw+'" fill="none" stroke-linecap="round" opacity="'+op+'" />';
  }
  if (CUR_PTS.length===0) return '';
  let s='';
  for (let i=0;i<CUR_PTS.length-1;i++) {
    const a=dataToSvg(CUR_PTS[i].price,CUR_PTS[i].time),b=dataToSvg(CUR_PTS[i+1].price,CUR_PTS[i+1].time);
    if (a.x!=null&&b.x!=null) s+='<line x1="'+F(a.x)+'" y1="'+F(a.y)+'" x2="'+F(b.x)+'" y2="'+F(b.y)+'" stroke="'+CLR+'" stroke-width="'+WID+'" stroke-dasharray="4,2" />';
  }
  if (_previewPt) {
    const last=CUR_PTS[CUR_PTS.length-1];
    const lp=dataToSvg(last.price,last.time);
    if (lp.x!=null) s+='<line x1="'+F(lp.x)+'" y1="'+F(lp.y)+'" x2="'+F(_previewPt.x)+'" y2="'+F(_previewPt.y)+'" stroke="'+CLR+'" stroke-width="'+WID+'" stroke-dasharray="4,2" opacity="0.6" />';
  }
  return s;
}

let _previewPt = null;
let _lastX = 0, _lastY = 0;

// ── Pointer events ───────────────────────────────────────────────
// 3-point tools that need a third click after the initial drag
const THREE_PT = new Set(['channel','longposition','shortposition']);

// ── Returns true if a point is inside #chart-wrap ────────────────
function ptInWrap(cx, cy) {
  var el = document.getElementById('chart-wrap');
  if (!el) return false;
  var r = el.getBoundingClientRect();
  return cx>=r.left && cx<=r.right && cy>=r.top && cy<=r.bottom;
}

// ── Walk DOM upward looking for data-did, stopping at boundary ───
function findDid(el) {
  var cur = el;
  for (var i=0; i<20 && cur && cur.tagName; i++) {
    var did = cur.getAttribute && cur.getAttribute('data-did');
    if (did) return did;
    cur = cur.parentElement;
  }
  return null;
}

// ── Update small status bar (debug helper, visible on device) ────
function dbg(msg) {
  var el = document.getElementById('drw-status');
  if (el) el.textContent = msg;
}

function initDrawingEvents() {
  // ── document-level touch (most reliable on Android WebView) ──────────────
  document.addEventListener('touchstart', function(e) {
    var touch = e.changedTouches && e.changedTouches[0];
    if (!touch) return;
    var cx = touch.clientX, cy = touch.clientY;

    // Only handle touches that land inside #chart-wrap
    if (!ptInWrap(cx, cy)) return;

    // Let LWC handle panning when no drawing tool active
    if (!TOOL || TOOL==='cursor') {
      dbg('cursor');
      return;
    }

    // Ignore touches on sidebar overlay elements
    var el = document.elementFromPoint(cx, cy);
    if (el && el.closest && (el.closest('#sidebar')||el.closest('#sb-sub')||el.closest('#float-menu'))) return;

    dbg('T:'+TOOL+' DOWN');
    e.preventDefault();
    onSvgDown({target:el, clientX:cx, clientY:cy, pointerId:-1, preventDefault:function(){}});
  }, {passive:false});

  document.addEventListener('touchmove', function(e) {
    if (!M_DOWN) return;
    var touch = e.changedTouches && e.changedTouches[0];
    if (!touch) return;
    e.preventDefault();
    _lastX=touch.clientX; _lastY=touch.clientY;
    dbg('T:'+TOOL+' MOVE');
    onSvgMove({clientX:touch.clientX, clientY:touch.clientY, preventDefault:function(){}});
  }, {passive:false});

  document.addEventListener('touchend', function(e) {
    if (!M_DOWN) return;
    var touch = e.changedTouches && e.changedTouches[0];
    var cx = touch ? touch.clientX : _lastX;
    var cy = touch ? touch.clientY : _lastY;
    e.preventDefault();
    dbg('T:'+TOOL+' UP');
    onSvgUp({clientX:cx, clientY:cy});
  }, {passive:false});

  document.addEventListener('touchcancel', function() {
    if (M_DOWN) { M_DOWN=false; IP=null; CUR_PTS=[]; _previewPt=null; redraw(); }
  });

  // ── Pointer events — web/desktop only (skips touch pointerType) ───────────
  var svg = document.getElementById('drw-svg');
  if (svg) {
    svg.addEventListener('pointerdown', function(e) {
      if (e.pointerType==='touch') return; onSvgDown(e);
    }, {passive:false});
    svg.addEventListener('pointermove', function(e) {
      if (e.pointerType==='touch') return; onSvgMove(e);
    }, {passive:false});
    svg.addEventListener('pointerup', function(e) {
      if (e.pointerType==='touch') return; onSvgUp(e);
    });
  }
}

function onSvgDown(e) {
  if (e.target && e.target.closest && (e.target.closest('#float-menu')||e.target.closest('#sidebar')||e.target.closest('#sb-sub'))) return;
  closeSub();
  const {x,y}=clientToSvg(e.clientX,e.clientY);

  if (!TOOL||TOOL==='cursor') { SEL=null; hideFM(); redraw(); return; }

  e.preventDefault();

  // Freehand — start tracking
  if (TOOL==='brush'||TOOL==='highlighter') {
    IP=TOOL; FREE_PTS=[x,y]; M_DOWN=true;
    try { e.target.setPointerCapture(e.pointerId); } catch(_){}
    return;
  }

  const pt=svgToData(x,y);
  if (pt.price==null) return; // chart not ready

  // ── 3-point tool: waiting for 3rd click ──
  if (IP && THREE_PT.has(IP) && CUR_PTS.length===2) {
    CUR_PTS.push(pt); finishDrawing(); return;
  }

  // ── Single-click tools ──
  if (TOOL==='hline') {
    const id=genId(); DRW.push({id,type:'hline',pts:[{price:pt.price,time:pt.time||0}],color:CLR,width:WID,visible:true,locked:false}); saveDrw(); redraw(); return;
  }
  if (TOOL==='vline') {
    if (!pt.time) return;
    const id=genId(); DRW.push({id,type:'vline',pts:[{price:pt.price,time:pt.time}],color:CLR,width:WID,visible:true,locked:false}); saveDrw(); redraw(); return;
  }
  if (TOOL==='pricelabel') {
    const id=genId(); DRW.push({id,type:'pricelabel',pts:[{price:pt.price,time:pt.time||0}],color:CLR,width:WID,visible:true,locked:false}); saveDrw(); redraw(); return;
  }
  if (TOOL==='text'||TOOL==='note') {
    const txt=prompt('Enter '+(TOOL==='text'?'text':'note')+':',TOOL==='text'?'Text':'Note');
    if (txt==null) return;
    const id=genId(); DRW.push({id,type:TOOL,pts:[{price:pt.price,time:pt.time||0}],color:CLR,width:WID,text:txt,visible:true,locked:false}); saveDrw(); redraw(); return;
  }

  // ── Drag-to-draw: start drag with 2 identical points ──
  IP=TOOL; CUR_PTS=[pt,pt]; M_DOWN=true;
  _previewPt={x,y};
  try { e.target.setPointerCapture(e.pointerId); } catch(_){}
  redraw();
}

function onSvgMove(e) {
  e.preventDefault();
  _lastX=e.clientX; _lastY=e.clientY;
  const {x,y}=clientToSvg(e.clientX,e.clientY);

  if (IP==='brush'||IP==='highlighter') {
    if (!M_DOWN) return;
    FREE_PTS.push(x,y); redraw(); return;
  }

  // Always update preview (even without M_DOWN, for 3-pt tools awaiting 3rd click)
  _previewPt={x,y};

  if (M_DOWN && IP && CUR_PTS.length>=2) {
    // Update second point live (drag model)
    const pt=svgToData(x,y);
    if (pt.price!=null) { CUR_PTS[1]=pt; }
    redraw();
  } else if (!M_DOWN && IP && THREE_PT.has(IP) && CUR_PTS.length===2) {
    // 3-pt tool: hover preview of third point
    redraw();
  }
}

function onSvgUp(e) {
  if (!M_DOWN) return;
  M_DOWN=false;
  const {x,y}=clientToSvg(e.clientX,e.clientY);

  // Freehand finish
  if (IP==='brush'||IP==='highlighter') {
    FREE_PTS.push(x,y);
    if (FREE_PTS.length>=4) {
      const pts=[];
      for (let i=0;i<FREE_PTS.length;i+=2) { const pt=svgToData(FREE_PTS[i],FREE_PTS[i+1]); if(pt.price!=null) pts.push(pt); }
      if (pts.length>=2) { const id=genId(); DRW.push({id,type:IP,pts,color:CLR,width:WID,visible:true,locked:false}); saveDrw(); }
    }
    IP=null; FREE_PTS=[]; CUR_PTS=[]; _previewPt=null; redraw(); return;
  }

  // Drag-to-draw finish
  if (IP && CUR_PTS.length>=2) {
    const pt=svgToData(x,y);
    if (pt.price!=null) CUR_PTS[1]=pt;

    if (THREE_PT.has(IP)) {
      // Don't finish yet — wait for 3rd click
      // Show the 2-pt drawing in-progress; M_DOWN is now false
      _previewPt=null;
      redraw();
    } else {
      // Only save if user actually dragged (not a zero-length tap)
      const p1=dataToSvg(CUR_PTS[0].price,CUR_PTS[0].time);
      const p2=dataToSvg(CUR_PTS[1].price,CUR_PTS[1].time);
      const moved = p1.x!=null&&p2.x!=null && (Math.abs(p2.x-p1.x)>4||Math.abs(p2.y-p1.y)>4);
      if (moved) { finishDrawing(); } else { IP=null; CUR_PTS=[]; _previewPt=null; redraw(); }
    }
  }
}

function finishDrawing() {
  if (!IP||CUR_PTS.length===0) return;
  const id=genId();
  DRW.push({id,type:IP,pts:[...CUR_PTS],color:CLR,width:WID,visible:true,locked:false});
  // Auto-return to cursor so user can pan/zoom chart after drawing
  TOOL=null; IP=null; CUR_PTS=[]; _previewPt=null;
  saveDrw(); buildSidebar(); updateSvgMode(); redraw();
}

// ── Handle click on drawing element ─────────────────────────────
function handleDrawingClick(did,e) {
  if (!TOOL||TOOL==='cursor') {
    const d=DRW.find(x=>x.id===did);
    if (!d||d.locked) return;
    SEL=did; showFM(d,e); redraw();
  }
}

// ── Drag to move selected drawing ────────────────────────────────
function startMove(did,e) {
  const d=DRW.find(x=>x.id===did);
  if (!d||d.locked) return;
  SEL=did; redraw();
  const startXY=clientToSvg(e.clientX,e.clientY);
  const origPts=JSON.parse(JSON.stringify(d.pts));
  const startData=svgToData(startXY.x,startXY.y);
  const onMove=ev=>{
    const cur=clientToSvg(ev.clientX,ev.clientY);
    const curData=svgToData(cur.x,cur.y);
    if (!curData.time&&curData.time!==0) return;
    const dPrice=curData.price-(startData.price||0);
    const dTime=(curData.time||0)-(startData.time||0);
    d.pts=origPts.map(pt=>({price:(pt.price||0)+dPrice,time:(pt.time||0)+dTime}));
    redraw();
  };
  const onUp=()=>{ saveDrw(); document.removeEventListener('pointermove',onMove); document.removeEventListener('pointerup',onUp); };
  document.addEventListener('pointermove',onMove); document.addEventListener('pointerup',onUp);
}

// ── Resize handle ─────────────────────────────────────────────────
function startResize(did,idx,e) {
  const d=DRW.find(x=>x.id===did);
  if (!d||d.locked) return;
  SEL=did; redraw();
  const onMove=ev=>{
    const {x,y}=clientToSvg(ev.clientX,ev.clientY);
    const pt=svgToData(x,y);
    if (!pt.time&&pt.time!==0) return;
    if (d.type==='rectangle') {
      if (idx===0) { d.pts[0]={price:pt.price,time:pt.time}; }
      else if (idx===1) { d.pts[1]=d.pts[1]||{}; d.pts[0].time=pt.time; d.pts[1].price=d.pts[0].price; d.pts[1].time=pt.time; }
      else if (idx===2) { d.pts[0].time=pt.time; d.pts[1]=d.pts[1]||{}; d.pts[1].price=pt.price; }
      else { if(!d.pts[1]) d.pts[1]={}; d.pts[1].price=pt.price; d.pts[1].time=pt.time; }
    } else if (d.pts[idx]!==undefined) {
      d.pts[idx]={price:pt.price,time:pt.time};
    }
    redraw();
  };
  const onUp=()=>{ saveDrw(); document.removeEventListener('pointermove',onMove); document.removeEventListener('pointerup',onUp); };
  document.addEventListener('pointermove',onMove,{passive:false});
  document.addEventListener('pointerup',onUp);
}

// ── Select / Deselect ─────────────────────────────────────────────
function deselectAll() { SEL=null; hideFM(); redraw(); }

// ── Float menu actions ─────────────────────────────────────────────
function showFM(d,e) {
  const fm=document.getElementById('float-menu');
  if (!fm) return;
  fm.classList.remove('hidden');
  const fx=Math.min(e?e.clientX:200,window.innerWidth-210);
  const fy=Math.max(e?(e.clientY-70):120,50);
  fm.style.left=fx+'px'; fm.style.top=fy+'px';
  const lk=document.getElementById('fm-lck');
  if (lk) lk.textContent=d.locked?'🔓 Unlock':'🔒 Lock';
  const cl=document.getElementById('fm-clr');
  if (cl) cl.value=d.color||'#f0b90b';
}
function hideFM() { const fm=document.getElementById('float-menu'); if(fm) fm.classList.add('hidden'); }
function deleteSel() {
  if (!SEL) return;
  DRW=DRW.filter(d=>d.id!==SEL); SEL=null; hideFM(); saveDrw(); redraw();
}
function colorSel(v) {
  if (!SEL) return;
  const d=DRW.find(x=>x.id===SEL); if(d){d.color=v;saveDrw();redraw();}
}
function lockSel() {
  if (!SEL) return;
  const d=DRW.find(x=>x.id===SEL);
  if (d) {
    d.locked=!d.locked; saveDrw();
    if (d.locked){SEL=null;hideFM();}
    else { const lk=document.getElementById('fm-lck'); if(lk) lk.textContent='🔒 Lock'; }
    redraw();
  }
}

// ── Subscribe to chart viewport changes ───────────────────────────
function subscribeChartRedraw() {
  if (!chart) return;
  try { chart.timeScale().subscribeVisibleLogicalRangeChange(()=>redraw()); } catch {}
  try { chart.priceScale('right').subscribeVisiblePriceRangeChange(()=>redraw()); } catch {}
}

// ── Init ───────────────────────────────────────────────────────────
function initDrwEngine() {
  loadDrw();
  buildSidebar();
  updateSvgMode();
  subscribeChartRedraw();
  setTimeout(redraw,300);
}

// Attach all events IMMEDIATELY (sidebar HTML is already in DOM)
(function immediateInit() {
  try {
    loadDrw();
    buildSidebar();      // refresh .act classes on hardcoded buttons
    updateSvgMode();
    initSidebarEvents(); // touchend+click on every sidebar button
    initDrawingEvents(); // touchstart/move/end + pointer fallback on SVG
  } catch(e) {}
})();
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
        closeFullscreen();
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

  // Lock to landscape when fullscreen opens via rotate button; unlock on close
  const openFullscreenLandscape = useCallback(async () => {
    setFsLoading(true);
    setIsFullscreen(true);
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } catch (_) {}
  }, []);

  const closeFullscreen = useCallback(async () => {
    Keyboard.dismiss(); // prevent Android from restoring focus to last TextInput
    setIsFullscreen(false);
    try {
      await ScreenOrientation.unlockAsync();
    } catch (_) {}
  }, []);

  const onMessage = useCallback((e: any) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === "toggleFS") {
        if (data.value) { setFsLoading(true); setIsFullscreen(true); }
        else { closeFullscreen(); }
      } else if (data.type === "rotateFS") {
        openFullscreenLandscape();
      }
    } catch (_) {}
  }, [openFullscreenLandscape, closeFullscreen]);

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
        onRequestClose={closeFullscreen}
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
            onPress={closeFullscreen}
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
