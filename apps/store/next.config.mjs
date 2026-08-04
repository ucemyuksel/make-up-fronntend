/** @type {import('next').NextConfig} */
export default {
  transpilePackages: ["@makeup/ui", "@makeup/auth"],
  env: {
    STORE_API: process.env.STORE_API || "http://localhost:8084",
    PURCHASE_API: process.env.PURCHASE_API || "http://localhost:8088",
  },
  // Eski Türkçe rota adları — yer imleri ve paylaşılmış bağlantılar
  // kırılmasın diye kalıcı yönlendirme (308). En az bir yayın döngüsü kalmalı.
  async redirects() {
    return [
      { source: "/reklam", destination: "/ads", permanent: true },
      { source: "/reklam/kampanya", destination: "/ads/campaigns", permanent: true },
      { source: "/reklam/:id", destination: "/ads/:id", permanent: true },
      { source: "/satici", destination: "/seller", permanent: true },
      { source: "/satici/bildirim", destination: "/seller/notifications", permanent: true },
      { source: "/satici/cache", destination: "/seller/cache", permanent: true },
      { source: "/satici/kampanya", destination: "/seller/campaigns", permanent: true },
      { source: "/satici/siparis", destination: "/seller/orders", permanent: true },
      { source: "/satici/stok", destination: "/seller/stock", permanent: true },
      { source: "/satici/urun", destination: "/seller/products", permanent: true },
      { source: "/satici/yorum", destination: "/seller/reviews", permanent: true },
      { source: "/yetkisiz", destination: "/forbidden", permanent: true },
    ];
  },
};
