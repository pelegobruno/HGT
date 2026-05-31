import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EloVital",
  description: "Monitoramento de Sinais Vitais",
  icons: {
    icon: "/icon.png",
    apple: "/icon-180.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}