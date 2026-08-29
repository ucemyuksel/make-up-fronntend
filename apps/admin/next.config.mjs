export default {
  transpilePackages: ["@makeup/ui", "@makeup/auth"],
  env: {
    STORE_API: process.env.STORE_API || "http://localhost:8084",
    AD_API: process.env.AD_API || "http://localhost:8089",
    ACCOUNTING_API: process.env.ACCOUNTING_API || "http://localhost:8098"
  },
  // Eski Türkçe rota adları — yer imleri ve paylaşılmış bağlantılar
  // kırılmasın diye kalıcı yönlendirme (308). En az bir yayın döngüsü kalmalı.
  async redirects() {
    // İçerik yönetimi ayrı bir MFE'ye taşındı — hedef başka origin.
    const cms = process.env.NEXT_PUBLIC_CMS_URL || "http://localhost:3005";
    return [
      { source: "/komisyon", destination: "/commission", permanent: true },
      { source: "/kullanicilar", destination: "/users", permanent: true },
      { source: "/magazalar", destination: "/stores", permanent: true },
      { source: "/reklamlar", destination: "/ads", permanent: true },
      { source: "/yetkisiz", destination: "/forbidden", permanent: true },
      { source: "/icerikler", destination: `${cms}/content`, permanent: true },
      { source: "/kategoriler", destination: `${cms}/categories`, permanent: true },
    ];
  },
};
