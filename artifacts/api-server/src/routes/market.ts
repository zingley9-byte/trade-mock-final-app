import { Router } from "express";

const router = Router();

// MEXC has a Binance-compatible klines API and is accessible from Replit servers.
// Response format is identical: [[openTime, open, high, low, close, volume, ...], ...]
const MEXC_BASE    = "https://api.mexc.com/api/v3";
const BINANCE_BASE = "https://api.binance.com/api/v3";  // kept for ticker/price routes

// Map app interval strings to MEXC interval format
// MEXC intervals: 1m, 5m, 15m, 30m, 60m, 4h, 1d, 1W, 1M
function toMexcInterval(interval: string): string {
  const map: Record<string, string> = {
    "1m":"1m",  "3m":"3m",  "5m":"5m",   "15m":"15m", "30m":"30m",
    "1h":"60m", "2h":"2h",  "4h":"4h",
    "1d":"1d",  "1D":"1d",  "1w":"1W",   "1W":"1W",
  };
  return map[interval] ?? interval;
}

const COINGECKO_IDS: Record<string, string> = {
  BTCUSDT: "bitcoin",
  ETHUSDT: "ethereum",
  BNBUSDT: "binancecoin",
  DOGEUSDT: "dogecoin",
  SOLUSDT: "solana",
};

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

router.get("/market/ticker24hr", async (req, res) => {
  const { symbol } = req.query;
  try {
    const response = await fetch(
      `${BINANCE_BASE}/ticker/24hr?symbol=${symbol}`
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch ticker");
    res.status(502).json({ error: "Failed to fetch ticker data" });
  }
});

router.get("/market/price", async (req, res) => {
  const { symbol } = req.query;
  try {
    const response = await fetch(
      `${BINANCE_BASE}/ticker/price?symbol=${symbol}`
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch price");
    res.status(502).json({ error: "Failed to fetch price" });
  }
});

router.get("/market/prices", async (req, res) => {
  const symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "DOGEUSDT", "SOLUSDT"];
  try {
    const [priceRes, statsRes] = await Promise.all([
      fetch(`${BINANCE_BASE}/ticker/price?symbols=${encodeURIComponent(JSON.stringify(symbols))}`),
      fetch(`${BINANCE_BASE}/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`),
    ]);

    const priceData = await priceRes.json() as Array<{ symbol: string; price: string }>;
    const statsData = await statsRes.json() as Array<{ symbol: string; priceChangePercent: string }>;

    const changeMap: Record<string, number> = {};
    if (Array.isArray(statsData)) {
      for (const item of statsData) changeMap[item.symbol] = parseFloat(item.priceChangePercent);
    }

    const result: Record<string, { price: number; change24h: number }> = {};
    if (Array.isArray(priceData)) {
      for (const item of priceData) {
        result[item.symbol] = {
          price: parseFloat(item.price),
          change24h: changeMap[item.symbol] ?? 0,
        };
      }
    }
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch prices");
    res.status(502).json({ error: "Failed to fetch prices" });
  }
});

export default router;
