import * as React from "react";
import { Badge } from "@makeup/ui";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { requireSeller } from "../../authGuard";
import { api, tl, type Product } from "../../lib";

export const metadata = { title: "Siparişler & Kargo — GlamGuide" };

type ShipmentStatus = "HAZIRLANIYOR" | "KARGOLANDI" | "TESLIM_EDILDI" | "IPTAL";
type SellerOrder = {
  id: string;
  buyerUserId: string;
  productId: string;
  amountTry: number;
  status: string;
  shipmentStatus: ShipmentStatus | null;
  carrier: string | null;
  trackingNumber: string | null;
  countryCode: string | null;
  regionCode: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
};
type SellerSummary = { orderCount: number; totalRevenue: number; awaitingShipment: number };

const STATUS_STYLE: Record<ShipmentStatus, { bg: string; fg: string; text: string }> = {
  HAZIRLANIYOR: { bg: "#FCF2DE", fg: "#C98A1E", text: "HAZIRLANIYOR" },
  KARGOLANDI: { bg: "#E7EEFB", fg: "#2C5BB8", text: "KARGODA" },
  TESLIM_EDILDI: { bg: "#E5F6EC", fg: "#1E9E5A", text: "TESLİM EDİLDİ" },
  IPTAL: { bg: "#F1F1F3", fg: "#6B7280", text: "İPTAL" },
};

const TABS: { key: string; label: string }[] = [
  { key: "", label: "Tümü" },
  { key: "HAZIRLANIYOR", label: "Kargo pending" },
  { key: "KARGOLANDI", label: "Kargoda" },
  { key: "TESLIM_EDILDI", label: "Teslim edilen" },
];

/** Yaygın kargo firmaları — serbest yazım yerine seçim, takip linki tutarlı olsun. */
const CARRIERS = ["Yurtiçi Kargo", "Aras Kargo", "MNG Kargo", "PTT Kargo", "Sürat Kargo", "UPS", "DHL"];

const purchaseApi = () => process.env.PURCHASE_API ?? "http://localhost:8088";
const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString("tr-TR") : "—");

async function orderApi<T>(path: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(`${purchaseApi()}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export default async function SellerOrders({
  searchParams,
}: {
  searchParams: { status?: string; ok?: string; error?: string };
}) {
  const { token } = await requireSeller("/satici/siparis");

  const status = searchParams.status ?? "";
  const [orders, summary, products] = await Promise.all([
    // API parametresi `status` (tarayıcı URL'indeki `status` kullanıcıya görünen ad)
    orderApi<SellerOrder[]>(`/api/seller/orders${status ? `?status=${status}` : ""}`, token),
    orderApi<SellerSummary>("/api/seller/orders/summary", token),
    api<Product[]>("/api/products", token),
  ]);
  const list = orders ?? [];
  const productNames = new Map((products ?? []).map((u) => [u.id, u.name]));

  async function shipmentAction(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    const id = String(formData.get("id"));
    const action = String(formData.get("action")); // ship | deliver | cancel
    const body =
      action === "ship"
        ? {
            carrier: String(formData.get("carrier") ?? "").trim(),
            trackingNumber: String(formData.get("trackingNumber") ?? "").trim(),
          }
        : {};

    let res: Response | null = null;
    try {
      res = await fetch(`${purchaseApi()}/api/seller/orders/${id}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
    } catch {
      res = null;
    }
    const returnTo = String(formData.get("returnTo") ?? "/satici/siparis");
    revalidatePath("/satici/siparis");
    const ek = returnTo.includes("?") ? "&" : "?";
    // redirect() try/catch dışında — NEXT_REDIRECT yutulmasın.
    if (!res || !res.ok) {
      let message = res ? `HTTP ${res.status}` : "Sunucuya ulaşılamadı";
      if (res) {
        try {
          message = (await res.json()).message ?? message;
        } catch { /* gövde yok */ }
      }
      redirect(`${returnTo}${ek}error=${encodeURIComponent(message)}`);
    }
    redirect(`${returnTo}${ek}ok=1`);
  }

  const back = `/satici/siparis${status ? `?status=${status}` : ""}`;

  return (
    <div style={{ maxWidth: 900, display: "grid", gap: 18 }}>
      <a href="/satici" className="gg-see-all">← Satıcı Paneli</a>
      <div>
        <Badge>Sipariş Yönetimi</Badge>
        <h1 style={{ margin: "8px 0 0" }}>Siparişler & Kargo</h1>
        <p style={{ color: "var(--gg-muted)", margin: "6px 0 0", fontSize: 13.5 }}>
          Kargoya verirken firma ve takip numarası zorunludur — müşteri siparişini takip edebilmeli.
        </p>
      </div>

      {searchParams.ok ? (
        <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>✓ İşlem uygulandı.</div>
      ) : null}
      {searchParams.error ? (
        <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
          Hata: {searchParams.error}
        </div>
      ) : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {[
          { l: "Toplam sipariş", v: String(summary?.orderCount ?? 0) },
          { l: "Toplam satış", v: tl(Number(summary?.totalRevenue ?? 0)) },
          { l: "Kargo pending", v: String(summary?.awaitingShipment ?? 0) },
        ].map((k) => (
          <div key={k.l} className="gg-card" style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, color: "var(--gg-muted)" }}>{k.l}</span>
            <strong style={{ fontSize: 21 }}>{k.v}</strong>
          </div>
        ))}
      </section>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <a key={t.key} href={t.key ? `/satici/siparis?status=${t.key}` : "/satici/siparis"}
             className={`gg-btn ${status === t.key ? "gg-btn-primary" : "gg-btn-ghost"}`}>
            {t.label}
          </a>
        ))}
      </div>

      <section>
        <h2 style={{ fontSize: 17 }}>Siparişler ({list.length})</h2>
        {list.length === 0 ? (
          <p style={{ color: "var(--gg-muted)" }}>
            {status ? "Bu durumda sipariş yok." : "Henüz sipariş yok."}
          </p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {list.map((o) => {
              const d = o.shipmentStatus ? STATUS_STYLE[o.shipmentStatus] : null;
              return (
                <article key={o.id} className="gg-card" style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <strong>{productNames.get(o.productId) ?? "Ürün"}</strong>
                    {d ? (
                      <span style={{
                        background: d.bg, color: d.fg, borderRadius: 999,
                        padding: "2px 10px", fontSize: 11, fontWeight: 700,
                      }}>{d.text}</span>
                    ) : null}
                    <span style={{ flex: 1 }} />
                    <strong style={{ fontSize: 15 }}>{tl(Number(o.amountTry))}</strong>
                  </div>

                  <div style={{ fontSize: 12.5, color: "var(--gg-muted)", display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <span>Sipariş no: {o.id.slice(0, 8)}</span>
                    <span>Alıcı: {o.buyerUserId.slice(0, 8)}</span>
                    <span>📍 {[o.countryCode, o.regionCode].filter(Boolean).join(" / ") || "—"}</span>
                    <span>{formatDate(o.createdAt)}</span>
                  </div>

                  {o.trackingNumber ? (
                    <div style={{
                      background: "var(--gg-primary-soft)", borderRadius: 10, padding: "8px 11px", fontSize: 12.5,
                    }}>
                      🚚 <strong>{o.carrier}</strong> · Takip no: <strong>{o.trackingNumber}</strong>
                      {o.shippedAt ? ` · Kargoya veriliş: ${formatDate(o.shippedAt)}` : ""}
                      {o.deliveredAt ? ` · Teslim: ${formatDate(o.deliveredAt)}` : ""}
                    </div>
                  ) : null}

                  {/* Eylemler duruma göre — geçersiz geçiş hiç gösterilmez. */}
                  {o.shipmentStatus === "HAZIRLANIYOR" ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <form action={shipmentAction} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <input type="hidden" name="id" value={o.id} />
                        <input type="hidden" name="action" value="ship" />
                        <input type="hidden" name="returnTo" value={back} />
                        <select name="carrier" required className="gg-search" style={{ minWidth: 160 }}>
                          <option value="">Kargo firması seç</option>
                          {CARRIERS.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <input name="trackingNumber" required className="gg-search"
                               style={{ flex: 1, minWidth: 180 }} placeholder="Takip numarası" />
                        <button className="gg-btn gg-btn-primary" type="submit">🚚 Kargoya Ver</button>
                      </form>
                      <form action={shipmentAction}>
                        <input type="hidden" name="id" value={o.id} />
                        <input type="hidden" name="action" value="cancel" />
                        <input type="hidden" name="returnTo" value={back} />
                        <button className="gg-btn gg-btn-ghost" type="submit" style={{ fontSize: 12.5 }}>
                          Siparişi iptal et
                        </button>
                      </form>
                    </div>
                  ) : o.shipmentStatus === "KARGOLANDI" ? (
                    <form action={shipmentAction}>
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="action" value="deliver" />
                      <input type="hidden" name="returnTo" value={back} />
                      <button className="gg-btn gg-btn-primary" type="submit">✓ Teslim Edildi</button>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
