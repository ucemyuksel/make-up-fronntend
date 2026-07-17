import * as React from "react";

const NAV = [
  { key: "home", label: "Ana Sayfa", icon: "🏠", href: "/" },
  { key: "guide", label: "Adım Adım Makyaj", icon: "💄", href: "/recipes" },
  { key: "store", label: "Mağaza", icon: "🛍️", href: "/store" },
  { key: "reels", label: "Reels", icon: "🎬", href: "/reels" },
  { key: "fav", label: "Favoriler", icon: "🤍", href: "/favorites" },
  { key: "cart", label: "Alışveriş", icon: "🛒", href: "/cart" },
  { key: "orders", label: "Siparişlerim", icon: "🧾", href: "/orders" },
  { key: "shipping", label: "Kargo Takip", icon: "🚚", href: "/shipping" },
  { key: "messages", label: "Mesajlar", icon: "💬", href: "/messages", badge: 2 },
  { key: "notifications", label: "Bildirimler", icon: "🔔", href: "/notifications", badge: 3 },
  { key: "profile", label: "Profil", icon: "👤", href: "/profile" },
  { key: "settings", label: "Ayarlar", icon: "⚙️", href: "/settings" },
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
        <a href="/" className="gg-logo">
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
          <a href="/reels/buy" className="gg-btn gg-btn-primary">
            🎬 <span className="txt">Reels Satın Al</span>
          </a>
          <NotifIcon icon="🔔" n={3} />
          <NotifIcon icon="💬" n={2} />
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

function NotifIcon({ icon, n }: { icon: string; n: number }) {
  return (
    <span style={{ position: "relative", fontSize: 20 }}>
      {icon}
      <span style={{ position: "absolute", top: -4, right: -6, background: "var(--gg-primary)", color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, padding: "0 5px" }}>{n}</span>
    </span>
  );
}
