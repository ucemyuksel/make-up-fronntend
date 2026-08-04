/** @type {import('next').NextConfig} */
export default {
  transpilePackages: ["@makeup/ui", "@makeup/auth"],
  env: {
    POST_API: process.env.POST_API || "http://localhost:8085",
    REELS_API: process.env.REELS_API || "http://localhost:8087",
    MESSAGING_API: process.env.MESSAGING_API || "http://localhost:8086",
    NOTIFICATION_API: process.env.NOTIFICATION_API || "http://localhost:8089",
  },
  // Eski Türkçe rota adları — yer imleri ve paylaşılmış bağlantılar
  // kırılmasın diye kalıcı yönlendirme (308). En az bir yayın döngüsü kalmalı.
  async redirects() {
    return [
      { source: "/hikaye", destination: "/story", permanent: true },
      { source: "/gonderi/:id", destination: "/post/:id", permanent: true },
      { source: "/profile/duzenle", destination: "/profile/edit", permanent: true },
    ];
  },
};
