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

export default router;
