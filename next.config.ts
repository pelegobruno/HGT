import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true, 
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: false, // Mantém o motor offline ativo em produção
  workboxOptions: {
    disableDevLogs: true,
  }
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Esta linha força a Vercel a aceitar as configurações de cache offline:
  webpack: (config) => {
    return config;
  },
};

export default withPWA(nextConfig);