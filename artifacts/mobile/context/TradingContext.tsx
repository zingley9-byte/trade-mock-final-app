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
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export type MarketType = "crypto";

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
  { id: "BTCUSDT",   name: "Bitcoin",           label: "BTC/USDT",   type: "crypto" },
  { id: "ETHUSDT",   name: "Ethereum",           label: "ETH/USDT",   type: "crypto" },
  { id: "BNBUSDT",   name: "BNB",               label: "BNB/USDT",   type: "crypto" },
  { id: "SOLUSDT",   name: "Solana",             label: "SOL/USDT",   type: "crypto" },
  { id: "XRPUSDT",   name: "XRP",               label: "XRP/USDT",   type: "crypto" },
  { id: "DOGEUSDT",  name: "Dogecoin",           label: "DOGE/USDT",  type: "crypto" },
  { id: "ADAUSDT",   name: "Cardano",            label: "ADA/USDT",   type: "crypto" },
  { id: "AVAXUSDT",  name: "Avalanche",          label: "AVAX/USDT",  type: "crypto" },
  { id: "TRXUSDT",   name: "TRON",               label: "TRX/USDT",   type: "crypto" },
  { id: "LINKUSDT",  name: "Chainlink",          label: "LINK/USDT",  type: "crypto" },
  { id: "DOTUSDT",   name: "Polkadot",           label: "DOT/USDT",   type: "crypto" },
  { id: "MATICUSDT", name: "Polygon",            label: "MATIC/USDT", type: "crypto" },
  { id: "SHIBUSDT",  name: "Shiba Inu",          label: "SHIB/USDT",  type: "crypto" },
  { id: "LTCUSDT",   name: "Litecoin",           label: "LTC/USDT",   type: "crypto" },
  { id: "UNIUSDT",   name: "Uniswap",            label: "UNI/USDT",   type: "crypto" },
  { id: "ATOMUSDT",  name: "Cosmos",             label: "ATOM/USDT",  type: "crypto" },
  { id: "XLMUSDT",   name: "Stellar",            label: "XLM/USDT",   type: "crypto" },
  { id: "NEARUSDT",  name: "NEAR Protocol",      label: "NEAR/USDT",  type: "crypto" },
  { id: "ICPUSDT",   name: "Internet Computer",  label: "ICP/USDT",   type: "crypto" },
  { id: "APTUSDT",   name: "Aptos",              label: "APT/USDT",   type: "crypto" },
  { id: "OPUSDT",    name: "Optimism",           label: "OP/USDT",    type: "crypto" },
  { id: "ARBUSDT",   name: "Arbitrum",           label: "ARB/USDT",   type: "crypto" },
  { id: "SUIUSDT",   name: "Sui",               label: "SUI/USDT",   type: "crypto" },
  { id: "INJUSDT",   name: "Injective",          label: "INJ/USDT",   type: "crypto" },
  { id: "PEPEUSDT",  name: "Pepe",              label: "PEPE/USDT",  type: "crypto" },
  { id: "LDOUSDT",   name: "Lido DAO",           label: "LDO/USDT",   type: "crypto" },
  { id: "FILUSDT",   name: "Filecoin",           label: "FIL/USDT",   type: "crypto" },
  { id: "HBARUSDT",  name: "Hedera",             label: "HBAR/USDT",  type: "crypto" },
  { id: "AAVEUSDT",  name: "Aave",              label: "AAVE/USDT",  type: "crypto" },
  { id: "MKRUSDT",   name: "Maker",             label: "MKR/USDT",   type: "crypto" },
  { id: "STXUSDT",   name: "Stacks",            label: "STX/USDT",   type: "crypto" },
  { id: "GRTUSDT",   name: "The Graph",          label: "GRT/USDT",   type: "crypto" },
  { id: "SANDUSDT",  name: "The Sandbox",        label: "SAND/USDT",  type: "crypto" },
  { id: "MANAUSDT",  name: "Decentraland",       label: "MANA/USDT",  type: "crypto" },
  { id: "AXSUSDT",   name: "Axie Infinity",      label: "AXS/USDT",   type: "crypto" },
  { id: "FTMUSDT",   name: "Fantom",             label: "FTM/USDT",   type: "crypto" },
  { id: "CAKEUSDT",  name: "PancakeSwap",        label: "CAKE/USDT",  type: "crypto" },
  { id: "RUNEUSDT",  name: "THORChain",          label: "RUNE/USDT",  type: "crypto" },
  { id: "ALGOUSDT",  name: "Algorand",           label: "ALGO/USDT",  type: "crypto" },
  { id: "VETUSDT",   name: "VeChain",            label: "VET/USDT",   type: "crypto" },
  { id: "FLOWUSDT",  name: "Flow",              label: "FLOW/USDT",  type: "crypto" },
  { id: "ARUSDT",    name: "Arweave",            label: "AR/USDT",    type: "crypto" },
  { id: "IMXUSDT",   name: "Immutable",          label: "IMX/USDT",   type: "crypto" },
  { id: "GALAUSDT",  name: "Gala",              label: "GALA/USDT",  type: "crypto" },
  { id: "APEUSDT",   name: "ApeCoin",            label: "APE/USDT",   type: "crypto" },
  { id: "GMXUSDT",   name: "GMX",               label: "GMX/USDT",   type: "crypto" },
  { id: "DYDXUSDT",  name: "dYdX",              label: "DYDX/USDT",  type: "crypto" },
  { id: "QNTUSDT",   name: "Quant",             label: "QNT/USDT",   type: "crypto" },
  { id: "RNDRUSDT",  name: "Render",            label: "RNDR/USDT",  type: "crypto" },
  { id: "TIAUSDT",   name: "Celestia",           label: "TIA/USDT",   type: "crypto" },
  { id: "SEIUSDT",   name: "Sei",               label: "SEI/USDT",   type: "crypto" },
  { id: "WLDUSDT",   name: "Worldcoin",          label: "WLD/USDT",   type: "crypto" },
  { id: "FETUSDT",   name: "Fetch.ai",           label: "FET/USDT",   type: "crypto" },
  { id: "AGIXUSDT",  name: "SingularityNET",     label: "AGIX/USDT",  type: "crypto" },
  { id: "CFXUSDT",   name: "Conflux",            label: "CFX/USDT",   type: "crypto" },
  { id: "TONUSDT",   name: "Toncoin",            label: "TON/USDT",   type: "crypto" },
  { id: "JUPUSDT",   name: "Jupiter",            label: "JUP/USDT",   type: "crypto" },
  { id: "WIFUSDT",   name: "dogwifhat",          label: "WIF/USDT",   type: "crypto" },
  { id: "BONKUSDT",  name: "Bonk",              label: "BONK/USDT",  type: "crypto" },
  { id: "FLOKIUSDT", name: "Floki",             label: "FLOKI/USDT", type: "crypto" },
  { id: "SNXUSDT",   name: "Synthetix",          label: "SNX/USDT",   type: "crypto" },
  { id: "CRVUSDT",   name: "Curve",             label: "CRV/USDT",   type: "crypto" },
  { id: "COMPUSDT",  name: "Compound",           label: "COMP/USDT",  type: "crypto" },
  { id: "YFIUSDT",   name: "yearn.finance",      label: "YFI/USDT",   type: "crypto" },
  { id: "SUSHIUSDT", name: "SushiSwap",          label: "SUSHI/USDT", type: "crypto" },
  { id: "1INCHUSDT", name: "1inch",             label: "1INCH/USDT", type: "crypto" },
  { id: "BATUSDT",   name: "Basic Attention Token", label: "BAT/USDT", type: "crypto" },
  { id: "ENJUSDT",   name: "Enjin Coin",         label: "ENJ/USDT",   type: "crypto" },
  { id: "CHZUSDT",   name: "Chiliz",             label: "CHZ/USDT",   type: "crypto" },
  { id: "XTZUSDT",   name: "Tezos",             label: "XTZ/USDT",   type: "crypto" },
  { id: "ZECUSDT",   name: "Zcash",             label: "ZEC/USDT",   type: "crypto" },
  { id: "EOSUSDT",   name: "EOS",               label: "EOS/USDT",   type: "crypto" },
  { id: "OCEANUSDT", name: "Ocean Protocol",     label: "OCEAN/USDT", type: "crypto" },
  { id: "ROSEUSDT",  name: "Oasis Network",      label: "ROSE/USDT",  type: "crypto" },
  { id: "KSMUSDT",   name: "Kusama",             label: "KSM/USDT",   type: "crypto" },
  { id: "ANKRUSDT",  name: "Ankr",              label: "ANKR/USDT",  type: "crypto" },
  { id: "ZRXUSDT",   name: "0x Protocol",        label: "ZRX/USDT",   type: "crypto" },
  { id: "IOTAUSDT",  name: "IOTA",              label: "IOTA/USDT",  type: "crypto" },
  { id: "ZILUSDT",   name: "Zilliqa",            label: "ZIL/USDT",   type: "crypto" },
  { id: "EGLDUSDT",  name: "MultiversX",         label: "EGLD/USDT",  type: "crypto" },
  { id: "ONEUSDT",   name: "Harmony",            label: "ONE/USDT",   type: "crypto" },
  { id: "KAVAUSDT",  name: "Kava",              label: "KAVA/USDT",  type: "crypto" },
  { id: "THETAUSDT", name: "Theta Network",      label: "THETA/USDT", type: "crypto" },
  { id: "NEOUSDT",   name: "Neo",               label: "NEO/USDT",   type: "crypto" },
  { id: "ONTUSDT",   name: "Ontology",           label: "ONT/USDT",   type: "crypto" },
  { id: "HOTUSDT",   name: "Holo",              label: "HOT/USDT",   type: "crypto" },
  { id: "ICXUSDT",   name: "ICON",              label: "ICX/USDT",   type: "crypto" },
  { id: "BANDUSDT",  name: "Band Protocol",      label: "BAND/USDT",  type: "crypto" },
  { id: "WAVESUSDT", name: "Waves",             label: "WAVES/USDT", type: "crypto" },
  { id: "DASHUSDT",  name: "Dash",              label: "DASH/USDT",  type: "crypto" },
  { id: "LRCUSDT",   name: "Loopring",           label: "LRC/USDT",   type: "crypto" },
  { id: "SKLUSDT",   name: "SKALE",             label: "SKL/USDT",   type: "crypto" },
  { id: "STORJUSDT", name: "Storj",             label: "STORJ/USDT", type: "crypto" },
  { id: "CELOUSDT",  name: "Celo",              label: "CELO/USDT",  type: "crypto" },
  { id: "OMGUSDT",   name: "OMG Network",        label: "OMG/USDT",   type: "crypto" },
  { id: "ALPHAUSDT", name: "Alpha Finance",      label: "ALPHA/USDT", type: "crypto" },
  { id: "SFPUSDT",   name: "SafePal",            label: "SFP/USDT",   type: "crypto" },
  { id: "CTSIUSDT",  name: "Cartesi",            label: "CTSI/USDT",  type: "crypto" },
  { id: "REEFUSDT",  name: "Reef",              label: "REEF/USDT",  type: "crypto" },
  { id: "TLMUSDT",   name: "Alien Worlds",       label: "TLM/USDT",   type: "crypto" },
  { id: "XECUSDT",   name: "eCash",             label: "XEC/USDT",   type: "crypto" },
];

export const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "1D"];
export const LEVERAGES = [1, 5, 10, 25, 50, 80, 100];

const INITIAL_BALANCE = 50000;
const STORAGE_KEY = "trademock_state_v4";

const LEGACY_KEYS = [
  "demoBalance",
  "initialBalance",
  "portfolioValue",
  "tradeMockPortfolio",
  "portfolioState",
];

interface TradingContextType {
  balance: number;
  positions: Position[];
  tradeHistory: TradeHistory[];
  selectedSymbol: MarketSymbol;
  currentPrice: number;
  symbolPrices: Record<string, number>;
  symbolChanges: Record<string, number>;
  candles: Candle[];
  timeframe: Timeframe;
  theme: "dark" | "light";
  chartType: "candle" | "line" | "area";
  leverage: number;
  isConnected: boolean;
  dataSource: "binance" | "mexc";
  priceChange24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketFilter: "crypto";
  currencyMode: "usd" | "inr";
  setSelectedSymbol: (s: MarketSymbol) => void;
  setTimeframe: (t: Timeframe) => void;
  setTheme: (t: "dark" | "light") => void;
  setChartType: (t: "candle" | "line" | "area") => void;
  setLeverage: (l: number) => void;
  setMarketFilter: (f: "crypto") => void;
  setCurrencyMode: (m: "usd" | "inr") => void;
  usdToInr: number;
  tradeFlash: { side: "buy" | "sell"; symbol: string; entryPrice: number; leverage: number; quantity: number; positionId: string } | null;
  openPosition: (params: {
    side: "buy" | "sell";
    quantity: number;
    stopLoss?: number;
    takeProfit?: number;
    entryPrice?: number;
  }) => { success: boolean; message: string };
  closePosition: (positionId: string) => void;
  modifyPosition: (positionId: string, stopLoss?: number, takeProfit?: number) => void;
  updateLivePrice: (price: number) => void;
  getRunningPnL: () => number;
  getTotalPortfolioValue: () => number;
  resetAccount: () => { allowed: boolean; message: string };
  addAdminBonus: (amount: number) => void;
  refreshPrices: () => Promise<void>;
  isChartFullscreen: boolean;
  setIsChartFullscreen: (v: boolean) => void;
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

function calcPnL(pos: Position, price: number): number {
  if (!price || price <= 0) return 0;
  const entry = parseFloat(String(pos.entryPrice));
  const qty   = parseFloat(String(pos.quantity));
  if (!entry || !qty) return 0;
  const priceDiff = pos.side === "buy" ? price - entry : entry - price;
  return priceDiff * qty;
}

/** Returns the live price for a position's symbol, with fallback to currentPrice for the selected symbol. Returns 0 if unknown. */
function getPosPrice(
  pos: Position,
  symbolPrices: Record<string, number>,
  currentPrice: number,
  selectedSymbolId: string
): number {
  const p = symbolPrices[pos.symbol.id];
  if (p && p > 0) return p;
  if (pos.symbol.id === selectedSymbolId && currentPrice > 0) return currentPrice;
  return 0;
}

const BINANCE_WS = "wss://stream.binance.com:9443/ws";
const API_BASE = "/api";
// MEXC-compatible intervals (same as Binance, except 1h→60m handled by backend)
const TIMEFRAME_MAP: Record<Timeframe, string> = {
  "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1h", "1D": "1d",
};


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
  const [chartType, setChartType] = useState<"candle" | "line" | "area">("candle");
  const [leverage, setLeverage] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [dataSource, setDataSource] = useState<"binance" | "mexc">("mexc");
  const [priceChange24h, setPriceChange24h] = useState(0);
  const [high24h, setHigh24h] = useState(0);
  const [low24h, setLow24h] = useState(0);
  const [volume24h, setVolume24h] = useState(0);
  const [marketFilter, setMarketFilterState] = useState<"crypto">("crypto");
  const [currencyMode, setCurrencyModeState] = useState<"usd" | "inr">("usd");
  const [tradeFlash, setTradeFlash] = useState<{ side: "buy" | "sell"; symbol: string; entryPrice: number; leverage: number; quantity: number; positionId: string } | null>(null);
  const [usdToInr] = useState(95);
  const [symbolPrices, setSymbolPrices] = useState<Record<string, number>>({});
  const [symbolChanges, setSymbolChanges] = useState<Record<string, number>>({});
  const [resetTimestamps, setResetTimestamps] = useState<number[]>([]);
  const [isChartFullscreen, setIsChartFullscreen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const fetchAllPricesRef = useRef<(() => Promise<void>) | null>(null);

  const lastSymbolRef       = useRef<string>("");
  // always reflects the current selectedSymbol.id so interval callbacks can sync priceChange24h
  const selectedSymbolIdRef = useRef<string>(SYMBOLS[0].id);

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

    // Aliases for coins that were rebranded or have different symbols on MEXC
    const SYMBOL_ALIASES: Record<string, string> = {
      MATICUSDT: "POLUSDT", // Polygon rebranded to POL
    };

    function resolve(id: string, map: Record<string, { price: number; change24h: number; high24h?: number; low24h?: number; volume?: number }>) {
      return map[id] ?? map[SYMBOL_ALIASES[id] ?? ""];
    }

    async function fetchAllPrices() {
      try {
        const res = await fetch(`${API_BASE}/market/prices`);
        const map: Record<string, { price: number; change24h: number; high24h?: number; low24h?: number; volume?: number }> = await res.json();
        setSymbolPrices((prev) => {
          const next = { ...prev };
          for (const id of CRYPTO_IDS) {
            const entry = resolve(id, map);
            if (entry?.price > 0) next[id] = entry.price;
          }
          return next;
        });
        setSymbolChanges((prev) => {
          const next = { ...prev };
          for (const id of CRYPTO_IDS) {
            const entry = resolve(id, map);
            if (entry !== undefined) next[id] = entry.change24h;
          }
          return next;
        });
        const selId = selectedSymbolIdRef.current;
        const selEntry = resolve(selId, map);
        if (selEntry !== undefined) {
          setPriceChange24h(selEntry.change24h);
          if (selEntry.high24h) setHigh24h(selEntry.high24h!);
          if (selEntry.low24h)  setLow24h(selEntry.low24h!);
          if (selEntry.volume)  setVolume24h(selEntry.volume!);
        }
      } catch {}
    }
    fetchAllPricesRef.current = fetchAllPrices;
    fetchAllPrices();
    const interval = setInterval(fetchAllPrices, 5000);
    return () => clearInterval(interval);
  }, []);

  const refreshPrices = useCallback(async () => {
    await fetchAllPricesRef.current?.();
  }, []);

  async function loadState() {
    try {
      // Remove stale keys from old demo versions (browser localStorage leftovers)
      for (const key of LEGACY_KEYS) {
        await AsyncStorage.removeItem(key).catch(() => {});
      }

      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);

        // Migrate: clamp any old demo balance (1,000,000) back to 50,000
        let loadedBalance: number | undefined = saved.balance;
        if (loadedBalance !== undefined && loadedBalance >= 1_000_000) {
          loadedBalance = INITIAL_BALANCE;
        }

        if (loadedBalance !== undefined) setBalance(loadedBalance);
        if (saved.positions) setPositions(saved.positions);
        if (saved.tradeHistory) setTradeHistory(saved.tradeHistory);
        if (saved.theme) { setTheme(saved.theme); Appearance.setColorScheme(saved.theme); }
        if (saved.leverage) setLeverage(saved.leverage);
        if (saved.marketFilter) setMarketFilterState(saved.marketFilter);
        if (saved.currencyMode) setCurrencyModeState(saved.currencyMode);
        if (Array.isArray(saved.resetTimestamps)) setResetTimestamps(saved.resetTimestamps);

        // Persist the corrected balance immediately so next load is clean
        if (saved.balance !== undefined && saved.balance >= 1_000_000) {
          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...saved, balance: INITIAL_BALANCE })
          ).catch(() => {});
        }
      }
    } catch {}
  }

  async function saveState(
    newBalance: number,
    newPositions: Position[],
    newHistory: TradeHistory[],
    newTheme: "dark" | "light",
    newLeverage: number,
    newMarketFilter?: "crypto",
    newCurrencyMode?: "usd" | "inr",
    newResetTimestamps?: number[]
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
          resetTimestamps: newResetTimestamps ?? resetTimestamps,
        })
      );
    } catch {}
  }

  const fetchCandles = useCallback(
    async (symbol: MarketSymbol, tf: Timeframe) => {
      const binInterval = TIMEFRAME_MAP[tf];

      // Use backend proxy only — MEXC-backed, Binance-compatible array format
      console.log("Using proxy klines API");
      try {
        const res  = await fetch(`${API_BASE}/market/klines?symbol=${symbol.id}&interval=${binInterval}&limit=101`);
        const data = await res.json();

        // Binance-compatible format: [[timeMs, o, h, l, c, v], ...]
        if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
          const parsed: Candle[] = data.map((k: unknown[]) => ({
            time:   (k[0] as number),
            open:   parseFloat(k[1] as string),
            high:   parseFloat(k[2] as string),
            low:    parseFloat(k[3] as string),
            close:  parseFloat(k[4] as string),
            volume: parseFloat(k[5] as string),
          })).sort((a, b) => a.time - b.time);
          console.log("Candles received count:", parsed.length);
          setCandles(parsed);
          if (parsed.length > 0) setCurrentPrice(parsed[parsed.length - 1].close);
        }
      } catch {}
    },
    []
  );

  const fetch24hStats = useCallback(async (symbol: MarketSymbol) => {
    try {
      const res = await fetch(`${API_BASE}/market/ticker24hr?symbol=${symbol.id}`);
      const data = await res.json();
      if (data && data.priceChangePercent) {
        const pct = parseFloat(data.priceChangePercent);
        setPriceChange24h(pct);
        setHigh24h(parseFloat(data.highPrice));
        setLow24h(parseFloat(data.lowPrice));
        setVolume24h(parseFloat(data.volume));
        setSymbolChanges((prev) => ({ ...prev, [symbol.id]: pct }));
      }
    } catch {}
  }, []);

  const connectWebSocket = useCallback(
    (symbol: MarketSymbol) => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      let pollInterval: ReturnType<typeof setInterval> | null = null;
      let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
      let reconnectDelay = 2000;
      // Use object so onclose closure always reads the latest value
      const state = { stopped: false };

      function startPolling(symbolId: string) {
        if (pollInterval) return;
        setIsConnected(false);
        setDataSource("mexc");
        pollInterval = setInterval(async () => {
          try {
            const res = await fetch(`${API_BASE}/market/ticker24hr?symbol=${symbolId}`);
            if (!res.ok) return;
            const d = await res.json() as Record<string, string>;
            const price = parseFloat(d.lastPrice ?? "0");
            if (price > 0) {
              setCurrentPrice(price);
              const pct = parseFloat(d.priceChangePercent ?? "0");
              setPriceChange24h(pct);
              setSymbolChanges((prev) => ({ ...prev, [symbolId]: pct }));
              const h = parseFloat(d.highPrice ?? "0");
              const l = parseFloat(d.lowPrice  ?? "0");
              const v = parseFloat(d.volume     ?? "0");
              if (h > 0) setHigh24h(h);
              if (l > 0) setLow24h(l);
              if (v > 0) setVolume24h(v);
              setCandles((prev) => {
                if (prev.length === 0) return prev;
                const last = { ...prev[prev.length - 1] };
                last.close = price;
                last.high  = Math.max(last.high, price);
                last.low   = Math.min(last.low,  price);
                return [...prev.slice(0, -1), last];
              });
            }
          } catch {}
        }, 5000);
      }

      function connect() {
        if (state.stopped) return;

        // Binance individual symbol ticker stream:
        // c = last price, P = 24h change %, h = 24h high, l = 24h low, v = base volume
        const stream = `${symbol.id.toLowerCase()}@ticker`;
        const ws = new WebSocket(`${BINANCE_WS}/${stream}`);
        wsRef.current = ws;
        let wsConnected = false;

        const wsTimeout = setTimeout(() => {
          if (!wsConnected && !state.stopped) startPolling(symbol.id);
        }, 5000);

        ws.onopen = () => {
          wsConnected = true;
          reconnectDelay = 2000;
          clearTimeout(wsTimeout);
          if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
          setIsConnected(true);
          setDataSource("binance");
        };

        ws.onclose = () => {
          clearTimeout(wsTimeout);
          setIsConnected(false);
          setDataSource("mexc");
          if (!state.stopped) {
            startPolling(symbol.id);
            reconnectTimeout = setTimeout(() => {
              if (state.stopped) return;
              if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
              connect();
            }, reconnectDelay);
            reconnectDelay = Math.min(reconnectDelay * 2, 30000);
          }
        };

        ws.onerror = () => {
          setIsConnected(false);
          setDataSource("mexc");
          if (!state.stopped) startPolling(symbol.id);
        };

        ws.onmessage = (evt) => {
          try {
            const msg = JSON.parse(evt.data as string) as Record<string, string>;
            const price = parseFloat(msg.c ?? "0");
            if (price > 0) {
              setCurrentPrice(price);
              setCandles((prev) => {
                if (prev.length === 0) return prev;
                const last = { ...prev[prev.length - 1] };
                last.close = price;
                last.high  = Math.max(last.high, price);
                last.low   = Math.min(last.low,  price);
                return [...prev.slice(0, -1), last];
              });
            }
            if (msg.P !== undefined) {
              const pct = parseFloat(msg.P);
              setPriceChange24h(pct);
              setSymbolChanges((prev) => ({ ...prev, [symbol.id]: pct }));
            }
            if (msg.h) setHigh24h(parseFloat(msg.h));
            if (msg.l) setLow24h(parseFloat(msg.l));
            if (msg.v) setVolume24h(parseFloat(msg.v));
          } catch {}
        };
      }

      connect();

      return () => {
        state.stopped = true;
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        if (pollInterval) clearInterval(pollInterval);
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
      // Stop reconnect logic BEFORE closing so onclose doesn't trigger a new attempt
      if (cleanup) cleanup();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [selectedSymbol]);

  useEffect(() => {
    fetchCandles(selectedSymbol, timeframe);
  }, [timeframe]);

  const setSelectedSymbol = useCallback((s: MarketSymbol) => {
    lastSymbolRef.current = "";
    selectedSymbolIdRef.current = s.id;
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
        return { success: false, message: "Price not loaded yet — please wait a moment" };
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

      setTradeFlash({ side: params.side, symbol: selectedSymbol.label, entryPrice: usePrice, leverage, quantity: params.quantity, positionId: newPos.id });
      setTimeout(() => setTradeFlash(null), 4000);

      return { success: true, message: "Position opened" };
    },
    [currentPrice, balance, leverage, selectedSymbol, tradeHistory, theme, usdToInr]
  );

  const closePosition = useCallback(
    (positionId: string) => {
      const pos = positions.find((p) => p.id === positionId);
      if (!pos) return;

      const exitPrice = getPosPrice(pos, symbolPrices, currentPrice, selectedSymbol.id) || pos.entryPrice;
      const pnlRaw   = calcPnL(pos, exitPrice);
      const clampedPnl = Math.max(-pos.margin, pnlRaw);
      const exitValue  = pos.margin + clampedPnl;
      const pnlPct     = (clampedPnl / pos.margin) * 100;

      const histEntry: TradeHistory = {
        id: positionId,
        symbol: pos.symbol,
        side: pos.side,
        entryPrice: pos.entryPrice,
        exitPrice,
        quantity: pos.quantity,
        leverage: pos.leverage,
        pnl: clampedPnl,
        pnlPct,
        openedAt: pos.openedAt,
        closedAt: Date.now(),
        margin: pos.margin,
      };

      // Persist trade to Firestore so admin can view history
      try {
        const uid = getFirebaseAuth().currentUser?.uid;
        if (uid) {
          const db = getFirebaseDb();
          setDoc(doc(db, "users", uid, "trades", histEntry.id), {
            id: histEntry.id,
            symbolId:    histEntry.symbol.id,
            symbolLabel: histEntry.symbol.label,
            symbolName:  histEntry.symbol.name,
            side:        histEntry.side,
            entryPrice:  histEntry.entryPrice,
            exitPrice:   histEntry.exitPrice,
            quantity:    histEntry.quantity,
            leverage:    histEntry.leverage,
            pnl:         histEntry.pnl,
            pnlPct:      histEntry.pnlPct,
            openedAt:    histEntry.openedAt,
            closedAt:    histEntry.closedAt,
            margin:      histEntry.margin,
          }).catch(() => {});
        }
      } catch {}

      const updatedPositions = positions.filter((p) => p.id !== positionId);
      const newHistory = [histEntry, ...tradeHistory];

      setPositions(updatedPositions);
      setTradeHistory(newHistory);
      setBalance((b) => {
        const newB = b + exitValue;
        saveState(newB, updatedPositions, newHistory, theme, leverage);
        return newB;
      });
    },
    [positions, currentPrice, symbolPrices, selectedSymbol, tradeHistory, theme, leverage]
  );

  const modifyPosition = useCallback(
    (positionId: string, stopLoss?: number, takeProfit?: number) => {
      setPositions((prev) => {
        const updated = prev.map((p) =>
          p.id === positionId ? { ...p, stopLoss, takeProfit } : p
        );
        saveState(balance, updated, tradeHistory, theme, leverage);
        return updated;
      });
    },
    [balance, tradeHistory, theme, leverage]
  );

  const getRunningPnL = useCallback((): number => {
    return positions.reduce((sum, pos) => {
      const price = getPosPrice(pos, symbolPrices, currentPrice, selectedSymbol.id);
      if (!price) return sum;
      const pnlRaw = calcPnL(pos, price);
      const clampedPnl = Math.max(-pos.margin, pnlRaw);
      return sum + clampedPnl;
    }, 0);
  }, [positions, currentPrice, symbolPrices, selectedSymbol.id]);

  const getTotalPortfolioValue = useCallback((): number => {
    const marginUsed = positions.reduce((s, p) => s + parseFloat(String(p.margin)), 0);
    const runningPnL = getRunningPnL();
    const raw = parseFloat(String(balance)) + marginUsed + runningPnL;
    // Safety clamp: portfolio can't go below 0 or above 100× initial
    return Math.max(0, Math.min(raw, INITIAL_BALANCE * 100));
  }, [balance, positions, getRunningPnL]);

  const resetAccount = useCallback((): { allowed: boolean; message: string } => {
    const newTimestamps = [...resetTimestamps, Date.now()];
    setResetTimestamps(newTimestamps);
    setBalance(INITIAL_BALANCE);
    setPositions([]);
    setTradeHistory([]);
    setLeverage(1);
    // Clear any lingering legacy keys so old cached balances can't come back
    for (const key of LEGACY_KEYS) {
      AsyncStorage.removeItem(key).catch(() => {});
    }
    saveState(INITIAL_BALANCE, [], [], theme, 1, marketFilter, currencyMode, newTimestamps);
    return { allowed: true, message: "Account reset successfully." };
  }, [resetTimestamps, theme, marketFilter, currencyMode]);

  const addAdminBonus = useCallback((amount: number) => {
    setBalance((prev) => {
      const updated = prev + amount;
      saveState(updated, positions, tradeHistory, theme, leverage, marketFilter, currencyMode, resetTimestamps);
      return updated;
    });
  }, [positions, tradeHistory, theme, leverage, marketFilter, currencyMode, resetTimestamps]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (positions.length === 0) return;
      positions.forEach((pos) => {
        const posPrice = getPosPrice(pos, symbolPrices, currentPrice, selectedSymbol.id);
        if (!posPrice || posPrice <= 0) return;
        const isLiquidated =
          pos.side === "buy"
            ? posPrice <= pos.liquidationPrice
            : posPrice >= pos.liquidationPrice;
        const isSLHit =
          pos.stopLoss !== undefined &&
          (pos.side === "buy"
            ? posPrice <= pos.stopLoss
            : posPrice >= pos.stopLoss);
        const isTPHit =
          pos.takeProfit !== undefined &&
          (pos.side === "buy"
            ? posPrice >= pos.takeProfit
            : posPrice <= pos.takeProfit);
        if (isLiquidated || isSLHit || isTPHit) {
          closePosition(pos.id);
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [positions, currentPrice, symbolPrices, selectedSymbol.id, closePosition]);

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
    (_f: "crypto") => {
      saveState(balance, positions, tradeHistory, theme, leverage, "crypto", currencyMode);
    },
    [balance, positions, tradeHistory, theme, leverage, currencyMode]
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
        symbolChanges,
        candles,
        timeframe,
        theme,
        chartType,
        leverage,
        isConnected,
        dataSource,
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
        usdToInr,
        tradeFlash,
        openPosition,
        closePosition,
        modifyPosition,
        updateLivePrice: setCurrentPrice,
        getRunningPnL,
        getTotalPortfolioValue,
        resetAccount,
        addAdminBonus,
        refreshPrices,
        isChartFullscreen,
        setIsChartFullscreen,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}
