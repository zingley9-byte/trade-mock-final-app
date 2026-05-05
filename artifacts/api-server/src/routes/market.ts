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
  try {
    const response = await fetch(
      `${BINANCE_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit ?? 120}`
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch klines");
    res.status(502).json({ error: "Failed to fetch market data" });
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
