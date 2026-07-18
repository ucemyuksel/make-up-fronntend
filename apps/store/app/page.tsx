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

// Popüler ürünler (geçici görselli veri). ciltTipi = ürünün uyumlu olduğu cilt(ler);
// baz/bakım ürünlerinde kritik, aksesuarlarda boş.
const MOCK_URUNLER = [
  { id: "u1", name: "Nude Far Paleti", brand: "Soft Colors", priceAmount: 1249, rating: 4.8, count: 125, ciltTipi: "Tüm ciltler" },
  { id: "u2", name: "Lash Sensational Maskara", brand: "Maybelline", priceAmount: 439.9, rating: 4.7, count: 114, ciltTipi: "Hassas göz uyumlu" },
  { id: "u3", name: "Double Wear Fondöten", brand: "Estée Lauder", priceAmount: 1599, rating: 4.9, count: 86, ciltTipi: "Yağlı & Karma" },
  { id: "u4", name: "Mat Ruj - Velvet Teddy", brand: "MAC", priceAmount: 899, rating: 4.8, count: 93, ciltTipi: "Kuru dudakta nemlendir" },
  { id: "u5", name: "Vanilla Aydınlatıcı", brand: "Becca", priceAmount: 699, rating: 4.6, count: 61, ciltTipi: "Normal & Kuru" },
  { id: "u6", name: "Hydra Nemlendirici", brand: "L'Oréal Paris", priceAmount: 329, rating: 4.5, count: 208, ciltTipi: "Kuru & Hassas" },
  { id: "u7", name: "Göz Farı Fırçası", brand: "Gratis", priceAmount: 129, rating: 4.4, count: 77, ciltTipi: "" },
  { id: "u8", name: "Siyah Eyeliner", brand: "Flormar", priceAmount: 149, rating: 4.3, count: 152, ciltTipi: "Hassas göz uyumlu" },
  { id: "u9", name: "Cilt Serumu C Vitamini", brand: "The Body Shop", priceAmount: 549, rating: 4.7, count: 99, ciltTipi: "Tüm ciltler" },
  { id: "u10", name: "Allık - Şeftali", brand: "Watsons", priceAmount: 199, rating: 4.5, count: 45, ciltTipi: "Tüm ciltler" },
];

// Cilt tipi filtresi (ürünlerin ciltTipi metniyle eşleşir).
const CILT_TIPLERI = ["Tümü", "Kuru", "Yağlı", "Karma", "Hassas", "Normal"];

const KATEGORILER = [
  ["👁️", "Makyaj"], ["🧴", "Cilt Bakımı"], ["💇", "Saç"], ["🌸", "Parfüm"], ["🧰", "Aksesuar"], ["⋯", "Tümü"],
];

export default async function StoreHome({ searchParams }: { searchParams: { q?: string; cilt?: string } }) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;

  // Canlı ürün/kategori (oturum varsa) — mağaza sayfası oturumsuz da dolu görünsün.
  let products: (Product & { rating?: number; count?: number; ciltTipi?: string })[] = MOCK_URUNLER as never;
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

  // Arama: ürün (ad/marka) + mağaza (isim) filtresi + cilt tipi filtresi.
  const q = (searchParams.q ?? "").toLocaleLowerCase("tr").trim();
  const cilt = searchParams.cilt && searchParams.cilt !== "Tümü" ? searchParams.cilt : "";
  const magazalar = q ? MAGAZALAR.filter((m) => m.ad.toLocaleLowerCase("tr").includes(q)) : MAGAZALAR;
  const urunler = products.filter((p) => {
    if (q && !`${p.name} ${p.brand}`.toLocaleLowerCase("tr").includes(q)) return false;
    if (cilt && !(p.ciltTipi ?? "").toLocaleLowerCase("tr").includes(cilt.toLocaleLowerCase("tr"))) return false;
    return true;
  });
  const ciltLink = (c: string) => {
    const p = new URLSearchParams();
    if (searchParams.q) p.set("q", searchParams.q);
    if (c !== "Tümü") p.set("cilt", c);
    const s = p.toString();
    return "/" + (s ? `?${s}` : "");
  };

  return (
    <div style={{ display: "grid", gap: 22 }}>
      {/* Çalışan arama (GET; sunucuda filtrelenir) */}
      <form method="get" style={{ display: "flex", gap: 8 }}>
        <input name="q" defaultValue={searchParams.q ?? ""} className="gg-search" style={{ flex: 1 }} placeholder="Ürün, marka veya mağaza ara..." autoComplete="off" />
        <button className="gg-btn gg-btn-primary" type="submit">Ara</button>
        {q ? <a href="/" className="gg-btn gg-btn-ghost">Temizle</a> : null}
      </form>

      {q ? (
        <div style={{ fontSize: 13.5, color: "var(--gg-muted)" }}>
          &quot;{searchParams.q}&quot; için {urunler.length} ürün, {magazalar.length} mağaza bulundu.
        </div>
      ) : null}

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
        <SectionHeader title={q ? `Mağazalar (${magazalar.length})` : "Mağazalar"} href="#" />
        {magazalar.length === 0 ? <p style={{ color: "var(--gg-muted)", fontSize: 13 }}>Eşleşen mağaza yok.</p> : null}
        <div style={{ display: "flex", gap: 18, overflowX: "auto", paddingBottom: 6 }}>
          {magazalar.map((m) => (
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
        <SectionHeader title={q ? `Ürünler (${urunler.length})` : "Popüler Ürünler"} href="#" />
        {/* Cilt tipine göre filtre */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 12 }}>
          <span style={{ fontSize: 12.5, color: "var(--gg-muted)", alignSelf: "center", whiteSpace: "nowrap" }}>🧴 Cilt tipi:</span>
          {CILT_TIPLERI.map((c) => {
            const aktif = (cilt || "Tümü") === c;
            return (
              <a key={c} href={ciltLink(c)} style={{ borderRadius: "var(--gg-r-pill)", padding: "5px 13px", fontSize: 12.5, whiteSpace: "nowrap", textDecoration: "none", background: aktif ? "var(--gg-primary)" : "var(--gg-surface)", color: aktif ? "#fff" : "var(--gg-text)", border: `1px solid ${aktif ? "var(--gg-primary)" : "var(--gg-border)"}` }}>
                {c}
              </a>
            );
          })}
        </div>
        {urunler.length === 0 ? <p style={{ color: "var(--gg-muted)", fontSize: 13 }}>Bu cilt tipine/aramaya uygun ürün yok.</p> : null}
        <div className="gg-grid cols-5">
          {urunler.map((p, i) => (
            <ProductCard
              key={p.id}
              name={p.name}
              brand={p.brand}
              price={tl(p.priceAmount)}
              rating={p.rating ?? 4.5}
              count={p.count ?? 40}
              image={img(p.id ?? String(i))}
              skinTag={p.ciltTipi || undefined}
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
