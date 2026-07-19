import * as React from "react";
import { SectionHeader } from "@makeup/ui";
import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { tl } from "../lib";
import { purchases, STATUS, shortId, dateTr, type Purchase } from "./lib";

// Sekmeler gerçek sipariş durumlarına eşlenir (purchase-service: PENDING/COMPLETED/FAILED).
const TABS: { ad: string; durum: string | null }[] = [
  { ad: "Tümü", durum: null },
  { ad: "Kargoda", durum: "PENDING" },
  { ad: "Teslim Edildi", durum: "COMPLETED" },
  { ad: "İptal Edildi", durum: "FAILED" },
];

export default async function Orders({ searchParams }: { searchParams: { t?: string; q?: string } }) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    redirect("/api/auth/signin?callbackUrl=%2Forders"); // oturum yoksa login sayfasına yönlendir
  }
  const hepsi = (await purchases<Purchase[]>("/api/purchases", token)) ?? [];

  const aktifDurum = searchParams.t ?? null;
  const q = (searchParams.q ?? "").trim().toLocaleLowerCase("tr");

  // Filtre: sekme (durum) + arama (sipariş no / tarih / tutar / durum etiketi).
  const orders = hepsi.filter((o) => {
    if (aktifDurum && o.status !== aktifDurum) return false;
    if (q) {
      const etiket = (STATUS[o.status]?.label ?? "").toLocaleLowerCase("tr");
      const hedef = `${shortId(o.id)} ${o.id} ${dateTr(o.createdAt)} ${o.amountTry} ${etiket}`.toLocaleLowerCase("tr");
      if (!hedef.includes(q)) return false;
    }
    return true;
  });

  const linkOf = (durum: string | null) => {
    const p = new URLSearchParams();
    if (durum) p.set("t", durum);
    if (searchParams.q) p.set("q", searchParams.q);
    const s = p.toString();
    return "/orders" + (s ? `?${s}` : "");
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <SectionHeader title="Siparişlerim" />

      {/* Arama (GET formu — sunucuda filtrelenir) */}
      <form method="get" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {aktifDurum && <input type="hidden" name="t" value={aktifDurum} />}
        <input name="q" defaultValue={searchParams.q ?? ""} className="gg-search" style={{ flex: 1 }}
               placeholder="Sipariş no, tarih, tutar veya durum ara..." />
        <button className="gg-btn gg-btn-primary" type="submit">Ara</button>
      </form>

      <div style={{ display: "flex", gap: 18, borderBottom: "1px solid var(--gg-border)", marginBottom: 16, overflowX: "auto" }}>
        {TABS.map((t) => {
          const aktif = aktifDurum === t.durum;
          return (
            <a key={t.ad} href={linkOf(t.durum)}
               style={{ padding: "8px 2px", whiteSpace: "nowrap", borderBottom: aktif ? "2px solid var(--gg-primary)" : "2px solid transparent", color: aktif ? "var(--gg-primary)" : "var(--gg-muted)", fontWeight: 600, fontSize: 13.5 }}>
              {t.ad} ({t.durum ? hepsi.filter((o) => o.status === t.durum).length : hepsi.length})
            </a>
          );
        })}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {orders.map((o) => {
          const s = STATUS[o.status] ?? STATUS.PENDING;
          return (
            <a key={o.id} href={`/orders/${o.id}`} className="gg-card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ width: 54, height: 54, borderRadius: 10, background: "linear-gradient(135deg, var(--gg-primary-soft), var(--gg-coral-soft))", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>Sipariş No: {shortId(o.id)}</strong>
                  <span style={{ background: s.bg, color: s.color, borderRadius: "var(--gg-r-pill)", padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--gg-muted)", marginTop: 2 }}>{dateTr(o.createdAt)}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  <div><strong>{tl(o.amountTry)}</strong> <span style={{ fontSize: 11, color: "var(--gg-muted)" }}>KDV dahil</span></div>
                  <span className="gg-see-all">Detay ›</span>
                </div>
              </div>
            </a>
          );
        })}
        {orders.length === 0 && (
          <p style={{ color: "var(--gg-muted)" }}>
            {q || aktifDurum ? "Filtreye uyan sipariş yok." : "Sipariş yok."}
          </p>
        )}
      </div>
    </div>
  );
}
