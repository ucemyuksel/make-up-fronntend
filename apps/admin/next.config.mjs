export default {
  transpilePackages: ["@makeup/ui", "@makeup/auth"],
  env: {
    STORE_API: process.env.STORE_API || "http://localhost:8084",
    AD_API: process.env.AD_API || "http://localhost:8089"
  }
};
