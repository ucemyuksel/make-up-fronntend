import * as React from "react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { reviewApi, reviewSend, star, type Review, type ReviewSummary } from "../lib";

/**
 * Ürün/tarif değerlendirmeleri: puan özeti, yorum listesi ve yorum formu.
 *
 * <p>Form yalnızca <b>satın almış</b> kullanıcıya açılır — bu kontrol backend'de
 * de var (403), buradaki yalnızca kullanıcıyı boşuna yazdırmamak için.
 */
export async function Ratings({
  kind,
  subjectId,
  returnPath,
  error,
}: {
  kind: "PRODUCT" | "RECIPE";
  subjectId: string;
  /** Kaydettikten sonra dönülecek sayfa (revalidate + redirect için). */
  returnPath: string;
  error?: string;
}) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;

  const [summary, reviews, izin] = await Promise.all([
    reviewApi<ReviewSummary>(`/api/reviews/summary/${kind}/${subjectId}`),
    reviewApi<Review[]>(`/api/reviews/list/${kind}/${subjectId}`),
    token
      ? reviewApi<{ canReview: boolean }>(`/api/reviews/can-review/${kind}/${subjectId}`, token)
      : Promise.resolve(null),
  ]);

  const quantity = summary?.count ?? 0;
  const average = Number(summary?.average ?? 0);
  const yazabilir = izin?.canReview === true;

  async function save(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    const r = await reviewSend(`/api/reviews/${kind}/${subjectId}`, t, {
      rating: Number(formData.get("rating") ?? 5),
      text: String(formData.get("text") ?? "").trim(),
    });
    revalidatePath(returnPath);
    // redirect() try/catch dışında olmalı — NEXT_REDIRECT yutulmasın.
    redirect(r.ok ? returnPath : `${returnPath}?cerror=${encodeURIComponent(r.error ?? "error")}`);
  }

  // Yıldız dağılımı çubukları için en yüksek değer (oransal genişlik).
  const dagilim = [
    { starCount: 5, quantity: summary?.five ?? 0 },
    { starCount: 4, quantity: summary?.four ?? 0 },
    { starCount: 3, quantity: summary?.three ?? 0 },
    { starCount: 2, quantity: summary?.two ?? 0 },
    { starCount: 1, quantity: summary?.one ?? 0 },
  ];

  return (
    <section style={{ marginTop: 34, display: "grid", gap: 18 }}>
      <h2 style={{ margin: 0, fontSize: 19 }}>Değerlendirmeler</h2>

      {quantity === 0 ? (
        <p style={{ color: "var(--gg-muted)", margin: 0 }}>
          Henüz değerlendirme yok. {kind === "PRODUCT" ? "Ürünü" : "Tarifi"} satın alanlar puan verebilir.
        </p>
      ) : (
        <div className="gg-card" style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ textAlign: "center", minWidth: 110 }}>
            <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{average.toFixed(1)}</div>
            <div style={{ color: "var(--gg-star)", fontSize: 18 }}>{star(average)}</div>
            <div style={{ fontSize: 12, color: "var(--gg-muted)" }}>{quantity} değerlendirme</div>
          </div>
          <div style={{ flex: 1, minWidth: 200, display: "grid", gap: 4 }}>
            {dagilim.map((d) => (
              <div key={d.starCount} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <span style={{ width: 34, color: "var(--gg-muted)" }}>{d.starCount} ★</span>
                <span style={{ flex: 1, height: 7, background: "var(--gg-border)", borderRadius: 999, overflow: "hidden" }}>
                  <span style={{
                    display: "block", height: "100%", borderRadius: 999,
                    width: quantity > 0 ? `${(d.quantity / quantity) * 100}%` : "0%",
                    background: "var(--gg-star, #F5A623)",
                  }} />
                </span>
                <span style={{ width: 24, textAlign: "right", color: "var(--gg-muted)" }}>{d.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error ? (
        <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
          Değerlendirme kaydedilemedi: {error}
        </div>
      ) : null}

      {/* Yorum formu — yalnızca satın alanlara */}
      {!token ? (
        <p style={{ color: "var(--gg-muted)", fontSize: 13.5, margin: 0 }}>
          Değerlendirme yazmak için <a href="/api/auth/signin" className="gg-see-all">giriş yap</a>.
        </p>
      ) : yazabilir ? (
        <form action={save} className="gg-card" style={{ display: "grid", gap: 10 }}>
          <strong style={{ fontSize: 14 }}>Değerlendirmeni yaz</strong>
          <label style={{ display: "grid", gap: 4, fontSize: 13, maxWidth: 220 }}>
            Puan
            <select name="rating" className="gg-search" defaultValue="5">
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{"★".repeat(n)} ({n})</option>
              ))}
            </select>
          </label>
          <textarea name="text" className="gg-search" rows={3} maxLength={2000}
                    placeholder="Deneyimini yaz (isteğe bağlı)" />
          <button className="gg-btn gg-btn-primary" type="submit" style={{ justifySelf: "start" }}>
            Değerlendirmeyi Gönder
          </button>
          <span style={{ fontSize: 12, color: "var(--gg-muted)" }}>
            Daha önce yazdıysan bu gönderim mevcut değerlendirmeni günceller.
          </span>
        </form>
      ) : (
        <div className="gg-card" style={{ fontSize: 13.5, color: "var(--gg-muted)" }}>
          🔒 Yıldız ve yorum yalnızca {kind === "PRODUCT" ? "bu ürünü" : "bu tarifi"} <strong>satın alanlara</strong> açıktır.
        </div>
      )}

      {/* Yorum listesi */}
      <div style={{ display: "grid", gap: 12 }}>
        {(reviews ?? []).map((r) => (
          <article key={r.id} className="gg-card" style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ color: "var(--gg-star)" }}>{star(r.rating)}</span>
              {r.verifiedPurchase ? (
                <span style={{
                  background: "#E5F6EC", color: "#1E9E5A", borderRadius: 999,
                  padding: "2px 9px", fontSize: 11, fontWeight: 700,
                }}>✓ SATIN ALDI</span>
              ) : null}
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11.5, color: "var(--gg-muted)" }}>
                {new Date(r.createdAt).toLocaleDateString("tr-TR")}
              </span>
            </div>
            {r.text ? <p style={{ margin: 0, fontSize: 14 }}>{r.text}</p> : null}
            {r.sellerReply ? (
              <div style={{
                background: "var(--gg-primary-soft)", borderRadius: 10, padding: "9px 11px",
                fontSize: 13, display: "grid", gap: 3,
              }}>
                <strong style={{ fontSize: 12, color: "var(--gg-primary-dark)" }}>🏪 Satıcı cevabı</strong>
                <span>{r.sellerReply}</span>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
