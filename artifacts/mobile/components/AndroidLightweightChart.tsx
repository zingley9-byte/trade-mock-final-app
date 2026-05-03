/**
 * AndroidLightweightChart
 * Pure lightweight-charts v5 in a WebView — no CDN dependency.
 * Full mobile touch: horizontal drag, pinch-zoom, price-scale drag.
 * WebSocket live candle updates from Binance.
 */
import React, { useRef, useState, useCallback, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { WebView } from "react-native-webview";
import { LWC_SCRIPT } from "../lib/lwcScript";

interface Props {
  symbol?: string;
  height?: number;
}

function toBinSym(symbol: string): string {
  const s = symbol.replace("/", "").toUpperCase();
  return s.endsWith("USDT") ? s : s + "USDT";
}

function buildHtml(binSym: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;}
html,body{width:100%;height:100%;background:#131722;overflow:hidden;}
#root{display:flex;flex-direction:column;width:100%;height:100%;}

/* ── Timeframe bar ── */
#tfbar{
  display:flex;align-items:center;background:#1e222d;
  border-bottom:1px solid #2a2e39;height:40px;flex-shrink:0;
  padding:0 6px;gap:2px;overflow-x:auto;-webkit-overflow-scrolling:touch;
}
#tfbar::-webkit-scrollbar{display:none;}
.tf{
  padding:4px 10px;font-size:12px;font-weight:700;color:#787b86;
  border-radius:5px;border:none;background:none;cursor:pointer;white-space:nowrap;
  -webkit-tap-highlight-color:transparent;flex-shrink:0;
}
.tf.active{color:#f0b90b;background:#f0b90b18;}
.tf:active{background:#ffffff14;}
.tf-sep{width:1px;height:20px;background:#2a2e39;flex-shrink:0;margin:0 2px;}

/* ── WS strip ── */
#ws-strip{
  padding:2px 8px;text-align:center;font-size:10px;font-weight:700;
  background:#1e222d;flex-shrink:0;display:none;
}

/* ── Chart area ── */
#chart-wrap{flex:1;position:relative;min-height:0;overflow:hidden;}
#chart{width:100%;height:100%;touch-action:none;}

/* ── OHLCV overlay ── */
#ohlcv{
  position:absolute;top:6px;left:6px;right:60px;z-index:10;
  display:flex;flex-wrap:wrap;align-items:center;gap:5px 8px;
  font-size:11px;color:#d1d4dc;pointer-events:none;line-height:1.4;
}
#ohlcv.hidden{display:none;}

/* ── Bottom bar ── */
#botbar{
  height:28px;display:flex;align-items:center;gap:8px;
  background:#1e222d;border-top:1px solid #2a2e39;
  padding:0 8px;flex-shrink:0;font-size:10px;color:#787b86;
}
#ist{font-variant-numeric:tabular-nums;color:#d1d4dc;font-size:10px;}
#wsbadge{font-size:9px;font-weight:700;margin-left:auto;}
.bbot{
  border:1px solid #2a2e39;border-radius:3px;padding:1px 7px;
  font-size:10px;font-weight:600;color:#787b86;background:none;cursor:pointer;
}
.bbot.active{color:#f0b90b;background:#f0b90b18;border-color:#f0b90b60;}
</style>
</head>
<body>
<div id="root">

  <!-- TIMEFRAME BAR -->
  <div id="tfbar">
    <button class="tf active" onclick="selectTf(this,'1m')">1m</button>
    <button class="tf" onclick="selectTf(this,'3m')">3m</button>
    <button class="tf" onclick="selectTf(this,'5m')">5m</button>
    <button class="tf" onclick="selectTf(this,'15m')">15m</button>
    <button class="tf" onclick="selectTf(this,'30m')">30m</button>
    <div class="tf-sep"></div>
    <button class="tf" onclick="selectTf(this,'1h')">1h</button>
    <button class="tf" onclick="selectTf(this,'2h')">2h</button>
    <button class="tf" onclick="selectTf(this,'4h')">4h</button>
    <div class="tf-sep"></div>
    <button class="tf" onclick="selectTf(this,'1D')">1D</button>
    <button class="tf" onclick="selectTf(this,'1W')">1W</button>
  </div>

  <!-- WS status strip -->
  <div id="ws-strip"></div>

  <!-- CHART -->
  <div id="chart-wrap">
    <div id="ohlcv" class="hidden"></div>
    <div id="chart"></div>
  </div>

  <!-- BOTTOM BAR -->
  <div id="botbar">
    <span id="ist">--:--:-- IST</span>
    <span id="wsbadge">○ Connecting…</span>
    <button class="bbot" id="btn-pct" onclick="this.classList.toggle('active')">%</button>
    <button class="bbot" id="btn-log" onclick="this.classList.toggle('active')">log</button>
    <button class="bbot" id="btn-auto" onclick="this.classList.toggle('active')">auto</button>
  </div>
</div>

<script>${LWC_SCRIPT}</script>
<script>
// ── Config ────────────────────────────────────────────────────────────────────
var SYMBOL = '${binSym}';
var TF_MAP = {
  '1m':'1m','3m':'3m','5m':'5m','15m':'15m','30m':'30m',
  '1h':'1h','2h':'2h','4h':'4h','1D':'1d','1W':'1w'
};
var currentTf = '1m';
var chart, candleSeries, volSeries;
var ws, retryTimer;
var retryDelay = 3000;
var loadId = 0;

// ── IST clock ─────────────────────────────────────────────────────────────────
function tickIST() {
  var now = new Date();
  var ist = new Date(now.getTime() + now.getTimezoneOffset()*60000 + 5.5*3600000);
  var p = function(n){return String(n).padStart(2,'0');};
  document.getElementById('ist').textContent =
    p(ist.getHours())+':'+p(ist.getMinutes())+':'+p(ist.getSeconds())+' IST';
}
setInterval(tickIST, 1000); tickIST();

// ── WS badge ─────────────────────────────────────────────────────────────────
function setBadge(st) {
  var el  = document.getElementById('wsbadge');
  var str = document.getElementById('ws-strip');
  if (st === 'live') {
    el.textContent = '● LIVE'; el.style.color = '#26a69a';
    str.style.display = 'none';
  } else if (st === 'reconnecting') {
    el.textContent = '↻ Reconnecting…'; el.style.color = '#f59e0b';
    str.textContent = 'Reconnecting…'; str.style.color = '#f59e0b'; str.style.display = 'block';
  } else if (st === 'error') {
    el.textContent = '✕ Error'; el.style.color = '#ef5350';
    str.textContent = 'WS Error · Retrying…'; str.style.color = '#ef5350'; str.style.display = 'block';
  } else {
    el.textContent = '○ Connecting…'; el.style.color = '#787b86';
    str.style.display = 'none';
  }
}

// ── Number format ─────────────────────────────────────────────────────────────
function fmtP(v) {
  if (!v && v !== 0) return '—';
  if (v >= 10000) return v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  if (v >= 1)     return v.toFixed(4);
  return v.toFixed(6);
}
function fmtV(v) {
  if (v >= 1e9) return (v/1e9).toFixed(2)+'B';
  if (v >= 1e6) return (v/1e6).toFixed(2)+'M';
  if (v >= 1e3) return (v/1e3).toFixed(2)+'K';
  return v.toFixed(0);
}

// ── Init chart ────────────────────────────────────────────────────────────────
function initChart() {
  if (chart) { try { chart.remove(); } catch(e){} chart = null; }
  var el = document.getElementById('chart');
  chart = LightweightCharts.createChart(el, {
    width:  el.offsetWidth  || window.innerWidth,
    height: el.offsetHeight || (window.innerHeight - 40 - 28),
    layout: {
      background: { type: 'solid', color: '#131722' },
      textColor: '#d1d4dc',
    },
    grid: {
      vertLines: { color: '#1e222d' },
      horzLines: { color: '#1e222d' },
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: { color: '#758696', labelBackgroundColor: '#1e222d' },
      horzLine: { color: '#758696', labelBackgroundColor: '#26a69a' },
    },
    rightPriceScale: {
      borderColor: '#2a2e39',
      visible: true,
      autoScale: true,
      scaleMargins: { top: 0.08, bottom: 0.22 },
    },
    timeScale: {
      borderColor: '#2a2e39',
      timeVisible: true,
      secondsVisible: false,
      fixLeftEdge: false,
      fixRightEdge: false,
    },
    /* ─── Touch / gesture settings ─── */
    handleScroll: {
      mouseWheel:        true,
      pressedMouseMove:  true,
      horzTouchDrag:     true,   // ← left-right drag on mobile
      vertTouchDrag:     false,  // ← don't eat vertical swipes
    },
    handleScale: {
      axisPressedMouseMove: {
        time:  false,
        price: true,   // ← price scale drag
      },
      mouseWheel: true,
      pinch:      true,          // ← pinch zoom
    },
  });

  candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
    upColor: '#26a69a', downColor: '#ef5350',
    borderUpColor: '#26a69a', borderDownColor: '#ef5350',
    wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    lastValueVisible: true, priceLineVisible: true,
  });

  volSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
    priceScaleId: 'vol',
    priceFormat: { type: 'volume' },
    lastValueVisible: false,
    priceLineVisible: false,
  });
  chart.priceScale('vol').applyOptions({
    scaleMargins: { top: 0.8, bottom: 0 },
    visible: false,
  });

  // OHLCV crosshair tooltip
  chart.subscribeCrosshairMove(function(param) {
    var ohlcv = document.getElementById('ohlcv');
    if (!param || !param.time) { ohlcv.classList.add('hidden'); return; }
    var d = param.seriesData && param.seriesData.get(candleSeries);
    if (!d) { ohlcv.classList.add('hidden'); return; }
    var vd = param.seriesData && param.seriesData.get(volSeries);
    var isUp = d.close >= d.open;
    var c = isUp ? '#26a69a' : '#ef5350';
    var chg  = d.close - d.open;
    var chgP = d.open ? ((chg/d.open)*100).toFixed(2) : '0.00';
    var sign = chg >= 0 ? '+' : '';
    ohlcv.innerHTML =
      '<span style="color:'+c+';font-weight:700;font-size:13px">'+fmtP(d.close)+'</span>'+
      '<span style="color:#787b86">O <b style="color:#d1d4dc">'+fmtP(d.open)+'</b></span>'+
      '<span style="color:#787b86">H <b style="color:#26a69a">'+fmtP(d.high)+'</b></span>'+
      '<span style="color:#787b86">L <b style="color:#ef5350">'+fmtP(d.low)+'</b></span>'+
      '<span style="color:#787b86">C <b style="color:#d1d4dc">'+fmtP(d.close)+'</b></span>'+
      (vd ? '<span style="color:#787b86">V <b style="color:#d1d4dc">'+fmtV(vd.value)+'</b></span>' : '')+
      '<span style="color:'+c+';font-weight:600">'+sign+fmtP(chg)+' ('+sign+chgP+'%)</span>';
    ohlcv.classList.remove('hidden');
  });

  // Resize observer
  var ro = new ResizeObserver(function() {
    if (!chart) return;
    var wrap = document.getElementById('chart-wrap');
    chart.resize(wrap.offsetWidth, wrap.offsetHeight);
  });
  ro.observe(document.getElementById('chart-wrap'));
}

// ── Load data ─────────────────────────────────────────────────────────────────
function loadData(sym, tf) {
  var id = ++loadId;
  var interval = TF_MAP[tf] || '1m';
  setBadge('connecting');
  fetch('https://api.binance.com/api/v3/klines?symbol='+sym+'&interval='+interval+'&limit=500')
    .then(function(r){ return r.json(); })
    .then(function(data){
      if (loadId !== id) return;
      var candles = data.map(function(k){
        return { time: Math.floor(k[0]/1000), open: +k[1], high: +k[2], low: +k[3], close: +k[4] };
      });
      var vols = data.map(function(k){
        return {
          time: Math.floor(k[0]/1000),
          value: +k[5],
          color: +k[4] >= +k[1] ? '#26a69a55' : '#ef535055',
        };
      });
      if (loadId !== id) return;
      candleSeries.setData(candles);
      volSeries.setData(vols);
      chart.timeScale().fitContent();
      var last = candles[candles.length-1];
      if (last) {
        var ohlcv = document.getElementById('ohlcv');
        var isUp = last.close >= last.open;
        var c = isUp ? '#26a69a' : '#ef5350';
        var chg  = last.close - last.open;
        var chgP = last.open ? ((chg/last.open)*100).toFixed(2) : '0.00';
        var sign = chg >= 0 ? '+' : '';
        ohlcv.innerHTML =
          '<span style="color:'+c+';font-weight:700;font-size:13px">'+fmtP(last.close)+'</span>'+
          '<span style="color:#787b86">O <b style="color:#d1d4dc">'+fmtP(last.open)+'</b></span>'+
          '<span style="color:#787b86">H <b style="color:#26a69a">'+fmtP(last.high)+'</b></span>'+
          '<span style="color:#787b86">L <b style="color:#ef5350">'+fmtP(last.low)+'</b></span>'+
          '<span style="color:#787b86">C <b style="color:#d1d4dc">'+fmtP(last.close)+'</b></span>'+
          '<span style="color:'+c+';font-weight:600">'+sign+fmtP(chg)+' ('+sign+chgP+'%)</span>';
        ohlcv.classList.remove('hidden');
      }
      connectWS(sym, interval, id);
    })
    .catch(function(){
      if (loadId !== id) return;
      setBadge('error');
      retryTimer = setTimeout(function(){ loadData(sym, tf); }, retryDelay);
      retryDelay = Math.min(retryDelay*2, 30000);
    });
}

// ── WebSocket ─────────────────────────────────────────────────────────────────
function connectWS(sym, interval, id) {
  if (ws) { try{ ws.close(); } catch(e){} ws = null; }
  clearTimeout(retryTimer);
  var url = 'wss://stream.binance.com:9443/ws/'+sym.toLowerCase()+'@kline_'+interval;
  ws = new WebSocket(url);
  ws.onopen = function() {
    if (loadId !== id) return;
    retryDelay = 3000;
    setBadge('live');
  };
  ws.onmessage = function(e) {
    if (loadId !== id || !candleSeries) return;
    try {
      var k = JSON.parse(e.data).k;
      var candle = { time: Math.floor(k.t/1000), open: +k.o, high: +k.h, low: +k.l, close: +k.c };
      var vol    = { time: Math.floor(k.t/1000), value: +k.v,
        color: +k.c >= +k.o ? '#26a69a55' : '#ef535055' };
      candleSeries.update(candle);
      volSeries.update(vol);
    } catch(err){}
  };
  ws.onerror = function() {
    if (loadId !== id) return;
    setBadge('error');
  };
  ws.onclose = function() {
    if (loadId !== id) return;
    setBadge('reconnecting');
    retryTimer = setTimeout(function(){ connectWS(sym, interval, loadId); }, retryDelay);
    retryDelay = Math.min(retryDelay*2, 30000);
  };
}

// ── Timeframe selector ───────────────────────────────────────────────────────
function selectTf(btn, tf) {
  if (tf === currentTf) return;
  document.querySelectorAll('.tf').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  currentTf = tf;
  if (ws) { try{ ws.close(); } catch(e){} ws = null; }
  clearTimeout(retryTimer);
  ++loadId;
  loadData(SYMBOL, tf);
}

// ── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  initChart();
  loadData(SYMBOL, currentTf);
});
window.addEventListener('resize', function() {
  if (!chart) return;
  var wrap = document.getElementById('chart-wrap');
  chart.resize(wrap.offsetWidth, wrap.offsetHeight);
});
</script>
</body>
</html>`;
}

export default function AndroidLightweightChart({ symbol = "BTCUSDT", height = 480 }: Props) {
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const webviewRef = useRef<any>(null);

  const binSym = toBinSym(symbol);
  const html   = buildHtml(binSym);

  const onLoad  = useCallback(() => setLoading(false), []);
  const onError = useCallback(() => { setLoading(false); setError(true); }, []);
  const retry   = useCallback(() => {
    setError(false); setLoading(true);
    webviewRef.current?.reload();
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(false);
  }, [symbol]);

  return (
    <View style={[styles.root, { height }]}>
      {loading && !error && (
        <View style={styles.loader}>
          <ActivityIndicator color="#26a69a" size="small" />
          <Text style={styles.loaderTxt}>Loading chart…</Text>
        </View>
      )}

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
        <WebView
          ref={webviewRef}
          key={`${binSym}-${height}`}
          source={{ html, baseUrl: "" }}
          style={styles.webview}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          allowUniversalAccessFromFileURLs
          allowFileAccessFromFileURLs
          mixedContentMode="always"
          onLoad={onLoad}
          onError={onError}
          onHttpError={onError}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={false}
          androidHardwareAccelerationDisabled={false}
          renderToHardwareTextureAndroid
          onShouldStartLoadWithRequest={() => true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:      { backgroundColor: "#131722", overflow: "hidden" },
  webview:   { flex: 1, backgroundColor: "#131722" },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#131722",
    alignItems: "center", justifyContent: "center", gap: 8, zIndex: 10,
  },
  loaderTxt: { color: "#787b86", fontSize: 12 },
  errBox:    { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  errIcon:   { fontSize: 28, color: "#f59e0b" },
  errTitle:  { color: "#d1d4dc", fontSize: 14, fontWeight: "700" },
  errSub:    { color: "#787b86", fontSize: 12 },
  retryBtn:  { marginTop: 4, backgroundColor: "#26a69a", paddingHorizontal: 24, paddingVertical: 9, borderRadius: 6 },
  retryTxt:  { color: "#fff", fontSize: 13, fontWeight: "700" },
});
