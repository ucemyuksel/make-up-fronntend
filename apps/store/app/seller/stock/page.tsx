import * as React from "react";
import { Badge } from "@makeup/ui";
import { requireSeller } from "../../authGuard";
import { api, tl, type Product, type Store } from "../../lib";

export const metadata = { title: "Stok Durumu — GlamGuide" };

/** Stok eşikleri — kritik/az/yeterli ayrımı tek yerde. */
const CRITICAL = 5;
const LOW = 20;

function status(stock: number) {
  if (stock <= 0) return { bg: "#FBE6E6", fg: "#B42318", text: "TÜKENDİ" };
  if (stock <= CRITICAL) return { bg: "#FBE6E6", fg: "#B42318", text: "KRİTİK" };
  if (stock <= LOW) return { bg: "#FCF2DE", fg: "#C98A1E", text: "AZALDI" };
  return { bg: "#E5F6EC", fg: "#1E9E5A", text: "YETERLİ" };
}

/**
 * Stok görünümü. Ürün <b>silinemez</b> — platformda satılmış bir ürünün kaydı
 * sipariş/yorum geçmişine bağlıdır; satıştan kaldırmak için stok sıfırlanır.
 */
export default async function StockStatus({
  searchParams,
}: {
  searchParams: { store?: string; filter?: string };
}) {
  const { token } = await requireSeller("/seller/stock");

  const stores = (await api<Store[]>("/api/stores", token)) ?? [];
  const selected = searchParams.store ?? stores[0]?.id;
  if (!selected) {
    return (
      <div style={{ maxWidth: 620, display: "grid", gap: 12 }}>
        <a href="/seller" className="gg-see-all">← Satıcı Paneli</a>
        <p>Önce bir mağaza açmalısın.</p>
      </div>
    );
  }

  const allProducts = (await api<Product[]>(`/api/products?storeId=${selected}`, token)) ?? [];
  const filter = searchParams.filter ?? "";
  const products =
    filter === "kritik" ? allProducts.filter((u) => u.stock <= CRITICAL)
      : filter === "azaldi" ? allProducts.filter((u) => u.stock > CRITICAL && u.stock <= LOW)
        : allProducts;

  const criticalCount = allProducts.filter((u) => u.stock <= CRITICAL).length;
  const azSayi = allProducts.filter((u) => u.stock > CRITICAL && u.stock <= LOW).length;
  const totalQuantity = allProducts.reduce((t, u) => t + Number(u.stock ?? 0), 0);
  const stockValue = allProducts.reduce((t, u) => t + Number(u.stock ?? 0) * Number(u.priceAmount ?? 0), 0);

  const tab = (key: string, label: string, n: number) => (
    <a key={key} href={`/seller/stock?store=${selected}${key ? `&filter=${key}` : ""}`}
       className={`gg-btn ${filter === key ? "gg-btn-primary" : "gg-btn-ghost"}`}
       style={{ fontSize: 12.5, padding: "5px 12px" }}>
      {label} ({n})
    </a>
  );

  return (
    <div style={{ maxWidth: 900, display: "grid", gap: 18 }}>
      <a href="/seller" className="gg-see-all">← Satıcı Paneli</a>
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
            <a key={s.id} href={`/seller/stock?store=${s.id}`}
               className={`gg-btn ${s.id === selected ? "gg-btn-primary" : "gg-btn-ghost"}`}>
              {s.name}
            </a>
          ))}
        </div>
      ) : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {[
          { l: "Ürün çeşidi", v: String(allProducts.length) },
          { l: "Toplam adet", v: totalQuantity.toLocaleString("tr-TR") },
          { l: "Stok değeri", v: tl(stockValue) },
          { l: "Kritik stock", v: String(criticalCount) },
        ].map((k) => (
          <div key={k.l} className="gg-card" style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, color: "var(--gg-muted)" }}>{k.l}</span>
            <strong style={{ fontSize: 21 }}>{k.v}</strong>
          </div>
        ))}
      </section>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tab("", "Tümü", allProducts.length)}
        {tab("kritik", "Kritik / tükenen", criticalCount)}
        {tab("azaldi", "Azalan", azSayi)}
      </div>

      {products.length === 0 ? (
        <p style={{ color: "var(--gg-muted)" }}>Bu süzgeçle eşleşen ürün yok.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {[...products].sort((a, b) => a.stock - b.stock).map((u) => {
            const d = status(u.stock);
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
                <a href={`/seller/products?store=${selected}&edit=${u.id}`}
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
