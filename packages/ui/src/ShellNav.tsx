"use client";
import * as React from "react";
import { usePathname } from "next/navigation";

export type NavItem = { key: string; label: string; icon: string; href: string; badge?: number };

const MOD_ANAHTARI = "gg_panel_modu";

/**
 * Kabuk navigasyonu — aktif sekmeyi KONUMDAN otomatik çıkarır (origin + pathname
 * en-uzun-önek eşleşmesi). Böylece her micro-frontend'in her alt sayfası doğru
 * menü öğesini vurgular (ör. social /messages → "Mesajlar", /reels → "Reels").
 * SSR/ilk boyamada {@code fallbackActive} kullanılır (hydration uyumu).
 *
 * <p>Mağaza sahibi hesaplar iki moda sahiptir: <b>Alışveriş</b> ve <b>Satıcı</b>.
 * Menüyü tümden satıcıya çevirmek, aynı hesabın tüketici tarafını (tarifler,
 * reels) erişilemez kılıyordu — mod anahtarı ikisini de açık tutar. Seçim
 * localStorage'da saklanır; SSR her zaman alışveriş modunu boyar, mod yalnızca
 * tarayıcıda uygulanır (hydration uyuşmazlığı olmasın).
 */
export function ShellNav({
  nav,
  sellerNav,
  fallbackActive,
}: {
  nav: NavItem[];
  /** Verilirse mod anahtarı gösterilir (yalnız STORE_OWNER hesaplar). */
  sellerNav?: NavItem[];
  fallbackActive: string;
}) {
  const pathname = usePathname();
  const [origin, setOrigin] = React.useState("");
  const [sellerMode, setSellerMode] = React.useState(false);

  React.useEffect(() => {
    setOrigin(window.location.origin);
    if (sellerNav) {
      setSellerMode(localStorage.getItem(MOD_ANAHTARI) === "seller");
    }
  }, [sellerNav]);

  const toggleMode = (seller: boolean) => {
    setSellerMode(seller);
    localStorage.setItem(MOD_ANAHTARI, seller ? "seller" : "alisveris");
  };

  const activeNav = sellerNav && sellerMode ? sellerNav : nav;

  const activeKey = React.useMemo(() => {
    if (!origin) return fallbackActive;
    const full = origin + (pathname || "/");
    let best = fallbackActive;
    let bestLen = -1;
    for (const n of activeNav) {
      const href = n.href.replace(/\/+$/, "") || origin; // sondaki / normalize
      const matches = full === href || full === href + "/" || full.startsWith(href + "/");
      if (matches && href.length > bestLen) {
        best = n.key;
        bestLen = href.length;
      }
    }
    return best;
  }, [origin, pathname, activeNav, fallbackActive]);

  return (
    <>
      {sellerNav ? (
        <div className="gg-mode-switch" role="group" aria-label="Panel modu">
          <button type="button" onClick={() => toggleMode(false)}
                  className={"gg-mode-btn" + (sellerMode ? "" : " active")}
                  aria-pressed={!sellerMode}>
            🛍️ Alışveriş
          </button>
          <button type="button" onClick={() => toggleMode(true)}
                  className={"gg-mode-btn" + (sellerMode ? " active" : "")}
                  aria-pressed={sellerMode}>
            🏪 Satıcı
          </button>
        </div>
      ) : null}

      <nav className="gg-nav">
        {activeNav.map((n) => (
          <a key={n.key} href={n.href} className={"gg-nav-item" + (n.key === activeKey ? " active" : "")}>
            <span className="ico">{n.icon}</span>
            <span className="lbl">{n.label}</span>
            {n.badge ? <span className="gg-badge-count">{n.badge}</span> : null}
          </a>
        ))}
      </nav>
    </>
  );
}
