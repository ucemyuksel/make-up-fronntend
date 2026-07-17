import * as React from "react";
import { SectionHeader, ProductCard, Button, Badge } from "@makeup/ui";
import { auth } from "../auth";
import { api, tl, type Product, type Category } from "./lib";

export default async function StoreHome() {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;

  if (!token) {
    return (
      <div style={{ maxWidth: 440, display: "grid", gap: 14 }}>
        <Badge>Mağaza · Keycloak OIDC</Badge>
        <h1 style={{ margin: 0 }}>Mağazaya giriş</h1>
        <a href="/api/auth/signin?callbackUrl=%2F" className="gg-btn gg-btn-primary" style={{ justifySelf: "start" }}>
          Keycloak ile giriş yap
        </a>
      </div>
    );
  }

  const [products, categories] = await Promise.all([
    api<Product[]>("/api/products", token),
    api<Category[]>("/api/categories", token),
  ]);
  const chips = ["Tümü", ...(categories ?? []).map((c) => c.name)];

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <input className="gg-search" style={{ maxWidth: "100%" }} placeholder="Ürün, marka veya kategori ara..." />

      {/* Kategori çipleri */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        {chips.map((c, i) => (
          <span key={c} className={i === 0 ? "gg-pill" : ""} style={i === 0 ? {} : { border: "1px solid var(--gg-border)", borderRadius: "var(--gg-r-pill)", padding: "6px 14px", fontSize: 13, background: "var(--gg-surface)", whiteSpace: "nowrap" }}>
            {c}
          </span>
        ))}
      </div>

      {/* Kampanya banner */}
      <div style={{ background: "linear-gradient(120deg, var(--gg-primary-soft), var(--gg-coral-soft))", borderRadius: "var(--gg-r-lg)", padding: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 4px" }}>Yaz İndirimleri</h2>
          <p style={{ margin: 0, color: "var(--gg-muted)" }}>%30&apos;a varan indirimler</p>
        </div>
        <a href="#" className="gg-btn gg-btn-primary">Alışverişe Başla</a>
      </div>

      <section>
        <SectionHeader title={`Popüler Ürünler (${products?.length ?? 0})`} />
        <div className="gg-grid cols-5">
          {(products ?? []).map((p) => (
            <ProductCard key={p.id} name={p.name} brand={p.brand} price={tl(p.priceAmount)} href={`/product/${p.id}`} />
          ))}
        </div>
        {(!products || products.length === 0) && (
          <p style={{ color: "var(--gg-muted)" }}>Ürün bulunamadı (store-service çalışıyor mu?).</p>
        )}
      </section>
    </div>
  );
}
