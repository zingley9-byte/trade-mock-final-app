import { Router } from "express";

const router = Router();

const BINANCE_BASE = "https://api.binance.com/api/v3";

function binanceHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (process.env.BINANCE_API_KEY) {
    headers["X-MBX-APIKEY"] = process.env.BINANCE_API_KEY;
  }
  return headers;
}

router.get("/market/klines", async (req, res) => {
  const { symbol, interval, limit } = req.query;
  try {
    const response = await fetch(
      `${BINANCE_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit ?? 120}`,
      { headers: binanceHeaders() }
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
      `${BINANCE_BASE}/ticker/24hr?symbol=${symbol}`,
      { headers: binanceHeaders() }
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
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
    );
    const data: Record<string, { usd: number; usd_24h_change?: number }> = await response.json();
    const result: Record<string, { price: number; change24h: number }> = {};
    for (const [symbolId, geckoId] of Object.entries(COINGECKO_IDS)) {
      if (data[geckoId]?.usd) {
        result[symbolId] = {
          price: data[geckoId].usd,
          change24h: data[geckoId].usd_24h_change ?? 0,
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
