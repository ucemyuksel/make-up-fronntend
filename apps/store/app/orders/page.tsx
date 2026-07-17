import * as React from "react";
import { SectionHeader } from "@makeup/ui";
import { auth } from "../../auth";
import { tl } from "../lib";
import { purchases, STATUS, shortId, dateTr, type Purchase } from "./lib";

const TABS = ["Tümü", "Bekliyor", "Kargoda", "Teslim Edildi", "İptal Edildi"];

export default async function Orders() {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    return <a href="/api/auth/signin?callbackUrl=%2Forders" className="gg-btn gg-btn-primary">Giriş yap</a>;
  }
  const orders = (await purchases<Purchase[]>("/api/purchases", token)) ?? [];

  return (
    <div style={{ maxWidth: 720 }}>
      <SectionHeader title="Siparişlerim" />
      <div style={{ display: "flex", gap: 18, borderBottom: "1px solid var(--gg-border)", marginBottom: 16, overflowX: "auto" }}>
        {TABS.map((t, i) => (
          <span key={t} style={{ padding: "8px 2px", whiteSpace: "nowrap", borderBottom: i === 0 ? "2px solid var(--gg-primary)" : "2px solid transparent", color: i === 0 ? "var(--gg-primary)" : "var(--gg-muted)", fontWeight: 600, fontSize: 13.5 }}>{t}</span>
        ))}
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
                  <strong>{tl(o.amountTry)}</strong>
                  <span className="gg-see-all">Detay ›</span>
                </div>
              </div>
            </a>
          );
        })}
        {orders.length === 0 && <p style={{ color: "var(--gg-muted)" }}>Sipariş yok.</p>}
      </div>
    </div>
  );
}
