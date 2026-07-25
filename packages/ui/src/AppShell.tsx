import * as React from "react";
import { ShellNav } from "./ShellNav";

// Zone origin'leri: her micro-frontend ayrı dağıtım (yerelde ayrı port, prod'da
// ayrı Vercel domain'i). Zone'lar arası gezinme origin'e tam URL ile yapılır —
// böylece basePath/asset karmaşası olmadan menü her yerden çalışır.
const ORIGINS = {
  shell: process.env.NEXT_PUBLIC_SHELL_URL || "http://localhost:3010",
  recipes: process.env.NEXT_PUBLIC_RECIPES_URL || "http://localhost:3001",
  store: process.env.NEXT_PUBLIC_STORE_URL || "http://localhost:3002",
  social: process.env.NEXT_PUBLIC_SOCIAL_URL || "http://localhost:3003",
  admin: process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3004",
};

/** Yalnız ADMIN rolüne gösterilir — sıradan kullanıcıya yönetim linki çıkmaz. */
const ADMIN_NAV = {
  key: "admin",
  label: "Yönetim Merkezi",
  icon: "🛡️",
  href: `${ORIGINS.admin}/`,
};

// Tüketici menüsü. Yalnızca gerçekten var olan sayfalara link verilir.
const NAV = [
  { key: "home", label: "Ana Sayfa", icon: "🏠", href: `${ORIGINS.shell}/` },
  { key: "guide", label: "Adım Adım Makyaj", icon: "💄", href: `${ORIGINS.recipes}/` },
  { key: "analysis", label: "Yüz Analizi (AI)", icon: "🎯", href: `${ORIGINS.shell}/analysis` },
  { key: "store", label: "Mağaza", icon: "🛍️", href: `${ORIGINS.store}/` },
  { key: "reels", label: "Reels", icon: "🎬", href: `${ORIGINS.social}/reels` },
  { key: "cart", label: "Sepetim", icon: "🛒", href: `${ORIGINS.store}/cart` },
  { key: "orders", label: "Siparişlerim", icon: "🧾", href: `${ORIGINS.store}/orders` },
  { key: "messages", label: "Mesajlar", icon: "💬", href: `${ORIGINS.social}/messages` },
  { key: "notifications", label: "Bildirimler", icon: "🔔", href: `${ORIGINS.social}/notifications` },
  { key: "profile", label: "Profil", icon: "👤", href: `${ORIGINS.social}/profile` },
];

/**
 * Satıcı menüsü. Mağaza sahibi işini yönetir — Reels ve Yüz Analizi gibi
 * tüketici içerikleri menüsünde yer almaz. Reklam verme yalnızca burada.
 */
const SATICI_NAV = [
  { key: "satici", label: "Satıcı Paneli", icon: "🏪", href: `${ORIGINS.store}/satici` },
  { key: "urun", label: "Ürünlerim", icon: "📦", href: `${ORIGINS.store}/satici/urun` },
  { key: "siparis", label: "Siparişler & Kargo", icon: "🚚", href: `${ORIGINS.store}/satici/siparis` },
  { key: "yorum", label: "Ürün Yorumları", icon: "⭐", href: `${ORIGINS.store}/satici/yorum` },
  { key: "skampanya", label: "Kampanyalar", icon: "🏷️", href: `${ORIGINS.store}/satici/kampanya` },
  { key: "reklam", label: "Reklam Ver", icon: "📣", href: `${ORIGINS.store}/reklam` },
  { key: "store", label: "Mağazam", icon: "🛍️", href: `${ORIGINS.store}/` },
  { key: "messages", label: "Mesajlar", icon: "💬", href: `${ORIGINS.social}/messages` },
  { key: "notifications", label: "Bildirimler", icon: "🔔", href: `${ORIGINS.social}/notifications` },
  { key: "profile", label: "Profil", icon: "👤", href: `${ORIGINS.social}/profile` },
];

export function AppShell({
  active = "home",
  user = { name: "Melisa Güler" },
  isAdmin = false,
  roles = [],
  children,
}: {
  active?: string;
  user?: { name: string };
  /** ADMIN rolü varsa yönetim merkezi linki menüye eklenir. */
  isAdmin?: boolean;
  /** Keycloak realm rolleri — menü buna göre kurulur. */
  roles?: string[];
  children: React.ReactNode;
}) {
  // Mağaza sahibi satıcı menüsünü görür; hem satıcı hem admin ise ikisi birleşir.
  const satici = roles.includes("STORE_OWNER");
  const temel = satici ? SATICI_NAV : NAV;
  const nav = isAdmin || roles.includes("ADMIN") ? [...temel, ADMIN_NAV] : temel;
  return (
    <div className="gg-shell">
      <aside className="gg-sidebar">
        <a href={ORIGINS.shell + "/"} className="gg-logo">
          <span className="gg-logo-mark">✦</span>
          <span className="txt">GlamGuide</span>
        </a>
        {/* Aktif sekme konumdan otomatik (client); active prop SSR fallback'i. */}
        <ShellNav nav={nav} fallbackActive={active} />
        {/* Premium tüketiciye satılır; satıcıya bunun yerine mağaza özeti gösterilir. */}
        {satici ? (
          <div className="gg-premium">
            <div style={{ fontSize: 22 }}>🏪</div>
            <strong style={{ color: "var(--gg-primary-dark)" }}>Satıcı Hesabı</strong>
            <p>Siparişlerini yönet, kampanya kur, reklam ver.</p>
            <a href={`${ORIGINS.store}/satici`} className="gg-btn gg-btn-primary"
               style={{ width: "100%", justifyContent: "center" }}>
              Panele Git
            </a>
          </div>
        ) : (
          <div className="gg-premium">
            <div style={{ fontSize: 22 }}>👑</div>
            <strong style={{ color: "var(--gg-primary-dark)" }}>Premium&apos;a Geç</strong>
            <p>Özel içerikler, sınırsız reels ve kişiye özel öneriler seni bekliyor.</p>
            <a href="/premium" className="gg-btn gg-btn-primary" style={{ width: "100%", justifyContent: "center" }}>
              Premium&apos;u Keşfet
            </a>
          </div>
        )}
      </aside>

      <div className="gg-content">
        <header className="gg-topbar">
          <input className="gg-search" type="search" aria-label="Ürün, marka veya kategori ara"
                 placeholder="Ürün, marka veya kategori ara..." />
          <span className="gg-topbar-spacer" />
          {/* Mesaj/bildirim erişimi yalnızca sol menüde — topbar sade tutuldu
              (eskiden burada da ikonlar vardı, menü + sağ bar ile tekrar ediyordu). */}
          <a href={ORIGINS.recipes + "/"} className="gg-btn gg-btn-primary">
            💄 <span className="txt">Tarif Satın Al</span>
          </a>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--gg-primary-light)" }} />
            <strong style={{ fontSize: 14 }}>{user.name}</strong>
          </span>
        </header>
        <main className="gg-main">{children}</main>
      </div>
    </div>
  );
}
