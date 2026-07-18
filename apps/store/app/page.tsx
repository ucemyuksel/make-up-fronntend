import * as React from "react";
import { SectionHeader, ProductCard } from "@makeup/ui";
import { auth } from "../auth";
import { api, tl, type Product, type Category } from "./lib";

// Geçici görseller (placeholder — prod'da MinIO'daki gerçek ürün görseli).
const img = (seed: string) => `https://picsum.photos/seed/gg${seed}/320/320`;

// Mağazalar (marketplace) — geçici veri; prod'da store-service'ten gelir.
const MAGAZALAR: { ad: string; renk: string }[] = [
  { ad: "Gratis", renk: "#E6007E" },
  { ad: "Watsons", renk: "#00A9CE" },
  { ad: "L'Oréal Paris", renk: "#111827" },
  { ad: "Sephora", renk: "#000000" },
  { ad: "MAC", renk: "#1F2937" },
  { ad: "Maybelline", renk: "#0A5FB4" },
  { ad: "Estée Lauder", renk: "#0B2A5B" },
  { ad: "Flormar", renk: "#C8102E" },
  { ad: "Rossmann", renk: "#C4122F" },
  { ad: "The Body Shop", renk: "#004B34" },
];

// Popüler ürünler (geçici görselli veri — mockup ile aynı düzen).
const MOCK_URUNLER = [
  { id: "u1", name: "Nude Far Paleti", brand: "Soft Colors", priceAmount: 1249, rating: 4.8, count: 125 },
  { id: "u2", name: "Lash Sensational Maskara", brand: "Maybelline", priceAmount: 439.9, rating: 4.7, count: 114 },
  { id: "u3", name: "Double Wear Fondöten", brand: "Estée Lauder", priceAmount: 1599, rating: 4.9, count: 86 },
  { id: "u4", name: "Mat Ruj - Velvet Teddy", brand: "MAC", priceAmount: 899, rating: 4.8, count: 93 },
  { id: "u5", name: "Vanilla Aydınlatıcı", brand: "Becca", priceAmount: 699, rating: 4.6, count: 61 },
  { id: "u6", name: "Hydra Nemlendirici", brand: "L'Oréal Paris", priceAmount: 329, rating: 4.5, count: 208 },
  { id: "u7", name: "Göz Farı Fırçası", brand: "Gratis", priceAmount: 129, rating: 4.4, count: 77 },
  { id: "u8", name: "Siyah Eyeliner", brand: "Flormar", priceAmount: 149, rating: 4.3, count: 152 },
  { id: "u9", name: "Cilt Serumu C Vitamini", brand: "The Body Shop", priceAmount: 549, rating: 4.7, count: 99 },
  { id: "u10", name: "Allık - Şeftali", brand: "Watsons", priceAmount: 199, rating: 4.5, count: 45 },
];

const KATEGORILER = [
  ["👁️", "Makyaj"], ["🧴", "Cilt Bakımı"], ["💇", "Saç"], ["🌸", "Parfüm"], ["🧰", "Aksesuar"], ["⋯", "Tümü"],
];

export default async function StoreHome() {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;

  // Canlı ürün/kategori (oturum varsa) — mağaza sayfası oturumsuz da dolu görünsün.
  let products: (Product & { rating?: number; count?: number })[] = MOCK_URUNLER as never;
  let chips = ["Tümü", "Makyaj", "Cilt Bakımı", "Saç", "Parfüm", "Aksesuar"];
  if (token) {
    const [live, cats] = await Promise.all([
      api<Product[]>("/api/products", token),
      api<Category[]>("/api/categories", token),
    ]);
    if (live && live.length > 0) {
      products = [...live, ...(MOCK_URUNLER as never[])].slice(0, 15) as never;
    }
    if (cats && cats.length > 0) chips = ["Tümü", ...cats.map((c) => c.name)];
  }

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <input className="gg-search" style={{ maxWidth: "100%" }} placeholder="Ürün, marka veya kategori ara..." />

      {/* Kategori çipleri */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        {chips.map((c, i) => (
          <span key={c} className={i === 0 ? "gg-pill" : ""} style={i === 0 ? { whiteSpace: "nowrap" } : { border: "1px solid var(--gg-border)", borderRadius: "var(--gg-r-pill)", padding: "6px 14px", fontSize: 13, background: "var(--gg-surface)", whiteSpace: "nowrap" }}>
            {c}
          </span>
        ))}
      </div>

      {/* Kampanya banner (görselli) */}
      <div style={{ background: "linear-gradient(120deg, var(--gg-primary-soft), var(--gg-coral-soft))", borderRadius: "var(--gg-r-lg)", padding: 28, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, overflow: "hidden" }}>
        <div>
          <h2 style={{ margin: "0 0 4px" }}>Yaz İndirimleri</h2>
          <p style={{ margin: "0 0 14px", color: "var(--gg-muted)" }}>%30&apos;a varan indirimler</p>
          <a href="#" className="gg-btn gg-btn-primary">Alışverişe Başla</a>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {["b1", "b2", "b3"].map((s) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={s} src={img(s)} alt="" width={90} height={90} style={{ borderRadius: 14, objectFit: "cover", boxShadow: "0 4px 14px rgba(0,0,0,.12)" }} />
          ))}
        </div>
      </div>

      {/* Mağazalar */}
      <section>
        <SectionHeader title="Mağazalar" href="#" />
        <div style={{ display: "flex", gap: 18, overflowX: "auto", paddingBottom: 6 }}>
          {MAGAZALAR.map((m) => (
            <a key={m.ad} href="#" style={{ display: "grid", justifyItems: "center", gap: 8, minWidth: 84, textDecoration: "none" }}>
              <span style={{ width: 72, height: 72, borderRadius: "50%", background: "#fff", border: "1px solid var(--gg-border)", display: "grid", placeItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
                <span style={{ width: 54, height: 54, borderRadius: "50%", background: m.renk, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 18 }}>
                  {m.ad.replace(/[^A-Za-zÇĞİÖŞÜ]/g, "").slice(0, 2).toUpperCase()}
                </span>
              </span>
              <span style={{ fontSize: 12, textAlign: "center", color: "var(--gg-text)", whiteSpace: "nowrap" }}>{m.ad}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Popüler Ürünler (görselli) */}
      <section>
        <SectionHeader title="Popüler Ürünler" href="#" />
        <div className="gg-grid cols-5">
          {products.map((p, i) => (
            <ProductCard
              key={p.id}
              name={p.name}
              brand={p.brand}
              price={tl(p.priceAmount)}
              rating={p.rating ?? 4.5}
              count={p.count ?? 40}
              image={img(p.id ?? String(i))}
              href={`/product/${p.id}`}
            />
          ))}
        </div>
      </section>

      {/* Kategoriler */}
      <section>
        <SectionHeader title="Kategoriler" />
        <div style={{ display: "flex", gap: 20, overflowX: "auto", paddingBottom: 4 }}>
          {KATEGORILER.map(([ic, l]) => (
            <div key={l} style={{ display: "grid", justifyItems: "center", gap: 8, minWidth: 76 }}>
              <span style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--gg-surface)", border: "1px solid var(--gg-border)", display: "grid", placeItems: "center", fontSize: 24 }}>{ic}</span>
              <span style={{ fontSize: 12.5 }}>{l}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
