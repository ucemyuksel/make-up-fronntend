"use client";
import * as React from "react";

// storeId ZORUNLU: kupon ve hediye karti MAGAZAYA ait; hangi magazaya
// sorulacagi bilinmeden dogrulama yapilamaz.
type CartItem = { id: string; name: string; brand: string; priceAmount: number;
                  qty: number; storeId?: string };

export function AddToCart({ product }: { product: Omit<CartItem, "qty"> }) {
  const [qty, setQty] = React.useState(1);
  const [added, setAdded] = React.useState(false);

  const add = () => {
    const cart: CartItem[] = JSON.parse(localStorage.getItem("gg_cart") || "[]");
    const existing = cart.find((i) => i.id === product.id);
    if (existing) existing.qty += qty;
    else cart.push({ ...product, qty });
    localStorage.setItem("gg_cart", JSON.stringify(cart));
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const box: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 34, height: 34, borderRadius: 9, border: "1px solid var(--gg-border)",
    background: "#fff", cursor: "pointer", fontSize: 18, userSelect: "none",
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button type="button" style={box} onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Adedi azalt">−</button>
        <strong style={{ minWidth: 24, textAlign: "center" }} aria-live="polite">{qty}</strong>
        <button type="button" style={box} onClick={() => setQty((q) => q + 1)} aria-label="Adedi artır">+</button>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="gg-btn gg-btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={add}>
          {added ? "✓ Sepete Eklendi" : "Sepete Ekle"}
        </button>
        <a href="/cart" className="gg-btn gg-btn-ghost">🛒</a>
      </div>
    </div>
  );
}
