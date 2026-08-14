import * as React from "react";
import { ShellNav } from "./ShellNav";

// App origins: every app is deployed separately (its own port locally, its own
// Vercel domain in production). Navigation between them uses a full URL to the
// origin, so the menu works everywhere without basePath/asset juggling.
const ORIGINS = {
  shell: process.env.NEXT_PUBLIC_SHELL_URL || "http://localhost:3010",
  recipes: process.env.NEXT_PUBLIC_RECIPES_URL || "http://localhost:3001",
  store: process.env.NEXT_PUBLIC_STORE_URL || "http://localhost:3002",
  social: process.env.NEXT_PUBLIC_SOCIAL_URL || "http://localhost:3003",
  admin: process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3004",
  cms: process.env.NEXT_PUBLIC_CMS_URL || "http://localhost:3005",
  // Satici paneli AYRI uygulama: magaza kullanicisi satar, musteri satin alir.
  // Ayni kod tabaninda olsalardi satici paneline giren bir hata musteri
  // vitrinini de dusururdu - iki tarafin yayin dongusu de birbirine baglanirdi.
  seller: process.env.NEXT_PUBLIC_SELLER_URL || "http://localhost:3006",
};

/**
 * Shown only to the ADMIN role - ordinary users never see an admin link.
 * Administration and content are separate apps: enforcement decisions
 * (commission, stores, users, ad approval) live in admin, while the catalog and
 * moderation live in cms.
 */
const ADMIN_NAV = [
  { key: "admin", label: "Yönetim Merkezi", icon: "🛡️", href: `${ORIGINS.admin}/` },
  { key: "cms", label: "İçerik Yönetimi", icon: "🗂️", href: `${ORIGINS.cms}/` },
];

// Consumer menu. Only links to pages that actually exist.
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
 * Seller menu. A store owner runs their business here, so consumer content
 * such as Reels and Face Analysis is absent. Advertising exists only here.
 */
/** Yalniz MAGAZA SAHIBI gorur. Personel kendi arkadasini ise alamaz. */
const OWNER_ONLY_NAV = [
  { key: "staff", label: "Personel", icon: "👥", href: `${ORIGINS.seller}/seller/staff` },
];

const SELLER_NAV = [
  { key: "seller", label: "Satıcı Paneli", icon: "🏪", href: `${ORIGINS.seller}/seller` },
  { key: "product", label: "Ürünlerim", icon: "📦", href: `${ORIGINS.seller}/seller/products` },
  { key: "order", label: "Siparişler & Kargo", icon: "🚚", href: `${ORIGINS.seller}/seller/orders` },
  { key: "stock", label: "Stok Durumu", icon: "📊", href: `${ORIGINS.seller}/seller/stock` },
  { key: "review", label: "Ürün Yorumları", icon: "⭐", href: `${ORIGINS.seller}/seller/reviews` },
  { key: "questions", label: "Müşteri Soruları", icon: "❓", href: `${ORIGINS.seller}/seller/questions` },
  { key: "returns", label: "İade Talepleri", icon: "↩️", href: `${ORIGINS.seller}/seller/returns` },
  { key: "sellerNotifications", label: "Mesaj & Bildirim", icon: "🔔", href: `${ORIGINS.seller}/seller/notifications` },
  { key: "sellerCampaigns", label: "Kampanyalar", icon: "🏷️", href: `${ORIGINS.seller}/seller/campaigns` },
  { key: "coupons", label: "Kupon Kodları", icon: "🎟️", href: `${ORIGINS.seller}/seller/coupons` },
  { key: "giftCards", label: "Hediye Kartları", icon: "🎁", href: `${ORIGINS.seller}/seller/gift-cards` },
  // Personel yonetimi menude YOK - yalniz sahibe eklenir (asagida).
  { key: "ad", label: "Reklam Ver", icon: "📣", href: `${ORIGINS.seller}/ads` },
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
  panel = false,
  children,
}: {
  active?: string;
  user?: { name: string };
  /** With the ADMIN role, the admin centre link is added to the menu. */
  isAdmin?: boolean;
  /** Keycloak realm roles - the menu is built from these. */
  roles?: string[];
  /**
   * Bu uygulama SATICI PANELI mi.
   *
   * <p>When true, the consumer menu (Reels, Cart, Premium…) is not shown at
   * all. The seller panel is a separate app, so putting a shopping menu there
   * would send the user to the wrong place; a signed-out visitor should see no
   * menu at all.
   */
  panel?: boolean;
  children: React.ReactNode;
}) {
  // TUKETICI UYGULAMASINDA: ayni hesap hem alisveris yapip hem satabilir, bu
  // yuzden tuketici menusu kaldirilmaz ve kullanici mod anahtariyla gecer.
  //
  // SATICI PANELINDE (panel=true): tuketici menusu HIC gosterilmez. Satici
  // paneli artik ayri bir uygulama; oraya Sepet/Reels koymak kullaniciyi
  // baska origine atar. Giris yapmamis birine de menu gosterilmez.
  // Personel de satici panelini gorur; magaza isini o da yapar.
  const staff = roles.includes("STORE_STAFF");
  const owner = roles.includes("STORE_OWNER");
  const seller = owner || staff;
  const admin = isAdmin || roles.includes("ADMIN");
  const nav = admin ? [...NAV, ...ADMIN_NAV] : NAV;
  // Personel yonetimi menude yalniz sahibe cikar. Menuyu gizlemek tek basina
  // koruma degil - sayfanin kendisi de sahiplik doguluyor (bkz. requireOwner).
  const baseNav = owner ? [...SELLER_NAV, ...OWNER_ONLY_NAV] : SELLER_NAV;
  const sellerNav = seller ? (admin ? [...baseNav, ...ADMIN_NAV] : baseNav) : undefined;

  // Panelde tek liste gosterilir: satici menusu. Mod anahtarina gerek yok,
  // gecilecek ikinci bir menu yok.
  const gosterilenNav = panel ? (sellerNav ?? []) : nav;
  const gosterilenSellerNav = panel ? undefined : sellerNav;
  return (
    <div className="gg-shell">
      <aside className="gg-sidebar">
        <a href={ORIGINS.shell + "/"} className="gg-logo">
          <span className="gg-logo-mark">✦</span>
          <span className="txt">GlamGuide</span>
        </a>
        {/* Aktif sekme konumdan otomatik (client); active prop SSR fallback'i. */}
        <ShellNav nav={gosterilenNav} sellerNav={gosterilenSellerNav} fallbackActive={active} />
        {/* Premium TUKETICIYE satilir. Panelde (satici uygulamasi) ne premium
            karti ne de tuketici kismi gosterilir; giris yapmamis birine hic
            bir sey gosterilmez. */}
        {panel && !seller ? null : seller ? (
          <div className="gg-premium">
            <div style={{ fontSize: 22 }}>🏪</div>
            <strong style={{ color: "var(--gg-primary-dark)" }}>Satıcı Hesabı</strong>
            <p>Siparişlerini yönet, kampanya kur, reklam ver.</p>
            <a href={`${ORIGINS.seller}/seller`} className="gg-btn gg-btn-primary"
               style={{ width: "100%", justifyContent: "center" }}>
              Panele Git
            </a>
          </div>
        ) : panel ? null : (
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
          {/* Urun aramasi TUKETICI ogesi: satici panelinde arananlar urun
              degil siparis/soru/iade olur ve o aramalar kendi sayfalarinda.
              Panelde bu kutu yaniltici olurdu. */}
          {panel ? (
            <strong style={{ fontSize: 15 }}>Satıcı Paneli</strong>
          ) : (
            <input className="gg-search" type="search" aria-label="Ürün, marka veya kategori ara"
                   placeholder="Ürün, marka veya kategori ara..." />
          )}
          <span className="gg-topbar-spacer" />
          {/* Mesaj ve bildirim erişimi yalnızca sol menüde — topbar sade tutuldu
              (eskiden burada da ikonlar vardı, menü + sağ bar ile tekrar ediyordu). */}
          {/* Tarif satin alma tuketici akisi; panelde gosterilmez. */}
          {panel ? null : (
            <a href={ORIGINS.recipes + "/"} className="gg-btn gg-btn-primary">
              💄 <span className="txt">Tarif Satın Al</span>
            </a>
          )}
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
