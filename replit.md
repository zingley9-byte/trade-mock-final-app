# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Trade Mock (Mobile App)
- **Type**: Expo React Native
- **Path**: `artifacts/mobile/`
- **Preview**: `/` (root)
- **Package**: `@workspace/mobile`

#### Features (Phases 1-6 implemented)
- Candlestick + Line chart with SVG rendering (react-native-svg)
- Symbols: BTC/USDT, ETH/USDT, BNB/USDT, DOGE/USDT, SOL/USDT (Crypto) + NIFTY50, SENSEX, BANKNIFTY, BANKEX (Indian — simulated)
- Timeframes: 1m, 5m, 15m, 30m, 1h, 1D
- Real-time WebSocket price updates from Binance
- Buy/Sell order panel with market execution
- Leverage: x1, x5, x10, x25, x50, x80, x100
- Stop Loss / Take Profit
- Auto-liquidation at leverage threshold
- P&L tracking (running + realized)
- Balance system (₹1,00,000 starting)
- Portfolio screen with stats
- Trade history with win/loss filtering
- Dark/Light theme toggle
- Data persisted via AsyncStorage

#### Key Files
- `context/TradingContext.tsx` — Global state, market data, position management
- `components/CandlestickChart.tsx` — SVG chart renderer
- `components/SymbolSelector.tsx` — Market/symbol picker modal
- `components/OrderPanel.tsx` — Buy/Sell UI with positions
- `app/(tabs)/index.tsx` — Main trading screen
- `app/(tabs)/portfolio.tsx` — Portfolio & P&L screen
- `app/(tabs)/history.tsx` — Trade history screen

### API Server
- **Type**: Express 5
- **Path**: `artifacts/api-server/`
- **Preview**: `/api`
- **Package**: `@workspace/api-server`
- **Routes**: `/api/healthz`, `/api/market/klines`, `/api/market/ticker24hr` (Binance proxy)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
