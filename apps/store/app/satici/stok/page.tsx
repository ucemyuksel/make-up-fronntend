import * as React from "react";
import { Badge } from "@makeup/ui";
import { requireSeller } from "../../yetki";
import { api, tl, type Product, type Store } from "../../lib";

export const metadata = { title: "Stok Durumu — GlamGuide" };

/** Stok eşikleri — kritik/az/yeterli ayrımı tek yerde. */
const KRITIK = 5;
const AZ = 20;

function durum(stok: number) {
  if (stok <= 0) return { bg: "#FBE6E6", fg: "#B42318", text: "TÜKENDİ" };
  if (stok <= KRITIK) return { bg: "#FBE6E6", fg: "#B42318", text: "KRİTİK" };
  if (stok <= AZ) return { bg: "#FCF2DE", fg: "#C98A1E", text: "AZALDI" };
  return { bg: "#E5F6EC", fg: "#1E9E5A", text: "YETERLİ" };
}

/**
 * Stok görünümü. Ürün <b>silinemez</b> — platformda satılmış bir ürünün kaydı
 * sipariş/yorum geçmişine bağlıdır; satıştan kaldırmak için stok sıfırlanır.
 */
export default async function StokDurumu({
  searchParams,
}: {
  searchParams: { store?: string; filtre?: string };
}) {
  const { token } = await requireSeller("/satici/stok");

  const stores = (await api<Store[]>("/api/stores", token)) ?? [];
  const secili = searchParams.store ?? stores[0]?.id;
  if (!secili) {
    return (
      <div style={{ maxWidth: 620, display: "grid", gap: 12 }}>
        <a href="/satici" className="gg-see-all">← Satıcı Paneli</a>
        <p>Önce bir mağaza açmalısın.</p>
      </div>
    );
  }

  const tumUrunler = (await api<Product[]>(`/api/products?storeId=${secili}`, token)) ?? [];
  const filtre = searchParams.filtre ?? "";
  const urunler =
    filtre === "kritik" ? tumUrunler.filter((u) => u.stock <= KRITIK)
      : filtre === "azaldi" ? tumUrunler.filter((u) => u.stock > KRITIK && u.stock <= AZ)
        : tumUrunler;

  const kritikSayi = tumUrunler.filter((u) => u.stock <= KRITIK).length;
  const azSayi = tumUrunler.filter((u) => u.stock > KRITIK && u.stock <= AZ).length;
  const toplamAdet = tumUrunler.reduce((t, u) => t + Number(u.stock ?? 0), 0);
  const stokDegeri = tumUrunler.reduce((t, u) => t + Number(u.stock ?? 0) * Number(u.priceAmount ?? 0), 0);

  const sekme = (key: string, label: string, n: number) => (
    <a key={key} href={`/satici/stok?store=${secili}${key ? `&filtre=${key}` : ""}`}
       className={`gg-btn ${filtre === key ? "gg-btn-primary" : "gg-btn-ghost"}`}
       style={{ fontSize: 12.5, padding: "5px 12px" }}>
      {label} ({n})
    </a>
  );

  return (
    <div style={{ maxWidth: 900, display: "grid", gap: 18 }}>
      <a href="/satici" className="gg-see-all">← Satıcı Paneli</a>
      <div>
        <Badge>Envanter</Badge>
        <h1 style={{ margin: "8px 0 0" }}>Stok Durumu</h1>
        <p style={{ color: "var(--gg-muted)", margin: "6px 0 0", fontSize: 13.5 }}>
          Ürün <strong>silinemez</strong> — sipariş ve yorum geçmişi ona bağlıdır.
          Satıştan kaldırmak için stoğu sıfırla.
        </p>
      </div>

      {stores.length > 1 ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {stores.map((s) => (
            <a key={s.id} href={`/satici/stok?store=${s.id}`}
               className={`gg-btn ${s.id === secili ? "gg-btn-primary" : "gg-btn-ghost"}`}>
              {s.name}
            </a>
          ))}
        </div>
      ) : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {[
          { l: "Ürün çeşidi", v: String(tumUrunler.length) },
          { l: "Toplam adet", v: toplamAdet.toLocaleString("tr-TR") },
          { l: "Stok değeri", v: tl(stokDegeri) },
          { l: "Kritik stok", v: String(kritikSayi) },
        ].map((k) => (
          <div key={k.l} className="gg-card" style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, color: "var(--gg-muted)" }}>{k.l}</span>
            <strong style={{ fontSize: 21 }}>{k.v}</strong>
          </div>
        ))}
      </section>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {sekme("", "Tümü", tumUrunler.length)}
        {sekme("kritik", "Kritik / tükenen", kritikSayi)}
        {sekme("azaldi", "Azalan", azSayi)}
      </div>

      {urunler.length === 0 ? (
        <p style={{ color: "var(--gg-muted)" }}>Bu süzgeçle eşleşen ürün yok.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {[...urunler].sort((a, b) => a.stock - b.stock).map((u) => {
            const d = durum(u.stock);
            return (
              <article key={u.id} className="gg-card"
                       style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <strong style={{ fontSize: 14 }}>{u.name}</strong>
                  <div style={{ fontSize: 12.5, color: "var(--gg-muted)" }}>
                    {u.brand} · {tl(u.priceAmount)}
                  </div>
                </div>
                <span style={{
                  background: d.bg, color: d.fg, borderRadius: 999,
                  padding: "2px 10px", fontSize: 11, fontWeight: 700,
                }}>{d.text}</span>
                <span style={{ fontSize: 15, fontWeight: 700, minWidth: 60, textAlign: "right" }}>
                  {u.stock} adet
                </span>
                <a href={`/satici/urun?store=${secili}&duzenle=${u.id}`}
                   className="gg-btn gg-btn-ghost" style={{ fontSize: 12.5, padding: "5px 12px" }}>
                  Stok güncelle
                </a>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
