import LegalScreen from "@/components/LegalScreen";

export default function TermsConditions() {
  return (
    <LegalScreen
      title="Terms & Conditions"
      badge="Legal"
      badgeColor="#10b981"
      sections={[
        {
          body: "By downloading or using Trade Mock Pro, you agree to be bound by the following terms and conditions. Please read them carefully before using the app.",
        },
        {
          heading: "Acceptance of Terms",
          body: "",
          items: [
            "You will use the app for lawful purposes only.",
            "You will not attempt to hack, reverse-engineer, or misuse the app.",
            "We are not responsible for any financial loss resulting from trading decisions.",
            "The app is for educational and informational purposes only.",
          ],
        },
        {
          heading: "Account Responsibility",
          body: "Users are fully responsible for maintaining the security of their account credentials. Do not share your password with anyone. Trade Mock Pro will never ask for your password.",
        },
        {
          heading: "Virtual Funds",
          body: "The ₹10,00,000 starting balance and all trades within Trade Mock Pro use virtual funds only. No real money is involved at any point. Profits or losses are simulated and have no real-world monetary value.",
        },
        {
          heading: "Changes to the App",
          body: "We reserve the right to update, modify, or discontinue features of the app at any time without prior notice. We will try our best to communicate significant changes.",
        },
        {
          heading: "Termination",
          body: "We reserve the right to suspend or terminate accounts that violate these terms or engage in abusive behavior on the platform.",
        },
        {
          heading: "Governing Law",
          body: "These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of Indian courts.",
        },
        {
          heading: "Contact",
          body: "For questions about these terms, contact us at: Zingley9@gmail.com",
        },
      ]}
    />
  );
}
