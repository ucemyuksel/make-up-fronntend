import * as React from "react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../auth";

/** Ürün sorusu. Herkese açık listede soranın kimliği gizlenir (null döner). */
type ProductQuestion = {
  id: string;
  productId: string;
  askerUserId: string | null;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
};

const storeApi = () => process.env.STORE_API ?? "http://localhost:8084";
const tarih = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : "";

/**
 * Ürün soru-cevap.
 *
 * <p><b>Yorumdan farkı:</b> yorum satın alma sonrası bir değerlendirmedir ve
 * yalnız satın alan yazabilir. Soru satın almadan ÖNCE sorulur — burada
 * "satın aldın mı" kontrolü yoktur, yalnızca giriş gerekir.
 *
 * <p>Listede yalnızca <b>cevaplanmış</b> sorular görünür; cevapsızları
 * yayınlamak cevaplanmamış şikâyetleri vitrine asmak ve spam için açık kapı
 * bırakmak olurdu. Soran kişinin kimliği de gösterilmez.
 */
export async function Questions({
  productId,
  returnPath,
  error,
}: {
  productId: string;
  returnPath: string;
  error?: string;
}) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;

  let sorular: ProductQuestion[] = [];
  try {
    const res = await fetch(`${storeApi()}/api/products/${productId}/questions?size=20`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    if (res.ok) sorular = (await res.json()) as ProductQuestion[];
  } catch {
    sorular = []; // servis erişilemez → sayfayı çökertme
  }

  async function sor(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) redirect(`/login?callbackUrl=${encodeURIComponent(returnPath)}`);

    const metin = String(formData.get("question") ?? "").trim();
    let hata: string | null = null;
    try {
      const res = await fetch(`${storeApi()}/api/products/${productId}/questions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ question: metin }),
        cache: "no-store",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        hata = (j as { message?: string }).message ?? `HTTP ${res.status}`;
      }
    } catch {
      hata = "Sunucuya ulaşılamadı";
    }
    revalidatePath(returnPath);
    redirect(hata ? `${returnPath}?qerror=${encodeURIComponent(hata)}` : `${returnPath}?qok=1`);
  }

  return (
    <section className="gg-card" style={{ marginTop: 20 }} aria-labelledby="sorular-baslik">
      <h2 id="sorular-baslik" style={{ marginTop: 0, fontSize: 18 }}>
        Ürüne Sorulan Sorular
      </h2>

      {error ? (
        <p role="alert" style={{ background: "#FBE6E6", color: "#B42318", padding: 10, borderRadius: 8, fontSize: 14 }}>
          {error}
        </p>
      ) : null}

      {sorular.length === 0 ? (
        <p style={{ color: "var(--gg-muted)", fontSize: 14 }}>
          Bu ürüne henüz cevaplanmış soru yok. İlk soruyu siz sorun.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px", display: "grid", gap: 14 }}>
          {sorular.map((q) => (
            <li key={q.id} style={{ borderTop: "1px solid var(--gg-border)", paddingTop: 12 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{q.question}</p>
              <p style={{ margin: "8px 0 0", padding: 10, background: "var(--gg-bg-soft, #FAFAFA)",
                          borderRadius: 8, fontSize: 14 }}>
                <strong style={{ fontSize: 12, opacity: 0.7 }}>Satıcı yanıtı</strong>
                <br />
                {q.answer}
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--gg-muted)" }}>
                {tarih(q.answeredAt)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {token ? (
        <form action={sor} style={{ display: "grid", gap: 8 }}>
          <label style={{ fontSize: 13, display: "grid", gap: 4 }}>
            Satıcıya sorun
            <textarea name="question" rows={2} required minLength={5} maxLength={1000}
                      className="gg-search"
                      placeholder="Örn: Bu ürün hassas cilde uygun mu?" />
          </label>
          <p style={{ margin: 0, fontSize: 12, color: "var(--gg-muted)" }}>
            Cevaplanan sorular bu sayfada herkese görünür; adınız gösterilmez.
          </p>
          <button type="submit" className="gg-btn gg-btn-primary" style={{ justifySelf: "start" }}>
            Soruyu gönder
          </button>
        </form>
      ) : (
        <p style={{ fontSize: 14 }}>
          Soru sormak için <a href={`/login?callbackUrl=${encodeURIComponent(returnPath)}`}>giriş yapın</a>.
        </p>
      )}
    </section>
  );
}
