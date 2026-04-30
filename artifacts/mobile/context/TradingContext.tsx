import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Appearance } from "react-native";

export type MarketType = "crypto" | "indian";

export interface MarketSymbol {
  id: string;
  name: string;
  label: string;
  type: MarketType;
  exchange?: string;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "1D";

export interface Position {
  id: string;
  symbol: MarketSymbol;
  side: "buy" | "sell";
  entryPrice: number;
  quantity: number;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
  openedAt: number;
  margin: number;
  liquidationPrice: number;
}

export interface TradeHistory {
  id: string;
  symbol: MarketSymbol;
  side: "buy" | "sell";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  leverage: number;
  pnl: number;
  pnlPct: number;
  openedAt: number;
  closedAt: number;
  margin: number;
}

export const SYMBOLS: MarketSymbol[] = [
  { id: "BTCUSDT", name: "Bitcoin", label: "BTC/USDT", type: "crypto" },
  { id: "ETHUSDT", name: "Ethereum", label: "ETH/USDT", type: "crypto" },
  { id: "BNBUSDT", name: "BNB", label: "BNB/USDT", type: "crypto" },
  { id: "DOGEUSDT", name: "Dogecoin", label: "DOGE/USDT", type: "crypto" },
  { id: "SOLUSDT", name: "Solana", label: "SOL/USDT", type: "crypto" },
  { id: "NIFTY50", name: "Nifty 50", label: "NIFTY50", type: "indian" },
  { id: "SENSEX", name: "BSE Sensex", label: "SENSEX", type: "indian" },
  { id: "BANKNIFTY", name: "Bank Nifty", label: "BANKNIFTY", type: "indian" },
  { id: "BANKEX", name: "Bank Ex", label: "BANKEX", type: "indian" },
];

export const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "1D"];
export const LEVERAGES = [1, 5, 10, 25, 50, 80, 100];

const INITIAL_BALANCE = 1000000;
const STORAGE_KEY = "trademock_state_v3";

interface TradingContextType {
  balance: number;
  positions: Position[];
  tradeHistory: TradeHistory[];
  selectedSymbol: MarketSymbol;
  currentPrice: number;
  symbolPrices: Record<string, number>;
  candles: Candle[];
  timeframe: Timeframe;
  theme: "dark" | "light";
  chartType: "candle" | "line";
  leverage: number;
  isConnected: boolean;
  priceChange24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketFilter: "crypto" | "indian";
  currencyMode: "usd" | "inr";
  setSelectedSymbol: (s: MarketSymbol) => void;
  setTimeframe: (t: Timeframe) => void;
  setTheme: (t: "dark" | "light") => void;
  setChartType: (t: "candle" | "line") => void;
  setLeverage: (l: number) => void;
  setMarketFilter: (f: "crypto" | "indian") => void;
  setCurrencyMode: (m: "usd" | "inr") => void;
  openPosition: (params: {
    side: "buy" | "sell";
    quantity: number;
    stopLoss?: number;
    takeProfit?: number;
    entryPrice?: number;
  }) => { success: boolean; message: string };
  closePosition: (positionId: string) => void;
  getRunningPnL: () => number;
  getTotalPortfolioValue: () => number;
  resetAccount: () => void;
}

const TradingContext = createContext<TradingContextType | null>(null);

export function useTradingContext() {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error("useTradingContext must be inside TradingProvider");
  return ctx;
}

function calcLiquidationPrice(
  side: "buy" | "sell",
  entryPrice: number,
  leverage: number
): number {
  const liquidationPct = 1 / leverage;
  if (side === "buy") {
    return entryPrice * (1 - liquidationPct);
  } else {
    return entryPrice * (1 + liquidationPct);
  }
}

function calcPnL(pos: Position, currentPrice: number): number {
  const priceDiff =
    pos.side === "buy"
      ? currentPrice - pos.entryPrice
      : pos.entryPrice - currentPrice;
  return priceDiff * pos.quantity * pos.leverage;
}

const BINANCE_BASE = "https://api.binance.com/api/v3";
const API_BASE = "/api";
const BINANCE_WS = "wss://stream.binance.com:9443/ws";

const TIMEFRAME_MAP: Record<Timeframe, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "1h": "1h",
  "1D": "1d",
};

const INDIAN_BASE_PRICES: Record<string, number> = {
  NIFTY50: 24200,
  SENSEX: 79500,
  BANKNIFTY: 51800,
  BANKEX: 57000,
};

function generateIndianCandles(
  symbolId: string,
  count: number = 120
): Candle[] {
  const base = INDIAN_BASE_PRICES[symbolId] ?? 20000;
  const candles: Candle[] = [];
  let price = base * (0.97 + Math.random() * 0.06);
  const now = Date.now();
  for (let i = count; i >= 0; i--) {
    const open = price;
    const change = (Math.random() - 0.48) * base * 0.003;
    const close = Math.max(open + change, base * 0.5);
    const high = Math.max(open, close) + Math.random() * base * 0.002;
    const low = Math.min(open, close) - Math.random() * base * 0.002;
    const volume = 100000 + Math.random() * 500000;
    candles.push({ time: now - i * 60000, open, high, low, close, volume });
    price = close;
  }
  return candles;
}

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [positions, setPositions] = useState<Position[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [selectedSymbol, setSelectedSymbolState] = useState<MarketSymbol>(
    SYMBOLS[0]
  );
  const [currentPrice, setCurrentPrice] = useState(0);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [timeframe, setTimeframeState] = useState<Timeframe>("15m");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [chartType, setChartType] = useState<"candle" | "line">("candle");
  const [leverage, setLeverage] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [priceChange24h, setPriceChange24h] = useState(0);
  const [high24h, setHigh24h] = useState(0);
  const [low24h, setLow24h] = useState(0);
  const [volume24h, setVolume24h] = useState(0);
  const [marketFilter, setMarketFilterState] = useState<"crypto" | "indian">("crypto");
  const [currencyMode, setCurrencyModeState] = useState<"usd" | "inr">("usd");
  const [symbolPrices, setSymbolPrices] = useState<Record<string, number>>(() => ({
    ...INDIAN_BASE_PRICES,
  }));

  const wsRef = useRef<WebSocket | null>(null);
  const lastSymbolRef = useRef<string>("");

  useEffect(() => {
    loadState();
  }, []);

  useEffect(() => {
    if (currentPrice > 0) {
      setSymbolPrices((prev) => ({ ...prev, [selectedSymbol.id]: currentPrice }));
    }
  }, [currentPrice, selectedSymbol.id]);

  useEffect(() => {
    const CRYPTO_IDS = SYMBOLS.filter((s) => s.type === "crypto").map((s) => s.id);
    async function fetchAllPrices() {
      try {
        const res = await fetch(`${API_BASE}/market/prices`);
        const map: Record<string, number> = await res.json();
        setSymbolPrices((prev) => {
          const next = { ...prev };
          for (const id of CRYPTO_IDS) {
            if (map[id] && map[id] > 0) next[id] = map[id];
          }
          return next;
        });
      } catch {}
    }
    fetchAllPrices();
    const interval = setInterval(fetchAllPrices, 15000);
    return () => clearInterval(interval);
  }, []);

  async function loadState() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.balance !== undefined) setBalance(saved.balance);
        if (saved.positions) setPositions(saved.positions);
        if (saved.tradeHistory) setTradeHistory(saved.tradeHistory);
        if (saved.theme) { setTheme(saved.theme); Appearance.setColorScheme(saved.theme); }
        if (saved.leverage) setLeverage(saved.leverage);
        if (saved.marketFilter) setMarketFilterState(saved.marketFilter);
        if (saved.currencyMode) setCurrencyModeState(saved.currencyMode);
      }
    } catch {}
  }

  async function saveState(
    newBalance: number,
    newPositions: Position[],
    newHistory: TradeHistory[],
    newTheme: "dark" | "light",
    newLeverage: number,
    newMarketFilter?: "crypto" | "indian",
    newCurrencyMode?: "usd" | "inr"
  ) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          balance: newBalance,
          positions: newPositions,
          tradeHistory: newHistory,
          theme: newTheme,
          leverage: newLeverage,
          marketFilter: newMarketFilter,
          currencyMode: newCurrencyMode,
        })
      );
    } catch {}
  }

  const fetchCandles = useCallback(
    async (symbol: MarketSymbol, tf: Timeframe) => {
      if (symbol.type === "indian") {
        const generated = generateIndianCandles(symbol.id, 120);
        setCandles(generated);
        if (generated.length > 0) {
          const last = generated[generated.length - 1];
          setCurrentPrice(last.close);
          const first = generated[0];
          setPriceChange24h(
            ((last.close - first.open) / first.open) * 100
          );
          const highs = generated.map((c) => c.high);
          const lows = generated.map((c) => c.low);
          setHigh24h(Math.max(...highs));
          setLow24h(Math.min(...lows));
          setVolume24h(generated.reduce((s, c) => s + c.volume, 0));
        }
        return;
      }
      try {
        const interval = TIMEFRAME_MAP[tf];
        const res = await fetch(
          `${API_BASE}/market/klines?symbol=${symbol.id}&interval=${interval}&limit=120`
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          const parsed: Candle[] = data.map((k: unknown[]) => ({
            time: k[0] as number,
            open: parseFloat(k[1] as string),
            high: parseFloat(k[2] as string),
            low: parseFloat(k[3] as string),
            close: parseFloat(k[4] as string),
            volume: parseFloat(k[5] as string),
          }));
          setCandles(parsed);
          if (parsed.length > 0) {
            setCurrentPrice(parsed[parsed.length - 1].close);
          }
        }
      } catch {}
    },
    []
  );

  const fetch24hStats = useCallback(async (symbol: MarketSymbol) => {
    if (symbol.type === "indian") return;
    try {
      const res = await fetch(
        `${API_BASE}/market/ticker24hr?symbol=${symbol.id}`
      );
      const data = await res.json();
      if (data && data.priceChangePercent) {
        setPriceChange24h(parseFloat(data.priceChangePercent));
        setHigh24h(parseFloat(data.highPrice));
        setLow24h(parseFloat(data.lowPrice));
        setVolume24h(parseFloat(data.volume));
      }
    } catch {}
  }, []);

  const connectWebSocket = useCallback(
    (symbol: MarketSymbol) => {
      if (symbol.type === "indian") {
        setIsConnected(false);
        const interval = setInterval(() => {
          setCurrentPrice((prev) => {
            if (prev === 0) return INDIAN_BASE_PRICES[symbol.id] ?? 20000;
            const delta = prev * (Math.random() - 0.498) * 0.001;
            return prev + delta;
          });
          setCandles((prev) => {
            if (prev.length === 0) return prev;
            const last = { ...prev[prev.length - 1] };
            const now = Date.now();
            const delta = last.close * (Math.random() - 0.498) * 0.001;
            last.close = last.close + delta;
            last.high = Math.max(last.high, last.close);
            last.low = Math.min(last.low, last.close);
            last.time = now;
            return [...prev.slice(0, -1), last];
          });
        }, 1000);
        return () => clearInterval(interval);
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      const stream = `${symbol.id.toLowerCase()}@kline_1m`;
      const ws = new WebSocket(`${BINANCE_WS}/${stream}`);
      wsRef.current = ws;

      ws.onopen = () => setIsConnected(true);
      ws.onclose = () => setIsConnected(false);
      ws.onerror = () => setIsConnected(false);

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.k) {
            const k = msg.k;
            const price = parseFloat(k.c);
            setCurrentPrice(price);
            setCandles((prev) => {
              if (prev.length === 0) return prev;
              const last = prev[prev.length - 1];
              const newCandle: Candle = {
                time: k.t,
                open: parseFloat(k.o),
                high: parseFloat(k.h),
                low: parseFloat(k.l),
                close: price,
                volume: parseFloat(k.v),
              };
              if (k.t === last.time) {
                return [...prev.slice(0, -1), newCandle];
              } else {
                return [...prev, newCandle];
              }
            });
          }
        } catch {}
      };
    },
    []
  );

  useEffect(() => {
    if (lastSymbolRef.current === selectedSymbol.id) return;
    lastSymbolRef.current = selectedSymbol.id;
    setCandles([]);
    setCurrentPrice(0);
    fetchCandles(selectedSymbol, timeframe);
    fetch24hStats(selectedSymbol);
    const cleanup = connectWebSocket(selectedSymbol);
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (cleanup) cleanup();
    };
  }, [selectedSymbol]);

  useEffect(() => {
    fetchCandles(selectedSymbol, timeframe);
  }, [timeframe]);

  const setSelectedSymbol = useCallback((s: MarketSymbol) => {
    lastSymbolRef.current = "";
    setSelectedSymbolState(s);
  }, []);

  const setTimeframe = useCallback((t: Timeframe) => {
    setTimeframeState(t);
  }, []);

  const openPosition = useCallback(
    (params: {
      side: "buy" | "sell";
      quantity: number;
      stopLoss?: number;
      takeProfit?: number;
      entryPrice?: number;
    }): { success: boolean; message: string } => {
      if (currentPrice === 0)
        return { success: false, message: "Price not loaded" };
      if (params.quantity <= 0)
        return { success: false, message: "Invalid quantity" };

      const usePrice = params.entryPrice ?? currentPrice;
      if (usePrice <= 0)
        return { success: false, message: "Invalid entry price" };

      const margin = (usePrice * params.quantity) / leverage;
      if (margin > balance)
        return { success: false, message: "Insufficient balance" };

      const liqPrice = calcLiquidationPrice(params.side, usePrice, leverage);
      const newPos: Position = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
        symbol: selectedSymbol,
        side: params.side,
        entryPrice: usePrice,
        quantity: params.quantity,
        leverage,
        stopLoss: params.stopLoss,
        takeProfit: params.takeProfit,
        openedAt: Date.now(),
        margin,
        liquidationPrice: liqPrice,
      };

      setPositions((prev) => {
        const updated = [...prev, newPos];
        setBalance((b) => {
          const newB = b - margin;
          saveState(newB, updated, tradeHistory, theme, leverage);
          return newB;
        });
        return updated;
      });

      return { success: true, message: "Position opened" };
    },
    [currentPrice, balance, leverage, selectedSymbol, tradeHistory, theme]
  );

  const closePosition = useCallback(
    (positionId: string) => {
      setPositions((prev) => {
        const pos = prev.find((p) => p.id === positionId);
        if (!pos) return prev;

        const pnl = calcPnL(pos, currentPrice);
        const exitValue = pos.margin + pnl;
        const pnlPct = (pnl / pos.margin) * 100;

        const histEntry: TradeHistory = {
          id: positionId,
          symbol: pos.symbol,
          side: pos.side,
          entryPrice: pos.entryPrice,
          exitPrice: currentPrice,
          quantity: pos.quantity,
          leverage: pos.leverage,
          pnl,
          pnlPct,
          openedAt: pos.openedAt,
          closedAt: Date.now(),
          margin: pos.margin,
        };

        const updated = prev.filter((p) => p.id !== positionId);
        const newHistory = [histEntry, ...tradeHistory];

        setTradeHistory(newHistory);
        setBalance((b) => {
          const newB = b + exitValue;
          saveState(newB, updated, newHistory, theme, leverage);
          return newB;
        });

        return updated;
      });
    },
    [currentPrice, tradeHistory, theme, leverage]
  );

  const getRunningPnL = useCallback((): number => {
    return positions.reduce((sum, pos) => sum + calcPnL(pos, currentPrice), 0);
  }, [positions, currentPrice]);

  const getTotalPortfolioValue = useCallback((): number => {
    const marginUsed = positions.reduce((s, p) => s + p.margin, 0);
    return balance + marginUsed + getRunningPnL();
  }, [balance, positions, getRunningPnL]);

  const resetAccount = useCallback(async () => {
    setBalance(INITIAL_BALANCE);
    setPositions([]);
    setTradeHistory([]);
    setLeverage(1);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (positions.length === 0 || currentPrice === 0) return;
      positions.forEach((pos) => {
        const pnl = calcPnL(pos, currentPrice);
        const isLiquidated =
          pos.side === "buy"
            ? currentPrice <= pos.liquidationPrice
            : currentPrice >= pos.liquidationPrice;
        const isSLHit =
          pos.stopLoss !== undefined &&
          (pos.side === "buy"
            ? currentPrice <= pos.stopLoss
            : currentPrice >= pos.stopLoss);
        const isTPHit =
          pos.takeProfit !== undefined &&
          (pos.side === "buy"
            ? currentPrice >= pos.takeProfit
            : currentPrice <= pos.takeProfit);
        if (isLiquidated || isSLHit || isTPHit) {
          closePosition(pos.id);
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [positions, currentPrice, closePosition]);

  const handleSetTheme = useCallback(
    (t: "dark" | "light") => {
      setTheme(t);
      Appearance.setColorScheme(t);
      saveState(balance, positions, tradeHistory, t, leverage);
    },
    [balance, positions, tradeHistory, leverage]
  );

  const handleSetLeverage = useCallback(
    (l: number) => {
      setLeverage(l);
      saveState(balance, positions, tradeHistory, theme, l, marketFilter, currencyMode);
    },
    [balance, positions, tradeHistory, theme, marketFilter, currencyMode]
  );

  const setMarketFilter = useCallback(
    (f: "crypto" | "indian") => {
      setMarketFilterState(f);
      const firstOfType = SYMBOLS.find((s) => s.type === f);
      if (firstOfType) {
        setSelectedSymbol(firstOfType);
      }
      saveState(balance, positions, tradeHistory, theme, leverage, f, currencyMode);
    },
    [balance, positions, tradeHistory, theme, leverage, currencyMode, setSelectedSymbol]
  );

  const setCurrencyMode = useCallback(
    (m: "usd" | "inr") => {
      setCurrencyModeState(m);
      saveState(balance, positions, tradeHistory, theme, leverage, marketFilter, m);
    },
    [balance, positions, tradeHistory, theme, leverage, marketFilter]
  );

  return (
    <TradingContext.Provider
      value={{
        balance,
        positions,
        tradeHistory,
        selectedSymbol,
        currentPrice,
        symbolPrices,
        candles,
        timeframe,
        theme,
        chartType,
        leverage,
        isConnected,
        priceChange24h,
        high24h,
        low24h,
        volume24h,
        marketFilter,
        currencyMode,
        setSelectedSymbol,
        setTimeframe,
        setTheme: handleSetTheme,
        setChartType,
        setLeverage: handleSetLeverage,
        setMarketFilter,
        setCurrencyMode,
        openPosition,
        closePosition,
        getRunningPnL,
        getTotalPortfolioValue,
        resetAccount,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}
