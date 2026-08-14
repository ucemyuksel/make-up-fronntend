import * as React from "react";
import { Badge } from "@makeup/ui";
import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { requireSeller } from "../../../authGuard";
import { orderApi, orderSend, tl, type SellerOrderDetail } from "../../../lib";

export const metadata = { title: "Sipariş Detayı — GlamGuide" };
export const dynamic = "force-dynamic";

/** Yaygın kargo firmaları — serbest yazım yerine seçim, takip linki tutarlı olsun. */
const CARRIERS = ["Yurtiçi Kargo", "Aras Kargo", "MNG Kargo", "PTT Kargo", "Sürat Kargo", "UPS", "DHL"];

const DURUM: Record<string, string> = {
  HAZIRLANIYOR: "Hazırlanıyor",
  KARGOLANDI: "Kargoda",
  TESLIM_EDILDI: "Teslim edildi",
  IPTAL: "İptal",
};
const IADE_DURUM: Record<string, string> = {
  REQUESTED: "Karar bekliyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  CANCELLED: "Müşteri vazgeçti",
};

const tarih = (iso: string | null) => (iso ? new Date(iso).toLocaleString("tr-TR") : "—");

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { ok?: string; error?: string };
}) {
  const { token } = await requireSeller(`/seller/orders/${params.id}`);
  const detail = await orderApi<SellerOrderDetail>(`/api/seller/orders/${params.id}`, token);

  if (!detail) {
    return (
      <div style={{ maxWidth: 720 }}>
        <a href="/seller/orders" className="gg-see-all">← Siparişler</a>
        <p role="alert">Sipariş bulunamadı ya da bu sipariş size ait değil.</p>
      </div>
    );
  }

  const { order, shippingAddress: address, returns: iadeler } = detail;

  async function ship(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    const r = await orderSend(`/api/seller/orders/${params.id}/ship`, "POST", t, {
      carrier: String(formData.get("carrier") ?? ""),
      trackingNumber: String(formData.get("trackingNumber") ?? "").trim(),
    });
    redirect(r.ok
      ? `/seller/orders/${params.id}?ok=kargo`
      : `/seller/orders/${params.id}?error=${encodeURIComponent(r.error ?? "Kargo bilgisi kaydedilemedi")}`);
  }

  async function markDelivered() {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    const r = await orderSend(`/api/seller/orders/${params.id}/deliver`, "POST", t);
    redirect(r.ok
      ? `/seller/orders/${params.id}?ok=teslim`
      : `/seller/orders/${params.id}?error=${encodeURIComponent(r.error ?? "İşlem tamamlanamadı")}`);
  }

  const kargolandi = order.shipmentStatus === "KARGOLANDI";
  const hazirlaniyor = order.shipmentStatus === "HAZIRLANIYOR";

  return (
    <div style={{ maxWidth: 760, display: "grid", gap: 16 }}>
      <a href="/seller/orders" className="gg-see-all">← Siparişler</a>

      <div>
        <Badge>{DURUM[order.shipmentStatus ?? ""] ?? "—"}</Badge>
        <h1 style={{ margin: "8px 0 0", fontSize: 22 }}>Sipariş Detayı</h1>
        <p style={{ color: "#666", margin: "4px 0 0", fontSize: 13, fontFamily: "monospace" }}>
          {order.id}
        </p>
      </div>

      {searchParams.ok === "kargo" ? (
        <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>
          ✓ Kargo bilgisi kaydedildi.
        </div>
      ) : null}
      {searchParams.ok === "teslim" ? (
        <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>
          ✓ Teslim edildi olarak işaretlendi.
        </div>
      ) : null}
      {searchParams.error ? (
        <div role="alert" style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
          Hata: {searchParams.error}
        </div>
      ) : null}

      <section className="gg-card">
        <h2 style={{ marginTop: 0, fontSize: 17 }}>Sipariş</h2>
        <dl style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "6px 12px", margin: 0, fontSize: 14 }}>
          <dt style={{ color: "#666" }}>Tutar</dt><dd style={{ margin: 0 }}>{tl(order.amountTry)}</dd>
          <dt style={{ color: "#666" }}>Sipariş tarihi</dt><dd style={{ margin: 0 }}>{tarih(order.createdAt)}</dd>
          <dt style={{ color: "#666" }}>Kargoya veriliş</dt><dd style={{ margin: 0 }}>{tarih(order.shippedAt)}</dd>
          <dt style={{ color: "#666" }}>Teslim</dt><dd style={{ margin: 0 }}>{tarih(order.deliveredAt)}</dd>
          <dt style={{ color: "#666" }}>Kargo firması</dt><dd style={{ margin: 0 }}>{order.carrier ?? "—"}</dd>
          <dt style={{ color: "#666" }}>Takip no</dt>
          <dd style={{ margin: 0, fontFamily: "monospace" }}>{order.trackingNumber ?? "—"}</dd>
        </dl>
      </section>

      <section className="gg-card">
        <h2 style={{ marginTop: 0, fontSize: 17 }}>Teslimat adresi</h2>
        {address ? (
          <>
            <address style={{ fontStyle: "normal", lineHeight: 1.7, fontSize: 14 }}>
              <strong>{address.fullName}</strong><br />
              {address.phone}<br />
              {address.line1}{address.line2 ? <>, {address.line2}</> : null}<br />
              {address.district ? <>{address.district} / </> : null}{address.city}
              {address.postalCode ? <> {address.postalCode}</> : null}<br />
              {address.countryCode}
            </address>
            {address.note ? (
              <p style={{ marginTop: 10, fontSize: 13, background: "#FFF7E6", padding: 10, borderRadius: 8 }}>
                <strong>Kuryeye not:</strong> {address.note}
              </p>
            ) : null}
            <p style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
              Bu bilgiler <strong>sipariş anındaki</strong> hâlidir ve yalnızca kargo
              için verilmiştir. Müşteri adresini sonradan değiştirse bile burası değişmez.
            </p>
          </>
        ) : (
          <p style={{ color: "#666" }}>
            Bu siparişte teslimat adresi yok. (Address alanı eklenmeden önce oluşturulmuş
            eski siparişlerde beklenen durum.)
          </p>
        )}
      </section>

      {hazirlaniyor ? (
        <form action={ship} className="gg-card" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ marginTop: 0, fontSize: 17 }}>Kargoya ver</h2>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Kargo firması
            <select name="carrier" required className="gg-search">
              {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Takip numarası
            <input name="trackingNumber" required className="gg-search" placeholder="1234567890123" />
          </label>
          <button type="submit" className="gg-btn">Kargo bilgisini kaydet</button>
        </form>
      ) : null}

      {kargolandi ? (
        <form action={markDelivered} className="gg-card">
          <h2 style={{ marginTop: 0, fontSize: 17 }}>Teslimat</h2>
          <p style={{ color: "#666", fontSize: 13 }}>
            Kargo teslim edildiyse işaretleyin. Müşteri iade süresi bu tarihten işler.
          </p>
          <button type="submit" className="gg-btn">Teslim edildi olarak işaretle</button>
        </form>
      ) : null}

      <section className="gg-card">
        <h2 style={{ marginTop: 0, fontSize: 17 }}>İade talepleri</h2>
        {iadeler.length === 0 ? (
          <p style={{ color: "#666" }}>Bu siparişte iade talebi yok.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {iadeler.map((i) => (
              <li key={i.id} style={{ borderTop: "1px solid #eee", paddingTop: 10, fontSize: 14 }}>
                <strong>{IADE_DURUM[i.status] ?? i.status}</strong>
                <span style={{ color: "#666" }}> · {tarih(i.requestedAt)}</span>
                <p style={{ margin: "6px 0 0" }}>{i.reason}</p>
                {i.decisionReason ? (
                  <p style={{ margin: "6px 0 0", color: "#666" }}>
                    <strong>Kararınız:</strong> {i.decisionReason}
                  </p>
                ) : null}
                {i.status === "REQUESTED" ? (
                  <a href="/seller/returns" className="gg-see-all" style={{ display: "inline-block", marginTop: 6 }}>
                    Karar ver →
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
