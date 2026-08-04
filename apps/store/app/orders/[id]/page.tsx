import * as React from "react";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { tl } from "../../lib";
import { purchases, STATUS, VAT_RATE, shortId, dateTr, type Purchase } from "../lib";

const STEPS = ["Sipariş Alındı", "Doğrulandı", "Hazırlanıyor", "Tamamlandı"];

export default async function OrderDetail({ params }: { params: { id: string } }) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  if (!token) redirect(`/api/auth/signin?callbackUrl=%2Forders%2F${params.id}`);

  const o = await purchases<Purchase>(`/api/purchases/${params.id}`, token);
  if (!o) return <p>Sipariş bulunamadı.</p>;

  const s = STATUS[o.status] ?? STATUS.PENDING;
  const done = o.status === "COMPLETED" ? STEPS.length : o.status === "FAILED" ? 1 : 2;

  return (
    <div style={{ maxWidth: 620 }}>
      <a href="/orders" className="gg-see-all" style={{ display: "inline-block", marginBottom: 14 }}>‹ Siparişlerim</a>
      <div className="gg-card" style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ fontSize: 18 }}>Sipariş No: {shortId(o.id)}</strong>
            <div style={{ fontSize: 12.5, color: "var(--gg-muted)" }}>{dateTr(o.createdAt)} · {o.store}</div>
          </div>
          <span style={{ background: s.bg, color: s.color, borderRadius: "var(--gg-r-pill)", padding: "4px 12px", fontSize: 12.5, fontWeight: 700 }}>{s.label}</span>
        </div>

        {/* Zaman çizelgesi */}
        {o.status !== "FAILED" ? (
          <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
            {STEPS.map((st, i) => (
              <div key={st} style={{ display: "grid", justifyItems: "center", gap: 6, flex: 1, zIndex: 1 }}>
                <span style={{ width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", background: i < done ? "var(--gg-primary)" : "var(--gg-border)", color: "#fff", fontSize: 13 }}>{i < done ? "✓" : i + 1}</span>
                <span style={{ fontSize: 11, textAlign: "center", color: i < done ? "var(--gg-text)" : "var(--gg-muted)" }}>{st}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: s.bg, color: s.color, borderRadius: "var(--gg-r-md)", padding: 12, fontSize: 13 }}>
            ✕ {o.failureReason ?? "Sipariş iptal edildi."}
          </div>
        )}

        {/* Ürünler / tutar */}
        <div style={{ borderTop: "1px solid var(--gg-border)", paddingTop: 12, display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ width: 46, height: 46, borderRadius: 10, background: "linear-gradient(135deg, var(--gg-primary-soft), var(--gg-coral-soft))" }} />
            <div style={{ flex: 1, fontSize: 13 }}>
              <strong>Dijital Tarif</strong>
              <div style={{ color: "var(--gg-muted)" }}>{o.recipeId.slice(0, 8)}…</div>
            </div>
            <strong>{tl(o.amountTry)}</strong>
          </div>

          {/* KDV kırılımı (amountTry KDV dahildir → net + KDV ayrıştır) */}
          {(() => {
            const kdvHaric = o.amountTry / (1 + VAT_RATE);
            const kdv = o.amountTry - kdvHaric;
            const rj = { display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--gg-muted)" } as React.CSSProperties;
            return (
              <div style={{ borderTop: "1px dashed var(--gg-border)", paddingTop: 10, display: "grid", gap: 6 }}>
                <div style={rj}><span>Ara Toplam (KDV hariç)</span><span>{tl(kdvHaric)}</span></div>
                <div style={rj}><span>KDV (%{Math.round(VAT_RATE * 100)})</span><span>{tl(kdv)}</span></div>
                <div style={rj}><span>Kargo</span><span style={{ color: "var(--gg-primary)" }}>Ücretsiz</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, marginTop: 4 }}>
                  <strong>Genel Toplam</strong><strong>{tl(o.amountTry)}</strong>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--gg-muted)" }}>Fiyatlara %{Math.round(VAT_RATE * 100)} KDV dahildir.</div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
