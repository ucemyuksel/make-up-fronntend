import * as React from "react";
import { Badge } from "@makeup/ui";
import { auth } from "../../../auth";
import { api, reviewApi, tl, type Product, type ReviewSummary } from "../../lib";
import { Degerlendirmeler } from "../../bilesenler/Degerlendirmeler";
import { AddToCart } from "./AddToCart";

const SWATCHES = ["#E7C4A0", "#D9A679", "#C98A5E", "#B06B45", "#8A4F33", "#5E3320"];

export default async function ProductDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { yhata?: string };
}) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  // Ürün detayı herkese açık (GET anonim — Cache Faz 2). Oturum varsa token gönderilir.
  const p = await api<Product>(`/api/products/${params.id}`, token ?? "");
  if (!p) return <p>Ürün bulunamadı. <a href="/" className="gg-see-all">← Mağaza</a></p>;

  // Puan özeti başlıkta da gösterilir (eskiden sabit "4.8 (125)" yazıyordu).
  const ozet = await reviewApi<ReviewSummary>(`/api/reviews/summary/PRODUCT/${p.id}`);

  return (
    <div style={{ maxWidth: 900 }}>
      <a href="/" className="gg-see-all" style={{ display: "inline-block", marginBottom: 14 }}>‹ Mağazaya dön</a>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1fr) 1fr", gap: 28 }} className="gg-detail">
        <div style={{ aspectRatio: "1/1", borderRadius: "var(--gg-r-lg)", background: "linear-gradient(135deg, var(--gg-primary-soft), var(--gg-coral-soft))" }} />
        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <div>
            <h1 style={{ margin: "0 0 2px" }}>{p.name}</h1>
            <div style={{ color: "var(--gg-muted)" }}>{p.brand}</div>
          </div>
          <div style={{ fontSize: 13, color: "var(--gg-muted)" }}>
            {ozet && ozet.count > 0 ? (
              <>
                <span style={{ color: "var(--gg-star)" }}>★ {Number(ozet.average).toFixed(1)}</span>{" "}
                ({ozet.count} değerlendirme)
              </>
            ) : (
              <span>Henüz değerlendirilmedi</span>
            )}{" "}
            · Stok: {p.stock}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{tl(p.priceAmount)}</div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Ürün Açıklaması</div>
            <p style={{ margin: 0, color: "var(--gg-muted)", fontSize: 14 }}>{p.description || "Açıklama yok."}</p>
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Renk Seçenekleri</div>
            <div style={{ display: "flex", gap: 8 }}>
              {SWATCHES.map((s) => (
                <span key={s} style={{ width: 26, height: 26, borderRadius: "50%", background: s, border: "2px solid #fff", boxShadow: "0 0 0 1px var(--gg-border)" }} />
              ))}
            </div>
          </div>

          <AddToCart product={{ id: p.id, name: p.name, brand: p.brand, priceAmount: p.priceAmount }} />
        </div>
      </div>

      <Degerlendirmeler tur="PRODUCT" subjectId={p.id} donusYolu={`/product/${p.id}`} hata={searchParams.yhata} />
    </div>
  );
}
