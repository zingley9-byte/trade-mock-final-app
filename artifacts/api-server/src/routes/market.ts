import { Router } from "express";

const router = Router();

const BINANCE_BASE = "https://data-api.binance.vision/api/v3";

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
    const [priceRes, geckoRes] = await Promise.all([
      fetch(`${BINANCE_BASE}/ticker/price?symbols=${encodeURIComponent(JSON.stringify(symbols))}`),
      fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${Object.values(COINGECKO_IDS).join(",")}&vs_currencies=usd&include_24hr_change=true`
      ),
    ]);

    const priceData: Array<{ symbol: string; price: string }> = await priceRes.json();
    const geckoData: Record<string, { usd: number; usd_24h_change?: number }> = await geckoRes.json();

    const priceMap: Record<string, number> = {};
    if (Array.isArray(priceData)) {
      for (const item of priceData) priceMap[item.symbol] = parseFloat(item.price);
    }

    const result: Record<string, { price: number; change24h: number }> = {};
    for (const [symbolId, geckoId] of Object.entries(COINGECKO_IDS)) {
      const price = priceMap[symbolId] || geckoData[geckoId]?.usd || 0;
      result[symbolId] = {
        price,
        change24h: geckoData[geckoId]?.usd_24h_change ?? 0,
      };
    }
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch prices");
    res.status(502).json({ error: "Failed to fetch prices" });
  }
});

export default router;
