import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true, 
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: false, 
  workboxOptions: {
    disableDevLogs: true,
  }
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Esta é a linha mágica que acalma a Vercel e o Turbopack:
  turbopack: {},
};

export default withPWA(nextConfig);