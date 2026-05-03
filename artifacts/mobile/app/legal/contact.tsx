import LegalScreen from "@/components/LegalScreen";

export default function ContactUs() {
  return (
    <LegalScreen
      title="Contact Us"
      badge="Support"
      badgeColor="#8b5cf6"
      sections={[
        {
          body: "We would love to hear from you! Whether you have a question, feedback, bug report, or feature request — feel free to reach out.",
        },
        {
          heading: "Email Support",
          body: "📧 Zingley9@gmail.com\n\nWe typically respond within 24–48 hours on business days.",
        },
        {
          heading: "Bug Reports",
          body: "Found a bug? Please describe the issue in detail — what happened, what you expected, and your device/OS version. This helps us fix it faster.",
        },
        {
          heading: "Feature Requests",
          body: "Have an idea for a new feature? We actively review all suggestions and prioritize the most-requested ones in future updates.",
        },
        {
          heading: "Response Time",
          body: "Our team is small but dedicated. We aim to reply to all queries within 1–2 business days.",
        },
      ]}
    />
  );
}
