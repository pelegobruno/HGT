import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EloVital",
  description: "Acompanhamento de Saúde",
  icons: {
    icon: "/icon-familiar.png",
    apple: "/icon-familiar-180.png",
  },
  manifest: "/manifest-familiar.json",
};

export default function FamiliarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}