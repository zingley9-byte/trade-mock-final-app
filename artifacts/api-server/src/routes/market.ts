import { Router } from "express";

const router = Router();

const BINANCE_BASE = "https://api.binance.com/api/v3";

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

const COINGECKO_IDS: Record<string, string> = {
  BTCUSDT: "bitcoin",
  ETHUSDT: "ethereum",
  BNBUSDT: "binancecoin",
  DOGEUSDT: "dogecoin",
  SOLUSDT: "solana",
};

router.get("/market/prices", async (req, res) => {
  try {
    const ids = Object.values(COINGECKO_IDS).join(",");
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
    );
    const data: Record<string, { usd: number }> = await response.json();
    const map: Record<string, number> = {};
    for (const [symbolId, geckoId] of Object.entries(COINGECKO_IDS)) {
      if (data[geckoId]?.usd) map[symbolId] = data[geckoId].usd;
    }
    res.json(map);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch prices");
    res.status(502).json({ error: "Failed to fetch prices" });
  }
});

export default router;
