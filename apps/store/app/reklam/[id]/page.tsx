import * as React from "react";
import { Badge } from "@makeup/ui";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { adApi, tl, type AdCampaign, type GeoStat } from "../../lib";

export const metadata = { title: "Kampanya Raporu — GlamGuide" };

export default async function KampanyaRapor({ params }: { params: { id: string } }) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  if (!token) redirect("/api/auth/signin?callbackUrl=%2Freklam");

  const c = await adApi<AdCampaign>(`/api/campaigns/${params.id}`, token);
  if (!c) return <p>Kampanya bulunamadı. <a href="/reklam" className="gg-see-all">← Reklam Paneli</a></p>;
  const report = (await adApi<GeoStat[]>(`/api/campaigns/${params.id}/report`, token)) ?? [];

  const bolge = (g: GeoStat) => [g.countryCode, g.regionCode, g.cityName].filter(Boolean).join(" › ");
  const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 12, color: "var(--gg-muted)", borderBottom: "1px solid var(--gg-border)" };
  const td: React.CSSProperties = { padding: "8px 10px", fontSize: 13, borderBottom: "1px solid var(--gg-border)" };

  return (
    <div style={{ maxWidth: 780, display: "grid", gap: 18 }}>
      <a href="/reklam" className="gg-see-all">← Reklam Paneli</a>
      <div>
        <Badge>Kampanya Raporu</Badge>
        <h1 style={{ margin: "8px 0 0" }}>{c.name}</h1>
        <div style={{ fontSize: 12.5, color: "var(--gg-muted)" }}>{c.placement} · {c.pricingModel} · durum {c.status}</div>
      </div>

      {/* Özet metrikler */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
        <div className="gg-card"><div style={{ fontSize: 12, color: "var(--gg-muted)" }}>Gösterim</div><strong style={{ fontSize: 20 }}>{c.impressions}</strong></div>
        <div className="gg-card"><div style={{ fontSize: 12, color: "var(--gg-muted)" }}>Tık</div><strong style={{ fontSize: 20 }}>{c.clicks}</strong></div>
        <div className="gg-card"><div style={{ fontSize: 12, color: "var(--gg-muted)" }}>CTR</div><strong style={{ fontSize: 20 }}>{(c.ctr * 100).toFixed(1)}%</strong></div>
        <div className="gg-card"><div style={{ fontSize: 12, color: "var(--gg-muted)" }}>Harcama</div><strong style={{ fontSize: 20 }}>{tl(c.spentTotal)}</strong></div>
      </div>

      {/* Bölgesel performans */}
      <section>
        <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>🌍 Bölgesel Performans</h2>
        {report.length === 0 ? (
          <p style={{ color: "var(--gg-muted)", fontSize: 13 }}>Henüz gösterim/tık verisi yok.</p>
        ) : (
          <div className="gg-card" style={{ padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Bölge</th>
                  <th style={{ ...th, textAlign: "right" }}>Gösterim</th>
                  <th style={{ ...th, textAlign: "right" }}>Tık</th>
                  <th style={{ ...th, textAlign: "right" }}>CTR</th>
                  <th style={{ ...th, textAlign: "right" }}>Harcama</th>
                </tr>
              </thead>
              <tbody>
                {report.map((g, i) => (
                  <tr key={i}>
                    <td style={td}>{bolge(g) || "—"}</td>
                    <td style={{ ...td, textAlign: "right" }}>{g.impressions}</td>
                    <td style={{ ...td, textAlign: "right" }}>{g.clicks}</td>
                    <td style={{ ...td, textAlign: "right" }}>{g.impressions ? ((g.clicks / g.impressions) * 100).toFixed(1) : "0.0"}%</td>
                    <td style={{ ...td, textAlign: "right" }}>{tl(g.spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
