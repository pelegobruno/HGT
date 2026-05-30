import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EloVital Família',
  description: 'Acompanhe a saúde de quem você ama.',
  manifest: '/manifest-familiar.json',
  icons: {
    apple: '/icon-familiar-180.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'EloVital Família',
  },
};

export default function FamiliarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}