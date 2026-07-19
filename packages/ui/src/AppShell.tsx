import * as React from "react";

// Zone origin'leri: her micro-frontend ayrı dağıtım (yerelde ayrı port, prod'da
// ayrı Vercel domain'i). Zone'lar arası gezinme origin'e tam URL ile yapılır —
// böylece basePath/asset karmaşası olmadan menü her yerden çalışır.
const ORIGINS = {
  shell: process.env.NEXT_PUBLIC_SHELL_URL || "http://localhost:3010",
  recipes: process.env.NEXT_PUBLIC_RECIPES_URL || "http://localhost:3001",
  store: process.env.NEXT_PUBLIC_STORE_URL || "http://localhost:3002",
  social: process.env.NEXT_PUBLIC_SOCIAL_URL || "http://localhost:3003",
};

// Yalnızca gerçekten var olan sayfalara link verilir (ölü menü öğesi yok).
const NAV = [
  { key: "home", label: "Ana Sayfa", icon: "🏠", href: `${ORIGINS.shell}/` },
  { key: "guide", label: "Adım Adım Makyaj", icon: "💄", href: `${ORIGINS.recipes}/` },
  { key: "analysis", label: "Yüz Analizi (AI)", icon: "🎯", href: `${ORIGINS.shell}/analysis` },
  { key: "store", label: "Mağaza", icon: "🛍️", href: `${ORIGINS.store}/` },
  { key: "reels", label: "Reels", icon: "🎬", href: `${ORIGINS.social}/reels` },
  { key: "cart", label: "Sepetim", icon: "🛒", href: `${ORIGINS.store}/cart` },
  { key: "orders", label: "Siparişlerim", icon: "🧾", href: `${ORIGINS.store}/orders` },
  { key: "reklam", label: "Reklam Ver", icon: "📣", href: `${ORIGINS.store}/reklam` },
  { key: "messages", label: "Mesajlar", icon: "💬", href: `${ORIGINS.social}/messages` },
  { key: "notifications", label: "Bildirimler", icon: "🔔", href: `${ORIGINS.social}/notifications` },
  { key: "profile", label: "Profil", icon: "👤", href: `${ORIGINS.social}/profile` },
];

export function AppShell({
  active = "home",
  user = { name: "Melisa Güler" },
  children,
}: {
  active?: string;
  user?: { name: string };
  children: React.ReactNode;
}) {
  return (
    <div className="gg-shell">
      <aside className="gg-sidebar">
        <a href={ORIGINS.shell + "/"} className="gg-logo">
          <span className="gg-logo-mark">✦</span>
          <span className="txt">GlamGuide</span>
        </a>
        <nav className="gg-nav">
          {NAV.map((n) => (
            <a key={n.key} href={n.href} className={"gg-nav-item" + (n.key === active ? " active" : "")}>
              <span className="ico">{n.icon}</span>
              <span className="lbl">{n.label}</span>
              {n.badge ? <span className="gg-badge-count">{n.badge}</span> : null}
            </a>
          ))}
        </nav>
        <div className="gg-premium">
          <div style={{ fontSize: 22 }}>👑</div>
          <strong style={{ color: "var(--gg-primary-dark)" }}>Premium&apos;a Geç</strong>
          <p>Özel içerikler, sınırsız reels ve kişiye özel öneriler seni bekliyor.</p>
          <a href="/premium" className="gg-btn gg-btn-primary" style={{ width: "100%", justifyContent: "center" }}>
            Premium&apos;u Keşfet
          </a>
        </div>
      </aside>

      <div className="gg-content">
        <header className="gg-topbar">
          <input className="gg-search" placeholder="Ürün, marka veya kategori ara..." />
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
