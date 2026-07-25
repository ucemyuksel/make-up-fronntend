import * as React from "react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { reviewApi, reviewSend, yildiz, type Review, type ReviewSummary } from "../lib";

/**
 * Ürün/tarif değerlendirmeleri: puan özeti, yorum listesi ve yorum formu.
 *
 * <p>Form yalnızca <b>satın almış</b> kullanıcıya açılır — bu kontrol backend'de
 * de var (403), buradaki yalnızca kullanıcıyı boşuna yazdırmamak için.
 */
export async function Degerlendirmeler({
  tur,
  subjectId,
  donusYolu,
  hata,
}: {
  tur: "PRODUCT" | "RECIPE";
  subjectId: string;
  /** Kaydettikten sonra dönülecek sayfa (revalidate + redirect için). */
  donusYolu: string;
  hata?: string;
}) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;

  const [ozet, yorumlar, izin] = await Promise.all([
    reviewApi<ReviewSummary>(`/api/reviews/summary/${tur}/${subjectId}`),
    reviewApi<Review[]>(`/api/reviews/list/${tur}/${subjectId}`),
    token
      ? reviewApi<{ canReview: boolean }>(`/api/reviews/can-review/${tur}/${subjectId}`, token)
      : Promise.resolve(null),
  ]);

  const adet = ozet?.count ?? 0;
  const ortalama = Number(ozet?.average ?? 0);
  const yazabilir = izin?.canReview === true;

  async function kaydet(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    const r = await reviewSend(`/api/reviews/${tur}/${subjectId}`, t, {
      rating: Number(formData.get("rating") ?? 5),
      text: String(formData.get("text") ?? "").trim(),
    });
    revalidatePath(donusYolu);
    // redirect() try/catch dışında olmalı — NEXT_REDIRECT yutulmasın.
    redirect(r.ok ? donusYolu : `${donusYolu}?yhata=${encodeURIComponent(r.error ?? "hata")}`);
  }

  // Yıldız dağılımı çubukları için en yüksek değer (oransal genişlik).
  const dagilim = [
    { yildizSayisi: 5, adet: ozet?.five ?? 0 },
    { yildizSayisi: 4, adet: ozet?.four ?? 0 },
    { yildizSayisi: 3, adet: ozet?.three ?? 0 },
    { yildizSayisi: 2, adet: ozet?.two ?? 0 },
    { yildizSayisi: 1, adet: ozet?.one ?? 0 },
  ];

  return (
    <section style={{ marginTop: 34, display: "grid", gap: 18 }}>
      <h2 style={{ margin: 0, fontSize: 19 }}>Değerlendirmeler</h2>

      {adet === 0 ? (
        <p style={{ color: "var(--gg-muted)", margin: 0 }}>
          Henüz değerlendirme yok. {tur === "PRODUCT" ? "Ürünü" : "Tarifi"} satın alanlar puan verebilir.
        </p>
      ) : (
        <div className="gg-card" style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ textAlign: "center", minWidth: 110 }}>
            <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{ortalama.toFixed(1)}</div>
            <div style={{ color: "var(--gg-star)", fontSize: 18 }}>{yildiz(ortalama)}</div>
            <div style={{ fontSize: 12, color: "var(--gg-muted)" }}>{adet} değerlendirme</div>
          </div>
          <div style={{ flex: 1, minWidth: 200, display: "grid", gap: 4 }}>
            {dagilim.map((d) => (
              <div key={d.yildizSayisi} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <span style={{ width: 34, color: "var(--gg-muted)" }}>{d.yildizSayisi} ★</span>
                <span style={{ flex: 1, height: 7, background: "var(--gg-border)", borderRadius: 999, overflow: "hidden" }}>
                  <span style={{
                    display: "block", height: "100%", borderRadius: 999,
                    width: adet > 0 ? `${(d.adet / adet) * 100}%` : "0%",
                    background: "var(--gg-star, #F5A623)",
                  }} />
                </span>
                <span style={{ width: 24, textAlign: "right", color: "var(--gg-muted)" }}>{d.adet}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hata ? (
        <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
          Değerlendirme kaydedilemedi: {hata}
        </div>
      ) : null}

      {/* Yorum formu — yalnızca satın alanlara */}
      {!token ? (
        <p style={{ color: "var(--gg-muted)", fontSize: 13.5, margin: 0 }}>
          Değerlendirme yazmak için <a href="/api/auth/signin" className="gg-see-all">giriş yap</a>.
        </p>
      ) : yazabilir ? (
        <form action={kaydet} className="gg-card" style={{ display: "grid", gap: 10 }}>
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
          🔒 Yıldız ve yorum yalnızca {tur === "PRODUCT" ? "bu ürünü" : "bu tarifi"} <strong>satın alanlara</strong> açıktır.
        </div>
      )}

      {/* Yorum listesi */}
      <div style={{ display: "grid", gap: 12 }}>
        {(yorumlar ?? []).map((r) => (
          <article key={r.id} className="gg-card" style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ color: "var(--gg-star)" }}>{yildiz(r.rating)}</span>
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
