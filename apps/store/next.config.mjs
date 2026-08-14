const SELLER = process.env.NEXT_PUBLIC_SELLER_URL || "http://localhost:3006";

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
      // Satici paneli AYRI uygulamaya tasindi (apps/seller, 3006). Eski
      // adresler yer imlerinde ve paylasilmis baglantilarda duruyor; hem
      // Turkce hem Ingilizce yollar yeni origine gonderilir.
      { source: "/reklam/:yol*", destination: `${SELLER}/ads/:yol*`, permanent: true },
      { source: "/ads/:yol*", destination: `${SELLER}/ads/:yol*`, permanent: true },
      { source: "/satici", destination: `${SELLER}/seller`, permanent: true },
      { source: "/satici/bildirim", destination: `${SELLER}/seller/notifications`, permanent: true },
      { source: "/satici/cache", destination: `${SELLER}/seller/cache`, permanent: true },
      { source: "/satici/kampanya", destination: `${SELLER}/seller/campaigns`, permanent: true },
      { source: "/satici/siparis", destination: `${SELLER}/seller/orders`, permanent: true },
      { source: "/satici/stok", destination: `${SELLER}/seller/stock`, permanent: true },
      { source: "/satici/urun", destination: `${SELLER}/seller/products`, permanent: true },
      { source: "/satici/yorum", destination: `${SELLER}/seller/reviews`, permanent: true },
      { source: "/seller/:yol*", destination: `${SELLER}/seller/:yol*`, permanent: true },
      { source: "/yetkisiz", destination: "/forbidden", permanent: true },
    ];
  },
};
