import * as React from "react";
import { Badge } from "@makeup/ui";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { requireSeller } from "../../authGuard";
import { orderApi, orderSend, type OrderReturn } from "../../lib";

export const metadata = { title: "İade Talepleri — GlamGuide" };
export const dynamic = "force-dynamic";

const DURUM: Record<string, { etiket: string; bg: string; fg: string }> = {
  REQUESTED: { etiket: "Karar bekliyor", bg: "#FCF2DE", fg: "#C98A1E" },
  APPROVED: { etiket: "Onaylandı", bg: "#E5F6EC", fg: "#1E9E5A" },
  REJECTED: { etiket: "Reddedildi", bg: "#FBE6E6", fg: "#B42318" },
  CANCELLED: { etiket: "Müşteri vazgeçti", bg: "#F1F1F3", fg: "#6B7280" },
};

const tarih = (iso: string | null) => (iso ? new Date(iso).toLocaleString("tr-TR") : "—");

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string };
}) {
  const { token } = await requireSeller("/seller/returns");
  const iadeler = (await orderApi<OrderReturn[]>("/api/seller/orders/returns?limit=100", token)) ?? [];
  const bekleyen = iadeler.filter((i) => i.status === "REQUESTED");
  const gecmis = iadeler.filter((i) => i.status !== "REQUESTED");

  async function decide(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;

    const id = String(formData.get("id"));
    const karar = String(formData.get("karar"));
    const gerekce = String(formData.get("reason") ?? "").trim();

    // Ret gerekçesi burada da kontrol edilir: kullanıcıya sunucuya gidip
    // dönmeden anlaşılır bir hata göstermek için. Son söz yine API'de.
    if (karar === "reject" && !gerekce) {
      redirect(`/seller/returns?error=${encodeURIComponent("Reddetmek için gerekçe yazmalısınız")}`);
    }

    const r = await orderSend(`/api/seller/orders/returns/${id}/${karar}`, "POST", t,
      { reason: gerekce || null });
    redirect(r.ok
      ? `/seller/returns?ok=${karar}`
      : `/seller/returns?error=${encodeURIComponent(r.error ?? "Karar kaydedilemedi")}`);
  }

  return (
    <div style={{ maxWidth: 820, display: "grid", gap: 16 }}>
      <a href="/seller" className="gg-see-all">← Satıcı Paneli</a>

      <div>
        <Badge>Satış Sonrası</Badge>
        <h1 style={{ margin: "8px 0 0" }}>İade Talepleri</h1>
        <p style={{ color: "#666", margin: "6px 0 0", fontSize: 14 }}>
          Müşteri iade talebi açar, kararı siz verirsiniz. <strong>Reddederken
          gerekçe yazmak zorunludur</strong> — müşteri neden reddedildiğini
          bilmeden itiraz edemez.
        </p>
      </div>

      {searchParams.ok === "approve" ? (
        <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>
          ✓ İade onaylandı.
        </div>
      ) : null}
      {searchParams.ok === "reject" ? (
        <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>
          ✓ İade reddedildi, gerekçe müşteriye iletildi.
        </div>
      ) : null}
      {searchParams.error ? (
        <div role="alert" style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
          Hata: {searchParams.error}
        </div>
      ) : null}

      <section>
        <h2 style={{ fontSize: 18 }}>Karar bekleyenler ({bekleyen.length})</h2>
        {bekleyen.length === 0 ? (
          <p style={{ color: "#666" }}>Karar bekleyen iade talebi yok.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {bekleyen.map((i) => (
              <div key={i.id} className="gg-card" style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <a href={`/seller/orders/${i.purchaseId}`} className="gg-see-all">
                    Sipariş: {i.purchaseId.slice(0, 8)}… →
                  </a>
                  <span style={{ color: "#666", fontSize: 13 }}>{tarih(i.requestedAt)}</span>
                </div>

                <div style={{ background: "#FAFAFA", padding: 12, borderRadius: 8 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#666" }}>Müşterinin gerekçesi</p>
                  <p style={{ margin: "4px 0 0" }}>{i.reason}</p>
                </div>

                <form action={decide} style={{ display: "grid", gap: 8 }}>
                  <input type="hidden" name="id" value={i.id} />
                  <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                    Kararınızın gerekçesi
                    <textarea name="reason" rows={2} className="gg-search"
                              placeholder="Reddediyorsanız zorunlu: neden kabul edilmediğini yazın" />
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="submit" name="karar" value="approve" className="gg-btn">
                      İadeyi onayla
                    </button>
                    <button type="submit" name="karar" value="reject"
                            style={{ background: "#FBE6E6", color: "#B42318", border: "1px solid #F0BDBD",
                                     borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>
                      Reddet
                    </button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: 18 }}>Sonuçlananlar</h2>
        {gecmis.length === 0 ? (
          <p style={{ color: "#666" }}>Henüz sonuçlanmış talep yok.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: "left", padding: "6px 8px 6px 0" }}>Sipariş</th>
                  <th scope="col" style={{ textAlign: "left" }}>Durum</th>
                  <th scope="col" style={{ textAlign: "left" }}>Müşteri gerekçesi</th>
                  <th scope="col" style={{ textAlign: "left" }}>Kararınız</th>
                  <th scope="col" style={{ textAlign: "left" }}>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {gecmis.map((i) => {
                  const d = DURUM[i.status] ?? { etiket: i.status, bg: "#eee", fg: "#333" };
                  return (
                    <tr key={i.id} style={{ borderTop: "1px solid #eee" }}>
                      <td style={{ padding: "8px 8px 8px 0" }}>
                        <a href={`/seller/orders/${i.purchaseId}`}>{i.purchaseId.slice(0, 8)}…</a>
                      </td>
                      <td>
                        <span style={{ background: d.bg, color: d.fg, padding: "2px 8px",
                                       borderRadius: 999, fontSize: 12 }}>{d.etiket}</span>
                      </td>
                      <td style={{ maxWidth: 220 }}>{i.reason}</td>
                      <td style={{ maxWidth: 220, color: "#666" }}>{i.decisionReason ?? "—"}</td>
                      <td>{tarih(i.decidedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
