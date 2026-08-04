import * as React from "react";
import { Badge } from "@makeup/ui";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { requireSeller } from "../../authGuard";
import { api, reviewApi, reviewSend, star, type Product, type Store, type Review } from "../../lib";

export const metadata = { title: "Ürün Yorumları — GlamGuide" };

/**
 * Satıcının kendi ürünlerine gelen değerlendirmeler. Cevaplanmamışlar üstte
 * listelenir; satıcı yorumu silemez, yalnızca cevap verebilir.
 */
export default async function SellerReviews({
  searchParams,
}: {
  searchParams: { store?: string; cevapsiz?: string; ok?: string; error?: string };
}) {
  const { token } = await requireSeller("/seller/reviews");

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

  const products = (await api<Product[]>(`/api/products?storeId=${selected}`, token)) ?? [];
  const productNames = new Map(products.map((u) => [u.id, u.name]));
  const ids = products.map((u) => u.id).join(",");
  const onlyUnanswered = searchParams.cevapsiz === "1";

  const reviews = ids
    ? (await reviewApi<Review[]>(
        `/api/reviews/for-seller?type=PRODUCT&ids=${ids}&cevapsiz=${onlyUnanswered}`,
        token,
      )) ?? []
    : [];
  const unansweredCount = reviews.filter((r) => !r.sellerReply).length;

  async function cevapla(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    const returnTo = String(formData.get("returnTo") ?? "/seller/reviews");
    const r = await reviewSend(`/api/reviews/${formData.get("id")}/reply`, t, {
      reply: String(formData.get("reply") ?? "").trim(),
    });
    revalidatePath("/seller/reviews");
    const ek = returnTo.includes("?") ? "&" : "?";
    redirect(r.ok ? `${returnTo}${ek}ok=1` : `${returnTo}${ek}error=${encodeURIComponent(r.error ?? "error")}`);
  }

  const back = `/seller/reviews?store=${selected}${onlyUnanswered ? "&cevapsiz=1" : ""}`;

  return (
    <div style={{ maxWidth: 820, display: "grid", gap: 16 }}>
      <a href="/seller" className="gg-see-all">← Satıcı Paneli</a>
      <div>
        <Badge>Müşteri Geri Bildirimi</Badge>
        <h1 style={{ margin: "8px 0 0" }}>Ürün Yorumları</h1>
        <p style={{ color: "var(--gg-muted)", margin: "6px 0 0", fontSize: 13.5 }}>
          Yalnızca ürünü satın alanlar puan verebilir. Yorumu kaldıramazsın — cevap verebilirsin.
        </p>
      </div>

      {searchParams.ok ? (
        <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>✓ Cevabın yayınlandı.</div>
      ) : null}
      {searchParams.error ? (
        <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
          Hata: {searchParams.error}
        </div>
      ) : null}

      {stores.length > 1 ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {stores.map((s) => (
            <a key={s.id} href={`/seller/reviews?store=${s.id}`}
               className={`gg-btn ${s.id === selected ? "gg-btn-primary" : "gg-btn-ghost"}`}>
              {s.name}
            </a>
          ))}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8 }}>
        <a href={`/seller/reviews?store=${selected}`}
           className={`gg-btn ${onlyUnanswered ? "gg-btn-ghost" : "gg-btn-primary"}`}>
          Tümü
        </a>
        <a href={`/seller/reviews?store=${selected}&cevapsiz=1`}
           className={`gg-btn ${onlyUnanswered ? "gg-btn-primary" : "gg-btn-ghost"}`}>
          Cevap bekleyenler{!onlyUnanswered && unansweredCount > 0 ? ` (${unansweredCount})` : ""}
        </a>
      </div>

      {reviews.length === 0 ? (
        <p style={{ color: "var(--gg-muted)" }}>
          {onlyUnanswered ? "Cevap bekleyen yorum yok." : "Henüz ürünlerine yorum gelmemiş."}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {reviews.map((r) => (
            <article key={r.id} className="gg-card" style={{ display: "grid", gap: 9 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <strong style={{ fontSize: 14 }}>{productNames.get(r.subjectId) ?? "Ürün"}</strong>
                <span style={{ color: "var(--gg-star)" }}>{star(r.rating)}</span>
                {r.verifiedPurchase ? (
                  <span style={{
                    background: "#E5F6EC", color: "#1E9E5A", borderRadius: 999,
                    padding: "2px 9px", fontSize: 11, fontWeight: 700,
                  }}>✓ SATIN ALDI</span>
                ) : null}
                {!r.sellerReply ? (
                  <span style={{
                    background: "#FCF2DE", color: "#C98A1E", borderRadius: 999,
                    padding: "2px 9px", fontSize: 11, fontWeight: 700,
                  }}>CEVAP BEKLİYOR</span>
                ) : null}
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 11.5, color: "var(--gg-muted)" }}>
                  {new Date(r.createdAt).toLocaleDateString("tr-TR")}
                </span>
              </div>

              {r.text ? <p style={{ margin: 0, fontSize: 14 }}>{r.text}</p> : (
                <p style={{ margin: 0, fontSize: 13, color: "var(--gg-muted)" }}>(yalnızca puan verilmiş)</p>
              )}

              {r.sellerReply ? (
                <div style={{
                  background: "var(--gg-primary-soft)", borderRadius: 10, padding: "9px 11px", fontSize: 13,
                }}>
                  <strong style={{ fontSize: 12, color: "var(--gg-primary-dark)" }}>🏪 Cevabın: </strong>
                  {r.sellerReply}
                </div>
              ) : null}

              <form action={cevapla} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="returnTo" value={back} />
                <input name="reply" required maxLength={2000} className="gg-search"
                       style={{ flex: 1, minWidth: 240 }}
                       placeholder={r.sellerReply ? "Cevabını güncelle" : "Müşteriye cevap yaz"} />
                <button className="gg-btn gg-btn-primary" type="submit">
                  {r.sellerReply ? "Güncelle" : "Cevapla"}
                </button>
              </form>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
