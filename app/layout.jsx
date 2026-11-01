import "./globals.css";

export const metadata = {
  title: "Reactivation Engine | Revenue, Rebooted",
  description: "Autonomous AI operators for dormant CRM revenue.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
