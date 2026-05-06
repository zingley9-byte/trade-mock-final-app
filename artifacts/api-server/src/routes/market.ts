import { Router } from "express";

const router = Router();

const MEXC_BASE = "https://api.mexc.com/api/v3";

function toMexcInterval(interval: string): string {
  const map: Record<string, string> = {
    "1m":"1m",  "3m":"3m",  "5m":"5m",   "15m":"15m", "30m":"30m",
    "1h":"60m", "2h":"2h",  "4h":"4h",
    "1d":"1d",  "1D":"1d",  "1w":"1W",   "1W":"1W",
  };
  return map[interval] ?? interval;
}

router.get("/market/klines", async (req, res) => {
  const { symbol, interval, limit } = req.query;
  const mexcInterval = toMexcInterval(interval as string);
  const mexcUrl = `${MEXC_BASE}/klines?symbol=${symbol}&interval=${mexcInterval}&limit=${limit ?? 200}`;
  req.log.info({ symbol, interval, mexcInterval, limit }, "klines request received");
  console.log("[API] klines request — symbol:", symbol, "mexcInterval:", mexcInterval, "limit:", limit);
  try {
    const response = await fetch(mexcUrl);
    console.log("[API] MEXC response status:", response.status, response.statusText);
    req.log.info({ status: response.status }, "MEXC klines response");
    if (!response.ok) {
      const text = await response.text();
      console.log("[API] MEXC error body:", text.slice(0, 200));
      res.status(502).json({ error: `MEXC returned ${response.status}: ${text.slice(0, 100)}` });
      return;
    }
    const data = await response.json() as unknown[];
    const count = Array.isArray(data) ? data.length : -1;
    console.log("[API] candles count:", count);
    req.log.info({ count }, "klines fetched successfully from MEXC");
    res.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log("[API] klines fetch error:", msg);
    req.log.error({ err }, "Failed to fetch klines");
    res.status(502).json({ error: `Failed to fetch market data: ${msg}` });
  }
});

// Ticker 24hr — MEXC primary, no Binance dependency
router.get("/market/ticker24hr", async (req, res) => {
  const { symbol } = req.query;
  try {
    const response = await fetch(`${MEXC_BASE}/ticker/24hr?symbol=${symbol}`);
    if (!response.ok) {
      res.status(502).json({ error: `MEXC returned ${response.status}` });
      return;
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch ticker");
    res.status(502).json({ error: "Failed to fetch ticker data" });
  }
});

interface TickerStats {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
}

// Fetch a single symbol's 24hr ticker from MEXC
async function fetchMexcTicker(symbol: string): Promise<TickerStats | null> {
  try {
    const r = await fetch(`${MEXC_BASE}/ticker/24hr?symbol=${symbol}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;
    const d = await r.json() as {
      lastPrice?: string; highPrice?: string; lowPrice?: string;
      volume?: string; priceChangePercent?: string;
    };
    const price = parseFloat(d.lastPrice ?? "0");
    if (!price) return null;
    return {
      price,
      change24h: parseFloat(d.priceChangePercent ?? "0"),
      high24h:   parseFloat(d.highPrice ?? "0"),
      low24h:    parseFloat(d.lowPrice  ?? "0"),
      volume:    parseFloat(d.volume    ?? "0"),
    };
  } catch {
    return null;
  }
}

// All-symbol prices endpoint — fetches ALL pairs from MEXC in a single bulk request
router.get("/market/prices", async (req, res) => {
  try {
    const r = await fetch(`${MEXC_BASE}/ticker/24hr`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) {
      req.log.error({ status: r.status }, "MEXC bulk ticker failed");
      res.status(502).json({ error: `MEXC returned ${r.status}` });
      return;
    }
    const allTickers = await r.json() as Array<{
      symbol: string;
      lastPrice: string;
      highPrice: string;
      lowPrice: string;
      volume: string;
      priceChangePercent: string;
    }>;
    const out: Record<string, TickerStats> = {};
    for (const t of allTickers) {
      const price = parseFloat(t.lastPrice ?? "0");
      if (!price) continue;
      out[t.symbol] = {
        price,
        change24h: parseFloat(t.priceChangePercent ?? "0"),
        high24h:   parseFloat(t.highPrice ?? "0"),
        low24h:    parseFloat(t.lowPrice  ?? "0"),
        volume:    parseFloat(t.volume    ?? "0"),
      };
    }
    req.log.info({ count: Object.keys(out).length }, "bulk ticker fetched");
    res.json(out);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch prices");
    res.status(502).json({ error: "Failed to fetch prices" });
  }
});

export default router;
