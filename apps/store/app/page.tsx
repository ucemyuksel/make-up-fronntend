import * as React from "react";
import { ProductCard, Carousel } from "@makeup/ui";
import { auth } from "../auth";
import { api, tl, type Product, type Category } from "./lib";

// Geçici görseller (placeholder — prod'da MinIO'daki gerçek ürün/mağaza görseli).
const img = (seed: string, w = 320, h = 320) => `https://picsum.photos/seed/gg${seed}/${w}/${h}`;

// Mağazalar (marketplace) — geçici veri; prod'da store-service'ten gelir.
const STORES = [
  { ad: "Gratis", color: "#E6007E", slug: "gratis" },
  { ad: "Watsons", color: "#00A9CE", slug: "watsons" },
  { ad: "L'Oréal Paris", color: "#111827", slug: "loreal" },
  { ad: "Sephora", color: "#000000", slug: "sephora" },
  { ad: "MAC", color: "#1F2937", slug: "mac" },
  { ad: "Maybelline", color: "#0A5FB4", slug: "maybelline" },
  { ad: "Estée Lauder", color: "#0B2A5B", slug: "estee" },
  { ad: "Flormar", color: "#C8102E", slug: "flormar" },
];

// Kategori ağacı (Trendyol tarzı: kategori → alt kategoriler).
const CATEGORY_TREE: { ad: string; ikon: string; alt: string[] }[] = [
  { ad: "Makyaj", ikon: "💄", alt: ["Ruj", "Fondöten", "Maskara", "Far", "Eyeliner", "Allık", "Aydınlatıcı"] },
  { ad: "Cilt Bakımı", ikon: "🧴", alt: ["Nemlendirici", "Serum", "Temizleyici", "Güneş Koruyucu", "Maske"] },
  { ad: "Saç", ikon: "💇", alt: ["Şampuan", "Saç Kremi", "Serum", "Şekillendirici"] },
  { ad: "Parfüm", ikon: "🌸", alt: ["Kadın Parfüm", "Erkek Parfüm", "Deodorant"] },
  { ad: "Aksesuar", ikon: "🧰", alt: ["Fırça", "Sünger", "Ayna", "Makyaj Çantası"] },
  { ad: "Anne & Bebek", ikon: "🍼", alt: ["Bebek Bakım", "Bebek Bezi"] },
];

// Ürünler (category + mağaza + indirim ile). Geçici veri — her mağazanın kendi ürün/kategorisi var.
const MOCK_PRODUCTS = [
  // Gratis (geniş yelpaze)
  { id: "g1", name: "Nude Far Paleti", brand: "Note", store: "gratis", category: "Makyaj", priceAmount: 349, rating: 4.6, count: 210, skinType: "Tüm ciltler", discount: 30 },
  { id: "g2", name: "Micellar Temizleme Suyu", brand: "Garnier", store: "gratis", category: "Cilt Bakımı", priceAmount: 129, rating: 4.7, count: 540, skinType: "Hassas", discount: 15 },
  { id: "g3", name: "Göz Farı Fırçası", brand: "Gratis", store: "gratis", category: "Aksesuar", priceAmount: 89, rating: 4.4, count: 77, skinType: "", discount: 0 },
  { id: "g4", name: "Onarıcı Şampuan", brand: "Elidor", store: "gratis", category: "Saç", priceAmount: 99, rating: 4.3, count: 132, skinType: "", discount: 20 },
  // Watsons
  { id: "w1", name: "C Vitamini Serumu", brand: "The Body Shop", store: "watsons", category: "Cilt Bakımı", priceAmount: 549, rating: 4.7, count: 99, skinType: "Tüm ciltler", discount: 0 },
  { id: "w2", name: "Keratin Saç Kremi", brand: "Watsons", store: "watsons", category: "Saç", priceAmount: 159, rating: 4.5, count: 64, skinType: "", discount: 10 },
  { id: "w3", name: "Çiçeksi Kadın Parfüm", brand: "Watsons", store: "watsons", category: "Parfüm", priceAmount: 399, rating: 4.6, count: 88, skinType: "", discount: 25 },
  // L'Oréal Paris
  { id: "l1", name: "Hydra Nemlendirici", brand: "L'Oréal Paris", store: "loreal", category: "Cilt Bakımı", priceAmount: 329, rating: 4.5, count: 208, skinType: "Kuru & Hassas", discount: 10 },
  { id: "l2", name: "Infaillible Fondöten", brand: "L'Oréal Paris", store: "loreal", category: "Makyaj", priceAmount: 429, rating: 4.7, count: 176, skinType: "Karma", discount: 0 },
  { id: "l3", name: "Elseve Saç Serumu", brand: "L'Oréal Paris", store: "loreal", category: "Saç", priceAmount: 189, rating: 4.4, count: 143, skinType: "", discount: 15 },
  // Sephora
  { id: "s1", name: "Vanilla Aydınlatıcı", brand: "Becca", store: "sephora", category: "Makyaj", priceAmount: 699, rating: 4.6, count: 61, skinType: "Normal & Kuru", discount: 20 },
  { id: "s2", name: "Sephora İmza Parfüm", brand: "Sephora", store: "sephora", category: "Parfüm", priceAmount: 549, rating: 4.5, count: 39, skinType: "", discount: 0 },
  // MAC
  { id: "m1", name: "Mat Ruj - Velvet Teddy", brand: "MAC", store: "mac", category: "Makyaj", priceAmount: 899, rating: 4.8, count: 93, skinType: "Kuru dudakta nemlendir", discount: 0 },
  { id: "m2", name: "Fix+ Sabitleyici Sprey", brand: "MAC", store: "mac", category: "Makyaj", priceAmount: 749, rating: 4.7, count: 58, skinType: "Tüm ciltler", discount: 10 },
  // Maybelline
  { id: "y1", name: "Lash Sensational Maskara", brand: "Maybelline", store: "maybelline", category: "Makyaj", priceAmount: 439.9, rating: 4.7, count: 114, skinType: "Hassas göz uyumlu", discount: 0 },
  { id: "y2", name: "Fit Me Fondöten", brand: "Maybelline", store: "maybelline", category: "Makyaj", priceAmount: 329, rating: 4.6, count: 220, skinType: "Karma & Yağlı", discount: 15 },
  // Estée Lauder
  { id: "e1", name: "Double Wear Fondöten", brand: "Estée Lauder", store: "estee", category: "Makyaj", priceAmount: 1599, rating: 4.9, count: 86, skinType: "Yağlı & Karma", discount: 15 },
  { id: "e2", name: "Advanced Night Repair Serum", brand: "Estée Lauder", store: "estee", category: "Cilt Bakımı", priceAmount: 2450, rating: 4.9, count: 154, skinType: "Tüm ciltler", discount: 0 },
  { id: "e3", name: "Beautiful Kadın Parfüm", brand: "Estée Lauder", store: "estee", category: "Parfüm", priceAmount: 1890, rating: 4.8, count: 41, skinType: "", discount: 10 },
  // Flormar
  { id: "f1", name: "Siyah Eyeliner", brand: "Flormar", store: "flormar", category: "Makyaj", priceAmount: 149, rating: 4.3, count: 152, skinType: "Hassas göz uyumlu", discount: 25 },
  { id: "f2", name: "Allık - Şeftali", brand: "Flormar", store: "flormar", category: "Makyaj", priceAmount: 129, rating: 4.5, count: 45, skinType: "Tüm ciltler", discount: 40 },
  { id: "f3", name: "Makyaj Çantası", brand: "Flormar", store: "flormar", category: "Aksesuar", priceAmount: 199, rating: 4.4, count: 33, skinType: "", discount: 0 },
];

const CILT_TIPLERI = ["Tümü", "Kuru", "Yağlı", "Karma", "Hassas", "Normal"];

export default async function StoreHome({ searchParams }: { searchParams: { q?: string; cilt?: string; category?: string; store?: string } }) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;

  let products: (Product & { rating?: number; count?: number; skinType?: string; category?: string; store?: string; discount?: number })[] = MOCK_PRODUCTS as never;
  if (token) {
    const live = await api<Product[]>("/api/products", token);
    if (live && live.length > 0) products = [...live, ...(MOCK_PRODUCTS as never[])].slice(0, 20) as never;
  }

  // Filtreler (birleşik): arama + cilt + kategori + mağaza.
  const q = (searchParams.q ?? "").toLocaleLowerCase("tr").trim();
  const cilt = searchParams.cilt && searchParams.cilt !== "Tümü" ? searchParams.cilt.toLocaleLowerCase("tr") : "";
  const category = searchParams.category ?? "";
  const store = searchParams.store ?? "";
  const activeStore = STORES.find((m) => m.slug === store);

  const stores = q ? STORES.filter((m) => m.ad.toLocaleLowerCase("tr").includes(q)) : STORES;
  const filteredProducts = products.filter((p) => {
    if (q && !`${p.name} ${p.brand}`.toLocaleLowerCase("tr").includes(q)) return false;
    if (cilt && !(p.skinType ?? "").toLocaleLowerCase("tr").includes(cilt)) return false;
    if (category && p.category !== category) return false;
    if (store && p.store !== store) return false;
    return true;
  });

  // Master-detail: seçili mağazanın KENDİ kategorileri (o mağazanın ürünlerinden türetilir).
  const storeProducts = store ? products.filter((p) => p.store === store) : products;
  const storeCategorySet = new Set(storeProducts.map((p) => p.category));
  const visibleCategories = store ? CATEGORY_TREE.filter((k) => storeCategorySet.has(k.ad)) : CATEGORY_TREE;

  // Filtre linki üretici (mevcut parametreleri korur).
  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base = { q: searchParams.q, cilt: searchParams.cilt, category, store, ...patch };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    const s = p.toString();
    return "/" + (s ? `?${s}` : "");
  };

  const isFiltered = q || cilt || category || store;

  return (
    <div style={{ display: "grid", gap: 26, gridTemplateColumns: "minmax(0, 1fr)" }}>
      {/* Arama */}
      <form method="get" style={{ display: "flex", gap: 8 }}>
        <input name="q" defaultValue={searchParams.q ?? ""} className="gg-search" style={{ flex: 1 }} placeholder="Ürün, marka veya mağaza ara..." autoComplete="off" />
        <button className="gg-btn gg-btn-primary" type="submit">Ara</button>
        {isFiltered ? <a href="/" className="gg-btn gg-btn-ghost">Temizle</a> : null}
      </form>

      {/* Aktif filter bilgisi */}
      {activeStore ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: `linear-gradient(120deg, ${activeStore.color}22, transparent)`, borderRadius: "var(--gg-r-lg)", padding: 16 }}>
          <span style={{ width: 48, height: 48, borderRadius: 12, background: activeStore.color, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800 }}>{activeStore.ad.slice(0, 2).toUpperCase()}</span>
          <div style={{ flex: 1 }}><strong style={{ fontSize: 17 }}>{activeStore.ad}</strong><div style={{ fontSize: 12.5, color: "var(--gg-muted)" }}>{filteredProducts.length} ürün · Mağaza vitrini</div></div>
          <a href="/" className="gg-see-all">Tüm mağazalar ›</a>
        </div>
      ) : null}

      {/* Hero — sadece filtresizken */}
      {!isFiltered ? (
        <div style={{ position: "relative", borderRadius: "var(--gg-r-lg)", overflow: "hidden", minHeight: 200, display: "flex", alignItems: "center", background: "linear-gradient(115deg, var(--gg-primary) 0%, var(--gg-coral) 100%)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img("hero", 700, 300)} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.35 }} />
          <div style={{ position: "relative", padding: 32, color: "#fff", maxWidth: 460 }}>
            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9, letterSpacing: 1 }}>YAZ GÜZELLİK FESTİVALİ</div>
            <h1 style={{ margin: "8px 0", fontSize: "clamp(24px,4vw,36px)", lineHeight: 1.1 }}>Makyajda %50&apos;ye varan indirim ✨</h1>
            <p style={{ margin: "0 0 16px", opacity: 0.95 }}>En sevdiğin markalar, sana özel fiyatlarla.</p>
            <a href={link({ category: "Makyaj" })} className="gg-btn" style={{ background: "#fff", color: "var(--gg-primary-dark)", fontWeight: 700 }}>Alışverişe Başla</a>
          </div>
        </div>
      ) : null}

      {/* MAĞAZALAR (master) — görselli banner kartları, carousel; kategorilerin ÜSTÜNDE */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Mağazalar</h2>
          {store ? <a href={link({ store: undefined, category: undefined })} className="gg-see-all">Tüm mağazalar ›</a> : null}
        </div>
        {stores.length === 0 ? <p style={{ color: "var(--gg-muted)", fontSize: 13 }}>Eşleşen mağaza yok.</p> : null}
        {stores.length > 0 ? (
          <Carousel itemWidth={210}>
            {stores.map((m) => {
              const selected = m.slug === store;
              // Master seçimi: kategori filtresini sıfırlar (yeni mağazanın kendi kategorileri gelsin).
              return (
                <a key={m.slug} href={selected ? link({ store: undefined, category: undefined }) : link({ store: m.slug, category: undefined })} className="gg-card" style={{ display: "block", padding: 0, overflow: "hidden", textDecoration: "none", boxShadow: selected ? "0 0 0 2px var(--gg-primary)" : undefined }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img("mag" + m.slug, 300, 120)} alt="" style={{ width: "100%", height: 80, objectFit: "cover", display: "block" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, marginTop: -24 }}>
                    <span style={{ width: 44, height: 44, borderRadius: "50%", background: m.color, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, border: "3px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,.15)" }}>{m.ad.slice(0, 2).toUpperCase()}</span>
                    <div>
                      <strong style={{ fontSize: 14 }}>{m.ad}</strong>
                      {selected ? <div style={{ fontSize: 11, color: "var(--gg-primary)", fontWeight: 700 }}>● Seçili</div> : null}
                    </div>
                  </div>
                </a>
              );
            })}
          </Carousel>
        ) : null}
      </section>

      {/* KATEGORİLER (detay) — mağazaların ALTINDA. Mağaza seçiliyse yalnızca o mağazanın kategorileri. */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{activeStore ? `${activeStore.ad} · Categories` : "Kategoriler"}</h2>
          {category ? <a href={link({ category: undefined })} className="gg-see-all">Filtreyi kaldır ›</a> : null}
        </div>
        {visibleCategories.length === 0 ? (
          <p style={{ color: "var(--gg-muted)", fontSize: 13 }}>Bu mağazada kategori bulunamadı.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14 }}>
            {visibleCategories.map((k) => {
              const active = category === k.ad;
              return (
                <a key={k.ad} href={link({ category: active ? undefined : k.ad })}
                   style={{ position: "relative", borderRadius: "var(--gg-r-lg)", overflow: "hidden", minHeight: 110, display: "flex", flexDirection: "column", justifyContent: "flex-end", textDecoration: "none", boxShadow: active ? "0 0 0 2px var(--gg-primary)" : "0 2px 10px rgba(0,0,0,.07)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img("kat" + k.ad, 300, 200)} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "relative", background: "linear-gradient(0deg, rgba(0,0,0,.6), transparent)", padding: "10px 12px", color: "#fff" }}>
                    <div style={{ fontSize: 20 }}>{k.ikon}</div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{k.ad}</div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
        {/* Alt kategori şeridi (seçili kategori ağacı) */}
        {category ? (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 12 }}>
            {CATEGORY_TREE.find((k) => k.ad === category)?.alt.map((s) => (
              <span key={s} style={{ border: "1px solid var(--gg-border)", borderRadius: "var(--gg-r-pill)", padding: "5px 13px", fontSize: 12.5, background: "var(--gg-surface)", whiteSpace: "nowrap" }}>{s}</span>
            ))}
          </div>
        ) : null}
      </section>

      {/* ÜRÜNLER (indirim rozetli, görselli) */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{isFiltered ? `Ürünler (${filteredProducts.length})` : "Sana Özel Öneriler"}</h2>
        </div>
        {/* Cilt tipi filtresi */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 14 }}>
          <span style={{ fontSize: 12.5, color: "var(--gg-muted)", alignSelf: "center", whiteSpace: "nowrap" }}>🧴 Cilt tipi:</span>
          {CILT_TIPLERI.map((c) => {
            const active = (searchParams.cilt || "Tümü") === c;
            return (
              <a key={c} href={link({ cilt: c === "Tümü" ? undefined : c })} style={{ borderRadius: "var(--gg-r-pill)", padding: "5px 13px", fontSize: 12.5, whiteSpace: "nowrap", textDecoration: "none", background: active ? "var(--gg-primary)" : "var(--gg-surface)", color: active ? "#fff" : "var(--gg-text)", border: `1px solid ${active ? "var(--gg-primary)" : "var(--gg-border)"}` }}>{c}</a>
            );
          })}
        </div>
        {filteredProducts.length === 0 ? <p style={{ color: "var(--gg-muted)", fontSize: 13 }}>Bu filtreye uygun ürün yok.</p> : null}
        <div className="gg-grid cols-5">
          {filteredProducts.map((p, i) => (
            <div key={p.id} style={{ position: "relative" }}>
              {p.discount ? (
                <span style={{ position: "absolute", top: 8, left: 8, zIndex: 2, background: "var(--gg-coral)", color: "#fff", fontSize: 11, fontWeight: 800, borderRadius: 8, padding: "3px 7px" }}>%{p.discount}</span>
              ) : null}
              <ProductCard
                name={p.name}
                brand={p.brand}
                price={tl(p.discount ? p.priceAmount * (1 - p.discount / 100) : p.priceAmount)}
                rating={p.rating ?? 4.5}
                count={p.count ?? 40}
                image={img(p.id ?? String(i))}
                skinTag={p.skinType || undefined}
                href={`/product/${p.id}`}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
