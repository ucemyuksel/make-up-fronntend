"use client";
import * as React from "react";

/**
 * Yatay kaydırılabilir carousel — sağa/sola ok butonları + dokunmatik/trackpad kaydırma.
 * Kartlar doğrudan children olarak verilir; her kart `flex: 0 0 auto` ile yan yana dizilir.
 */
export function Carousel({ children, itemWidth = 210, gap = 14 }: { children: React.ReactNode; itemWidth?: number; gap?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [solVar, setSolVar] = React.useState(false);
  const [sagVar, setSagVar] = React.useState(false);

  const updateStatus = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setSolVar(el.scrollLeft > 4);
    setSagVar(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  React.useEffect(() => {
    updateStatus();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", updateStatus, { passive: true });
    window.addEventListener("resize", updateStatus);
    return () => {
      el.removeEventListener("scroll", updateStatus);
      window.removeEventListener("resize", updateStatus);
    };
  }, [updateStatus]);

  const kaydir = (yon: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: yon * Math.round(el.clientWidth * 0.8), behavior: "smooth" });
  };

  const okStil: React.CSSProperties = {
    position: "absolute", top: "50%", transform: "translateY(-50%)", zIndex: 2,
    width: 38, height: 38, borderRadius: "50%", border: "1px solid var(--gg-border)",
    background: "var(--gg-surface, #fff)", color: "var(--gg-text)", cursor: "pointer",
    display: "grid", placeItems: "center", fontSize: 20, lineHeight: 1,
    boxShadow: "0 2px 10px rgba(0,0,0,.12)",
  };

  return (
    <div style={{ position: "relative" }}>
      {solVar ? (
        <button type="button" aria-label="Sola kaydır" onClick={() => kaydir(-1)} style={{ ...okStil, left: -6 }}>‹</button>
      ) : null}
      <div
        ref={ref}
        style={{
          display: "flex", gap, overflowX: "auto", scrollBehavior: "smooth",
          scrollSnapType: "x mandatory", paddingBottom: 4,
          scrollbarWidth: "none", msOverflowStyle: "none",
        }}
        className="gg-carousel-track"
      >
        {React.Children.map(children, (c) => (
          <div style={{ flex: `0 0 ${itemWidth}px`, scrollSnapAlign: "start" }}>{c}</div>
        ))}
      </div>
      {sagVar ? (
        <button type="button" aria-label="Sağa kaydır" onClick={() => kaydir(1)} style={{ ...okStil, right: -6 }}>›</button>
      ) : null}
    </div>
  );
}
