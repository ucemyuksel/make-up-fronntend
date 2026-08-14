// GlamGuide brand tokens (vivid pink/magenta, per the mockup).
export const theme = {
  color: {
    primary: "#EC2E7A", // canlı pembe (CTA, "Hemen Başla", "Reels Satın Al")
    primaryDark: "#C71E62",
    primaryLight: "#F9A8C9",
    primarySoft: "#FCE7F0", // aktif menü / rozet arka planı
    coral: "#F0863B",
    coralDark: "#B45A1E",
    coralSoft: "#FDEEE2",
    white: "#FFFFFF",
    gold: "#E9A23B", // Reels bakiyesi jeton rengi
    bg: "#F7F6F9", // sayfa arka planı
    surface: "#FFFFFF",
    text: "#241A1F",
    textMuted: "#8A8290",
    border: "#EFEAF0",
    star: "#F5B301",
  },
  radius: { sm: "8px", md: "14px", lg: "22px", pill: "999px" },
  space: (n: number) => `${n * 4}px`,
  font: {
    family:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
} as const;

export type Theme = typeof theme;
