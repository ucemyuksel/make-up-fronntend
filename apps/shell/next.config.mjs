// Shell (host) — dashboard API'leri. Zone'lar arası gezinme artık AppShell'de
// origin bazlı (NEXT_PUBLIC_*_URL); rewrite proxy'sine gerek yok.
/** @type {import('next').NextConfig} */
export default {
  transpilePackages: ["@makeup/ui", "@makeup/auth"],
  env: {
    // Üyelik formu buraya POST eder (/api/registration anonimdir).
    USER_API: process.env.USER_API || "http://localhost:8082",
    STORE_API: process.env.STORE_API || "http://localhost:8084",
    POST_API: process.env.POST_API || "http://localhost:8085",
    MESSAGING_API: process.env.MESSAGING_API || "http://localhost:8086",
    REELS_API: process.env.REELS_API || "http://localhost:8087",
    PURCHASE_API: process.env.PURCHASE_API || "http://localhost:8088",
    NOTIFICATION_API: process.env.NOTIFICATION_API || "http://localhost:8089",
  },
};
