// Shell (host) — Multi-Zones + canlı dashboard API'leri.
const RECIPES_URL = process.env.RECIPES_URL || "http://localhost:3001";
const STORE_URL = process.env.STORE_URL || "http://localhost:3002";
const SOCIAL_URL = process.env.SOCIAL_URL || "http://localhost:3003";

/** @type {import('next').NextConfig} */
export default {
  transpilePackages: ["@makeup/ui"],
  env: {
    STORE_API: process.env.STORE_API || "http://localhost:8084",
    POST_API: process.env.POST_API || "http://localhost:8085",
    MESSAGING_API: process.env.MESSAGING_API || "http://localhost:8086",
    REELS_API: process.env.REELS_API || "http://localhost:8087",
    PURCHASE_API: process.env.PURCHASE_API || "http://localhost:8088",
  },
  async rewrites() {
    return [
      { source: "/recipes", destination: `${RECIPES_URL}/recipes` },
      { source: "/recipes/:path*", destination: `${RECIPES_URL}/recipes/:path*` },
      { source: "/store", destination: `${STORE_URL}/store` },
      { source: "/store/:path*", destination: `${STORE_URL}/store/:path*` },
      { source: "/social", destination: `${SOCIAL_URL}/social` },
      { source: "/social/:path*", destination: `${SOCIAL_URL}/social/:path*` },
    ];
  },
};
