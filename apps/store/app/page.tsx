import * as React from "react";
import { ProductCard, Carousel } from "@makeup/ui";
import { auth } from "../auth";
import { api, tl, type Product, type Category } from "./lib";

// Geçici görseller (placeholder — prod'da MinIO'daki gerçek ürün/mağaza görseli).
const img = (seed: string, w = 320, h = 320) => `https://picsum.photos/seed/gg${seed}/${w}/${h}`;

// Mağazalar (marketplace) — geçici veri; prod'da store-service'ten gelir.
const STORES = [
  { ad: "Gratis", renk: "#E6007E", slug: "gratis" },
  { ad: "Watsons", renk: "#00A9CE", slug: "watsons" },
  { ad: "L'Oréal Paris", renk: "#111827", slug: "loreal" },
  { ad: "Sephora", renk: "#000000", slug: "sephora" },
  { ad: "MAC", renk: "#1F2937", slug: "mac" },
  { ad: "Maybelline", renk: "#0A5FB4", slug: "maybelline" },
  { ad: "Estée Lauder", renk: "#0B2A5B", slug: "estee" },
  { ad: "Flormar", renk: "#C8102E", slug: "flormar" },
];

// Kategori ağacı (Trendyol tarzı: kategori → alt kategoriler).
const KATEGORI_AGACI: { ad: string; ikon: string; alt: string[] }[] = [
  { ad: "Makyaj", ikon: "💄", alt: ["Ruj", "Fondöten", "Maskara", "Far", "Eyeliner", "Allık", "Aydınlatıcı"] },
  { ad: "Cilt Bakımı", ikon: "🧴", alt: ["Nemlendirici", "Serum", "Temizleyici", "Güneş Koruyucu", "Maske"] },
  { ad: "Saç", ikon: "💇", alt: ["Şampuan", "Saç Kremi", "Serum", "Şekillendirici"] },
  { ad: "Parfüm", ikon: "🌸", alt: ["Kadın Parfüm", "Erkek Parfüm", "Deodorant"] },
  { ad: "Aksesuar", ikon: "🧰", alt: ["Fırça", "Sünger", "Ayna", "Makyaj Çantası"] },
  { ad: "Anne & Bebek", ikon: "🍼", alt: ["Bebek Bakım", "Bebek Bezi"] },
];

// Ürünler (kategori + mağaza + indirim ile). Geçici veri — her mağazanın kendi ürün/kategorileri var.
const MOCK_PRODUCTS = [
  // Gratis (geniş yelpaze)
  { id: "g1", name: "Nude Far Paleti", brand: "Note", magaza: "gratis", kategori: "Makyaj", priceAmount: 349, rating: 4.6, count: 210, ciltTipi: "Tüm ciltler", indirim: 30 },
  { id: "g2", name: "Micellar Temizleme Suyu", brand: "Garnier", magaza: "gratis", kategori: "Cilt Bakımı", priceAmount: 129, rating: 4.7, count: 540, ciltTipi: "Hassas", indirim: 15 },
  { id: "g3", name: "Göz Farı Fırçası", brand: "Gratis", magaza: "gratis", kategori: "Aksesuar", priceAmount: 89, rating: 4.4, count: 77, ciltTipi: "", indirim: 0 },
  { id: "g4", name: "Onarıcı Şampuan", brand: "Elidor", magaza: "gratis", kategori: "Saç", priceAmount: 99, rating: 4.3, count: 132, ciltTipi: "", indirim: 20 },
  // Watsons
  { id: "w1", name: "C Vitamini Serumu", brand: "The Body Shop", magaza: "watsons", kategori: "Cilt Bakımı", priceAmount: 549, rating: 4.7, count: 99, ciltTipi: "Tüm ciltler", indirim: 0 },
  { id: "w2", name: "Keratin Saç Kremi", brand: "Watsons", magaza: "watsons", kategori: "Saç", priceAmount: 159, rating: 4.5, count: 64, ciltTipi: "", indirim: 10 },
  { id: "w3", name: "Çiçeksi Kadın Parfüm", brand: "Watsons", magaza: "watsons", kategori: "Parfüm", priceAmount: 399, rating: 4.6, count: 88, ciltTipi: "", indirim: 25 },
  // L'Oréal Paris
  { id: "l1", name: "Hydra Nemlendirici", brand: "L'Oréal Paris", magaza: "loreal", kategori: "Cilt Bakımı", priceAmount: 329, rating: 4.5, count: 208, ciltTipi: "Kuru & Hassas", indirim: 10 },
  { id: "l2", name: "Infaillible Fondöten", brand: "L'Oréal Paris", magaza: "loreal", kategori: "Makyaj", priceAmount: 429, rating: 4.7, count: 176, ciltTipi: "Karma", indirim: 0 },
  { id: "l3", name: "Elseve Saç Serumu", brand: "L'Oréal Paris", magaza: "loreal", kategori: "Saç", priceAmount: 189, rating: 4.4, count: 143, ciltTipi: "", indirim: 15 },
  // Sephora
  { id: "s1", name: "Vanilla Aydınlatıcı", brand: "Becca", magaza: "sephora", kategori: "Makyaj", priceAmount: 699, rating: 4.6, count: 61, ciltTipi: "Normal & Kuru", indirim: 20 },
  { id: "s2", name: "Sephora İmza Parfüm", brand: "Sephora", magaza: "sephora", kategori: "Parfüm", priceAmount: 549, rating: 4.5, count: 39, ciltTipi: "", indirim: 0 },
  // MAC
  { id: "m1", name: "Mat Ruj - Velvet Teddy", brand: "MAC", magaza: "mac", kategori: "Makyaj", priceAmount: 899, rating: 4.8, count: 93, ciltTipi: "Kuru dudakta nemlendir", indirim: 0 },
  { id: "m2", name: "Fix+ Sabitleyici Sprey", brand: "MAC", magaza: "mac", kategori: "Makyaj", priceAmount: 749, rating: 4.7, count: 58, ciltTipi: "Tüm ciltler", indirim: 10 },
  // Maybelline
  { id: "y1", name: "Lash Sensational Maskara", brand: "Maybelline", magaza: "maybelline", kategori: "Makyaj", priceAmount: 439.9, rating: 4.7, count: 114, ciltTipi: "Hassas göz uyumlu", indirim: 0 },
  { id: "y2", name: "Fit Me Fondöten", brand: "Maybelline", magaza: "maybelline", kategori: "Makyaj", priceAmount: 329, rating: 4.6, count: 220, ciltTipi: "Karma & Yağlı", indirim: 15 },
  // Estée Lauder
  { id: "e1", name: "Double Wear Fondöten", brand: "Estée Lauder", magaza: "estee", kategori: "Makyaj", priceAmount: 1599, rating: 4.9, count: 86, ciltTipi: "Yağlı & Karma", indirim: 15 },
  { id: "e2", name: "Advanced Night Repair Serum", brand: "Estée Lauder", magaza: "estee", kategori: "Cilt Bakımı", priceAmount: 2450, rating: 4.9, count: 154, ciltTipi: "Tüm ciltler", indirim: 0 },
  { id: "e3", name: "Beautiful Kadın Parfüm", brand: "Estée Lauder", magaza: "estee", kategori: "Parfüm", priceAmount: 1890, rating: 4.8, count: 41, ciltTipi: "", indirim: 10 },
  // Flormar
  { id: "f1", name: "Siyah Eyeliner", brand: "Flormar", magaza: "flormar", kategori: "Makyaj", priceAmount: 149, rating: 4.3, count: 152, ciltTipi: "Hassas göz uyumlu", indirim: 25 },
  { id: "f2", name: "Allık - Şeftali", brand: "Flormar", magaza: "flormar", kategori: "Makyaj", priceAmount: 129, rating: 4.5, count: 45, ciltTipi: "Tüm ciltler", indirim: 40 },
  { id: "f3", name: "Makyaj Çantası", brand: "Flormar", magaza: "flormar", kategori: "Aksesuar", priceAmount: 199, rating: 4.4, count: 33, ciltTipi: "", indirim: 0 },
];

const CILT_TIPLERI = ["Tümü", "Kuru", "Yağlı", "Karma", "Hassas", "Normal"];

export default async function StoreHome({ searchParams }: { searchParams: { q?: string; cilt?: string; kategori?: string; magaza?: string } }) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;

  let products: (Product & { rating?: number; count?: number; ciltTipi?: string; kategori?: string; magaza?: string; indirim?: number })[] = MOCK_PRODUCTS as never;
  if (token) {
    const live = await api<Product[]>("/api/products", token);
    if (live && live.length > 0) products = [...live, ...(MOCK_PRODUCTS as never[])].slice(0, 20) as never;
  }

  // Filtreler (birleşik): arama + cilt + kategori + mağaza.
  const q = (searchParams.q ?? "").toLocaleLowerCase("tr").trim();
  const cilt = searchParams.cilt && searchParams.cilt !== "Tümü" ? searchParams.cilt.toLocaleLowerCase("tr") : "";
  const kategori = searchParams.kategori ?? "";
  const magaza = searchParams.magaza ?? "";
  const activeStore = STORES.find((m) => m.slug === magaza);

  const magazalar = q ? STORES.filter((m) => m.ad.toLocaleLowerCase("tr").includes(q)) : STORES;
  const filteredProducts = products.filter((p) => {
    if (q && !`${p.name} ${p.brand}`.toLocaleLowerCase("tr").includes(q)) return false;
    if (cilt && !(p.ciltTipi ?? "").toLocaleLowerCase("tr").includes(cilt)) return false;
    if (kategori && p.kategori !== kategori) return false;
    if (magaza && p.magaza !== magaza) return false;
    return true;
  });

  // Master-detail: seçili mağazanın KENDİ kategorileri (o mağazanın ürünlerinden türetilir).
  const magazaninUrunleri = magaza ? products.filter((p) => p.magaza === magaza) : products;
  const magazaKategoriSeti = new Set(magazaninUrunleri.map((p) => p.kategori));
  const gosterilecekKategoriler = magaza ? KATEGORI_AGACI.filter((k) => magazaKategoriSeti.has(k.ad)) : KATEGORI_AGACI;

  // Filtre linki üretici (mevcut parametreleri korur).
  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base = { q: searchParams.q, cilt: searchParams.cilt, kategori, magaza, ...patch };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    const s = p.toString();
    return "/" + (s ? `?${s}` : "");
  };

  const isFiltered = q || cilt || kategori || magaza;

  return (
    <div style={{ display: "grid", gap: 26, gridTemplateColumns: "minmax(0, 1fr)" }}>
      {/* Arama */}
      <form method="get" style={{ display: "flex", gap: 8 }}>
        <input name="q" defaultValue={searchParams.q ?? ""} className="gg-search" style={{ flex: 1 }} placeholder="Ürün, marka veya mağaza ara..." autoComplete="off" />
        <button className="gg-btn gg-btn-primary" type="submit">Ara</button>
        {isFiltered ? <a href="/" className="gg-btn gg-btn-ghost">Temizle</a> : null}
      </form>

      {/* Aktif filtre bilgisi */}
      {activeStore ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: `linear-gradient(120deg, ${activeStore.renk}22, transparent)`, borderRadius: "var(--gg-r-lg)", padding: 16 }}>
          <span style={{ width: 48, height: 48, borderRadius: 12, background: activeStore.renk, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800 }}>{activeStore.ad.slice(0, 2).toUpperCase()}</span>
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
            <a href={link({ kategori: "Makyaj" })} className="gg-btn" style={{ background: "#fff", color: "var(--gg-primary-dark)", fontWeight: 700 }}>Alışverişe Başla</a>
          </div>
        </div>
      ) : null}

      {/* MAĞAZALAR (master) — görselli banner kartları, carousel; kategorilerin ÜSTÜNDE */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Mağazalar</h2>
          {magaza ? <a href={link({ magaza: undefined, kategori: undefined })} className="gg-see-all">Tüm mağazalar ›</a> : null}
        </div>
        {magazalar.length === 0 ? <p style={{ color: "var(--gg-muted)", fontSize: 13 }}>Eşleşen mağaza yok.</p> : null}
        {magazalar.length > 0 ? (
          <Carousel itemWidth={210}>
            {magazalar.map((m) => {
              const secili = m.slug === magaza;
              // Master seçimi: kategori filtresini sıfırlar (yeni mağazanın kendi kategorileri gelsin).
              return (
                <a key={m.slug} href={secili ? link({ magaza: undefined, kategori: undefined }) : link({ magaza: m.slug, kategori: undefined })} className="gg-card" style={{ display: "block", padding: 0, overflow: "hidden", textDecoration: "none", boxShadow: secili ? "0 0 0 2px var(--gg-primary)" : undefined }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img("mag" + m.slug, 300, 120)} alt="" style={{ width: "100%", height: 80, objectFit: "cover", display: "block" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, marginTop: -24 }}>
                    <span style={{ width: 44, height: 44, borderRadius: "50%", background: m.renk, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, border: "3px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,.15)" }}>{m.ad.slice(0, 2).toUpperCase()}</span>
                    <div>
                      <strong style={{ fontSize: 14 }}>{m.ad}</strong>
                      {secili ? <div style={{ fontSize: 11, color: "var(--gg-primary)", fontWeight: 700 }}>● Seçili</div> : null}
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
          <h2 style={{ margin: 0, fontSize: 18 }}>{activeStore ? `${activeStore.ad} · Kategoriler` : "Kategoriler"}</h2>
          {kategori ? <a href={link({ kategori: undefined })} className="gg-see-all">Filtreyi kaldır ›</a> : null}
        </div>
        {gosterilecekKategoriler.length === 0 ? (
          <p style={{ color: "var(--gg-muted)", fontSize: 13 }}>Bu mağazada kategori bulunamadı.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14 }}>
            {gosterilecekKategoriler.map((k) => {
              const aktif = kategori === k.ad;
              return (
                <a key={k.ad} href={link({ kategori: aktif ? undefined : k.ad })}
                   style={{ position: "relative", borderRadius: "var(--gg-r-lg)", overflow: "hidden", minHeight: 110, display: "flex", flexDirection: "column", justifyContent: "flex-end", textDecoration: "none", boxShadow: aktif ? "0 0 0 2px var(--gg-primary)" : "0 2px 10px rgba(0,0,0,.07)" }}>
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
        {kategori ? (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 12 }}>
            {KATEGORI_AGACI.find((k) => k.ad === kategori)?.alt.map((s) => (
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
            const aktif = (searchParams.cilt || "Tümü") === c;
            return (
              <a key={c} href={link({ cilt: c === "Tümü" ? undefined : c })} style={{ borderRadius: "var(--gg-r-pill)", padding: "5px 13px", fontSize: 12.5, whiteSpace: "nowrap", textDecoration: "none", background: aktif ? "var(--gg-primary)" : "var(--gg-surface)", color: aktif ? "#fff" : "var(--gg-text)", border: `1px solid ${aktif ? "var(--gg-primary)" : "var(--gg-border)"}` }}>{c}</a>
            );
          })}
        </div>
        {filteredProducts.length === 0 ? <p style={{ color: "var(--gg-muted)", fontSize: 13 }}>Bu filtreye uygun ürün yok.</p> : null}
        <div className="gg-grid cols-5">
          {filteredProducts.map((p, i) => (
            <div key={p.id} style={{ position: "relative" }}>
              {p.indirim ? (
                <span style={{ position: "absolute", top: 8, left: 8, zIndex: 2, background: "var(--gg-coral)", color: "#fff", fontSize: 11, fontWeight: 800, borderRadius: 8, padding: "3px 7px" }}>%{p.indirim}</span>
              ) : null}
              <ProductCard
                name={p.name}
                brand={p.brand}
                price={tl(p.indirim ? p.priceAmount * (1 - p.indirim / 100) : p.priceAmount)}
                rating={p.rating ?? 4.5}
                count={p.count ?? 40}
                image={img(p.id ?? String(i))}
                skinTag={p.ciltTipi || undefined}
                href={`/product/${p.id}`}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
