import LegalScreen from "@/components/LegalScreen";

export default function Disclaimer() {
  return (
    <LegalScreen
      title="Disclaimer"
      badge="Important"
      badgeColor="#f59e0b"
      sections={[
        {
          heading: "Not Financial Advice",
          body: "Trade Mock Pro is NOT a financial advisor, broker, or investment platform. All content within the app is provided for educational and simulation purposes only.",
        },
        {
          heading: "No Real Money",
          body: "All trading activity within Trade Mock Pro uses virtual/simulated funds only. No real money is deposited, invested, or at risk at any time.",
        },
        {
          heading: "Trading Risk Warning",
          body: "Real cryptocurrency trading involves substantial risk of loss. Past performance of simulated trades does not guarantee or predict future results in real markets.",
        },
        {
          heading: "No Liability",
          body: "Trade Mock Pro and its developers are not responsible for any financial decisions made by users based on experience gained from this app. We are not liable for any profit or loss incurred in real trading.",
        },
        {
          heading: "Market Data",
          body: "Live price data is sourced from third-party providers (Binance API). While we strive for accuracy, we do not guarantee the completeness, timeliness, or accuracy of market data shown in the app.",
        },
        {
          heading: "Educational Purpose Only",
          body: "This app is designed purely as a learning and simulation tool to help users understand how crypto trading works — without the risk of losing real money.",
        },
        {
          heading: "Seek Professional Advice",
          body: "Before making any real investment decisions, please consult a qualified financial advisor. Never invest more than you can afford to lose.",
        },
      ]}
    />
  );
}
