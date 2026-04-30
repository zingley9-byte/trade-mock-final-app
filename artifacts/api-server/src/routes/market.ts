import { Router } from "express";

const router = Router();

const BINANCE_BASE = "https://api.binance.com/api/v3";
const CRYPTOCOMPARE_BASE = "https://min-api.cryptocompare.com/data/v2";

function binanceHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (process.env.BINANCE_API_KEY) {
    headers["X-MBX-APIKEY"] = process.env.BINANCE_API_KEY;
  }
  return headers;
}

const CRYPTO_SYMBOLS: Record<string, string> = {
  BTCUSDT: "BTC",
  ETHUSDT: "ETH",
  BNBUSDT: "BNB",
  DOGEUSDT: "DOGE",
  SOLUSDT: "SOL",
};

const TF_CC: Record<string, { endpoint: string; aggregate: number }> = {
  "1m":  { endpoint: "histominute", aggregate: 1 },
  "5m":  { endpoint: "histominute", aggregate: 5 },
  "15m": { endpoint: "histominute", aggregate: 15 },
  "30m": { endpoint: "histominute", aggregate: 30 },
  "1h":  { endpoint: "histohour",   aggregate: 1 },
  "1d":  { endpoint: "histoday",    aggregate: 1 },
};

interface CCCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volumefrom: number;
}

router.get("/market/klines", async (req, res) => {
  const { symbol, interval, limit } = req.query;
  const sym = String(symbol ?? "");
  const ivl = String(interval ?? "15m");
  const lim = parseInt(String(limit ?? "120"), 10);

  try {
    const response = await fetch(
      `${BINANCE_BASE}/klines?symbol=${sym}&interval=${ivl}&limit=${lim}`,
      { headers: binanceHeaders() }
    );
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return res.json(data);
    }
    throw new Error("binance_blocked");
  } catch {
    const fsym = CRYPTO_SYMBOLS[sym];
    if (!fsym) return res.status(400).json({ error: "Unknown symbol" });

    const tf = TF_CC[ivl] ?? TF_CC["15m"];
    try {
      const ccRes = await fetch(
        `${CRYPTOCOMPARE_BASE}/${tf.endpoint}?fsym=${fsym}&tsym=USD&limit=${lim}&aggregate=${tf.aggregate}`
      );
      const ccData: { Data?: { Data?: CCCandle[] } } = await ccRes.json();
      const candles = ccData?.Data?.Data ?? [];
      const klines = candles
        .filter((c) => c.open > 0)
        .map((c) => [
          c.time * 1000,
          String(c.open),
          String(c.high),
          String(c.low),
          String(c.close),
          String(c.volumefrom),
        ]);
      return res.json(klines);
    } catch (err) {
      req.log.error({ err }, "Failed to fetch klines from CryptoCompare");
      return res.status(502).json({ error: "Failed to fetch market data" });
    }
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
