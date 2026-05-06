/**
 * NativeWebViewChart — Full TradingView-style chart for Android & iOS
 * Uses react-native-webview + lightweight-charts (bundled inline) + MEXC REST + Binance WS
 * Identical look to the web chart: dark theme, candles, volume, crosshair,
 * timeframe picker, drawing toolbar, fullscreen, OHLCV tooltip, IST clock.
 */
import React, { useRef, useState, useCallback, useEffect, useMemo, forwardRef } from "react";
import {
  View, StyleSheet, ActivityIndicator, TouchableOpacity, Text,
  Modal, StatusBar, useWindowDimensions, Platform, BackHandler, Keyboard,
} from "react-native";
import LoadingCandleAnimation from "./LoadingCandleAnimation";
import { WebView } from "react-native-webview";
import * as ScreenOrientation from "expo-screen-orientation";
import { LWC_SCRIPT } from "../lib/lwcScript";
import { useTradingContext } from "@/context/TradingContext";

interface Props {
  symbol?: string;
  height?: number;
}

function buildHtml(symbol: string, initialFS = false, apiBase = ""): string {
  const bin = symbol.replace("/","").toUpperCase().endsWith("USDT")
    ? symbol.replace("/","").toUpperCase()
    : symbol.replace("/","").toUpperCase() + "USDT";

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
html,body{width:100%;height:100%;background:#131722;overflow:hidden;margin:0;padding:0;}
#root{position:fixed;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;}

/* ── Top toolbar ── */
#topbar{
  display:flex;align-items:center;background:#1e222d;
  border-bottom:1px solid #2a2e39;height:42px;flex-shrink:0;
  padding:0 calc(4px + env(safe-area-inset-right,0px)) 0 calc(4px + env(safe-area-inset-left,0px));gap:2px;
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
  position:fixed;top:42px;left:calc(44px + env(safe-area-inset-left,0px));
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
#chart-wrap{position:absolute;top:0;left:calc(50px + env(safe-area-inset-left,0px));right:env(safe-area-inset-right,0px);bottom:0;}
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
  padding:0 calc(8px + env(safe-area-inset-right,0px)) 0 calc(8px + env(safe-area-inset-left,0px));
  padding-bottom:env(safe-area-inset-bottom,0px);
  flex-shrink:0;font-size:12px;color:#787b86;
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
#sidebar{position:absolute;top:0;left:env(safe-area-inset-left,0px);width:50px;bottom:0;background:#111827;border-right:1px solid #1f2937;display:flex;flex-direction:column;align-items:center;padding:6px 0;gap:2px;z-index:20;overflow-y:auto;overflow-x:visible;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
#sidebar::-webkit-scrollbar{display:none;}
.sb-btn{width:38px;height:38px;display:flex;align-items:center;justify-content:center;background:none;border:none;border-radius:8px;cursor:pointer;color:#8A91A3;position:relative;flex-shrink:0;-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:background .12s,color .12s;}
.sb-btn.act{background:rgba(47,107,255,0.18);color:#2F6BFF;}
.sb-btn:active{background:rgba(255,255,255,0.08);}
.sb-btn svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;}
.sb-tri{position:absolute;right:4px;bottom:4px;width:0;height:0;border-left:3.5px solid transparent;border-right:0;border-top:3.5px solid #6B7280;}
.sb-btn.act .sb-tri{border-top-color:#2F6BFF;}
.sb-sep{width:30px;height:1px;background:#1f2937;flex-shrink:0;margin:4px 0;}
/* Submenu */
#sb-sub{position:fixed;left:calc(52px + env(safe-area-inset-left,0px));background:#1C2333;border:1px solid #283045;border-radius:10px;min-width:204px;padding:6px 0;z-index:500;box-shadow:0 8px 32px #00000099;}
#sb-sub.hidden{display:none;}
.sub-title{padding:7px 14px 6px;font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.8px;border-bottom:1px solid #283045;margin-bottom:4px;}
.sub-item{display:flex;align-items:center;gap:10px;padding:0 14px;height:44px;font-size:13px;color:#C9D1D9;cursor:pointer;border:none;background:none;width:100%;text-align:left;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
.sub-item:active,.sub-item.act{background:rgba(47,107,255,0.15);color:#2F6BFF;}
.sub-icon{width:20px;height:20px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.sub-icon svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;}
.sub-item.act .sub-icon svg,.sub-item.act .sub-icon{color:#2F6BFF;}
/* Drawing Canvas overlay — pointer-events:none by default so chart gets all touches */
#drw-canvas{display:block;position:absolute;top:0;left:0;z-index:5;pointer-events:none;}
/* Tool active instruction pill */
#drw-hint{
  position:fixed;bottom:calc(40px + env(safe-area-inset-bottom,0px));left:50%;
  transform:translateX(-50%);
  background:rgba(41,98,255,0.13);border:1px solid rgba(41,98,255,0.45);
  color:#93bbff;font-size:11px;font-weight:600;padding:5px 16px;border-radius:20px;
  pointer-events:none;z-index:700;letter-spacing:.3px;white-space:nowrap;
  -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
  transition:opacity .15s;
}
#drw-hint.hidden{display:none;}
/* Float menu */
#float-menu{position:fixed;background:#1C2333;border:1px solid #283045;border-radius:12px;padding:5px 7px;display:flex;align-items:center;gap:2px;z-index:600;box-shadow:0 8px 28px #00000099;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);}
#float-menu.hidden{display:none;}
.fm-btn{background:none;border:none;border-radius:6px;color:#C9D1D9;cursor:pointer;padding:6px 8px;font-size:11px;display:flex;align-items:center;gap:4px;white-space:nowrap;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
.fm-btn svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;}
.fm-btn:active{background:rgba(255,255,255,0.1);}
.fm-del{color:#EF5350;}
.fm-del svg{stroke:#EF5350;}
.fm-sep{width:1px;height:22px;background:#283045;flex-shrink:0;margin:0 2px;}
#fm-clr{width:24px;height:24px;border:2px solid #3a4560;border-radius:6px;cursor:pointer;padding:0;background:#f0b90b;flex-shrink:0;}
/* Fibonacci Settings Panel */
#fib-panel{position:fixed;background:#1C2333;border:1px solid #283045;border-radius:14px;padding:0;z-index:601;box-shadow:0 8px 28px #00000099;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);width:224px;overflow:hidden;}
#fib-panel.hidden{display:none;}
.fp-header{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-bottom:1px solid #283045;}
.fp-title{font-size:12px;font-weight:700;color:#C9D1D9;letter-spacing:.3px;}
.fp-hbtns{display:flex;gap:2px;}
.fp-row{display:flex;align-items:center;justify-content:space-between;padding:7px 12px;border-bottom:1px solid #1e2a3a;}
.fp-label{font-size:11px;color:#8B95A3;}
.fp-tog{display:flex;background:#0d1117;border-radius:6px;overflow:hidden;}
.fp-tog button{border:none;background:none;color:#6B7280;font-size:11px;font-weight:700;padding:4px 9px;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
.fp-tog button.act{background:#2962FF;color:#fff;border-radius:5px;}
.fp-sw{position:relative;width:34px;height:18px;flex-shrink:0;}
.fp-sw input{opacity:0;width:0;height:0;position:absolute;}
.fp-sw-track{position:absolute;top:0;left:0;right:0;bottom:0;background:#283045;border-radius:9px;cursor:pointer;transition:background .2s;}
.fp-sw input:checked+.fp-sw-track{background:#2962FF;}
.fp-sw-track::after{content:'';position:absolute;width:12px;height:12px;background:#fff;border-radius:50%;top:3px;left:3px;transition:left .2s;}
.fp-sw input:checked+.fp-sw-track::after{left:19px;}
.fp-slider{-webkit-appearance:none;appearance:none;width:100%;height:3px;border-radius:2px;background:#283045;accent-color:#2962FF;cursor:pointer;outline:none;}
.fp-slider::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#2962FF;cursor:pointer;}
.fp-del-btn{color:#EF5350 !important;}
.fp-del-btn svg{stroke:#EF5350 !important;}
.fp-reset-btn{color:#F59E0B;font-size:11px;padding:2px 0;}
/* Position Settings Panel */
#pos-panel{position:fixed;background:#1C2333;border:1px solid #283045;border-radius:14px;padding:0;z-index:601;box-shadow:0 8px 28px #00000099;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);width:224px;overflow:hidden;}
#pos-panel.hidden{display:none;}
</style>
</head>
<body>
<div id="root">

  <!-- TOP TOOLBAR -->
  <div id="topbar">
    <button id="tb-tools" class="tb-btn" title="Toggle Tools" onclick="toggleTools(this)">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
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
    <button id="tb-chart-type" class="tb-btn" title="Toggle chart type" onclick="toggleChartType()">
      <svg id="tb-ct-svg" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
        <line x1="5" y1="3" x2="5" y2="5"/><rect x="3.5" y="5" width="3" height="6" rx=".5"/>
        <line x1="5" y1="11" x2="5" y2="14"/><line x1="12" y1="2" x2="12" y2="5"/>
        <rect x="10.5" y="5" width="3" height="9" rx=".5"/><line x1="12" y1="14" x2="12" y2="17"/>
        <line x1="19" y1="5" x2="19" y2="8"/><rect x="17.5" y="8" width="3" height="5" rx=".5"/>
        <line x1="19" y1="13" x2="19" y2="16"/>
      </svg>
    </button>
    <div style="flex:1"></div>
    <button class="tb-btn" id="tb-fs" title="Fullscreen" onclick="postRN({type:'toggleFS',value:true})">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
        <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
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
      <!-- Lines: diagonal line with filled dot at start -->
      <button class="sb-btn" id="sb-lines" title="Lines" onclick="openSubById('lines',this)">
        <svg viewBox="0 0 24 24">
          <line x1="5" y1="19" x2="19" y2="5"/>
          <circle cx="5" cy="19" r="2.5" fill="currentColor" stroke="none"/>
          <circle cx="19" cy="5" r="1.5"/>
        </svg>
        <div class="sb-tri"></div>
      </button>
      <!-- Positions & Ranges: long/short arrows with mid bar -->
      <button class="sb-btn" id="sb-pos" title="Positions &amp; Ranges" onclick="openSubById('pos',this)">
        <svg viewBox="0 0 24 24">
          <line x1="4" y1="12" x2="20" y2="12"/>
          <polyline points="8 7 12 3 16 7" stroke="#22C55E" fill="none"/>
          <line x1="12" y1="3" x2="12" y2="12" stroke="#22C55E"/>
          <polyline points="8 17 12 21 16 17" stroke="#EF4444" fill="none"/>
          <line x1="12" y1="12" x2="12" y2="21" stroke="#EF4444"/>
        </svg>
        <div class="sb-tri"></div>
      </button>
      <!-- Shapes: rectangle -->
      <button class="sb-btn" id="sb-shapes" title="Shapes" onclick="openSubById('shapes',this)">
        <svg viewBox="0 0 24 24">
          <rect x="3" y="6" width="18" height="12" rx="1.5"/>
        </svg>
        <div class="sb-tri"></div>
      </button>
      <!-- Brush: wavy freehand line (TradingView squiggle style) -->
      <button class="sb-btn" id="sb-brush" title="Draw" onclick="openSubById('brush',this)">
        <svg viewBox="0 0 24 24">
          <path d="M3 14 C5.5 8 7.5 17 10 12 C12.5 7 14.5 16 17 11 C18.5 8 20.5 10 21 10" fill="none"/>
        </svg>
        <div class="sb-tri"></div>
      </button>
      <!-- Text: clean T with crossbar and stem -->
      <button class="sb-btn" id="sb-text" title="Text" onclick="openSubById('text',this)">
        <svg viewBox="0 0 24 24">
          <line x1="4" y1="6" x2="20" y2="6"/>
          <line x1="12" y1="6" x2="12" y2="20"/>
        </svg>
        <div class="sb-tri"></div>
      </button>
      <div class="sb-sep"></div>
      <!-- Hide/Show: eye (TradingView style with slash when hidden) -->
      <button class="sb-btn" id="sb-hide" title="Hide/Show drawings" onclick="toggleHide(this)">
        <svg viewBox="0 0 24 24">
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
      <!-- Lock all: padlock -->
      <button class="sb-btn" id="sb-lock" title="Lock all drawings" onclick="toggleLockAll(this)">
        <svg viewBox="0 0 24 24">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </button>
      <!-- Clear all: trash can -->
      <button class="sb-btn" id="sb-delete" title="Clear all drawings" onclick="clearAllDrawings()">
        <svg viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
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
      <!-- Drawing Canvas overlay -->
      <canvas id="drw-canvas"></canvas>
      <!-- Drawing status bar (debug helper) -->
      <div id="drw-status" style="position:absolute;top:4px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.55);color:#fff;font-size:10px;padding:2px 8px;border-radius:8px;pointer-events:none;z-index:600;letter-spacing:.5px;"></div>
    </div>
  </div>

  <!-- Float menu for selected drawing -->
  <div id="float-menu" class="hidden">
    <input type="color" id="fm-clr" value="#f0b90b" title="Color">
    <div class="fm-sep"></div>
    <button class="fm-btn" id="fm-lck" title="Lock">
      <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    </button>
    <div class="fm-sep"></div>
    <button class="fm-btn fm-del" id="fm-del" title="Delete">
      <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
    </button>
    <div class="fm-sep"></div>
    <button class="fm-btn" id="fm-close" title="Deselect" style="color:#6B7280;">
      <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>

  <!-- Fibonacci Settings Panel -->
  <div id="fib-panel" class="hidden">
    <div class="fp-header">
      <span class="fp-title">Fibonacci</span>
      <div class="fp-hbtns">
        <button class="fm-btn fp-del-btn" id="fp-del" title="Delete">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
        <button class="fm-btn" id="fp-close" title="Close" style="color:#6B7280;">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
    <div class="fp-row">
      <span class="fp-label">Show Labels</span>
      <label class="fp-sw"><input type="checkbox" id="fp-labels" checked><span class="fp-sw-track"></span></label>
    </div>
    <div class="fp-row">
      <span class="fp-label">Show Prices</span>
      <label class="fp-sw"><input type="checkbox" id="fp-prices" checked><span class="fp-sw-track"></span></label>
    </div>
    <div class="fp-row">
      <span class="fp-label">Golden Zone</span>
      <label class="fp-sw"><input type="checkbox" id="fp-golden" checked><span class="fp-sw-track"></span></label>
    </div>
    <div class="fp-row">
      <span class="fp-label">Thickness</span>
      <div class="fp-tog">
        <button id="fp-w1" class="act" onclick="fibSetWidth(1)">1</button>
        <button id="fp-w2" onclick="fibSetWidth(2)">2</button>
      </div>
    </div>
    <div class="fp-row">
      <span class="fp-label">Style</span>
      <div class="fp-tog">
        <button id="fp-s-solid" onclick="fibSetStyle('solid')">&#9135;</button>
        <button id="fp-s-dashed" class="act" onclick="fibSetStyle('dashed')">- -</button>
        <button id="fp-s-dotted" onclick="fibSetStyle('dotted')">&#xB7;&#xB7;&#xB7;</button>
      </div>
    </div>
    <div class="fp-row" style="flex-direction:column;align-items:flex-start;gap:5px;">
      <div style="display:flex;justify-content:space-between;width:100%;">
        <span class="fp-label">Opacity</span>
        <span class="fp-label" id="fp-opacity-val">45%</span>
      </div>
      <input type="range" class="fp-slider" id="fp-opacity" min="20" max="80" value="45">
    </div>
    <div class="fp-row">
      <span class="fp-label">Label Position</span>
      <div class="fp-tog">
        <button id="fp-lp-left" class="act" onclick="fibSetLabelPos('left')">L</button>
        <button id="fp-lp-center" onclick="fibSetLabelPos('center')">C</button>
        <button id="fp-lp-right" onclick="fibSetLabelPos('right')">R</button>
      </div>
    </div>
    <div class="fp-row">
      <span class="fp-label">Extend Right</span>
      <label class="fp-sw"><input type="checkbox" id="fp-extend"><span class="fp-sw-track"></span></label>
    </div>
    <div class="fp-row">
      <span class="fp-label">Reverse</span>
      <label class="fp-sw"><input type="checkbox" id="fp-reverse"><span class="fp-sw-track"></span></label>
    </div>
    <div class="fp-row" style="border-bottom:none;">
      <button class="fm-btn fp-reset-btn" id="fp-reset" onclick="fibResetStyle()">Reset Style</button>
      <button class="fm-btn" id="fp-lck" title="Lock">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </button>
    </div>
  </div>

  <!-- Position Settings Panel -->
  <div id="pos-panel" class="hidden">
    <div class="fp-header">
      <span class="fp-title" id="pp-title">Long Position</span>
      <div class="fp-hbtns">
        <button class="fm-btn fp-del-btn" id="pp-del" title="Delete">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
        <button class="fm-btn" id="pp-close" title="Close" style="color:#6B7280;">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
    <div class="fp-row">
      <span class="fp-label">Show Labels</span>
      <label class="fp-sw"><input type="checkbox" id="pp-labels" checked><span class="fp-sw-track"></span></label>
    </div>
    <div class="fp-row">
      <span class="fp-label">Show Prices</span>
      <label class="fp-sw"><input type="checkbox" id="pp-prices" checked><span class="fp-sw-track"></span></label>
    </div>
    <div class="fp-row">
      <span class="fp-label">Risk / Reward</span>
      <label class="fp-sw"><input type="checkbox" id="pp-rr" checked><span class="fp-sw-track"></span></label>
    </div>
    <div class="fp-row">
      <span class="fp-label">Thickness</span>
      <div class="fp-tog">
        <button id="pp-w1" class="act" onclick="posSetWidth(1)">1</button>
        <button id="pp-w2" onclick="posSetWidth(2)">2</button>
        <button id="pp-w3" onclick="posSetWidth(3)">3</button>
      </div>
    </div>
    <div class="fp-row" style="flex-direction:column;align-items:flex-start;gap:5px;">
      <div style="display:flex;justify-content:space-between;width:100%;">
        <span class="fp-label">Opacity</span>
        <span class="fp-label" id="pp-opacity-val">22%</span>
      </div>
      <input type="range" class="fp-slider" id="pp-opacity" min="10" max="60" value="22">
    </div>
    <div class="fp-row" style="border-bottom:none;">
      <button class="fm-btn fp-reset-btn" id="pp-reset" onclick="posResetStyle()">Reset Style</button>
      <div style="display:flex;gap:2px;">
        <button class="fm-btn" id="pp-dup" title="Duplicate" style="color:#60A5FA;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="fm-btn" id="pp-lck" title="Lock">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </button>
      </div>
    </div>
  </div>

  <!-- Tool submenu -->
  <div id="sb-sub" class="hidden"></div>

  <!-- Backdrop for menus -->
  <div id="backdrop" onclick="closeAllMenus()"></div>

  <!-- Tool instruction pill -->
  <div id="drw-hint" class="hidden"></div>

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
const API_BASE = '${apiBase}';
// TF_MAP: Binance WS kline stream interval (kept for WebSocket URL)
const TF_MAP   = {
  '1m':'1m','3m':'3m','5m':'5m','15m':'15m','30m':'30m',
  '1h':'1h','2h':'2h','4h':'4h','1D':'1d','1W':'1w',
};
// MEXC_TF_MAP: MEXC REST kline interval (Binance-compatible format, device-accessible)
const MEXC_TF_MAP = {
  '1m':'1m','3m':'3m','5m':'5m','15m':'15m','30m':'30m',
  '1h':'60m','2h':'2h','4h':'4h','1D':'1d','1W':'1W',
};
let currentTf  = '5m';
let chart, candleSeries, volSeries;
let ws, tickerWs, retryTimer, retryDelay = 500;
let CHART_TYPE = 'candle';
let _rawCandles = [];
let _gridVisible = true;
let loadId = 0;
let lastMsgAt = 0;
let stalenessTimer = null;
let volCollapsed = false;
let isFS = ${initialFS ? 'true' : 'false'};
// Tracks the live (incomplete) candle so aggTrade can update close in real-time
let liveCandle = null;


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
      vertLine: { color: 'transparent', labelVisible: false, labelBackgroundColor: 'transparent' },
      horzLine: { color: 'transparent', labelVisible: false, labelBackgroundColor: 'transparent' },
    },
    rightPriceScale: { borderColor: '#2a2e39' },
    timeScale: {
      borderColor: '#2a2e39', timeVisible: true, secondsVisible: false,
      // Smooth kinetic scroll on mobile touch
      rightOffset: 5, barSpacing: 8, minBarSpacing: 2,
    },
    handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
    handleScale:  { axisPressedMouseMove: { time: true, price: true }, mouseWheel: true, pinch: true },
    // Keep auto-scale stable — prevents price-scale jumping on every live tick
    autoSize: false,
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

  // Resize observer — suppressed while native fullscreen is active so the
  // hidden portrait WebView doesn't resize to landscape dimensions
  const ro = new ResizeObserver(() => { if (!window.__suppressResize) resizeChart(); });
  ro.observe(el);
}

function resizeChart() {
  if (!chart) return;
  const el = document.getElementById('chart');
  chart.resize(el.offsetWidth, el.offsetHeight);
}

function toggleChartType() {
  if (!chart) return;
  CHART_TYPE = CHART_TYPE === 'candle' ? 'line' : 'candle';
  var btn = document.getElementById('tb-ct-svg');
  if (CHART_TYPE === 'line') {
    if (btn) btn.innerHTML = '<polyline points="3 17 8 11 13 14 21 5" stroke-width="2"/>';
    try { chart.removeSeries(candleSeries); } catch(_) {}
    candleSeries = chart.addSeries(LightweightCharts.LineSeries, {
      color: '#2962FF', lineWidth: 2,
      lastValueVisible: true, priceLineVisible: true,
      crosshairMarkerVisible: true, crosshairMarkerRadius: 4,
    });
    if (_rawCandles.length) {
      candleSeries.setData(_rawCandles.map(function(c){return{time:c.time,value:c.close};}));
    }
  } else {
    if (btn) btn.innerHTML =
      '<line x1="5" y1="3" x2="5" y2="5"/><rect x="3.5" y="5" width="3" height="6" rx=".5"/>'+
      '<line x1="5" y1="11" x2="5" y2="14"/><line x1="12" y1="2" x2="12" y2="5"/>'+
      '<rect x="10.5" y="5" width="3" height="9" rx=".5"/><line x1="12" y1="14" x2="12" y2="17"/>'+
      '<line x1="19" y1="5" x2="19" y2="8"/><rect x="17.5" y="8" width="3" height="5" rx=".5"/>'+
      '<line x1="19" y1="13" x2="19" y2="16"/>';
    try { chart.removeSeries(candleSeries); } catch(_) {}
    candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
      upColor: '#26a69a', downColor: '#ef5350',
      borderUpColor: '#26a69a', borderDownColor: '#ef5350',
      wickUpColor: '#26a69a', wickDownColor: '#ef5350',
      lastValueVisible: true, priceLineVisible: true,
    });
    if (_rawCandles.length) candleSeries.setData(_rawCandles);
  }
  scheduleRedraw();
}

var _toolsVisible = true;
function toggleTools(btn) {
  _toolsVisible = !_toolsVisible;
  var sb = document.getElementById('sidebar');
  var cw = document.getElementById('chart-wrap');
  if (sb) sb.style.display = _toolsVisible ? '' : 'none';
  if (cw) cw.style.left = _toolsVisible
    ? 'calc(50px + env(safe-area-inset-left,0px))'
    : 'env(safe-area-inset-left,0px)';
  // close submenu if open
  closeSub();
  // deselect current tool when hiding
  if (!_toolsVisible && TOOL && TOOL !== 'cursor') {
    TOOL = 'cursor'; IP = null; CUR_PTS = []; _previewPt = null;
    DRAW_MODE = 'selecting'; updateCanvasMode();
  }
  if (btn) btn.classList.toggle('act', !_toolsVisible);
  setTimeout(resizeChart, 30);
}

function toggleGrid(btn) {
  if (!chart) return;
  _gridVisible = !_gridVisible;
  var c = _gridVisible ? '#1e222d' : 'transparent';
  chart.applyOptions({ grid: { vertLines: { color: c }, horzLines: { color: c } } });
  if (btn) btn.classList.toggle('act', !_gridVisible);
}

// ── Data loading ─────────────────────────────────────────────────────────────
async function loadData(sym, tf) {
  const id = ++loadId;
  const mexcInterval = MEXC_TF_MAP[tf] || '5m';

  // Try API proxy first (more reliable in dev/Replit), fall back to MEXC direct
  const proxyUrl = API_BASE
    ? API_BASE + '/api/market/klines?symbol=' + sym + '&interval=' + mexcInterval + '&limit=101'
    : null;
  const mexcUrl = 'https://api.mexc.com/api/v3/klines?symbol=' + sym + '&interval=' + mexcInterval + '&limit=101';

  console.log('[NativeChart] fetching candles — sym:', sym, 'interval:', mexcInterval);

  async function tryFetch(url) {
    const ctrl = new AbortController();
    const tid = setTimeout(function(){ ctrl.abort(); }, 8000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(tid);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) throw new Error('empty response');
      return data;
    } catch(e) {
      clearTimeout(tid);
      throw e;
    }
  }

  let data = null;
  try {
    if (proxyUrl) {
      console.log('[NativeChart] trying proxy:', proxyUrl);
      data = await tryFetch(proxyUrl);
      console.log('[NativeChart] proxy success — candles:', data.length);
    }
  } catch(e) {
    console.log('[NativeChart] proxy failed, trying MEXC direct:', e && e.message ? e.message : String(e));
    data = null;
  }

  if (!data) {
    try {
      console.log('[NativeChart] trying MEXC direct:', mexcUrl);
      data = await tryFetch(mexcUrl);
      console.log('[NativeChart] MEXC direct success — candles:', data.length);
    } catch(e) {
      console.log('[NativeChart] both sources failed:', e && e.message ? e.message : String(e));
    }
  }

  if (loadId !== id) return;

  if (!data) {
    // REST failed — keep any existing candles visible, retry silently
    console.log('[NativeChart] REST failed, retrying...');
    setWsBadge('error');
    retryTimer = setTimeout(function(){ loadData(sym, tf); }, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 8000);
    return;
  }

  // ── Render candles immediately from REST ──────────────────────────────────
  var candles = data.map(function(k) { return {
    time: Math.floor(Number(k[0])/1000),
    open: parseFloat(k[1]), high: parseFloat(k[2]),
    low: parseFloat(k[3]), close: parseFloat(k[4]),
  }; });
  var vols = data.map(function(k) { return {
    time: Math.floor(Number(k[0])/1000),
    value: parseFloat(k[5]),
    color: parseFloat(k[4]) >= parseFloat(k[1]) ? '#26a69a55' : '#ef535055',
  }; });
  _rawCandles = candles;
  var mappedCandles = CHART_TYPE === 'line'
    ? candles.map(function(c){return{time:c.time,value:c.close};})
    : candles;
  candleSeries.setData(mappedCandles);
  volSeries.setData(vols);
  chart.timeScale().fitContent();
  console.log("Candles rendered");

  // ── Connect WebSocket (optional — candles already visible) ────────────────
  connectWS(sym, tf, id);
}

// ── WebSocket ────────────────────────────────────────────────────────────────
function clearStaleness() {
  if (stalenessTimer) { clearTimeout(stalenessTimer); stalenessTimer = null; }
}
function armStaleness(sym, tf, id) {
  clearStaleness();
  stalenessTimer = setTimeout(() => {
    // No message for 12 s → force reconnect
    if (loadId !== id) return;
    setWsBadge('reconnecting');
    if (ws) { try { ws.close(); } catch(_){} ws = null; }
    retryDelay = 500;
    connectWS(sym, tf, id);
  }, 12000);
}

// ── aggTrade stream — every single trade → ultra-fast close price updates ────
// Runs in parallel with the kline stream. Kline gives full OHLCV; aggTrade
// gives the latest trade price on every transaction (~10-50/s for BTC).
function connectTradeWS(sym, id) {
  if (tickerWs) { try { tickerWs.close(); } catch(_){} tickerWs = null; }
  const url = 'wss://stream.binance.com:9443/ws/' + sym.toLowerCase() + '@aggTrade';
  tickerWs = new WebSocket(url);

  var _lastPricePost = 0;
  tickerWs.onmessage = e => {
    // Only update if we have a live candle reference from the kline stream
    if (loadId !== id || !liveCandle || !candleSeries) return;
    try {
      const msg = JSON.parse(e.data);
      const price = parseFloat(msg.p);
      // Update close; also expand high/low so wicks are accurate
      if (price > liveCandle.high) liveCandle.high = price;
      if (price < liveCandle.low)  liveCandle.low  = price;
      liveCandle.close = price;
      try {
        if (CHART_TYPE === 'line') candleSeries.update({time:liveCandle.time,value:price});
        else candleSeries.update({ ...liveCandle });
      } catch(_) {}
      // Sync live price to React Native header (throttled to 500ms)
      var now = Date.now();
      if (now - _lastPricePost >= 500) {
        _lastPricePost = now;
        postRN({ type: 'livePrice', price: price });
      }
    } catch(_) {}
  };

  // Silently reconnect — don't affect the main badge
  tickerWs.onclose = () => {
    if (loadId !== id) return;
    setTimeout(() => connectTradeWS(sym, id), 2000);
  };
}

function connectWS(sym, tf, id) {
  if (ws) { try { ws.close(); } catch(_){} ws = null; }
  if (tickerWs) { try { tickerWs.close(); } catch(_){} tickerWs = null; }
  liveCandle = null;
  clearTimeout(retryTimer);
  clearStaleness();
  const interval = TF_MAP[tf] || '5m';
  const url = 'wss://stream.binance.com:9443/ws/'+sym.toLowerCase()+'@kline_'+interval;
  setWsBadge('connecting');
  ws = new WebSocket(url);

  ws.onopen = () => {
    if (loadId !== id) return;
    retryDelay = 500;
    lastMsgAt = Date.now();
    setWsBadge('live');
    armStaleness(sym, tf, id);
    console.log("WS connected");
    // Start the fast trade stream as soon as kline is connected
    connectTradeWS(sym, id);
  };

  ws.onmessage = e => {
    if (loadId !== id) return;
    lastMsgAt = Date.now();
    armStaleness(sym, tf, id);
    try {
      const msg = JSON.parse(e.data);
      const k = msg.k;
      const candle = {
        time:  Math.floor(k.t / 1000),
        open:  parseFloat(k.o), high: parseFloat(k.h),
        low:   parseFloat(k.l), close: parseFloat(k.c),
      };
      const vol = {
        time:  Math.floor(k.t / 1000),
        value: parseFloat(k.v),
        color: parseFloat(k.c) >= parseFloat(k.o) ? '#26a69a55' : '#ef535055',
      };
      // Keep liveCandle in sync so aggTrade can update it between kline ticks
      liveCandle = { ...candle };
      if (_rawCandles.length && _rawCandles[_rawCandles.length-1].time===candle.time) {
        _rawCandles[_rawCandles.length-1]=candle;
      }
      try {
        if (CHART_TYPE === 'line') candleSeries.update({time:candle.time,value:candle.close});
        else candleSeries.update(candle);
      } catch(_) {}
      try { volSeries.update(vol); } catch(_) {}
    } catch(_) {}
  };

  ws.onerror = () => {
    if (loadId !== id) return;
    clearStaleness();
    setWsBadge('error');
    console.log("WS failed, keeping existing candles");
  };

  ws.onclose = () => {
    if (loadId !== id) return;
    clearStaleness();
    if (tickerWs) { try { tickerWs.close(); } catch(_){} tickerWs = null; }
    setWsBadge('reconnecting');
    console.log("WS failed, keeping existing candles");
    // Silently retry WS — never clear chart or call loadData
    retryTimer = setTimeout(() => connectWS(sym, tf, loadId), retryDelay);
    retryDelay = Math.min(retryDelay*2, 8000);
  };
}

// ── Reconnect when tab/app becomes visible again ──────────────────────────
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const stale = (Date.now() - lastMsgAt) > 3000;
    if (stale && candleSeries) {
      retryDelay = 500;
      loadData(SYMBOL, currentTf);
    }
  }
});

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

window.addEventListener('resize', () => { if (!window.__suppressResize) { resizeChart(); redraw(); } });
</script>

<script>
// ╔══════════════════════════════════════════════════════════════╗
// ║             DRAWING ENGINE v3  (HTML5 Canvas 2D)            ║
// ╚══════════════════════════════════════════════════════════════╝

const DK = 'tm_drw_v2';
let DRW = [];
let TOOL = null;
let SEL  = null;
let HIDE = false;
let CLR  = '#f0b90b';
let WID  = 1.5;
let SUB_OPEN = null;
let IP   = null;
let CUR_PTS  = [];
let FREE_PTS = [];
let M_DOWN   = false;
let _W = 0, _H = 0;
let _idCtr   = Date.now();
let _rafId   = null;
let _dirty   = true;
let _previewPt = null;
let _lastX = 0, _lastY = 0;
let _dragState   = null;
let _resizeState = null;
let _longPressTimer = null, _longPressD = null, _longPressCx = 0, _longPressCy = 0;

// ── Interaction mode & chart lock ─────────────────────────────────
// Modes: 'selecting' | 'draggingHandle' | 'draggingShape' | 'panningChart' | 'drawing'
var DRAW_MODE = 'selecting';
var _SCROLL_OPTS = { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true };
var _SCALE_OPTS  = { axisPressedMouseMove: { time: true, price: true }, mouseWheel: true, pinch: true };
function lockChart() {
  try { chart.applyOptions({ handleScroll: false, handleScale: false }); } catch(e){}
}
function unlockChart() {
  try { chart.applyOptions({ handleScroll: _SCROLL_OPTS, handleScale: _SCALE_OPTS }); } catch(e){}
}

function genId() { return 'drw_' + (_idCtr++); }

// ── Canvas accessors ─────────────────────────────────────────────
function getCanvas() { return document.getElementById('drw-canvas'); }
function getCtx()    { var c = getCanvas(); return c ? c.getContext('2d') : null; }

// ── Tool groups ─────────────────────────────────────────────────
const TOOL_GROUPS = [
  { id:'lines', label:'Lines', multi:true,
    items:[
      { id:'trendline',    label:'Trend Line',        pts:2 },
      { id:'arrow',        label:'Arrow',              pts:2 },
      { id:'ray',          label:'Ray',                pts:2 },
      { id:'hline',        label:'Horizontal Line',    pts:1 },
      { id:'vline',        label:'Vertical Line',      pts:1 },
      { id:'channel',      label:'Parallel Channel',   pts:3 },
    ] },
  { id:'pos', label:'Positions & Ranges', multi:true,
    items:[
      { id:'longposition',  label:'Long Position',    pts:1 },
      { id:'shortposition', label:'Short Position',   pts:1 },
      { id:'daterange',     label:'Date Range',        pts:2 },
      { id:'pricerange',    label:'Price Range',       pts:2 },
      { id:'fibretracement',label:'Fib Retracement',  pts:2 },
    ] },
  { id:'shapes', label:'Shapes', multi:true,
    items:[
      { id:'rectangle', label:'Rectangle', pts:2 },
      { id:'circle', label:'Circle', pts:2 },
    ] },
  { id:'brush', label:'Brushes', multi:true,
    items:[
      { id:'brush', label:'Brush', pts:0 },
      { id:'highlighter', label:'Highlighter', pts:0 },
    ] },
  { id:'text', label:'Text', multi:true,
    items:[
      { id:'text', label:'Text', pts:1 },
      { id:'note', label:'Note', pts:1 },
      { id:'pricelabel', label:'Price Label', pts:1 },
    ] },
  'sep',
  { id:'hide',   label:'Hide/Show', multi:false, toggle:true, items:[] },
  { id:'lock',   label:'Lock All',  multi:false, toggle:true, items:[] },
  { id:'delete', label:'Delete All',multi:false, toggle:true, items:[] },
];

function getToolPts(toolId) {
  for (var g of TOOL_GROUPS) {
    if (g === 'sep') continue;
    for (var it of (g.items||[])) { if (it.id === toolId) return it.pts || 2; }
  }
  return 2;
}

// ── Storage ──────────────────────────────────────────────────────
function loadDrw() { try { DRW = JSON.parse(localStorage.getItem(DK)||'[]'); } catch(e) { DRW=[]; } }
function saveDrw() { try { localStorage.setItem(DK, JSON.stringify(DRW)); } catch(e) {} }

// ── Coordinate helpers ────────────────────────────────────────────
function updateSize() {
  var el = document.getElementById('chart-wrap');
  var canvas = getCanvas();
  if (!el || !canvas) return;
  var w = el.offsetWidth || 300, h = el.offsetHeight || 400;
  if (w === _W && h === _H) return;
  _W = w; _H = h;
  var dpr = window.devicePixelRatio || 1;
  canvas.width  = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
}
function clientToCanvas(cx, cy) {
  var el = document.getElementById('chart-wrap');
  var r = el.getBoundingClientRect();
  return { x: cx - r.left, y: cy - r.top };
}
function svgToData(x, y) {
  try {
    var ts = chart.timeScale();
    var time = ts.coordinateToTime(x);
    // coordinateToTime returns null in empty space (e.g. future to the right of last bar).
    // Scan left for the nearest bar time so the drawing point stays valid.
    if (time == null) {
      for (var d = 2; d <= 120; d += 2) {
        time = ts.coordinateToTime(x - d);
        if (time != null) break;
        time = ts.coordinateToTime(x + d);
        if (time != null) break;
      }
    }
    return { time: time, price: candleSeries.coordinateToPrice(y) };
  }
  catch(e) { return { time:null, price:null }; }
}
function dataToSvg(price, time) {
  try { return { x: chart.timeScale().timeToCoordinate(time), y: candleSeries.priceToCoordinate(price) }; }
  catch(e) { return { x:null, y:null }; }
}
function fmtP(p) {
  if (!p && p!==0) return '';
  if (p>=10000) return p.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  if (p>=1) return p.toFixed(4);
  return p.toFixed(6);
}
function tfToSec(tf){return({'1m':60,'3m':180,'5m':300,'15m':900,'30m':1800,'1h':3600,'2h':7200,'4h':14400,'1D':86400,'1W':604800})[tf]||300;}
function estimateEndTime(startTime){return (startTime||0)+tfToSec(currentTf)*20;}

// ── Canvas pointer-events mode ────────────────────────────────────
function updateCanvasMode() {
  var c = getCanvas();
  if (!c) return;
  if (TOOL && TOOL !== 'cursor') {
    c.style.pointerEvents = 'all';
    c.style.touchAction   = 'none';
    c.style.cursor        = 'crosshair';
  } else {
    c.style.pointerEvents = 'none';
    c.style.touchAction   = '';
    c.style.cursor        = '';
  }
  updateHint();
}

// ── RAF render loop ───────────────────────────────────────────────
function scheduleRedraw() {
  _dirty = true;
  if (!_rafId) _rafId = requestAnimationFrame(doRender);
}
function redraw() { scheduleRedraw(); }

function doRender() {
  _rafId = null;
  if (!chart || !candleSeries) { if (_dirty) _rafId = requestAnimationFrame(doRender); return; }
  updateSize();
  var ctx = getCtx();
  if (!ctx) return;
  var dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, _W * dpr, _H * dpr);
  ctx.save();
  ctx.scale(dpr, dpr);
  if (!HIDE) { DRW.forEach(function(d) { if (d.visible !== false) drawShape(ctx, d, d.id === SEL); }); }
  if (IP) drawInProgress(ctx);
  drawCrosshair(ctx);
  ctx.restore();
  _dirty = false;
  // Keep looping every frame while drawings or an active tool exist.
  // This ensures the overlay stays pixel-locked to the chart during any
  // scroll, zoom, or price-scale change without relying solely on
  // subscription callbacks (which may not fire on every touch-pan frame).
  if (DRW.length > 0 || IP || TOOL) _rafId = requestAnimationFrame(doRender);
}

// ── Crosshair overlay (shown while any tool is active) ────────────
function drawCrosshair(ctx) {
  if (!_previewPt || !TOOL || TOOL==='cursor') return;
  var x=_previewPt.x, y=_previewPt.y;
  ctx.save();
  // Dashed guide lines
  ctx.strokeStyle='#2962FF'; ctx.lineWidth=1; ctx.globalAlpha=0.65;
  ctx.setLineDash([5,4]);
  ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,_H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(_W,y); ctx.stroke();
  ctx.setLineDash([]);
  // Center anchor dot
  ctx.globalAlpha=1;
  ctx.beginPath(); ctx.arc(x,y,4.5,0,Math.PI*2);
  ctx.fillStyle='#2962FF'; ctx.fill();
  ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.stroke();
  // Price label on right edge
  try {
    var price=candleSeries.coordinateToPrice(y);
    if (price!=null) {
      var pTxt=fmtP(price);
      ctx.font='bold 10px system-ui,sans-serif';
      var tw=ctx.measureText(pTxt).width, lw=tw+10, lh=17;
      var lx=_W-lw-1, ly=y-lh/2;
      ctx.fillStyle='#2962FF'; ctx.globalAlpha=0.95;
      cRRect(ctx,lx,ly,lw,lh,3); ctx.fill();
      ctx.fillStyle='#fff'; ctx.globalAlpha=1;
      ctx.textBaseline='middle'; ctx.fillText(pTxt,lx+5,y);
    }
  } catch(e){}
  ctx.restore();
}

// ── Instruction pill ──────────────────────────────────────────────
function updateHint() {
  var el=document.getElementById('drw-hint'); if(!el) return;
  var txt='';
  if (TOOL && TOOL!=='cursor') {
    if (TOOL==='brush'||TOOL==='highlighter') {
      txt='Draw freely on chart';
    } else if (TOOL==='hline') {
      txt='Tap to place horizontal line';
    } else if (TOOL==='vline') {
      txt='Tap to place vertical line';
    } else if (TOOL==='pricelabel') {
      txt='Tap to place price label';
    } else if (TOOL==='text'||TOOL==='note') {
      txt='Tap to place text';
    } else if (TOOL==='longposition'||TOOL==='shortposition') {
      txt='Tap chart to place position';
    } else if (THREE_PT.has(TOOL)) {
      if (!IP || CUR_PTS.length===0) txt='Tap to set first point';
      else if (CUR_PTS.length===1)   txt='Tap to set second point';
      else                           txt='Tap to finish';
    } else {
      // 2-pt drag tools
      if (!IP) txt='Drag to draw';
      else     txt='Release to finish';
    }
  }
  if (txt) { el.textContent=txt; el.classList.remove('hidden'); }
  else      { el.classList.add('hidden'); }
}

// ── Canvas drawing primitives ─────────────────────────────────────
function cStroke(ctx, color, width) {
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
}
function cHandle(ctx, x, y) {
  if (x==null||y==null||isNaN(x)||isNaN(y)) return;
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.strokeStyle = '#2962FF'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}
function cRRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

// ── Shape dispatcher ──────────────────────────────────────────────
function drawShape(ctx, d, sel) {
  var c = d.color || CLR, w = d.width || WID;
  ctx.save(); ctx.setLineDash([]);
  switch(d.type) {
    case 'trendline':      drawLine(ctx,d,sel,c,w,false,false); break;
    case 'arrow':          drawLine(ctx,d,sel,c,w,true,false);  break;
    case 'ray':            drawLine(ctx,d,sel,c,w,false,true);  break;
    case 'hline':          drawHLine(ctx,d,sel,c,w);   break;
    case 'vline':          drawVLine(ctx,d,sel,c,w);   break;
    case 'channel':        drawChannel(ctx,d,sel,c,w); break;
    case 'fibretracement': drawFib(ctx,d,sel,c,w);     break;
    case 'brush':          drawFreehand(ctx,d,sel,c,w,false); break;
    case 'highlighter':    drawFreehand(ctx,d,sel,c,w,true);  break;
    case 'rectangle':      drawRect(ctx,d,sel,c,w);    break;
    case 'circle':         drawCircle(ctx,d,sel,c,w);  break;
    case 'text':           drawText(ctx,d,sel,c);       break;
    case 'note':           drawNote(ctx,d,sel,c);       break;
    case 'pricelabel':     drawPriceLabel(ctx,d,sel,c); break;
    case 'longposition':   drawPosition(ctx,d,sel,true);  break;
    case 'shortposition':  drawPosition(ctx,d,sel,false); break;
    case 'daterange':      drawDateRange(ctx,d,sel,c,w);  break;
    case 'pricerange':     drawPriceRange(ctx,d,sel,c,w); break;
  }
  ctx.restore();
}

function drawLine(ctx,d,sel,c,w,arrow,ray) {
  if (!d.pts||d.pts.length<2) return;
  var p1=dataToSvg(d.pts[0].price,d.pts[0].time), p2=dataToSvg(d.pts[1].price,d.pts[1].time);
  if (p1.x==null||p2.x==null) return;
  var x1=p1.x,y1=p1.y,x2=p2.x,y2=p2.y;
  if (ray) { var dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy)||1; x2=x1+(dx/len)*5000; y2=y1+(dy/len)*5000; }
  var sc=sel?'#2962FF':c;
  cStroke(ctx,sc,w); ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  if (arrow) {
    var adx=x2-p1.x,ady=y2-p1.y,al=Math.sqrt(adx*adx+ady*ady)||1,nx=adx/al,ny=ady/al;
    ctx.beginPath(); ctx.moveTo(x2,y2);
    ctx.lineTo(x2-nx*10-ny*5, y2-ny*10+nx*5);
    ctx.lineTo(x2-nx*10+ny*5, y2-ny*10-nx*5);
    ctx.closePath(); ctx.fillStyle=sc; ctx.fill();
  }
  if (sel) { cHandle(ctx,p1.x,p1.y); cHandle(ctx,p2.x,p2.y); }
}
function drawHLine(ctx,d,sel,c,w) {
  if (!d.pts||d.pts.length<1) return;
  var y=candleSeries.priceToCoordinate(d.pts[0].price);
  if (y==null||isNaN(y)) return;
  var sc=sel?'#2962FF':c;
  ctx.setLineDash([5,3]); cStroke(ctx,sc,w);
  ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(_W,y); ctx.stroke(); ctx.setLineDash([]);
  var bw=84, px=fmtP(d.pts[0].price);
  ctx.fillStyle='#1e222d'; cRRect(ctx,_W-bw-4,y-11,bw,22,3); ctx.fill();
  ctx.strokeStyle=sc; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle=sc; ctx.font='10px monospace'; ctx.textAlign='center';
  ctx.fillText(px, _W-4-bw/2, y+4);
  if (sel) cHandle(ctx,_W/2,y);
}
function drawVLine(ctx,d,sel,c,w) {
  if (!d.pts||d.pts.length<1) return;
  var x=chart.timeScale().timeToCoordinate(d.pts[0].time);
  if (x==null||isNaN(x)) return;
  var sc=sel?'#2962FF':c;
  ctx.setLineDash([5,3]); cStroke(ctx,sc,w);
  ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,_H); ctx.stroke(); ctx.setLineDash([]);
  if (sel) cHandle(ctx,x,_H/2);
}
function drawFreehand(ctx,d,sel,c,w,hilight) {
  if (!d.pts||d.pts.length<2) return;
  var pts=d.pts.map(function(pt){return dataToSvg(pt.price,pt.time);}).filter(function(p){return p.x!=null;});
  if (pts.length<2) return;
  var sc=sel?'#2962FF':c;
  ctx.globalAlpha=hilight?0.4:1; cStroke(ctx,sc,hilight?10:w);
  ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
  for (var i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y);
  ctx.stroke(); ctx.globalAlpha=1;
}
function drawRect(ctx,d,sel,c,w) {
  if (!d.pts||d.pts.length<2) return;
  var p1=dataToSvg(d.pts[0].price,d.pts[0].time), p2=dataToSvg(d.pts[1].price,d.pts[1].time);
  if (p1.x==null) return;
  var x=Math.min(p1.x,p2.x),y=Math.min(p1.y,p2.y),rw=Math.abs(p2.x-p1.x),rh=Math.abs(p2.y-p1.y);
  var sc=sel?'#2962FF':c;
  ctx.fillStyle=sc+'22'; ctx.fillRect(x,y,rw,rh);
  cStroke(ctx,sc,w); ctx.strokeRect(x,y,rw,rh);
  if (sel) { cHandle(ctx,p1.x,p1.y); cHandle(ctx,p2.x,p1.y); cHandle(ctx,p1.x,p2.y); cHandle(ctx,p2.x,p2.y); }
}
function drawCircle(ctx,d,sel,c,w) {
  if (!d.pts||d.pts.length<2) return;
  var ctr=dataToSvg(d.pts[0].price,d.pts[0].time), edg=dataToSvg(d.pts[1].price,d.pts[1].time);
  if (ctr.x==null) return;
  var r=Math.sqrt((edg.x-ctr.x)*(edg.x-ctr.x)+(edg.y-ctr.y)*(edg.y-ctr.y));
  var sc=sel?'#2962FF':c;
  ctx.beginPath(); ctx.arc(ctr.x,ctr.y,r,0,Math.PI*2);
  ctx.fillStyle=sc+'22'; ctx.fill(); cStroke(ctx,sc,w); ctx.stroke();
  if (sel) { cHandle(ctx,ctr.x,ctr.y); cHandle(ctx,edg.x,edg.y); }
}
var FIB_DEFAULT_LEVELS = [
  {level:0,    color:'rgba(34,197,94,0.75)'},
  {level:0.236,color:'rgba(245,158,11,0.75)'},
  {level:0.382,color:'rgba(251,146,60,0.75)'},
  {level:0.5,  color:'rgba(156,163,175,0.70)'},
  {level:0.618,color:'rgba(250,204,21,0.85)'},
  {level:0.65, color:'rgba(234,179,8,0.85)'},
  {level:0.786,color:'rgba(139,92,246,0.75)'},
  {level:1,    color:'rgba(20,184,166,0.75)'},
];
function drawFib(ctx,d,sel,c,w) {
  if (!d.pts||d.pts.length<2) return;
  var p1=dataToSvg(d.pts[0].price,d.pts[0].time), p2=dataToSvg(d.pts[1].price,d.pts[1].time);
  if (p1.x==null) return;
  var levels=d.levels||FIB_DEFAULT_LEVELS;
  var reverse=d.fibReverse||false;
  var opacity=d.fibOpacity!=null?d.fibOpacity:0.45;
  var lw=d.fibLineWidth||1;
  var ls=d.fibLineStyle||'dashed';
  var showLabels=d.fibShowLabels!==false;
  var showPrices=d.fibShowPrices!==false;
  var showGolden=d.fibShowGolden!==false;
  var extend=d.fibExtend||false;
  var labelPos=d.fibLabelPos||'left';
  var range=(d.pts[1].price-d.pts[0].price)*(reverse?-1:1);
  var x0=Math.min(p1.x,p2.x);
  var xEnd=extend?_W:Math.max(p1.x,p2.x);
  ctx.save();
  ctx.beginPath(); ctx.rect(0,0,_W,_H); ctx.clip();
  // Anchor connector
  ctx.setLineDash([3,3]); ctx.globalAlpha=0.25; cStroke(ctx,'#64748b',1);
  ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke();
  ctx.setLineDash([]); ctx.globalAlpha=1;
  // Golden zone fill between 61.8% and 65%
  if(showGolden){
    var gp618=d.pts[0].price+range*0.618, gp65=d.pts[0].price+range*0.65;
    var gy618=candleSeries.priceToCoordinate(gp618), gy65=candleSeries.priceToCoordinate(gp65);
    if(gy618!=null&&gy65!=null){
      ctx.fillStyle='rgba(250,204,21,0.16)';
      ctx.fillRect(x0,Math.min(gy618,gy65),xEnd-x0,Math.abs(gy65-gy618));
      if(showLabels&&Math.abs(gy65-gy618)>=10){
        var gzMidY=(gy618+gy65)/2;
        var gzTxt='Golden Zone';
        ctx.font='500 10px system-ui,sans-serif'; ctx.textBaseline='middle';
        ctx.textAlign=labelPos==='right'?'right':(labelPos==='center'?'center':'left');
        var gzX=labelPos==='right'?xEnd-4:(labelPos==='center'?(x0+xEnd)/2:x0+4);
        var gzTw=ctx.measureText(gzTxt).width;
        var gzBgX=labelPos==='right'?gzX-gzTw-5:(labelPos==='center'?gzX-gzTw/2-3:gzX-2);
        ctx.globalAlpha=0.65; ctx.fillStyle='rgba(15,23,42,0.65)';
        cRRect(ctx,gzBgX,gzMidY-7,gzTw+10,14,3); ctx.fill();
        ctx.globalAlpha=1; ctx.fillStyle='#FACC15';
        ctx.fillText(gzTxt,gzX,gzMidY);
      }
    }
  }
  // Level lines + labels
  var dashPat=ls==='solid'?[]:(ls==='dotted'?[2,3]:[4,4]);
  ctx.textBaseline='middle';
  for(var i=0;i<levels.length;i++){
    var lv=levels[i];
    var price=d.pts[0].price+range*lv.level;
    var fy=candleSeries.priceToCoordinate(price);
    if(fy==null||isNaN(fy)) continue;
    ctx.globalAlpha=opacity; ctx.setLineDash(dashPat); cStroke(ctx,lv.color,lw);
    ctx.beginPath(); ctx.moveTo(x0,fy); ctx.lineTo(xEnd,fy); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha=1;
    if(showLabels){
      var pct=(lv.level*100).toFixed(1)+'%';
      var priceStr=showPrices?'  '+fmtP(price):'';
      var txt=pct+priceStr;
      ctx.font='500 10px system-ui,sans-serif';
      ctx.textAlign=labelPos==='right'?'right':(labelPos==='center'?'center':'left');
      var lbX=labelPos==='right'?xEnd-4:(labelPos==='center'?(x0+xEnd)/2:x0+4);
      var tw=ctx.measureText(txt).width;
      var bgX=labelPos==='right'?lbX-tw-5:(labelPos==='center'?lbX-tw/2-3:lbX-2);
      ctx.globalAlpha=0.65; ctx.fillStyle='rgba(15,23,42,0.65)';
      cRRect(ctx,bgX,fy-7,tw+9,14,4); ctx.fill();
      ctx.globalAlpha=1; ctx.fillStyle=lv.color;
      ctx.fillText(txt,lbX,fy);
    }
  }
  ctx.restore();
  // Blue handles for selection only
  if(sel){ cHandle(ctx,p1.x,p1.y); cHandle(ctx,p2.x,p2.y); }
}
function drawChannel(ctx,d,sel,c,w) {
  if (!d.pts||d.pts.length<3) return;
  var p1=dataToSvg(d.pts[0].price,d.pts[0].time);
  var p2=dataToSvg(d.pts[1].price,d.pts[1].time);
  var p3=dataToSvg(d.pts[2].price,d.pts[2].time);
  if (p1.x==null) return;
  var dy=p3.y-p1.y, q1y=p1.y+dy, q2y=p2.y+dy;
  var sc=sel?'#2962FF':c;
  ctx.fillStyle=sc+'22';
  ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.lineTo(p2.x,q2y); ctx.lineTo(p1.x,q1y); ctx.closePath(); ctx.fill();
  cStroke(ctx,sc,w); ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke();
  ctx.setLineDash([5,3]); ctx.beginPath(); ctx.moveTo(p1.x,q1y); ctx.lineTo(p2.x,q2y); ctx.stroke(); ctx.setLineDash([]);
  if (sel) { cHandle(ctx,p1.x,p1.y); cHandle(ctx,p2.x,p2.y); cHandle(ctx,p3.x,p3.y); }
}
function drawText(ctx,d,sel,c) {
  if (!d.pts||d.pts.length<1) return;
  var p=dataToSvg(d.pts[0].price,d.pts[0].time);
  if (p.x==null) return;
  var sc=sel?'#2962FF':c;
  ctx.fillStyle=sc; ctx.font='bold 14px sans-serif'; ctx.textAlign='left';
  ctx.fillText(d.text||'Text', p.x, p.y);
  if (sel) cHandle(ctx,p.x,p.y);
}
function drawNote(ctx,d,sel,c) {
  if (!d.pts||d.pts.length<1) return;
  var p=dataToSvg(d.pts[0].price,d.pts[0].time);
  if (p.x==null) return;
  var sc=sel?'#2962FF':c, txt=d.text||'Note';
  ctx.font='12px sans-serif';
  var bw=Math.max(60,ctx.measureText(txt).width+20);
  ctx.fillStyle='#1e222d'; cRRect(ctx,p.x,p.y-22,bw,26,4); ctx.fill();
  ctx.strokeStyle=sc; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle=sc; ctx.textAlign='left'; ctx.fillText(txt,p.x+8,p.y-5);
  if (sel) cHandle(ctx,p.x+bw/2,p.y-9);
}
function drawPriceLabel(ctx,d,sel,c) {
  if (!d.pts||d.pts.length<1) return;
  var p=dataToSvg(d.pts[0].price,d.pts[0].time);
  if (p.x==null) return;
  var sc=sel?'#2962FF':c;
  ctx.setLineDash([3,2]); cStroke(ctx,sc,1);
  ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(_W-88,p.y); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle=sc; cRRect(ctx,_W-88,p.y-11,84,22,3); ctx.fill();
  ctx.fillStyle='#000'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
  ctx.fillText(fmtP(d.pts[0].price),_W-88+42,p.y+4);
  if (sel) cHandle(ctx,p.x,p.y);
}
function drawPosition(ctx,d,sel,isLong) {
  // New data model: entryPrice/targetPrice/stopPrice/startTime/endTime
  // Legacy fallback: pts[0]=entry, pts[1]=target, pts[2]=stop
  var entryP,targetP,stopP,x1,x2;
  if (d.entryPrice!=null) {
    entryP=d.entryPrice; targetP=d.targetPrice; stopP=d.stopPrice;
    x1=chart.timeScale().timeToCoordinate(d.startTime);
    x2=chart.timeScale().timeToCoordinate(d.endTime);
    if (x1==null) x1=0; if (x2==null) x2=_W;
  } else {
    // Legacy
    if (!d.pts||d.pts.length<2) return;
    entryP=d.pts[0].price; targetP=d.pts[1].price;
    stopP=d.pts.length>=3?d.pts[2].price:entryP*(isLong?0.995:1.005);
    var lp1=dataToSvg(entryP,d.pts[0].time); if(lp1.x==null) return;
    x1=lp1.x; x2=_W;
  }
  var ey=candleSeries.priceToCoordinate(entryP);
  var ty=candleSeries.priceToCoordinate(targetP);
  var sy=candleSeries.priceToCoordinate(stopP);
  if(ey==null||ty==null||sy==null) return;
  // Clamp to canvas bounds
  x1=Math.max(0,x1); x2=Math.min(_W,x2);
  var bx=Math.min(x1,x2), bw=Math.abs(x2-x1);
  if(bw<2) bw=2;
  var opacity=d.posOpacity!=null?d.posOpacity:0.22;
  var lw=d.posLineWidth||1;
  var showLabels=d.posShowLabels!==false;
  var showPrices=d.posShowPrices!==false;
  var showRR=d.posShowRR!==false;
  ctx.save();
  // Clip to chart area
  ctx.beginPath(); ctx.rect(0,0,_W,_H); ctx.clip();
  // Target zone (green)
  ctx.globalAlpha=opacity; ctx.fillStyle='#22C55E';
  ctx.fillRect(bx,Math.min(ey,ty),bw,Math.abs(ty-ey));
  // Stop zone (red)
  ctx.fillStyle='#EF4444';
  ctx.fillRect(bx,Math.min(ey,sy),bw,Math.abs(sy-ey));
  ctx.globalAlpha=1;
  // Border around full position box
  var boxTop=Math.min(ey,ty,sy), boxBot=Math.max(ey,ty,sy);
  ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1; ctx.setLineDash([]);
  ctx.strokeRect(bx,boxTop,bw,boxBot-boxTop);
  // Lines
  cStroke(ctx,'#FACC15',lw+0.5); ctx.beginPath(); ctx.moveTo(bx,ey); ctx.lineTo(bx+bw,ey); ctx.stroke();
  cStroke(ctx,'#22C55E',lw); ctx.beginPath(); ctx.moveTo(bx,ty); ctx.lineTo(bx+bw,ty); ctx.stroke();
  cStroke(ctx,'#EF4444',lw); ctx.beginPath(); ctx.moveTo(bx,sy); ctx.lineTo(bx+bw,sy); ctx.stroke();
  // Labels
  if(showLabels) {
    ctx.font='600 11px system-ui,sans-serif'; ctx.textAlign='right'; ctx.textBaseline='middle';
    var lbx=bx+bw-3;
    function posLabel(txt,y,clr){
      var tw=ctx.measureText(txt).width;
      var lx=lbx-tw-8;
      ctx.globalAlpha=0.85; ctx.fillStyle='#0f172a';
      cRRect(ctx,lx-4,y-9,tw+14,18,4); ctx.fill();
      ctx.globalAlpha=1; ctx.fillStyle=clr; ctx.fillText(txt,lbx,y);
    }
    var eL='Entry'+(showPrices?' '+fmtP(entryP):'');
    var tL='Target'+(showPrices?' '+fmtP(targetP):'');
    var sL='Stop'+(showPrices?' '+fmtP(stopP):'');
    posLabel(eL,ey,'#FACC15');
    posLabel(tL,ty,'#22C55E');
    posLabel(sL,sy,'#EF4444');
    if(showRR){
      var profit=Math.abs(targetP-entryP), risk=Math.abs(stopP-entryP);
      if(risk>0){
        var rr=(profit/risk).toFixed(1);
        posLabel('1:'+rr,(ey+ty)/2,'#94A3B8');
      }
    }
  }
  ctx.restore();
  // Selection handles (blue) — entry mid, target mid, stop mid, left edge, right edge
  if(sel){
    var midX=(bx+bw/2);
    cHandle(ctx,midX,ey); cHandle(ctx,midX,ty); cHandle(ctx,midX,sy);
    var midY=(ey+ty+sy)/3;
    cHandle(ctx,bx,midY); cHandle(ctx,bx+bw,midY);
  }
}
function drawDateRange(ctx,d,sel,c,w) {
  if (!d.pts||d.pts.length<2) return;
  var p1=dataToSvg(d.pts[0].price,d.pts[0].time), p2=dataToSvg(d.pts[1].price,d.pts[1].time);
  if (p1.x==null) return;
  var sc=sel?'#2962FF':c, x1=Math.min(p1.x,p2.x), x2=Math.max(p1.x,p2.x);
  ctx.fillStyle=sc+'22'; ctx.fillRect(x1,0,x2-x1,_H);
  ctx.setLineDash([4,2]); cStroke(ctx,sc,w);
  ctx.beginPath(); ctx.moveTo(p1.x,0); ctx.lineTo(p1.x,_H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p2.x,0); ctx.lineTo(p2.x,_H); ctx.stroke(); ctx.setLineDash([]);
  if (sel) { cHandle(ctx,p1.x,_H/2); cHandle(ctx,p2.x,_H/2); }
}
function drawPriceRange(ctx,d,sel,c,w) {
  if (!d.pts||d.pts.length<2) return;
  var y1=candleSeries.priceToCoordinate(d.pts[0].price), y2=candleSeries.priceToCoordinate(d.pts[1].price);
  if (y1==null||y2==null||isNaN(y1)||isNaN(y2)) return;
  var sc=sel?'#2962FF':c, mn=Math.min(y1,y2), mx=Math.max(y1,y2);
  ctx.fillStyle=sc+'22'; ctx.fillRect(0,mn,_W,mx-mn);
  ctx.setLineDash([4,2]); cStroke(ctx,sc,w);
  ctx.beginPath(); ctx.moveTo(0,y1); ctx.lineTo(_W,y1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,y2); ctx.lineTo(_W,y2); ctx.stroke(); ctx.setLineDash([]);
  if (sel) { cHandle(ctx,_W/2,y1); cHandle(ctx,_W/2,y2); }
}

// ── In-progress drawing ───────────────────────────────────────────
function drawInProgress(ctx) {
  if (!IP) return;
  ctx.save();
  if ((IP==='brush'||IP==='highlighter')&&FREE_PTS.length>=4) {
    ctx.globalAlpha=IP==='highlighter'?0.4:1;
    cStroke(ctx,CLR,IP==='highlighter'?10:WID);
    ctx.beginPath(); ctx.moveTo(FREE_PTS[0],FREE_PTS[1]);
    for (var i=2;i<FREE_PTS.length;i+=2) ctx.lineTo(FREE_PTS[i],FREE_PTS[i+1]);
    ctx.stroke(); ctx.restore(); return;
  }
  ctx.setLineDash([4,2]); cStroke(ctx,CLR,WID);

  if (M_DOWN && _previewPt && CUR_PTS.length>=1) {
    // During live drag: always draw from the first stored anchor → finger pixel.
    // This keeps the line visible even when the finger is in empty/future space.
    var anchor=dataToSvg(CUR_PTS[0].price,CUR_PTS[0].time);
    if (anchor.x!=null) {
      ctx.beginPath(); ctx.moveTo(anchor.x,anchor.y);
      ctx.lineTo(_previewPt.x,_previewPt.y); ctx.stroke();
    }
  } else {
    // Between clicks (3-pt tools): draw stored segments + dashed preview to finger
    for (var j=0;j<CUR_PTS.length-1;j++) {
      var a=dataToSvg(CUR_PTS[j].price,CUR_PTS[j].time), b=dataToSvg(CUR_PTS[j+1].price,CUR_PTS[j+1].time);
      if (a.x!=null&&b.x!=null) { ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
    }
    if (_previewPt&&CUR_PTS.length>0) {
      var last=CUR_PTS[CUR_PTS.length-1], lp=dataToSvg(last.price,last.time);
      if (lp.x!=null) { ctx.globalAlpha=0.6; ctx.beginPath(); ctx.moveTo(lp.x,lp.y); ctx.lineTo(_previewPt.x,_previewPt.y); ctx.stroke(); }
    }
  }
  ctx.setLineDash([]); ctx.restore();
}

// ── Hit detection (24px tolerance for mobile handles) ─────────────
var HIT = 24;
function distSeg(px,py,x1,y1,x2,y2) {
  var dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy;
  if (l2===0) return Math.sqrt((px-x1)*(px-x1)+(py-y1)*(py-y1));
  var t=Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/l2));
  return Math.sqrt((px-x1-t*dx)*(px-x1-t*dx)+(py-y1-t*dy)*(py-y1-t*dy));
}
function getHandlePositions(d) {
  if (!d.pts||d.pts.length===0) return [];
  switch(d.type) {
    case 'hline': { var hy=candleSeries.priceToCoordinate(d.pts[0].price); return [{x:_W/2,y:hy}]; }
    case 'vline': { var vx=chart.timeScale().timeToCoordinate(d.pts[0].time); return [{x:vx,y:_H/2}]; }
    case 'rectangle': {
      var rp1=dataToSvg(d.pts[0].price,d.pts[0].time), rp2=dataToSvg(d.pts[1].price,d.pts[1].time);
      return [{x:rp1.x,y:rp1.y},{x:rp2.x,y:rp1.y},{x:rp1.x,y:rp2.y},{x:rp2.x,y:rp2.y}];
    }
    case 'pricerange': {
      var pry1=candleSeries.priceToCoordinate(d.pts[0].price), pry2=candleSeries.priceToCoordinate(d.pts[1].price);
      return [{x:_W/2,y:pry1},{x:_W/2,y:pry2}];
    }
    case 'daterange': {
      var drp1=dataToSvg(d.pts[0].price,d.pts[0].time), drp2=dataToSvg(d.pts[1].price,d.pts[1].time);
      return [{x:drp1.x,y:_H/2},{x:drp2.x,y:_H/2}];
    }
    case 'longposition': case 'shortposition': {
      if (d.entryPrice==null) return d.pts.map(function(pt){return dataToSvg(pt.price,pt.time);});
      var px1=chart.timeScale().timeToCoordinate(d.startTime)||0;
      var px2=chart.timeScale().timeToCoordinate(d.endTime)||_W;
      px1=Math.max(0,px1); px2=Math.min(_W,px2);
      var midX=(px1+px2)/2;
      var pey=candleSeries.priceToCoordinate(d.entryPrice);
      var pty=candleSeries.priceToCoordinate(d.targetPrice);
      var psy=candleSeries.priceToCoordinate(d.stopPrice);
      var midY=((pey||0)+(pty||0)+(psy||0))/3;
      return [{x:midX,y:pey},{x:midX,y:pty},{x:midX,y:psy},{x:px1,y:midY},{x:px2,y:midY}];
    }
    default: return d.pts.map(function(pt){return dataToSvg(pt.price,pt.time);});
  }
}
function hitTest(cx, cy) {
  for (var i=DRW.length-1;i>=0;i--) {
    var d=DRW[i];
    if (!d||d.visible===false) continue;
    if (d.id===SEL&&!d.locked) {
      var handles=getHandlePositions(d);
      for (var hi=0;hi<handles.length;hi++) {
        var h=handles[hi];
        if (h&&h.x!=null&&!isNaN(h.x)&&Math.sqrt((cx-h.x)*(cx-h.x)+(cy-h.y)*(cy-h.y))<=HIT+3)
          return {did:d.id, handleIdx:hi};
      }
    }
    if (d.locked) { if (hitBody(d,cx,cy)) return {did:d.id,handleIdx:-1,locked:true}; continue; }
    if (hitBody(d,cx,cy)) return {did:d.id, handleIdx:-1};
  }
  return null;
}
function hitBody(d,cx,cy) {
  var pts=d.pts; if (!pts||pts.length===0) return false;
  switch(d.type) {
    case 'trendline': case 'arrow': case 'channel': case 'fibretracement': {
      if (pts.length<2) return false;
      var p1=dataToSvg(pts[0].price,pts[0].time), p2=dataToSvg(pts[1].price,pts[1].time);
      if (p1.x==null) return false;
      return distSeg(cx,cy,p1.x,p1.y,p2.x,p2.y)<HIT;
    }
    case 'ray': {
      if (pts.length<2) return false;
      var rp1=dataToSvg(pts[0].price,pts[0].time), rp2=dataToSvg(pts[1].price,pts[1].time);
      if (rp1.x==null) return false;
      var rdx=rp2.x-rp1.x,rdy=rp2.y-rp1.y,rl=Math.sqrt(rdx*rdx+rdy*rdy)||1;
      return distSeg(cx,cy,rp1.x,rp1.y,rp1.x+(rdx/rl)*5000,rp1.y+(rdy/rl)*5000)<HIT;
    }
    case 'hline': { var hy=candleSeries.priceToCoordinate(pts[0].price); return hy!=null&&Math.abs(cy-hy)<HIT; }
    case 'vline': { var vx=chart.timeScale().timeToCoordinate(pts[0].time); return vx!=null&&Math.abs(cx-vx)<HIT; }
    case 'rectangle': {
      if (pts.length<2) return false;
      var bp1=dataToSvg(pts[0].price,pts[0].time), bp2=dataToSvg(pts[1].price,pts[1].time);
      if (bp1.x==null) return false;
      return cx>=Math.min(bp1.x,bp2.x)-HIT&&cx<=Math.max(bp1.x,bp2.x)+HIT&&cy>=Math.min(bp1.y,bp2.y)-HIT&&cy<=Math.max(bp1.y,bp2.y)+HIT;
    }
    case 'circle': {
      if (pts.length<2) return false;
      var ctr=dataToSvg(pts[0].price,pts[0].time), edg=dataToSvg(pts[1].price,pts[1].time);
      if (ctr.x==null) return false;
      var r=Math.sqrt((edg.x-ctr.x)*(edg.x-ctr.x)+(edg.y-ctr.y)*(edg.y-ctr.y));
      return Math.abs(Math.sqrt((cx-ctr.x)*(cx-ctr.x)+(cy-ctr.y)*(cy-ctr.y))-r)<HIT;
    }
    case 'brush': case 'highlighter': {
      if (pts.length<2) return false;
      var bpts=pts.map(function(pt){return dataToSvg(pt.price,pt.time);}).filter(function(p){return p.x!=null;});
      for (var bi=0;bi<bpts.length-1;bi++) if (distSeg(cx,cy,bpts[bi].x,bpts[bi].y,bpts[bi+1].x,bpts[bi+1].y)<HIT) return true;
      return false;
    }
    case 'text': case 'note': case 'pricelabel': {
      var tp=dataToSvg(pts[0].price,pts[0].time);
      return tp.x!=null&&Math.sqrt((cx-tp.x)*(cx-tp.x)+(cy-tp.y)*(cy-tp.y))<30;
    }
    case 'longposition': case 'shortposition': {
      if (d.entryPrice==null) {
        if (pts.length<2) return false;
        var ep=dataToSvg(pts[0].price,pts[0].time); if(ep.x==null) return false;
        return Math.abs(cy-ep.y)<HIT;
      }
      var hx1=chart.timeScale().timeToCoordinate(d.startTime)||0;
      var hx2=chart.timeScale().timeToCoordinate(d.endTime)||_W;
      var hey=candleSeries.priceToCoordinate(d.entryPrice);
      var hty=candleSeries.priceToCoordinate(d.targetPrice);
      var hsy=candleSeries.priceToCoordinate(d.stopPrice);
      if(hey==null||hty==null||hsy==null) return false;
      var hmn=Math.min(hey,hty,hsy)-HIT, hmx=Math.max(hey,hty,hsy)+HIT;
      return cx>=hx1-HIT&&cx<=hx2+HIT&&cy>=hmn&&cy<=hmx;
    }
    case 'pricerange': {
      if (pts.length<2) return false;
      var pry1=candleSeries.priceToCoordinate(pts[0].price), pry2=candleSeries.priceToCoordinate(pts[1].price);
      if (pry1==null||pry2==null) return false;
      return Math.abs(cy-pry1)<HIT||Math.abs(cy-pry2)<HIT;
    }
    case 'daterange': {
      if (pts.length<2) return false;
      var drp1=dataToSvg(pts[0].price,pts[0].time), drp2=dataToSvg(pts[1].price,pts[1].time);
      if (drp1.x==null) return false;
      return Math.abs(cx-drp1.x)<HIT||Math.abs(cx-drp2.x)<HIT;
    }
    default: return false;
  }
}

// ── Sidebar ───────────────────────────────────────────────────────
function buildSidebar() {
  var IDS={lines:'sb-lines',pos:'sb-pos',shapes:'sb-shapes',brush:'sb-brush',text:'sb-text',hide:'sb-hide',lock:'sb-lock',delete:'sb-delete'};
  var toolToGroup={trendline:'lines',arrow:'lines',ray:'lines',hline:'lines',vline:'lines',channel:'lines',longposition:'pos',shortposition:'pos',daterange:'pos',pricerange:'pos',fibretracement:'pos',rectangle:'shapes',circle:'shapes',brush:'brush',highlighter:'brush',text:'text',note:'text',pricelabel:'text'};
  Object.entries(IDS).forEach(function(e) {
    var gid=e[0], btnId=e[1];
    var btn=document.getElementById(btnId); if(!btn) return;
    var isActive=(TOOL===gid)||(toolToGroup[TOOL]===gid)||(gid==='hide'&&HIDE);
    btn.classList.toggle('act',!!isActive);
  });
}

// ── Sidebar helpers ───────────────────────────────────────────────
function setToolGroup(gid) {
  TOOL=null; SEL=null; CUR_PTS=[]; FREE_PTS=[]; IP=null;
  hideFM(); updateCanvasMode(); buildSidebar(); closeSub(); scheduleRedraw();
}

function openSubById(gid, btnEl) {
  var g=null;
  for (var gi=0;gi<TOOL_GROUPS.length;gi++) { if (TOOL_GROUPS[gi]!=='sep'&&TOOL_GROUPS[gi].id===gid){g=TOOL_GROUPS[gi];break;} }
  if (!g) return;
  var groupActive=TOOL===gid||(g.items||[]).some(function(it){return it.id===TOOL;});
  if (groupActive) { setToolGroup(null); closeSub(); return; }
  if ((g.items||[]).length===1) { setTool(g.items[0].id); return; }
  if (SUB_OPEN===gid) { closeSub(); return; }
  SUB_OPEN=gid;
  var sub=document.getElementById('sb-sub');
  if (!sub) return;
  var r=btnEl.getBoundingClientRect();
  sub.style.top=Math.min(r.top,window.innerHeight-220)+'px';
  var html='<div class="sub-title">'+g.label+'</div>';
  (g.items||[]).forEach(function(it) {
    html+='<button class="sub-item'+(TOOL===it.id?' act':'')+'" data-tid="'+it.id+'">'+it.label+'</button>';
  });
  sub.innerHTML=html;
  sub.querySelectorAll('.sub-item').forEach(function(btn) {
    var tid=btn.getAttribute('data-tid');
    btn.addEventListener('touchend',function(e){e.preventDefault();setTool(tid);closeSub();},{passive:false});
    btn.addEventListener('click',function(){setTool(tid);closeSub();});
  });
  sub.classList.remove('hidden');
}

function toggleHide() { HIDE=!HIDE; buildSidebar(); scheduleRedraw(); }
function toggleLockAll() {
  var allLk=DRW.length>0&&DRW.every(function(d){return d.locked;});
  DRW.forEach(function(d){d.locked=!allLk;}); saveDrw(); buildSidebar();
}
function clearAllDrawings() {
  if (DRW.length===0) return;
  if (!confirm('Delete all drawings?')) return;
  DRW=[]; SEL=null; CUR_PTS=[]; FREE_PTS=[]; IP=null;
  saveDrw(); hideFM(); scheduleRedraw();
}
function closeSub() { SUB_OPEN=null; var s=document.getElementById('sb-sub'); if(s) s.classList.add('hidden'); }

// ── Sidebar event listeners ───────────────────────────────────────
function _addBtn(id, fn) {
  var el=document.getElementById(id); if(!el) return;
  el.addEventListener('touchend',function(e){e.preventDefault();fn(el);},{passive:false});
  el.addEventListener('click',function(){fn(el);});
}
function initSidebarEvents() {
  _addBtn('sb-lines',   function(el){openSubById('lines',el);});
  _addBtn('sb-pos',     function(el){openSubById('pos',el);});
  _addBtn('sb-shapes',  function(el){openSubById('shapes',el);});
  _addBtn('sb-brush',      function(el){openSubById('brush',el);});
  _addBtn('sb-text',       function(el){openSubById('text',el);});
  _addBtn('sb-hide',    function(){toggleHide();});
  _addBtn('sb-lock',    function(){toggleLockAll();});
  _addBtn('sb-delete',  function(){clearAllDrawings();});
}

// ── Float menu event listeners (touchend for Android WebView) ─────
function initFMEvents() {
  _addBtn('fm-lck', function(){lockSel();});
  _addBtn('fm-del', function(){deleteSel();});
  _addBtn('fm-close', function(){deselectAll();});
  var clr=document.getElementById('fm-clr');
  if(clr) clr.addEventListener('input',function(){colorSel(this.value);});
}

function setTool(id) {
  TOOL=id; CUR_PTS=[]; FREE_PTS=[]; IP=null; SEL=null; _previewPt=null;
  hideFM(); updateCanvasMode(); updateHint(); buildSidebar(); scheduleRedraw();
}

// ── Float menu ────────────────────────────────────────────────────
var LOCK_SVG   = '<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
var UNLOCK_SVG = '<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 3 0 0 1 10 0"/></svg>';

function _fmSetLock(locked) {
  var lk=document.getElementById('fm-lck'); if(!lk) return;
  lk.innerHTML=locked?UNLOCK_SVG:LOCK_SVG;
  lk.title=locked?'Unlock':'Lock';
  lk.style.color=locked?'#f59e0b':'';
}
function _placePanel(el, panW, panH, ex, ey) {
  var wrap=document.getElementById('chart-wrap');
  var wb=wrap?wrap.getBoundingClientRect():{top:42,bottom:window.innerHeight,left:50,right:window.innerWidth};
  var gap=12;
  var top, left;
  if(ey - wb.top >= panH + gap + 8) { top = ey - panH - gap; }
  else { top = ey + gap; }
  top = Math.max(wb.top + 8, Math.min(top, wb.bottom - panH - 8));
  left = ex - panW / 2;
  left = Math.max(wb.left + 8, Math.min(left, wb.right - panW - 8));
  el.style.top = top + 'px';
  el.style.left = left + 'px';
}
function showFM(d, ex, ey) {
  hideFibPanel(); hidePosPanel();
  if(d.type==='fibretracement'){showFibPanel(d,ex,ey);return;}
  if(d.type==='longposition'||d.type==='shortposition'){showPosPanel(d,ex,ey);return;}
  var fm=document.getElementById('float-menu'); if(!fm) return;
  fm.classList.remove('hidden');
  var panW=fm.offsetWidth||200, panH=fm.offsetHeight||40;
  _placePanel(fm, panW, panH, ex||200, ey||200);
  _fmSetLock(d.locked);
  var cl=document.getElementById('fm-clr'); if(cl) cl.value=d.color||'#f0b90b';
}
function hideFM() {
  var fm=document.getElementById('float-menu'); if(fm) fm.classList.add('hidden');
  hideFibPanel(); hidePosPanel();
}
function deleteSel() {
  if(!SEL) return;
  DRW=DRW.filter(function(d){return d.id!==SEL;}); SEL=null; hideFM(); saveDrw(); scheduleRedraw();
}
function colorSel(v) {
  if(!SEL) return;
  var d=DRW.find(function(x){return x.id===SEL;}); if(d){d.color=v;saveDrw();scheduleRedraw();}
}
function lockSel() {
  if(!SEL) return;
  var d=DRW.find(function(x){return x.id===SEL;});
  if(d){
    d.locked=!d.locked; saveDrw();
    if(d.locked){SEL=null;hideFM();}
    else{_fmSetLock(false);}
    scheduleRedraw();
  }
}
function deselectAll() { SEL=null; hideFM(); scheduleRedraw(); }

// ── Fibonacci panel ───────────────────────────────────────────────
var _fibTarget = null;
function showFibPanel(d, ex, ey) {
  _fibTarget = d;
  var fp=document.getElementById('fib-panel'); if(!fp) return;
  var chkL=document.getElementById('fp-labels'),chkP=document.getElementById('fp-prices');
  var chkG=document.getElementById('fp-golden');
  var chkE=document.getElementById('fp-extend'),chkR=document.getElementById('fp-reverse');
  var slOp=document.getElementById('fp-opacity'),opV=document.getElementById('fp-opacity-val');
  if(chkL) chkL.checked=d.fibShowLabels!==false;
  if(chkP) chkP.checked=d.fibShowPrices!==false;
  if(chkG) chkG.checked=d.fibShowGolden!==false;
  if(chkE) chkE.checked=!!d.fibExtend;
  if(chkR) chkR.checked=!!d.fibReverse;
  var op=Math.round((d.fibOpacity!=null?d.fibOpacity:0.45)*100);
  if(slOp) slOp.value=op; if(opV) opV.textContent=op+'%';
  var fw=d.fibLineWidth||1;
  ['fp-w1','fp-w2'].forEach(function(id,i){var b=document.getElementById(id);if(b)b.classList.toggle('act',fw===i+1);});
  var fs=d.fibLineStyle||'dashed';
  ['solid','dashed','dotted'].forEach(function(st){var b=document.getElementById('fp-s-'+st);if(b)b.classList.toggle('act',st===fs);});
  var flp=d.fibLabelPos||'left';
  ['left','center','right'].forEach(function(p){var b=document.getElementById('fp-lp-'+p);if(b)b.classList.toggle('act',p===flp);});
  var lkBtn=document.getElementById('fp-lck');
  if(lkBtn) lkBtn.style.color=d.locked?'#f59e0b':'#C9D1D9';
  fp.classList.remove('hidden');
  var pw=224,ph=fp.offsetHeight||340;
  _placePanel(fp, pw, ph, ex||200, ey||200);
}
function hideFibPanel(){_fibTarget=null;var fp=document.getElementById('fib-panel');if(fp)fp.classList.add('hidden');}
function fibSave(){if(_fibTarget){saveDrw();scheduleRedraw();}}
function fibSetWidth(w){
  if(!_fibTarget)return;_fibTarget.fibLineWidth=w;
  ['fp-w1','fp-w2','fp-w3'].forEach(function(id,i){var b=document.getElementById(id);if(b)b.classList.toggle('act',w===i+1);});
  fibSave();
}
function fibSetStyle(s){
  if(!_fibTarget)return;_fibTarget.fibLineStyle=s;
  ['solid','dashed','dotted'].forEach(function(st){var b=document.getElementById('fp-s-'+st);if(b)b.classList.toggle('act',st===s);});
  fibSave();
}
function fibSetLabelPos(p){
  if(!_fibTarget)return; _fibTarget.fibLabelPos=p;
  ['left','center','right'].forEach(function(s){var b=document.getElementById('fp-lp-'+s);if(b)b.classList.toggle('act',s===p);});
  fibSave();
}
function fibResetStyle(){
  if(!_fibTarget)return;
  _fibTarget.levels=FIB_DEFAULT_LEVELS.map(function(l){return{level:l.level,color:l.color};});
  _fibTarget.fibOpacity=0.45; _fibTarget.fibLineWidth=1; _fibTarget.fibLineStyle='dashed';
  _fibTarget.fibShowLabels=true; _fibTarget.fibShowPrices=true; _fibTarget.fibShowGolden=true;
  _fibTarget.fibLabelPos='left'; _fibTarget.fibExtend=false; _fibTarget.fibReverse=false;
  fibSave(); showFibPanel(_fibTarget,0,0);
}
// ── Position panel ────────────────────────────────────────────────
var _posTarget = null;
function showPosPanel(d, ex, ey) {
  _posTarget = d;
  var pp=document.getElementById('pos-panel'); if(!pp) return;
  var ti=document.getElementById('pp-title');
  if(ti) ti.textContent=d.type==='longposition'?'Long Position':'Short Position';
  var chkL=document.getElementById('pp-labels'),chkP=document.getElementById('pp-prices'),chkRR=document.getElementById('pp-rr');
  var slOp=document.getElementById('pp-opacity'),opV=document.getElementById('pp-opacity-val');
  if(chkL) chkL.checked=d.posShowLabels!==false;
  if(chkP) chkP.checked=d.posShowPrices!==false;
  if(chkRR) chkRR.checked=d.posShowRR!==false;
  var op=Math.round((d.posOpacity!=null?d.posOpacity:0.22)*100);
  if(slOp) slOp.value=op; if(opV) opV.textContent=op+'%';
  var pw=d.posLineWidth||1;
  ['pp-w1','pp-w2','pp-w3'].forEach(function(id,i){var b=document.getElementById(id);if(b)b.classList.toggle('act',pw===i+1);});
  var lkBtn=document.getElementById('pp-lck');
  if(lkBtn) lkBtn.style.color=d.locked?'#f59e0b':'#C9D1D9';
  pp.classList.remove('hidden');
  var panW=224,ph=pp.offsetHeight||270;
  _placePanel(pp, panW, ph, ex||200, ey||200);
}
function hidePosPanel(){_posTarget=null;var pp=document.getElementById('pos-panel');if(pp)pp.classList.add('hidden');}
function posSave(){if(_posTarget){saveDrw();scheduleRedraw();}}
function posSetWidth(w){
  if(!_posTarget)return; _posTarget.posLineWidth=w;
  ['pp-w1','pp-w2','pp-w3'].forEach(function(id,i){var b=document.getElementById(id);if(b)b.classList.toggle('act',w===i+1);});
  posSave();
}
function posResetStyle(){
  if(!_posTarget)return;
  _posTarget.posOpacity=0.22; _posTarget.posLineWidth=1;
  _posTarget.posShowLabels=true; _posTarget.posShowPrices=true; _posTarget.posShowRR=true;
  posSave(); showPosPanel(_posTarget,0,0);
}
function initPosEvents(){
  var chkL=document.getElementById('pp-labels');
  if(chkL)chkL.addEventListener('change',function(){if(_posTarget){_posTarget.posShowLabels=this.checked;posSave();}});
  var chkP=document.getElementById('pp-prices');
  if(chkP)chkP.addEventListener('change',function(){if(_posTarget){_posTarget.posShowPrices=this.checked;posSave();}});
  var chkRR=document.getElementById('pp-rr');
  if(chkRR)chkRR.addEventListener('change',function(){if(_posTarget){_posTarget.posShowRR=this.checked;posSave();}});
  var slOp=document.getElementById('pp-opacity');
  if(slOp)slOp.addEventListener('input',function(){
    if(!_posTarget)return;
    _posTarget.posOpacity=parseInt(this.value)/100;
    var v=document.getElementById('pp-opacity-val');if(v)v.textContent=this.value+'%';
    posSave();
  });
  function _ppBtn(id,fn){var b=document.getElementById(id);if(b){b.addEventListener('touchend',function(e){e.preventDefault();fn();},{passive:false});b.addEventListener('click',fn);}}
  _ppBtn('pp-del',function(){
    if(!_posTarget)return;
    DRW=DRW.filter(function(d){return d.id!==_posTarget.id;});
    SEL=null;hidePosPanel();saveDrw();scheduleRedraw();
  });
  _ppBtn('pp-dup',function(){
    if(!_posTarget)return;
    var nd=JSON.parse(JSON.stringify(_posTarget));
    nd.id=genId();
    nd.startTime=(nd.startTime||0)+tfToSec(currentTf)*5;
    nd.endTime=(nd.endTime||0)+tfToSec(currentTf)*5;
    nd.pts=[{price:nd.entryPrice,time:nd.startTime}];
    DRW.push(nd);SEL=nd.id;_posTarget=nd;saveDrw();scheduleRedraw();
  });
  _ppBtn('pp-close',function(){SEL=null;hidePosPanel();scheduleRedraw();});
  _ppBtn('pp-lck',function(){
    if(!_posTarget)return;
    _posTarget.locked=!_posTarget.locked;saveDrw();
    if(_posTarget.locked){SEL=null;hidePosPanel();}
    else{var b=document.getElementById('pp-lck');if(b)b.style.color='#C9D1D9';}
    scheduleRedraw();
  });
}

function initFibEvents(){
  var chkL=document.getElementById('fp-labels');
  if(chkL)chkL.addEventListener('change',function(){if(_fibTarget){_fibTarget.fibShowLabels=this.checked;fibSave();}});
  var chkP=document.getElementById('fp-prices');
  if(chkP)chkP.addEventListener('change',function(){if(_fibTarget){_fibTarget.fibShowPrices=this.checked;fibSave();}});
  var chkG=document.getElementById('fp-golden');
  if(chkG)chkG.addEventListener('change',function(){if(_fibTarget){_fibTarget.fibShowGolden=this.checked;fibSave();}});
  var chkE=document.getElementById('fp-extend');
  if(chkE)chkE.addEventListener('change',function(){if(_fibTarget){_fibTarget.fibExtend=this.checked;fibSave();}});
  var chkR=document.getElementById('fp-reverse');
  if(chkR)chkR.addEventListener('change',function(){if(_fibTarget){_fibTarget.fibReverse=this.checked;fibSave();}});
  var slOp=document.getElementById('fp-opacity');
  if(slOp)slOp.addEventListener('input',function(){
    if(!_fibTarget)return;
    _fibTarget.fibOpacity=parseInt(this.value)/100;
    var v=document.getElementById('fp-opacity-val');if(v)v.textContent=this.value+'%';
    fibSave();
  });
  function _fpBtn(id,fn){var b=document.getElementById(id);if(b){b.addEventListener('touchend',function(e){e.preventDefault();fn();},{passive:false});b.addEventListener('click',fn);}}
  _fpBtn('fp-del',function(){
    if(!_fibTarget)return;
    DRW=DRW.filter(function(d){return d.id!==_fibTarget.id;});
    SEL=null;hideFibPanel();saveDrw();scheduleRedraw();
  });
  _fpBtn('fp-close',function(){SEL=null;hideFibPanel();scheduleRedraw();});
  _fpBtn('fp-lck',function(){
    if(!_fibTarget)return;
    _fibTarget.locked=!_fibTarget.locked;saveDrw();
    if(_fibTarget.locked){SEL=null;hideFibPanel();}
    else{var b=document.getElementById('fp-lck');if(b)b.style.color='#C9D1D9';}
    scheduleRedraw();
  });
}

// ── 3-point tool set ─────────────────────────────────────────────
var THREE_PT = new Set(['channel']);

// ── Inside chart-wrap check ───────────────────────────────────────
function ptInWrap(cx,cy) {
  var el=document.getElementById('chart-wrap'); if(!el) return false;
  var r=el.getBoundingClientRect();
  return cx>=r.left&&cx<=r.right&&cy>=r.top&&cy<=r.bottom;
}

function dbg() {}

// ── Canvas pointer events ─────────────────────────────────────────
function initDrawingEvents() {
  // Document-level touch — works on Android WebView
  document.addEventListener('touchstart',function(e) {
    var t=e.changedTouches&&e.changedTouches[0]; if(!t) return;
    var cx=t.clientX,cy=t.clientY;

    // Always let float-menu, sidebar, and sub-menu receive their own events first
    var el=document.elementFromPoint(cx,cy);
    if(el&&el.closest&&(el.closest('#float-menu')||el.closest('#fib-panel')||el.closest('#pos-panel')||el.closest('#sidebar')||el.closest('#sb-sub'))) return;

    if(!ptInWrap(cx,cy)) return;

    // Cursor mode: hit-test existing drawings for selection + drag
    if (!TOOL||TOOL==='cursor') {
      var pos=clientToCanvas(cx,cy);
      var hit=hitTest(pos.x,pos.y);
      if (hit&&!hit.locked) {
        e.preventDefault();
        var d=DRW.find(function(x){return x.id===hit.did;});
        if(!d) return;
        SEL=d.id;
        if(hit.handleIdx>=0) {
          // resize handle — lock chart so it doesn't pan
          e.stopPropagation();
          _resizeState={d:d,idx:hit.handleIdx};
          DRAW_MODE='draggingHandle';
          lockChart();
          hideFM();
        } else {
          // body drag — lock chart so it doesn't pan
          e.stopPropagation();
          var sxy=clientToCanvas(cx,cy);
          var _isPT=d.type==='longposition'||d.type==='shortposition';
          _dragState={d:d,origPts:JSON.parse(JSON.stringify(d.pts||[])),
            origPos:_isPT?{entryPrice:d.entryPrice,targetPrice:d.targetPrice,stopPrice:d.stopPrice,startTime:d.startTime,endTime:d.endTime}:null,
            startData:svgToData(sxy.x,sxy.y)};
          DRAW_MODE='draggingShape';
          lockChart();
          hideFM();
          // Long-press: show settings after 480ms if not dragged
          clearTimeout(_longPressTimer);
          _longPressD=d; _longPressCx=cx; _longPressCy=cy;
          _longPressTimer=setTimeout(function(){
            _longPressTimer=null;
            if(_longPressD&&SEL===_longPressD.id&&DRAW_MODE==='draggingShape'){
              showFM(_longPressD,_longPressCx,_longPressCy);
            }
          },480);
        }
        scheduleRedraw();
      } else if (hit&&hit.locked) {
        // locked — tap selects but no move
        SEL=hit.did; scheduleRedraw();
      } else {
        SEL=null;hideFM();scheduleRedraw();
      }
      return;
    }

    // Long/Short position: create full box on single tap (no multi-step drag)
    if(TOOL==='longposition'||TOOL==='shortposition'){
      e.preventDefault();
      var pPos=clientToCanvas(cx,cy);
      var pPt=svgToData(pPos.x,pPos.y);
      if(pPt.price!=null&&pPt.time!=null){
        var pIsLong=TOOL==='longposition', pEntry=pPt.price, pId=genId();
        var pDrw={id:pId,type:TOOL,
          entryPrice:pEntry,
          targetPrice:pIsLong?pEntry*1.01:pEntry*0.99,
          stopPrice:pIsLong?pEntry*0.995:pEntry*1.005,
          startTime:pPt.time,endTime:estimateEndTime(pPt.time),
          pts:[{price:pEntry,time:pPt.time}],
          posShowLabels:true,posShowPrices:true,posShowRR:true,
          posOpacity:0.22,posLineWidth:1,
          visible:true,locked:false};
        DRW.push(pDrw);SEL=pId;
        TOOL='cursor';IP=null;CUR_PTS=[];_previewPt=null;DRAW_MODE='selecting';
        unlockChart();saveDrw();buildSidebar();updateCanvasMode();scheduleRedraw();
      }
      return;
    }

    e.preventDefault();
    onDown({clientX:cx,clientY:cy});
  },{passive:false});

  document.addEventListener('touchmove',function(e) {
    var t=e.changedTouches&&e.changedTouches[0]; if(!t) return;
    _lastX=t.clientX;_lastY=t.clientY;

    // Cancel long-press if finger moved > 8px
    if(_longPressTimer&&(Math.abs(t.clientX-_longPressCx)>8||Math.abs(t.clientY-_longPressCy)>8)){
      clearTimeout(_longPressTimer);_longPressTimer=null;_longPressD=null;
    }

    // Handle drag-move in cursor mode
    if(_dragState) {
      e.preventDefault();
      var cur=clientToCanvas(t.clientX,t.clientY);
      var curData=svgToData(cur.x,cur.y);
      if(curData.time!=null) {
        var dP=curData.price-(_dragState.startData.price||0);
        var dT=(curData.time||0)-(_dragState.startData.time||0);
        var _dd=_dragState.d;
        if((_dd.type==='longposition'||_dd.type==='shortposition')&&_dragState.origPos){
          _dd.entryPrice=(_dragState.origPos.entryPrice||0)+dP;
          _dd.targetPrice=(_dragState.origPos.targetPrice||0)+dP;
          _dd.stopPrice=(_dragState.origPos.stopPrice||0)+dP;
          _dd.startTime=(_dragState.origPos.startTime||0)+dT;
          _dd.endTime=(_dragState.origPos.endTime||0)+dT;
          _dd.pts=[{price:_dd.entryPrice,time:_dd.startTime}];
        } else {
          _dd.pts=_dragState.origPts.map(function(pt){return{price:(pt.price||0)+dP,time:(pt.time||0)+dT};});
        }
        scheduleRedraw();
      }
      return;
    }

    // Handle resize handle in cursor mode
    if(_resizeState) {
      e.preventDefault();
      var rp=clientToCanvas(t.clientX,t.clientY);
      var rpt=svgToData(rp.x,rp.y);
      if(rpt.price!=null) {
        var rd=_resizeState.d,ri=_resizeState.idx;
        if(rd.type==='longposition'||rd.type==='shortposition'){
          if(ri===0){rd.entryPrice=rpt.price;}
          else if(ri===1){rd.targetPrice=rpt.price;}
          else if(ri===2){rd.stopPrice=rpt.price;}
          else if(ri===3&&rpt.time!=null){rd.startTime=rpt.time;}
          else if(ri===4&&rpt.time!=null){rd.endTime=rpt.time;}
          rd.pts=[{price:rd.entryPrice,time:rd.startTime}];
        } else if(rd.type==='rectangle'){
          if(ri===0){rd.pts[0]={price:rpt.price,time:rpt.time};}
          else if(ri===1){rd.pts[0].time=rpt.time;if(!rd.pts[1])rd.pts[1]={};rd.pts[1].price=rd.pts[0].price;}
          else if(ri===2){rd.pts[0].time=rpt.time;if(!rd.pts[1])rd.pts[1]={};rd.pts[1].price=rpt.price;}
          else{if(!rd.pts[1])rd.pts[1]={};rd.pts[1].price=rpt.price;rd.pts[1].time=rpt.time;}
        } else if(rpt.time!=null&&rd.pts[ri]!==undefined){
          rd.pts[ri]={price:rpt.price,time:rpt.time};
        }
        scheduleRedraw();
      }
      return;
    }

    if(!M_DOWN&&!(IP&&THREE_PT.has(IP)&&CUR_PTS.length===2)) return;
    e.preventDefault();
    onMove({clientX:t.clientX,clientY:t.clientY});
  },{passive:false});

  document.addEventListener('touchend',function(e) {
    var t=e.changedTouches&&e.changedTouches[0];
    var cx=t?t.clientX:_lastX,cy=t?t.clientY:_lastY;

    // Cancel long-press on finger lift (short tap — no settings)
    var _lpWasPending=!!_longPressTimer;
    if(_longPressTimer){clearTimeout(_longPressTimer);_longPressTimer=null;_longPressD=null;}

    if(_dragState) {
      e.preventDefault(); e.stopPropagation();
      var dd=_dragState.d;
      var _didMove=_dragState.startData&&(function(){
        var cp=clientToCanvas(cx,cy),cd=svgToData(cp.x,cp.y);
        return Math.abs((cd.price||0)-(_dragState.startData.price||0))>0.0001||
               Math.abs((cd.time||0)-(_dragState.startData.time||0))>0;
      })();
      saveDrw();
      _dragState=null;
      DRAW_MODE='selecting';
      unlockChart();
      // Long-press types: only show settings after actual drag (not tap)
      var _isLpType=dd.type==='longposition'||dd.type==='shortposition'||
                    dd.type==='daterange'||dd.type==='pricerange'||dd.type==='fibretracement';
      if(!_isLpType||_didMove) showFM(dd,cx,cy);
      scheduleRedraw();
      return;
    }
    if(_resizeState) {
      e.preventDefault(); e.stopPropagation();
      saveDrw();
      var _rsd=_resizeState.d;
      _resizeState=null;
      DRAW_MODE='selecting';
      unlockChart();
      showFM(_rsd,cx,cy);
      scheduleRedraw();
      return;
    }

    if(!M_DOWN) return;
    e.preventDefault();
    onUp({clientX:cx,clientY:cy});
  },{passive:false});

  document.addEventListener('touchcancel',function(){
    if(_dragState){saveDrw();_dragState=null;DRAW_MODE='selecting';unlockChart();}
    if(_resizeState){saveDrw();_resizeState=null;DRAW_MODE='selecting';unlockChart();}
    if(M_DOWN){M_DOWN=false;IP=null;CUR_PTS=[];FREE_PTS=[];_previewPt=null;DRAW_MODE='selecting';unlockChart();scheduleRedraw();}
  });

  // Canvas pointer events — desktop/web
  var canvas=getCanvas();
  if(canvas){
    canvas.addEventListener('pointerdown',function(e){if(e.pointerType==='touch')return;onDown(e);},{passive:false});
    canvas.addEventListener('pointermove',function(e){if(e.pointerType==='touch')return;onMove(e);},{passive:false});
    canvas.addEventListener('pointerup',  function(e){if(e.pointerType==='touch')return;onUp(e);});
  }

  // Drag-move & resize on canvas in cursor mode (pointer events)
  document.addEventListener('pointermove',function(e) {
    if(e.pointerType==='touch') return;
    if(_dragState) {
      var cur=clientToCanvas(e.clientX,e.clientY);
      var curData=svgToData(cur.x,cur.y);
      if(!curData.time&&curData.time!==0) return;
      var dP=curData.price-(_dragState.startData.price||0);
      var dT=(curData.time||0)-(_dragState.startData.time||0);
      _dragState.d.pts=_dragState.origPts.map(function(pt){return{price:(pt.price||0)+dP,time:(pt.time||0)+dT};});
      scheduleRedraw();
    }
    if(_resizeState) {
      var rp=clientToCanvas(e.clientX,e.clientY);
      var rpt=svgToData(rp.x,rp.y);
      if(!rpt.time&&rpt.time!==0) return;
      var rd=_resizeState.d,ri=_resizeState.idx;
      if(rd.type==='rectangle'){
        if(ri===0){rd.pts[0]={price:rpt.price,time:rpt.time};}
        else if(ri===1){rd.pts[0].time=rpt.time;if(!rd.pts[1])rd.pts[1]={};rd.pts[1].price=rd.pts[0].price;}
        else if(ri===2){rd.pts[0].time=rpt.time;if(!rd.pts[1])rd.pts[1]={};rd.pts[1].price=rpt.price;}
        else{if(!rd.pts[1])rd.pts[1]={};rd.pts[1].price=rpt.price;rd.pts[1].time=rpt.time;}
      } else if(rd.pts[ri]!==undefined){
        rd.pts[ri]={price:rpt.price,time:rpt.time};
      }
      scheduleRedraw();
    }
  });
  document.addEventListener('pointerup',function(e) {
    if(e.pointerType==='touch') return;
    if(_dragState){
      var _dpu=_dragState.d; saveDrw(); _dragState=null; DRAW_MODE='selecting'; unlockChart();
      if(SEL) showFM(_dpu, e.clientX, e.clientY);
    }
    if(_resizeState){
      var _rpu=_resizeState.d; saveDrw(); _resizeState=null; DRAW_MODE='selecting'; unlockChart();
      if(SEL) showFM(_rpu, e.clientX, e.clientY);
    }
  });

  // Cursor-mode tap on canvas for selection
  document.addEventListener('pointerdown',function(e) {
    if(e.pointerType==='touch') return;
    if(!ptInWrap(e.clientX,e.clientY)) return;
    if(TOOL&&TOOL!=='cursor') return;
    var pos=clientToCanvas(e.clientX,e.clientY);
    var hit=hitTest(pos.x,pos.y);
    if(hit&&!hit.locked) {
      if(hit.handleIdx>=0) {
        var rd=DRW.find(function(x){return x.id===hit.did;}); if(!rd) return;
        e.preventDefault(); e.stopPropagation(); SEL=rd.id;
        _resizeState={d:rd,idx:hit.handleIdx};
        DRAW_MODE='draggingHandle'; lockChart();
        scheduleRedraw();
      } else {
        var md=DRW.find(function(x){return x.id===hit.did;}); if(!md) return;
        e.preventDefault(); e.stopPropagation(); SEL=md.id;
        hideFM();
        var sxy=clientToCanvas(e.clientX,e.clientY);
        var _isPTp=md.type==='longposition'||md.type==='shortposition';
        _dragState={d:md,origPts:JSON.parse(JSON.stringify(md.pts||[])),
          origPos:_isPTp?{entryPrice:md.entryPrice,targetPrice:md.targetPrice,stopPrice:md.stopPrice,startTime:md.startTime,endTime:md.endTime}:null,
          startData:svgToData(sxy.x,sxy.y)};
        DRAW_MODE='draggingShape'; lockChart();
        scheduleRedraw();
      }
    } else {
      SEL=null;hideFM();scheduleRedraw();
    }
  },{passive:false});
}

function onDown(e) {
  closeSub();
  var pos=clientToCanvas(e.clientX,e.clientY);
  var x=pos.x,y=pos.y;

  if(!TOOL||TOOL==='cursor') return;

  // Freehand
  if(TOOL==='brush'||TOOL==='highlighter'){
    IP=TOOL;FREE_PTS=[x,y];M_DOWN=true;DRAW_MODE='drawing';lockChart();return;
  }

  var pt=svgToData(x,y);
  if(pt.price==null) return;

  // 3-pt: third click
  if(IP&&THREE_PT.has(IP)&&CUR_PTS.length===2){
    CUR_PTS.push(pt);finishDrawing();return;
  }
  updateHint();

  // Single-tap tools
  if(TOOL==='hline'){
    var hid=genId();DRW.push({id:hid,type:'hline',pts:[{price:pt.price,time:pt.time||0}],color:CLR,width:WID,visible:true,locked:false});saveDrw();scheduleRedraw();return;
  }
  if(TOOL==='vline'){
    if(!pt.time)return;
    var vid=genId();DRW.push({id:vid,type:'vline',pts:[{price:pt.price,time:pt.time}],color:CLR,width:WID,visible:true,locked:false});saveDrw();scheduleRedraw();return;
  }
  if(TOOL==='pricelabel'){
    var plid=genId();DRW.push({id:plid,type:'pricelabel',pts:[{price:pt.price,time:pt.time||0}],color:CLR,width:WID,visible:true,locked:false});saveDrw();scheduleRedraw();return;
  }
  if(TOOL==='text'||TOOL==='note'){
    var txt=prompt('Enter '+(TOOL==='text'?'text':'note')+':',TOOL==='text'?'Text':'Note');
    if(txt==null)return;
    var tid=genId();DRW.push({id:tid,type:TOOL,pts:[{price:pt.price,time:pt.time||0}],color:CLR,width:WID,text:txt,visible:true,locked:false});saveDrw();scheduleRedraw();return;
  }

  // Drag-to-draw
  IP=TOOL;CUR_PTS=[pt,pt];M_DOWN=true;_previewPt={x:x,y:y};
  DRAW_MODE='drawing';lockChart();
  scheduleRedraw();
}

function onMove(e) {
  _lastX=e.clientX;_lastY=e.clientY;
  var pos=clientToCanvas(e.clientX,e.clientY);
  var x=pos.x,y=pos.y;

  if(IP==='brush'||IP==='highlighter'){
    if(!M_DOWN) return;
    FREE_PTS.push(x,y);scheduleRedraw();return;
  }

  _previewPt={x:x,y:y};

  if(TOOL&&TOOL!=='cursor') scheduleRedraw();

  if(M_DOWN&&IP&&CUR_PTS.length>=2){
    var pt=svgToData(x,y);
    if(pt.price!=null && pt.time!=null) CUR_PTS[1]=pt;
  } else if(!M_DOWN&&IP&&THREE_PT.has(IP)&&CUR_PTS.length===2){
    // already scheduled above
  }
}

function onUp(e) {
  if(!M_DOWN) return;
  M_DOWN=false;
  var pos=clientToCanvas(e.clientX,e.clientY);
  var x=pos.x,y=pos.y;

  // Freehand finish
  if(IP==='brush'||IP==='highlighter'){
    FREE_PTS.push(x,y);
    if(FREE_PTS.length>=4){
      var fps=[];
      for(var fi=0;fi<FREE_PTS.length;fi+=2){var fpt=svgToData(FREE_PTS[fi],FREE_PTS[fi+1]);if(fpt.price!=null)fps.push(fpt);}
      if(fps.length>=2){var fid=genId();DRW.push({id:fid,type:IP,pts:fps,color:CLR,width:WID,visible:true,locked:false});saveDrw();}
    }
    IP=null;FREE_PTS=[];CUR_PTS=[];_previewPt=null;DRAW_MODE='selecting';unlockChart();scheduleRedraw();return;
  }

  // Drag-to-draw finish
  if(IP&&CUR_PTS.length>=2){
    var upt=svgToData(x,y);
    if(upt.price!=null && upt.time!=null) CUR_PTS[1]=upt;

    // If second point still has no valid time, cancel (nothing to save)
    if(CUR_PTS[1].time==null){IP=null;CUR_PTS=[];_previewPt=null;DRAW_MODE='selecting';unlockChart();scheduleRedraw();return;}

    if(THREE_PT.has(IP)){
      // 3-pt: finger up after pt2 — keep locked until 3rd tap (finishDrawing unlocks)
      _previewPt=null;updateHint();scheduleRedraw();
    } else {
      var up1=dataToSvg(CUR_PTS[0].price,CUR_PTS[0].time);
      var up2=dataToSvg(CUR_PTS[1].price,CUR_PTS[1].time);
      var moved=up1.x!=null&&up2.x!=null&&(Math.abs(up2.x-up1.x)>4||Math.abs(up2.y-up1.y)>4);
      if(moved){finishDrawing();}else{IP=null;CUR_PTS=[];_previewPt=null;DRAW_MODE='selecting';unlockChart();scheduleRedraw();}
    }
  }
}

function finishDrawing() {
  if(!IP||CUR_PTS.length===0) return;
  var id=genId();
  var drw={id:id,type:IP,pts:CUR_PTS.slice(),color:CLR,width:WID,visible:true,locked:false};
  if(IP==='fibretracement'){
    drw.levels=FIB_DEFAULT_LEVELS.map(function(l){return{level:l.level,color:l.color};});
    drw.fibShowLabels=true; drw.fibShowPrices=true; drw.fibShowGolden=true;
    drw.fibLineWidth=1; drw.fibLineStyle='dashed'; drw.fibOpacity=0.45;
    drw.fibExtend=false; drw.fibReverse=false; drw.fibLabelPos='left';
  }
  DRW.push(drw);
  TOOL=null;IP=null;CUR_PTS=[];_previewPt=null;DRAW_MODE='selecting';unlockChart();
  saveDrw();buildSidebar();updateCanvasMode();scheduleRedraw();
}

// ── Subscribe to chart viewport changes ───────────────────────────
function subscribeChartRedraw() {
  if(!chart) return;
  // Fires on every bar that scrolls in/out of view
  try{chart.timeScale().subscribeVisibleLogicalRangeChange(function(){scheduleRedraw();});}catch(e){}
  // Fires more granularly during touch pans (sub-bar resolution)
  try{chart.timeScale().subscribeVisibleTimeRangeChange(function(){scheduleRedraw();});}catch(e){}
  // Fires on price-scale zoom (drag on price axis)
  try{chart.priceScale('right').subscribeVisiblePriceRangeChange(function(){scheduleRedraw();});}catch(e){}
}

// ── Init ──────────────────────────────────────────────────────────
function initDrwEngine() {
  loadDrw();
  buildSidebar();
  updateCanvasMode();
  subscribeChartRedraw();
  setTimeout(scheduleRedraw,300);
}

// Attach sidebar events immediately (HTML already in DOM)
(function immediateInit() {
  try {
    loadDrw();
    buildSidebar();
    updateCanvasMode();
    initSidebarEvents();
    initFMEvents();
    initFibEvents();
    initPosEvents();
    initDrawingEvents();
  } catch(e) {}
})();
</script>
</body>
</html>`;
}

const ChartWebView = forwardRef<any, {
  html: string; binKey: string; h: number;
  onLoad: () => void; onError: () => void; onMsg: (e: any) => void;
}>(function ChartWebView({ html, binKey, h, onLoad, onError, onMsg }, ref) {
  return (
    <WebView
      ref={ref}
      key={binKey}
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
});

export default function NativeWebViewChart({ symbol = "BTCUSDT", height = 480 }: Props) {
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(false);
  const [isFullscreen,   setIsFullscreen]   = useState(false);
  const normalWVRef = useRef<any>(null); // ref to normal (portrait) WebView
  const { width: screenW, height: screenH } = useWindowDimensions();

  const bin = symbol.replace("/","").toUpperCase().endsWith("USDT")
    ? symbol.replace("/","").toUpperCase()
    : symbol.replace("/","").toUpperCase() + "USDT";

  // Compute API base URL so the WebView can reach the API proxy
  const apiBase = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "";

  // CRITICAL: memoize so `source={{ html }}` never changes reference between renders.
  // Without this, iOS WebView silently reloads on every parent re-render.
  const html   = useMemo(() => buildHtml(bin, false, apiBase), [bin, apiBase]);
  const htmlFS = useMemo(() => buildHtml(bin, true,  apiBase), [bin, apiBase]);

  // ── Auto-rotate: open fullscreen when device goes landscape, close when portrait ──
  // On mount: unlock orientation so the chart screen can rotate.
  // On unmount: lock back to portrait so other screens stay portrait.
  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(() => {});
    return () => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {}); };
  }, []);

  const isLandscape = screenW > screenH;
  const prevLandscapeRef = useRef(isLandscape);
  useEffect(() => {
    if (prevLandscapeRef.current === isLandscape) return;
    prevLandscapeRef.current = isLandscape;
    if (isLandscape) {
      // Device rotated to landscape → show fullscreen chart
      setIsFullscreen(true);
    } else {
      // Device rotated back to portrait → close fullscreen, remount portrait WV fresh
      setLoading(true);
      setIsFullscreen(false);
    }
  }, [isLandscape]);

  // Android: intercept hardware back button when fullscreen is open
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isFullscreen) { closeFullscreen(); return true; }
      return false;
    });
    return () => handler.remove();
  }, [isFullscreen]);

  const onNormalLoad = useCallback(() => setLoading(false), []);
  const onError      = useCallback(() => { setLoading(false); setError(true); }, []);
  const retry        = useCallback(() => { setError(false); setLoading(true); setIsFullscreen(false); }, []);

  const closeFullscreen = useCallback(() => {
    // Closing fullscreen: portrait WebView will remount fresh.
    Keyboard.dismiss();
    setLoading(true);
    setIsFullscreen(false);
  }, []);

  const { updateLivePrice } = useTradingContext();
  const onMessage = useCallback((e: any) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === "toggleFS") {
        if (data.value) setIsFullscreen(true); // fullscreen button tapped
        else closeFullscreen();                 // close from within fullscreen
      } else if (data.type === "livePrice" && typeof data.price === "number" && data.price > 0) {
        updateLivePrice(data.price);
      }
    } catch (_) {}
  }, [closeFullscreen, updateLivePrice]);

  return (
    <>
      {/* ── Normal view ── */}
      <View style={[styles.root, { height }]}>
        {error ? (
          <View style={styles.errBox}>
            <Text style={styles.errIcon}>⚠</Text>
            <Text style={styles.errTitle}>Chart failed to load</Text>
            <Text style={styles.errSub}>Check internet connection</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={retry}>
              <Text style={styles.retryTxt}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Portrait WebView — UNMOUNTED while fullscreen is active.
             This is the only 100%-reliable way to prevent orientation-change
             resize events from corrupting the chart canvas.
             When fullscreen closes, it mounts fresh at correct portrait size;
             the existing loading/candle animation covers the brief reload. */
          !isFullscreen && (
            <View style={styles.visibleWebView}>
              <ChartWebView
                ref={normalWVRef}
                html={html}
                binKey={`${bin}-normal`}
                h={height}
                onLoad={onNormalLoad}
                onError={onError}
                onMsg={onMessage}
              />
            </View>
          )
        )}
      </View>

      {/* ── Fullscreen Modal ─────────────────────────────────────────────────
          Uses simple visible={isFullscreen} — no transparent always-open trick
          that causes iOS view lifecycle issues.
          html/htmlFS are memoized so source never changes → no silent reload. */}
      <Modal
        visible={isFullscreen}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeFullscreen}
        supportedOrientations={["portrait", "landscape"]}
      >
        <StatusBar hidden backgroundColor="#131722" />
        <View style={[styles.fsRoot, { width: screenW, height: screenH }]}>
          <ChartWebView
            html={htmlFS}
            binKey={`${bin}-fs-static`}
            h={0}
            onLoad={onNormalLoad}
            onError={onError}
            onMsg={onMessage}
          />
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
  visibleWebView: { flex: 1 },
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
