/** @type {import('next').NextConfig} */
export default {
  transpilePackages: ["@makeup/ui", "@makeup/auth"],
  env: {
    POST_API: process.env.POST_API || "http://localhost:8085",
    REELS_API: process.env.REELS_API || "http://localhost:8087",
    MESSAGING_API: process.env.MESSAGING_API || "http://localhost:8086",
    NOTIFICATION_API: process.env.NOTIFICATION_API || "http://localhost:8089",
  },
};
