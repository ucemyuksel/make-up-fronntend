"use client";
import * as React from "react";
import { SectionHeader } from "@makeup/ui";

type CartItem = { id: string; name: string; brand: string; priceAmount: number; qty: number };
const tl = (n: number) => "₺" + Number(n).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CartPage() {
  const [items, setItems] = React.useState<CartItem[]>([]);

  React.useEffect(() => {
    setItems(JSON.parse(localStorage.getItem("gg_cart") || "[]"));
  }, []);

  const save = (next: CartItem[]) => {
    setItems(next);
    localStorage.setItem("gg_cart", JSON.stringify(next));
  };
  const setQty = (id: string, d: number) =>
    save(items.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + d) } : i)));
  const remove = (id: string) => save(items.filter((i) => i.id !== id));

  const subtotal = items.reduce((s, i) => s + i.priceAmount * i.qty, 0);

  const stepBox: React.CSSProperties = {
    width: 28, height: 28, borderRadius: 7, border: "1px solid var(--gg-border)",
    background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", userSelect: "none",
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <SectionHeader title={`Sepetim (${items.length})`} />
      {items.length === 0 ? (
        <p style={{ color: "var(--gg-muted)" }}>Sepetiniz boş. <a href="/" className="gg-see-all">Alışverişe başla ›</a></p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((i) => (
            <div key={i.id} className="gg-card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ width: 54, height: 54, borderRadius: 10, background: "linear-gradient(135deg, var(--gg-primary-soft), var(--gg-coral-soft))", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{i.name}</strong>
                <div style={{ fontSize: 12, color: "var(--gg-muted)" }}>{i.brand}</div>
                <div style={{ fontWeight: 700, marginTop: 2 }}>{tl(i.priceAmount)}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={stepBox} onClick={() => setQty(i.id, -1)}>−</span>
                <strong style={{ minWidth: 18, textAlign: "center" }}>{i.qty}</strong>
                <span style={stepBox} onClick={() => setQty(i.id, 1)}>+</span>
              </div>
              <span style={{ cursor: "pointer", color: "var(--gg-muted)" }} onClick={() => remove(i.id)}>🗑️</span>
            </div>
          ))}

          <div className="gg-card" style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--gg-muted)" }}>Ara Toplam</span><strong>{tl(subtotal)}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--gg-muted)" }}>Kargo</span><span style={{ color: "var(--gg-primary)" }}>Ücretsiz</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18 }}><strong>Toplam</strong><strong>{tl(subtotal)}</strong></div>
            <button className="gg-btn gg-btn-primary" style={{ justifyContent: "center", marginTop: 6 }} onClick={() => alert("Ödeme akışı: purchase-service entegrasyonu sonraki adım")}>
              Ödemeye Geç
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
