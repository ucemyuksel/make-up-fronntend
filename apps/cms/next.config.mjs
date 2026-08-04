export default {
  transpilePackages: ["@makeup/ui", "@makeup/auth"],
  env: {
    // Katalog: kategori ağacı ve ürün öznitelikleri
    STORE_API: process.env.STORE_API || "http://localhost:8084",
    // Editoryal: paylaşım ve reels moderasyonu
    POST_API: process.env.POST_API || "http://localhost:8085",
    REELS_API: process.env.REELS_API || "http://localhost:8087"
  }
};
