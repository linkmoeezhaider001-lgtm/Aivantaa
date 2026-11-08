import "./globals.css";
import Chatbot from "../components/Chatbot";

export const metadata = {
  title: "Aivanta Agency | Revenue, Rebooted",
  description: "Autonomous AI operators for dormant CRM revenue.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Chatbot />
      </body>
    </html>
  );
}
