import * as React from "react";
import { SectionHeader, Badge, WorldMap, type CityRow, type CountryRow } from "@makeup/ui";
import { revalidatePath } from "next/cache";
import { auth } from "../../auth";
import { requireSeller } from "../authGuard";

import { adApi, adSend, tl, type Advertiser, type AdCampaign, type LedgerDay } from "../lib";

export const metadata = { title: "Reklam Paneli — GlamGuide" };

const STATUS_STYLE: Record<string, { etiket: string; color: string; bg: string }> = {
  ACTIVE: { etiket: "Yayında", color: "#1E9E5A", bg: "#E5F6EC" },
  PENDING: { etiket: "Onay bekliyor", color: "#C98A1E", bg: "#FCF2DE" },
  PAUSED: { etiket: "Duraklatıldı", color: "#6B7280", bg: "#F1F1F3" },
  REJECTED: { etiket: "Reddedildi", color: "#D23B3B", bg: "#FBE6E6" },
  ENDED: { etiket: "Bitti", color: "#6B7280", bg: "#F1F1F3" },
  DRAFT: { etiket: "Taslak", color: "#6B7280", bg: "#F1F1F3" },
};

/** Satıcı sekmesi — eski/biten reklamlar da görülebilsin. */
const TABS: { key: string; label: string }[] = [
  { key: "", label: "Tümü" },
  { key: "ACTIVE", label: "Yayında" },
  { key: "PENDING", label: "Onay bekleyen" },
  { key: "PAUSED", label: "Duraklatılan" },
  { key: "ENDED", label: "Sona eren" },
  { key: "REJECTED", label: "Reddedilen" },
];

export default async function AdPanel({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string; status?: string };
}) {
  // Satıcı kapısı: giriş + STORE_OWNER rolü (menüyü gizlemek yetmez).
  const { token } = await requireSeller("/ads");

  const advertiser = await adApi<Advertiser>("/api/advertisers/me", token);

  async function toggleStatus(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    const id = String(formData.get("id") ?? "");
    const aksiyon = String(formData.get("aksiyon") ?? "pause");
    await adSend(`/api/campaigns/${id}/${aksiyon}`, "POST", t, {});
    revalidatePath("/ads");
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
            Hikaye, akış ve Reels aralarında bölgesel reklam göster. Ön kayıt gerekmez —
            bölgeni ve bütçeni seç, yayına gönder.
          </p>
        </div>
        {searchParams.error ? (
          <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
            Hata: {searchParams.error}
          </div>
        ) : null}
        <a href="/ads/campaigns" className="gg-btn gg-btn-primary" style={{ justifySelf: "start" }}>
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

  const allCampaigns = (await adApi<AdCampaign[]>("/api/campaigns/mine", token)) ?? [];
  const status = searchParams.status ?? "";
  // Süzgeç istemci tarafında: reklam veren kendi kampanyalarının tamamını zaten
  // çekiyor, ayrı bir istek atmaya gerek yok.
  const campaigns = status ? allCampaigns.filter((c) => c.status === status) : allCampaigns;
  const sayim = (d: string) => (d ? allCampaigns.filter((c) => c.status === d).length : allCampaigns.length);
  const ledger = (await adApi<LedgerDay[]>("/api/advertisers/me/ledger", token)) ?? [];
  // Reklamlarım nerede gösteriliyor — kendi coğrafi panom.
  const geo = await adApi<{
    totalImpressions: number; totalClicks: number; totalSpend: number; ctr: number;
    countries: CountryRow[]; cities: CityRow[];
  }>("/api/campaigns/geo/mine", token);
  const totalSpend = ledger.reduce((s, d) => s + Number(d.spend), 0);

  return (
    <div style={{ maxWidth: 900, display: "grid", gap: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <Badge>Reklam Paneli</Badge>
          <h1 style={{ margin: "8px 0 0" }}>{advertiser.name}</h1>
          <div style={{ fontSize: 12.5, color: "var(--gg-muted)" }}>Reklam veren · {advertiser.status}</div>
        </div>
        <a href="/ads/campaigns" className="gg-btn gg-btn-primary">+ Reklam Ver</a>
      </div>

      {searchParams.ok ? <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>✓ Kampanya oluşturuldu — onaydan sonra yayına çıkar.</div> : null}

      {/* Ön ödemeli model: bakiye bitince gösterim ücretlendirilmez ve
          kampanyalar otomatik durur. */}
      {Number(advertiser.balance) <= 0 ? (
        <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10, display: "grid", gap: 4 }}>
          <strong>⚠️ Bakiyen bitti — reklamların durduruldu.</strong>
          <span style={{ fontSize: 13 }}>
            Reklamlar ön ödemelidir. Bakiye yüklendiğinde duraklatılan kampanyaları
            &quot;Sürdür&quot; ile yeniden yayına alabilirsin.
          </span>
        </div>
      ) : Number(advertiser.balance) < 50 ? (
        <div style={{ background: "#FCF2DE", color: "#C98A1E", padding: 12, borderRadius: 10, fontSize: 13.5 }}>
          Bakiyen azaldı ({tl(advertiser.balance)}) — bitince reklamların otomatik durur.
        </div>
      ) : null}

      {/* Özet */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <div className="gg-card"><div style={{ fontSize: 12, color: "var(--gg-muted)" }}>Kampanya</div><strong style={{ fontSize: 22 }}>{campaigns.length}</strong></div>
        <div className="gg-card"><div style={{ fontSize: 12, color: "var(--gg-muted)" }}>Toplam Harcama</div><strong style={{ fontSize: 22 }}>{tl(totalSpend)}</strong></div>
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
          <WorldMap countries={geo.countries} cities={geo.cities} />
          <div style={{ display: "grid", gap: 6 }}>
            {geo.countries.slice(0, 8).map((c) => {
              const share = geo.totalImpressions > 0 ? c.impressions / geo.totalImpressions : 0;
              return (
                <div key={c.countryCode}
                     style={{ display: "grid", gridTemplateColumns: "42px 1fr 120px", gap: 10, alignItems: "center", fontSize: 12.5 }}>
                  <strong>{c.countryCode}</strong>
                  <span style={{ height: 8, background: "var(--gg-border)", borderRadius: 999, overflow: "hidden" }}>
                    <span style={{ display: "block", height: "100%", width: `${share * 100}%`, background: "var(--gg-primary)", borderRadius: 999 }} />
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
        <SectionHeader title={`Adsım (${campaigns.length})`} />

        {/* Durum sekmeleri — biten/reddedilen eski reklamlar da görülebilsin. */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 12px" }}>
          {TABS.map((t) => (
            <a key={t.key} href={t.key ? `/ads?status=${t.key}` : "/ads"}
               className={`gg-btn ${status === t.key ? "gg-btn-primary" : "gg-btn-ghost"}`}
               style={{ fontSize: 12.5, padding: "5px 12px" }}>
              {t.label} ({sayim(t.key)})
            </a>
          ))}
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {campaigns.map((c) => {
            const d = STATUS_STYLE[c.status] ?? STATUS_STYLE.DRAFT;
            return (
              <div key={c.id} className="gg-card" style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <strong>{c.name}</strong>
                    <div style={{ fontSize: 12, color: "var(--gg-muted)" }}>{c.placement} · {c.pricingModel} · günlük {tl(c.dailyBudget)}</div>
                  </div>
                  <span style={{ background: d.bg, color: d.color, borderRadius: "var(--gg-r-pill)", padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{d.etiket}</span>
                </div>
                <div style={{ display: "flex", gap: 18, fontSize: 13, flexWrap: "wrap" }}>
                  <span>👁️ {c.impressions} gösterim</span>
                  <span>👆 {c.clicks} tık</span>
                  <span>CTR {(c.ctr * 100).toFixed(1)}%</span>
                  <span>Harcama {tl(c.spentTotal)}</span>
                  <span style={{ color: "var(--gg-muted)" }}>Bugün kalan {tl(c.remainingToday)}</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a href={`/ads/${c.id}`} className="gg-btn gg-btn-ghost" style={{ padding: "5px 12px", fontSize: 13 }}>📊 Rapor</a>
                  {c.status === "ACTIVE" ? (
                    <form action={toggleStatus}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="aksiyon" value="pause" /><button className="gg-btn gg-btn-ghost" style={{ padding: "5px 12px", fontSize: 13 }} type="submit">⏸ Duraklat</button></form>
                  ) : c.status === "PAUSED" ? (
                    <form action={toggleStatus}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="aksiyon" value="resume" /><button className="gg-btn gg-btn-ghost" style={{ padding: "5px 12px", fontSize: 13 }} type="submit">▶ Sürdür</button></form>
                  ) : null}
                </div>
              </div>
            );
          })}
          {campaigns.length === 0 ? <p style={{ color: "var(--gg-muted)" }}>Henüz kampanyan yok. <a href="/ads/campaigns" className="gg-see-all">İlk kampanyanı oluşkind ›</a></p> : null}
        </div>
      </section>
    </div>
  );
}
