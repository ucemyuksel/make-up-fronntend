"use client";
import * as React from "react";
import { usePathname } from "next/navigation";

export type NavItem = { key: string; label: string; icon: string; href: string; badge?: number };

const MOD_ANAHTARI = "gg_panel_modu";

/**
 * Shell navigation - derives the active tab FROM THE LOCATION (longest-prefix
 * match on origin + pathname), so every sub-page of every app highlights the
 * right menu item (e.g. social /messages then /reels). During SSR and the first
 * paint it uses {@code fallbackActive}, to keep hydration consistent.
 *
 * <p>Store-owner accounts have two modes: <b>Shopping</b> and <b>Seller</b>.
 * Switching the menu wholesale to seller made the consumer side of the same
 * account (recipes, reels) unreachable - the mode switch keeps both open. The
 * choice
 * is kept in localStorage; SSR always paints shopping mode and the mode is
 * applied in the browser only, so hydration never mismatches.
 */
export function ShellNav({
  nav,
  sellerNav,
  fallbackActive,
}: {
  nav: NavItem[];
  /** When supplied, the mode switch is shown (STORE_OWNER accounts only). */
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
