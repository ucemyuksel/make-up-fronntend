import * as React from "react";
import { Badge } from "@makeup/ui";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { requireSeller } from "../../authGuard";
import { api, send, type ProductQuestion, type Store } from "../../lib";

export const metadata = { title: "Müşteri Soruları — GlamGuide" };
export const dynamic = "force-dynamic";

const tarih = (iso: string | null) => (iso ? new Date(iso).toLocaleString("tr-TR") : "—");

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: { store?: string; ok?: string; error?: string };
}) {
  const { token } = await requireSeller("/seller/questions");

  const stores = (await api<Store[]>("/api/stores/mine", token)) ?? [];
  const store = stores.find((s) => s.id === searchParams.store)?.id ?? stores[0]?.id;
  if (!store) {
    return <p>Önce mağazanızı açmanız gerekiyor. <a href="/seller" className="gg-see-all">← Panele dön</a></p>;
  }

  const sorular = (await api<ProductQuestion[]>(
    `/api/stores/${store}/questions?size=100`, token)) ?? [];
  const bekleyen = sorular.filter((q) => !q.answer);
  const cevaplanan = sorular.filter((q) => q.answer);

  async function answer(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    const r = await send(`/api/questions/${String(formData.get("id"))}/answer`, "PUT", t, {
      answer: String(formData.get("answer") ?? "").trim(),
    });
    redirect(r.ok
      ? `/seller/questions?store=${store}&ok=1`
      : `/seller/questions?store=${store}&error=${encodeURIComponent(r.error ?? "Cevap kaydedilemedi")}`);
  }

  async function hide(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    const gerekce = String(formData.get("reason") ?? "").trim();
    if (!gerekce) {
      redirect(`/seller/questions?store=${store}&error=${encodeURIComponent("Gizlemek için gerekçe yazmalısınız")}`);
    }
    const r = await send(`/api/questions/${String(formData.get("id"))}/hide`, "POST", t,
      { answer: gerekce });
    redirect(r.ok
      ? `/seller/questions?store=${store}&ok=2`
      : `/seller/questions?store=${store}&error=${encodeURIComponent(r.error ?? "Gizlenemedi")}`);
  }

  return (
    <div style={{ maxWidth: 820, display: "grid", gap: 16 }}>
      <a href="/seller" className="gg-see-all">← Satıcı Paneli</a>

      <div>
        <Badge>Müşteri İletişimi</Badge>
        <h1 style={{ margin: "8px 0 0" }}>Müşteri Soruları</h1>
        <p style={{ color: "#666", margin: "6px 0 0", fontSize: 14 }}>
          Cevapladığınız sorular <strong>ürün sayfasında herkese görünür</strong> —
          soranın kimliği gizlenir. Cevaplanmamış sorular yayınlanmaz.
        </p>
      </div>

      {searchParams.ok === "1" ? (
        <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>
          ✓ Cevap yayınlandı.
        </div>
      ) : null}
      {searchParams.ok === "2" ? (
        <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>
          ✓ Soru gizlendi.
        </div>
      ) : null}
      {searchParams.error ? (
        <div role="alert" style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
          Hata: {searchParams.error}
        </div>
      ) : null}

      <section>
        <h2 style={{ fontSize: 18 }}>Cevap bekleyenler ({bekleyen.length})</h2>
        {bekleyen.length === 0 ? (
          <p style={{ color: "#666" }}>Cevap bekleyen soru yok.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {bekleyen.map((q) => (
              <div key={q.id} className="gg-card" style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <a href={`/seller/products?store=${store}`} className="gg-see-all">
                    Ürün: {q.productId.slice(0, 8)}…
                  </a>
                  <span style={{ color: "#666", fontSize: 13 }}>{tarih(q.createdAt)}</span>
                </div>

                <p style={{ margin: 0, fontSize: 15 }}>{q.question}</p>

                <form action={answer} style={{ display: "grid", gap: 8 }}>
                  <input type="hidden" name="id" value={q.id} />
                  <textarea name="answer" rows={3} required minLength={2} className="gg-search"
                            placeholder="Cevabınız (ürün sayfasında yayınlanacak)" />
                  <button type="submit" className="gg-btn">Cevapla ve yayınla</button>
                </form>

                <details>
                  <summary style={{ cursor: "pointer", fontSize: 13, color: "#666" }}>
                    Uygunsuz mu? Gizle
                  </summary>
                  <form action={hide} style={{ display: "grid", gap: 8, marginTop: 8 }}>
                    <input type="hidden" name="id" value={q.id} />
                    <input name="reason" required className="gg-search"
                           placeholder="Gizleme gerekçesi (zorunlu)" />
                    <button type="submit"
                            style={{ background: "#F1F1F3", border: "1px solid #ddd", borderRadius: 8,
                                     padding: "8px 14px", cursor: "pointer", justifySelf: "start" }}>
                      Soruyu gizle
                    </button>
                  </form>
                </details>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: 18 }}>Cevaplananlar ({cevaplanan.length})</h2>
        {cevaplanan.length === 0 ? (
          <p style={{ color: "#666" }}>Henüz cevaplanmış soru yok.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {cevaplanan.map((q) => (
              <div key={q.id} className="gg-card">
                <p style={{ margin: 0, fontSize: 15 }}>{q.question}</p>
                <p style={{ margin: "8px 0 0", padding: 10, background: "#FAFAFA", borderRadius: 8 }}>
                  {q.answer}
                </p>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "#666" }}>
                  Cevaplandı: {tarih(q.answeredAt)}
                </p>
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer", fontSize: 13, color: "#666" }}>
                    Cevabı düzelt
                  </summary>
                  <form action={answer} style={{ display: "grid", gap: 8, marginTop: 8 }}>
                    <input type="hidden" name="id" value={q.id} />
                    <textarea name="answer" rows={3} required defaultValue={q.answer ?? ""}
                              className="gg-search" />
                    <button type="submit" className="gg-btn" style={{ justifySelf: "start" }}>
                      Güncelle
                    </button>
                  </form>
                </details>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
