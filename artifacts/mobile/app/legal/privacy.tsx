import LegalScreen from "@/components/LegalScreen";

export default function PrivacyPolicy() {
  return (
    <LegalScreen
      title="Privacy Policy"
      badge="Privacy"
      badgeColor="#3b82f6"
      sections={[
        {
          body: 'Trade Mock ("we", "our", "us") respects your privacy and is committed to protecting your personal information.',
        },
        {
          heading: "Information We Collect",
          body: "",
          items: [
            "Email address (for login and account management)",
            "Device information (IP address, device type, OS version)",
            "Usage data (app activity, features used, trade history)",
          ],
        },
        {
          heading: "How We Use Information",
          body: "",
          items: [
            "To provide and improve our services",
            "To manage user accounts and authentication",
            "To communicate important updates with users",
          ],
        },
        {
          heading: "Third-Party Services",
          body: "We use third-party services such as Firebase (authentication & database) and Google AdMob (for ads). These services may collect data as per their own privacy policies.",
        },
        {
          heading: "Data Sharing",
          body: "We do not sell your personal data to any third party. Your data is used solely to operate and improve Trade Mock.",
        },
        {
          heading: "Security",
          body: "We use industry-standard security practices including encrypted connections and Firebase security rules to protect your data.",
        },
        {
          heading: "User Rights",
          body: "You can request deletion of your account and associated data at any time by contacting us at the email below.",
        },
        {
          heading: "Contact Us",
          body: "For privacy-related queries, email us at: Zingley9@gmail.com",
        },
      ]}
    />
  );
}
