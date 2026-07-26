import * as React from "react";
import { SectionHeader, Badge, DunyaHaritasi, type SehirSatiri, type UlkeSatiri } from "@makeup/ui";
import { revalidatePath } from "next/cache";
import { auth } from "../../auth";
import { saticiKapisi } from "../yetki";

import { adApi, adSend, tl, type Advertiser, type AdCampaign, type LedgerDay } from "../lib";

export const metadata = { title: "Reklam Paneli — GlamGuide" };

const DURUM: Record<string, { etiket: string; renk: string; bg: string }> = {
  ACTIVE: { etiket: "Yayında", renk: "#1E9E5A", bg: "#E5F6EC" },
  PENDING: { etiket: "Onay bekliyor", renk: "#C98A1E", bg: "#FCF2DE" },
  PAUSED: { etiket: "Duraklatıldı", renk: "#6B7280", bg: "#F1F1F3" },
  REJECTED: { etiket: "Reddedildi", renk: "#D23B3B", bg: "#FBE6E6" },
  ENDED: { etiket: "Bitti", renk: "#6B7280", bg: "#F1F1F3" },
  DRAFT: { etiket: "Taslak", renk: "#6B7280", bg: "#F1F1F3" },
};

export default async function ReklamPanel({ searchParams }: { searchParams: { ok?: string; hata?: string } }) {
  // Satıcı kapısı: giriş + STORE_OWNER rolü (menüyü gizlemek yetmez).
  const { token } = await saticiKapisi("/reklam");

  const advertiser = await adApi<Advertiser>("/api/advertisers/me", token);

  async function durumDegis(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    const id = String(formData.get("id") ?? "");
    const aksiyon = String(formData.get("aksiyon") ?? "pause");
    await adSend(`/api/campaigns/${id}/${aksiyon}`, "POST", t, {});
    revalidatePath("/reklam");
  }

  // Henüz hiç reklam vermemiş: kayıt formu YOK — doğrudan reklam vermeye yollarız.
  // Reklam veren kaydı ilk reklamda backend'de otomatik açılır; firma/vergi
  // bilgisi fatura gerektiğinde tamamlanır.
  if (!advertiser) {
    return (
      <div style={{ maxWidth: 560, display: "grid", gap: 18 }}>
        <div>
          <Badge>Reklam</Badge>
          <h1 style={{ margin: "8px 0 0" }}>Reklam Vermeye Başla</h1>
          <p style={{ color: "var(--gg-muted)", marginTop: 6 }}>
            Story, akış ve Reels aralarında bölgesel reklam göster. Ön kayıt gerekmez —
            bölgeni ve bütçeni seç, yayına gönder.
          </p>
        </div>
        {searchParams.hata ? (
          <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
            Hata: {searchParams.hata}
          </div>
        ) : null}
        <a href="/reklam/kampanya" className="gg-btn gg-btn-primary" style={{ justifySelf: "start" }}>
          + Reklam Ver
        </a>
        <div className="gg-card" style={{ fontSize: 13, color: "var(--gg-muted)", display: "grid", gap: 6 }}>
          <span>📍 Ülke ve şehir bazında hedefleme</span>
          <span>💰 Günlük bütçe — dolunca otomatik durur, aşım olmaz</span>
          <span>📊 Gösterim, tık ve harcama raporu</span>
        </div>
      </div>
    );
  }

  const campaigns = (await adApi<AdCampaign[]>("/api/campaigns/mine", token)) ?? [];
  const ledger = (await adApi<LedgerDay[]>("/api/advertisers/me/ledger", token)) ?? [];
  // Reklamlarım nerede gösteriliyor — kendi coğrafi panom.
  const geo = await adApi<{
    totalImpressions: number; totalClicks: number; totalSpend: number; ctr: number;
    countries: UlkeSatiri[]; cities: SehirSatiri[];
  }>("/api/campaigns/geo/mine", token);
  const toplamHarcama = ledger.reduce((s, d) => s + Number(d.spend), 0);

  return (
    <div style={{ maxWidth: 900, display: "grid", gap: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <Badge>Reklam Paneli</Badge>
          <h1 style={{ margin: "8px 0 0" }}>{advertiser.name}</h1>
          <div style={{ fontSize: 12.5, color: "var(--gg-muted)" }}>Reklam veren · {advertiser.status}</div>
        </div>
        <a href="/reklam/kampanya" className="gg-btn gg-btn-primary">+ Reklam Ver</a>
      </div>

      {searchParams.ok ? <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>✓ Kampanya oluşturuldu — onaydan sonra yayına çıkar.</div> : null}

      {/* Özet */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <div className="gg-card"><div style={{ fontSize: 12, color: "var(--gg-muted)" }}>Kampanya</div><strong style={{ fontSize: 22 }}>{campaigns.length}</strong></div>
        <div className="gg-card"><div style={{ fontSize: 12, color: "var(--gg-muted)" }}>Toplam Harcama</div><strong style={{ fontSize: 22 }}>{tl(toplamHarcama)}</strong></div>
        <div className="gg-card"><div style={{ fontSize: 12, color: "var(--gg-muted)" }}>Bakiye</div><strong style={{ fontSize: 22 }}>{tl(advertiser.balance)}</strong></div>
      </div>

      {/* Coğrafi pano — reklamlarım nerede gösteriliyor */}
      {geo && geo.countries.length > 0 ? (
        <section style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 17, margin: 0 }}>🌍 Reklamlarım Nerede Gösteriliyor</h2>
            <span style={{ fontSize: 12.5, color: "var(--gg-muted)" }}>
              {geo.totalImpressions.toLocaleString("tr-TR")} gösterim ·{" "}
              {geo.totalClicks.toLocaleString("tr-TR")} tık · CTR {(geo.ctr * 100).toFixed(2)}%
            </span>
          </div>
          <DunyaHaritasi ulkeler={geo.countries} sehirler={geo.cities} />
          <div style={{ display: "grid", gap: 6 }}>
            {geo.countries.slice(0, 8).map((c) => {
              const pay = geo.totalImpressions > 0 ? c.impressions / geo.totalImpressions : 0;
              return (
                <div key={c.countryCode}
                     style={{ display: "grid", gridTemplateColumns: "42px 1fr 120px", gap: 10, alignItems: "center", fontSize: 12.5 }}>
                  <strong>{c.countryCode}</strong>
                  <span style={{ height: 8, background: "var(--gg-border)", borderRadius: 999, overflow: "hidden" }}>
                    <span style={{ display: "block", height: "100%", width: `${pay * 100}%`, background: "var(--gg-primary)", borderRadius: 999 }} />
                  </span>
                  <span style={{ color: "var(--gg-muted)", textAlign: "right" }}>
                    {c.impressions} gös · {c.clicks} tık
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Kampanyalar */}
      <section>
        <SectionHeader title={`Kampanyalarım (${campaigns.length})`} />
        <div style={{ display: "grid", gap: 12 }}>
          {campaigns.map((c) => {
            const d = DURUM[c.status] ?? DURUM.DRAFT;
            return (
              <div key={c.id} className="gg-card" style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <strong>{c.name}</strong>
                    <div style={{ fontSize: 12, color: "var(--gg-muted)" }}>{c.placement} · {c.pricingModel} · günlük {tl(c.dailyBudget)}</div>
                  </div>
                  <span style={{ background: d.bg, color: d.renk, borderRadius: "var(--gg-r-pill)", padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{d.etiket}</span>
                </div>
                <div style={{ display: "flex", gap: 18, fontSize: 13, flexWrap: "wrap" }}>
                  <span>👁️ {c.impressions} gösterim</span>
                  <span>👆 {c.clicks} tık</span>
                  <span>CTR {(c.ctr * 100).toFixed(1)}%</span>
                  <span>Harcama {tl(c.spentTotal)}</span>
                  <span style={{ color: "var(--gg-muted)" }}>Bugün kalan {tl(c.remainingToday)}</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a href={`/reklam/${c.id}`} className="gg-btn gg-btn-ghost" style={{ padding: "5px 12px", fontSize: 13 }}>📊 Rapor</a>
                  {c.status === "ACTIVE" ? (
                    <form action={durumDegis}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="aksiyon" value="pause" /><button className="gg-btn gg-btn-ghost" style={{ padding: "5px 12px", fontSize: 13 }} type="submit">⏸ Duraklat</button></form>
                  ) : c.status === "PAUSED" ? (
                    <form action={durumDegis}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="aksiyon" value="resume" /><button className="gg-btn gg-btn-ghost" style={{ padding: "5px 12px", fontSize: 13 }} type="submit">▶ Sürdür</button></form>
                  ) : null}
                </div>
              </div>
            );
          })}
          {campaigns.length === 0 ? <p style={{ color: "var(--gg-muted)" }}>Henüz kampanyan yok. <a href="/reklam/kampanya" className="gg-see-all">İlk kampanyanı oluştur ›</a></p> : null}
        </div>
      </section>
    </div>
  );
}
