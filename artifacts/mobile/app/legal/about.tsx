import LegalScreen from "@/components/LegalScreen";

export default function AboutUs() {
  return (
    <LegalScreen
      title="About Trade Mock"
      badge="About"
      badgeColor="#00c896"
      sections={[
        {
          body: "Trade Mock is a cryptocurrency trading simulation and analysis app designed for anyone who wants to learn trading without the risk of losing real money.",
        },
        {
          heading: "Our Mission",
          body: "Our goal is to make crypto trading education accessible, simple, and fast. We believe everyone deserves the chance to practice and build confidence before entering real markets.",
        },
        {
          heading: "What We Offer",
          body: "",
          items: [
            "Live market data from 100+ crypto coins",
            "Real-time TradingView-style charts",
            "Mock trading with ₹10,00,000 virtual balance",
            "Long & Short positions with leverage",
            "Stop Loss & Take Profit automation",
            "Complete trade history & P&L tracking",
            "Dark & Light theme support",
          ],
        },
        {
          heading: "Technology",
          body: "Trade Mock is built with React Native (Expo), powered by Firebase for authentication and data storage, and Binance API for live market prices.",
        },
        {
          heading: "Version",
          body: "Trade Mock v1.0.0\nBuilt with ❤️ for traders worldwide.",
        },
        {
          heading: "Contact",
          body: "📧 Zingley9@gmail.com",
        },
      ]}
    />
  );
}
