/** @type {import('next').NextConfig} */
export default {
  transpilePackages: ["@makeup/ui", "@makeup/auth"],
  env: {
    STORE_API: process.env.STORE_API || "http://localhost:8084",
    PURCHASE_API: process.env.PURCHASE_API || "http://localhost:8088",
    AD_API: process.env.AD_API || "http://localhost:8087",
    REVIEW_API: process.env.REVIEW_API || "http://localhost:8086",
  },
};
