import React, { useMemo } from "react";
import {
  Dimensions,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from "react-native";
import Svg, {
  Line,
  Rect,
  Path,
  Text as SvgText,
} from "react-native-svg";
import { Candle } from "@/context/TradingContext";

interface Props {
  candles: Candle[];
  width?: number;
  height?: number;
  chartType?: "candle" | "line";
  bullColor?: string;
  bearColor?: string;
  textColor?: string;
  gridColor?: string;
  bgColor?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PRICE_LABEL_WIDTH = 70;

function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(0);
  if (price >= 10) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

export default function CandlestickChart({
  candles,
  width,
  height = 260,
  chartType = "candle",
  bullColor = "#00c896",
  bearColor = "#ff4d4d",
  textColor = "#64748b",
  gridColor = "rgba(100,116,139,0.15)",
  bgColor = "transparent",
}: Props) {
  const chartWidth = width ?? SCREEN_WIDTH;
  const plotWidth = chartWidth - PRICE_LABEL_WIDTH;

  const { minPrice, maxPrice, priceRange, displayCandles } = useMemo(() => {
    if (candles.length === 0)
      return { minPrice: 0, maxPrice: 0, priceRange: 0, displayCandles: [] };
    const maxVisible = Math.floor(plotWidth / 8);
    const display = candles.slice(-maxVisible);
    const lows = display.map((c) => c.low);
    const highs = display.map((c) => c.high);
    const mn = Math.min(...lows);
    const mx = Math.max(...highs);
    const pad = (mx - mn) * 0.06;
    return {
      minPrice: mn - pad,
      maxPrice: mx + pad,
      priceRange: mx - mn + 2 * pad,
      displayCandles: display,
    };
  }, [candles, plotWidth]);

  const padding = { top: 16, bottom: 32, left: 0, right: PRICE_LABEL_WIDTH };
  const chartH = height - padding.top - padding.bottom;

  function toY(price: number): number {
    if (priceRange === 0) return chartH / 2;
    return padding.top + ((maxPrice - price) / priceRange) * chartH;
  }

  const candleW = Math.max(3, Math.floor(plotWidth / displayCandles.length) - 1);
  const candleSpacing = plotWidth / displayCandles.length;

  const gridLines = useMemo(() => {
    if (priceRange === 0) return [];
    const count = 5;
    const step = priceRange / count;
    return Array.from({ length: count + 1 }, (_, i) => {
      const price = minPrice + step * i;
      return { price, y: toY(price) };
    });
  }, [minPrice, priceRange, chartH]);

  if (candles.length === 0) {
    return (
      <View style={[styles.empty, { width: chartWidth, height }]}>
        <Text style={[styles.emptyText, { color: textColor }]}>
          Loading chart...
        </Text>
      </View>
    );
  }

  if (chartType === "line") {
    const linePath = displayCandles
      .map((c, i) => {
        const x = padding.left + (i + 0.5) * candleSpacing;
        const y = toY(c.close);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");

    const areaPath =
      linePath +
      ` L${padding.left + (displayCandles.length - 0.5) * candleSpacing},${height - padding.bottom} L${padding.left + 0.5 * candleSpacing},${height - padding.bottom} Z`;

    return (
      <View style={{ width: chartWidth, height }}>
        <Svg width={chartWidth} height={height} style={{ backgroundColor: bgColor }}>
          {gridLines.map((gl, i) => (
            <React.Fragment key={i}>
              <Line
                x1={padding.left}
                y1={gl.y}
                x2={chartWidth - PRICE_LABEL_WIDTH}
                y2={gl.y}
                stroke={gridColor}
                strokeWidth={1}
              />
              <SvgText
                x={chartWidth - PRICE_LABEL_WIDTH + 4}
                y={gl.y + 4}
                fontSize={9}
                fill={textColor}
              >
                {formatPrice(gl.price)}
              </SvgText>
            </React.Fragment>
          ))}
          <Path
            d={areaPath}
            fill={`${bullColor}22`}
            strokeWidth={0}
          />
          <Path
            d={linePath}
            fill="none"
            stroke={bullColor}
            strokeWidth={2}
          />
        </Svg>
      </View>
    );
  }

  return (
    <View style={{ width: chartWidth, height }}>
      <Svg width={chartWidth} height={height} style={{ backgroundColor: bgColor }}>
        {gridLines.map((gl, i) => (
          <React.Fragment key={i}>
            <Line
              x1={padding.left}
              y1={gl.y}
              x2={chartWidth - PRICE_LABEL_WIDTH}
              y2={gl.y}
              stroke={gridColor}
              strokeWidth={1}
            />
            <SvgText
              x={chartWidth - PRICE_LABEL_WIDTH + 4}
              y={gl.y + 4}
              fontSize={9}
              fill={textColor}
            >
              {formatPrice(gl.price)}
            </SvgText>
          </React.Fragment>
        ))}
        {displayCandles.map((candle, i) => {
          const x = padding.left + (i + 0.5) * candleSpacing;
          const isBull = candle.close >= candle.open;
          const color = isBull ? bullColor : bearColor;
          const bodyTop = toY(Math.max(candle.open, candle.close));
          const bodyBot = toY(Math.min(candle.open, candle.close));
          const bodyH = Math.max(1, bodyBot - bodyTop);
          const wickTop = toY(candle.high);
          const wickBot = toY(candle.low);
          return (
            <React.Fragment key={i}>
              <Line
                x1={x}
                y1={wickTop}
                x2={x}
                y2={bodyTop}
                stroke={color}
                strokeWidth={1}
              />
              <Line
                x1={x}
                y1={bodyBot}
                x2={x}
                y2={wickBot}
                stroke={color}
                strokeWidth={1}
              />
              <Rect
                x={x - candleW / 2}
                y={bodyTop}
                width={candleW}
                height={bodyH}
                fill={isBull ? color : "none"}
                stroke={color}
                strokeWidth={isBull ? 0 : 1}
              />
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
  },
});
