import * as React from "react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../auth";

type OrderReturn = {
  id: string;
  purchaseId: string;
  reason: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED";
  decisionReason: string | null;
  decidedAt: string | null;
  requestedAt: string;
};

const purchaseApi = () => process.env.PURCHASE_API ?? "http://localhost:8088";
const tarih = (iso: string | null) => (iso ? new Date(iso).toLocaleString("tr-TR") : "—");

const DURUM: Record<string, { etiket: string; bg: string; fg: string }> = {
  REQUESTED: { etiket: "Satıcı kararı bekleniyor", bg: "#FCF2DE", fg: "#C98A1E" },
  APPROVED: { etiket: "Onaylandı", bg: "#E5F6EC", fg: "#1E9E5A" },
  REJECTED: { etiket: "Reddedildi", bg: "#FBE6E6", fg: "#B42318" },
  CANCELLED: { etiket: "Vazgeçtiniz", bg: "#F1F1F3", fg: "#6B7280" },
};

/**
 * İade talebi — müşteri tarafı.
 *
 * <p><b>İptalden farkı:</b> kargoya verilmemiş sipariş iptal edilir ve satıcı
 * onayı gerekmez. İade, ürün yola çıktıktan sonraki süreçtir; kararı satıcı
 * verir ve <b>reddederse gerekçe yazmak zorundadır</b>.
 *
 * <p>Form yalnızca kargolanmış/teslim edilmiş siparişlerde gösterilir. Bu
 * kontrol backend'de de var; buradaki kullanıcıyı boşuna yazdırmamak için.
 */
export async function ReturnRequest({
  purchaseId,
  shipmentStatus,
  returnPath,
  error,
}: {
  purchaseId: string;
  shipmentStatus: string | null;
  returnPath: string;
  error?: string;
}) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  if (!token) return null;

  let talepler: OrderReturn[] = [];
  try {
    const res = await fetch(`${purchaseApi()}/api/returns?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) {
      talepler = ((await res.json()) as OrderReturn[]).filter((t) => t.purchaseId === purchaseId);
    }
  } catch {
    talepler = [];
  }

  const acikTalep = talepler.find((t) => t.status === "REQUESTED");
  const kargolandi = shipmentStatus === "SHIPPED" || shipmentStatus === "DELIVERED";

  async function talepAc(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) redirect(`/login?callbackUrl=${encodeURIComponent(returnPath)}`);

    let hata: string | null = null;
    try {
      const res = await fetch(`${purchaseApi()}/api/returns/orders/${purchaseId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: String(formData.get("reason") ?? "").trim() }),
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
    redirect(hata ? `${returnPath}?ierror=${encodeURIComponent(hata)}` : `${returnPath}?iok=1`);
  }

  async function vazgec(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    await fetch(`${purchaseApi()}/api/returns/${String(formData.get("id"))}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${t}` },
      cache: "no-store",
    });
    revalidatePath(returnPath);
    redirect(`${returnPath}?iok=2`);
  }

  return (
    <section className="gg-card" style={{ marginTop: 16 }} aria-labelledby="iade-baslik">
      <h2 id="iade-baslik" style={{ marginTop: 0, fontSize: 17 }}>İade</h2>

      {error ? (
        <p role="alert" style={{ background: "#FBE6E6", color: "#B42318", padding: 10,
                                 borderRadius: 8, fontSize: 14 }}>{error}</p>
      ) : null}

      {talepler.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px", display: "grid", gap: 10 }}>
          {talepler.map((t) => {
            const d = DURUM[t.status] ?? { etiket: t.status, bg: "#eee", fg: "#333" };
            return (
              <li key={t.id} style={{ borderTop: "1px solid var(--gg-border)", paddingTop: 10 }}>
                <span style={{ background: d.bg, color: d.fg, padding: "2px 10px",
                               borderRadius: 999, fontSize: 12 }}>{d.etiket}</span>
                <span style={{ marginLeft: 8, fontSize: 12, color: "var(--gg-muted)" }}>
                  {tarih(t.requestedAt)}
                </span>
                <p style={{ margin: "8px 0 0", fontSize: 14 }}>{t.reason}</p>
                {t.decisionReason ? (
                  <p style={{ margin: "6px 0 0", fontSize: 14, padding: 10, borderRadius: 8,
                              background: "var(--gg-bg-soft, #FAFAFA)" }}>
                    <strong style={{ fontSize: 12, opacity: 0.7 }}>Satıcının açıklaması</strong>
                    <br />
                    {t.decisionReason}
                  </p>
                ) : null}
                {t.status === "REQUESTED" ? (
                  <form action={vazgec} style={{ marginTop: 8 }}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" style={{ background: "transparent", border: "1px solid var(--gg-border)",
                                                   borderRadius: 8, padding: "6px 12px", cursor: "pointer",
                                                   fontSize: 13 }}>
                      Talepten vazgeç
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {!kargolandi ? (
        <p style={{ color: "var(--gg-muted)", fontSize: 14, margin: 0 }}>
          Bu sipariş henüz kargoya verilmedi. Vazgeçtiyseniz <strong>iptal</strong> edebilirsiniz;
          iade süreci ürün elinize ulaştıktan sonra başlar.
        </p>
      ) : acikTalep ? (
        <p style={{ color: "var(--gg-muted)", fontSize: 14, margin: 0 }}>
          Sonuçlanmamış bir talebiniz var. Satıcı karar verene kadar yeni talep açılamaz.
        </p>
      ) : (
        <form action={talepAc} style={{ display: "grid", gap: 8 }}>
          <label style={{ fontSize: 13, display: "grid", gap: 4 }}>
            İade sebebiniz
            <textarea name="reason" rows={3} required minLength={5} maxLength={1000}
                      className="gg-search"
                      placeholder="Örn: Ürün hasarlı geldi, kutusu ezilmiş." />
          </label>
          <p style={{ margin: 0, fontSize: 12, color: "var(--gg-muted)" }}>
            Kararı satıcı verir. Reddederse gerekçesini burada görürsünüz.
          </p>
          <button type="submit" className="gg-btn gg-btn-primary" style={{ justifySelf: "start" }}>
            İade talebi oluştur
          </button>
        </form>
      )}
    </section>
  );
}
