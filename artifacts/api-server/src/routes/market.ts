import { Router } from "express";

const router = Router();

const BINANCE_BASE = "https://api.binance.com/api/v3";

const COINGECKO_IDS: Record<string, string> = {
  BTCUSDT: "bitcoin",
  ETHUSDT: "ethereum",
  BNBUSDT: "binancecoin",
  DOGEUSDT: "dogecoin",
  SOLUSDT: "solana",
};

router.get("/market/klines", async (req, res) => {
  const { symbol, interval, limit } = req.query;
  const binanceUrl = `${BINANCE_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit ?? 120}`;
  req.log.info({ symbol, interval, limit }, "klines request received");
  console.log("[API] klines request received — symbol:", symbol, "interval:", interval, "limit:", limit);
  try {
    const response = await fetch(binanceUrl);
    console.log("[API] Binance response status:", response.status, response.statusText);
    req.log.info({ status: response.status }, "Binance klines response");
    if (!response.ok) {
      const text = await response.text();
      console.log("[API] Binance error body:", text.slice(0, 200));
      res.status(502).json({ error: `Binance returned ${response.status}: ${text.slice(0, 100)}` });
      return;
    }
    const data = await response.json() as unknown[];
    const count = Array.isArray(data) ? data.length : -1;
    console.log("[API] candles count:", count);
    req.log.info({ count }, "klines fetched successfully");
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
