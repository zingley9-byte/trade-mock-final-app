import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

const TICKER_OVERRIDES: Record<string, string> = {
  MATICUSDT:  "matic",
  "1INCHUSDT": "1inch",
  BTCUSDT:    "btc",
  ETHUSDT:    "eth",
  BNBUSDT:    "bnb",
  SOLUSDT:    "sol",
  XRPUSDT:    "xrp",
  DOGEUSDT:   "doge",
  ADAUSDT:    "ada",
  AVAXUSDT:   "avax",
  TRXUSDT:    "trx",
  LINKUSDT:   "link",
  DOTUSDT:    "dot",
  SHIBUSDT:   "shib",
  LTCUSDT:    "ltc",
  UNIUSDT:    "uni",
  ATOMUSDT:   "atom",
  XLMUSDT:    "xlm",
  NEARUSDT:   "near",
  BCHUSDT:    "bch",
  APTUSDT:    "apt",
  OPUSDT:     "op",
  ARBUSDT:    "arb",
  FILUSDT:    "fil",
  VETUSDT:    "vet",
  ICPUSDT:    "icp",
  HBARUSDT:   "hbar",
  QNTUSDT:    "qnt",
  AAVEUSDT:   "aave",
  GRTUSDT:    "grt",
  FTMUSDT:    "ftm",
  SANDUSDT:   "sand",
  MANAUSDT:   "mana",
  AXSUSDT:    "axs",
  THETAUSDT:  "theta",
  EOSUSDT:    "eos",
  XTZUSDT:    "xtz",
  FLOWUSDT:   "flow",
  STXUSDT:    "stx",
  CHZUSDT:    "chz",
  INJUSDT:    "inj",
  LDOUSDT:    "ldo",
  MKRUSDT:    "mkr",
  SNXUSDT:    "snx",
  COMPUSDT:   "comp",
  CRVUSDT:    "crv",
  APEUSDT:    "ape",
  IMXUSDT:    "imx",
  ALGOUSDT:   "algo",
  KSMUSDT:    "ksm",
  ZILUSDT:    "zil",
  DASHUSDT:   "dash",
  ZECUSDT:    "zec",
  BATUSDT:    "bat",
  ENJUSDT:    "enj",
  GALAUSDT:   "gala",
  KAVAUSDT:   "kava",
  COTIUSDT:   "coti",
  CELOUSDT:   "celo",
  HOTUSDT:    "hot",
  ONTUSDT:    "ont",
  IOTAUSDT:   "iota",
  XMRUSDT:    "xmr",
  NEOUSDT:    "neo",
  WAVESUSDT:  "waves",
  ROSOUSDT:   "roso",
  SKLUSDT:    "skl",
  ANKRUSDT:   "ankr",
  FETUSDT:    "fet",
  RVNUSDT:    "rvn",
  SUSHIUSDT:  "sushi",
  YFIUSDT:    "yfi",
  BALUSDT:    "bal",
  STORJUSDT:  "storj",
  OCEANUSDT:  "ocean",
  CVCUSDT:    "cvc",
  BANDUSDT:   "band",
  RENUSDT:    "ren",
  NMRUSDT:    "nmr",
  BLZUSDT:    "blz",
  SXPUSDT:    "sxp",
  SRMUSDT:    "srm",
  DYDXUSDT:   "dydx",
  ENJUSDT2:   "enj",
  PERPUSDT:   "perp",
  CELRUSDT:   "celr",
  ACHUSDT:    "ach",
  XVGUSDT:    "xvg",
  SUIUSDT:    "sui",
  PEPEUSDT:   "pepe",
  WLDUSDT:    "wld",
  SEIUSDT:    "sei",
  TIAUSDT:    "tia",
  ORDIUSDT:   "ordi",
  BONKUSDT:   "bonk",
  JUPUSDT:    "jup",
  WIFUSDT:    "wif",
  PYTHUSDT:   "pyth",
  STRKUSDT:   "strk",
  TURBOUSDT:  "turbo",
};

function getCoinCapTicker(symbolId: string): string {
  if (TICKER_OVERRIDES[symbolId]) return TICKER_OVERRIDES[symbolId];
  return symbolId.replace(/USDT$/, "").replace(/BUSD$/, "").toLowerCase();
}

function hashColor(ticker: string): string {
  const COLORS = [
    "#F7931A","#627EEA","#F0B90B","#9945FF","#C2A633",
    "#00FFA3","#E84142","#0033AD","#00B8D9","#FF4500",
    "#2775CA","#26A17B","#16213E","#E91E8C","#FF6B6B",
    "#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD",
  ];
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = (h * 31 + ticker.charCodeAt(i)) & 0xffff;
  return COLORS[h % COLORS.length];
}

interface Props {
  symbolId: string;
  size?: number;
}

export default function CoinLogo({ symbolId, size = 36 }: Props) {
  const [primaryError,   setPrimaryError]   = useState(false);
  const [secondaryError, setSecondaryError] = useState(false);

  const ticker  = getCoinCapTicker(symbolId);
  const primary   = `https://assets.coincap.io/assets/icons/${ticker}@2x.png`;
  const secondary = `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color/${ticker}.png`;

  const radius = size / 2;

  if (!primaryError) {
    return (
      <View style={[styles.wrap, { width: size, height: size, borderRadius: radius }]}>
        <Image
          source={{ uri: primary }}
          style={{ width: size, height: size, borderRadius: radius }}
          onError={() => setPrimaryError(true)}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (!secondaryError) {
    return (
      <View style={[styles.wrap, { width: size, height: size, borderRadius: radius }]}>
        <Image
          source={{ uri: secondary }}
          style={{ width: size, height: size, borderRadius: radius }}
          onError={() => setSecondaryError(true)}
          resizeMode="contain"
        />
      </View>
    );
  }

  const color  = hashColor(ticker);
  const initials = ticker.toUpperCase().substring(0, 2);
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: radius, backgroundColor: color }]}>
      <Text style={[styles.fallbackText, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:         { overflow: "hidden", backgroundColor: "#111" },
  fallback:     { alignItems: "center", justifyContent: "center" },
  fallbackText: { color: "#fff", fontWeight: "700" as const },
});
