"use client";
import * as React from "react";
import { usePathname } from "next/navigation";

export type NavItem = { key: string; label: string; icon: string; href: string; badge?: number };

/**
 * Kabuk navigasyonu — aktif sekmeyi KONUMDAN otomatik çıkarır (origin + pathname
 * en-uzun-önek eşleşmesi). Böylece her micro-frontend'in her alt sayfası doğru
 * menü öğesini vurgular (ör. social /messages → "Mesajlar", /reels → "Reels").
 * SSR/ilk boyamada {@code fallbackActive} kullanılır (hydration uyumu).
 */
export function ShellNav({ nav, fallbackActive }: { nav: NavItem[]; fallbackActive: string }) {
  const pathname = usePathname();
  const [origin, setOrigin] = React.useState("");
  React.useEffect(() => setOrigin(window.location.origin), []);

  const activeKey = React.useMemo(() => {
    if (!origin) return fallbackActive;
    const full = origin + (pathname || "/");
    let best = fallbackActive;
    let bestLen = -1;
    for (const n of nav) {
      const href = n.href.replace(/\/+$/, "") || origin; // sondaki / normalize
      const matches = full === href || full === href + "/" || full.startsWith(href + "/");
      if (matches && href.length > bestLen) {
        best = n.key;
        bestLen = href.length;
      }
    }
    return best;
  }, [origin, pathname, nav, fallbackActive]);

  return (
    <nav className="gg-nav">
      {nav.map((n) => (
        <a key={n.key} href={n.href} className={"gg-nav-item" + (n.key === activeKey ? " active" : "")}>
          <span className="ico">{n.icon}</span>
          <span className="lbl">{n.label}</span>
          {n.badge ? <span className="gg-badge-count">{n.badge}</span> : null}
        </a>
      ))}
    </nav>
  );
}
