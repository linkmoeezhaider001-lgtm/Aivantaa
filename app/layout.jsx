import "./globals.css";
import Chatbot from "../components/Chatbot";
import { Toaster } from "react-hot-toast";

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
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#18181b",
              color: "#f4f4f5",
              border: "1px solid rgba(34, 211, 238, 0.25)",
            },
          }}
        />
      </body>
    </html>
  );
}
