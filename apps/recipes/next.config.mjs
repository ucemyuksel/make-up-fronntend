// recipes — bağımsız domain MFE.
// NOT: Multi-Zones için basePath ideal; ancak Next basePath + Auth.js aynı app'te
// callback yolunu çakıştırıyor. Bu demoda OIDC login + canlı API'yi kanıtlamak
// için basePath'siz çalışıyoruz. Prod'da auth kabuk/gateway (Kong OIDC) katmanında
// merkezileşir; zone asset izolasyonu assetPrefix ile yapılır.
/** @type {import('next').NextConfig} */
export default {
  transpilePackages: ["@makeup/ui", "@makeup/auth"],
  env: {
    RECIPE_API: process.env.RECIPE_API || "http://localhost:8083",
  },
};
