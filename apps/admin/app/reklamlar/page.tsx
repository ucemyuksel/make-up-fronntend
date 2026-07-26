import { auth } from "../../auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminApi, adminPost } from "../lib";
import { DunyaHaritasi, type SehirSatiri, type UlkeSatiri } from "./DunyaHaritasi";

export const metadata = { title: "Reklam Yönetimi — GlamGuide" };

type GeoTarget = { countryCode: string; regionCode?: string; cityName?: string };
type Campaign = {
  id: string;
  advertiserId: string;
  name: string;
  placement: string;
  status: "DRAFT" | "PENDING" | "ACTIVE" | "PAUSED" | "ENDED" | "REJECTED";
  pricingModel: string;
  cpmBid: number;
  cpcBid: number;
  dailyBudget: number;
  spentToday: number;
  spentTotal: number;
  remainingToday: number;
  impressions: number;
  clicks: number;
  ctr: number;
  startsAt: string | null;
  endsAt: string | null;
  geoTargets: GeoTarget[];
  creative?: { mediaUrl: string; headline: string; ctaText: string };
};

const DURUM: Record<Campaign["status"], { bg: string; fg: string; text: string }> = {
  PENDING: { bg: "#FCF2DE", fg: "#C98A1E", text: "ONAY BEKLİYOR" },
  ACTIVE: { bg: "#E5F6EC", fg: "#1E9E5A", text: "YAYINDA" },
  PAUSED: { bg: "#F1F1F3", fg: "#6B7280", text: "DURAKLATILDI" },
  REJECTED: { bg: "#FBE6E6", fg: "#B42318", text: "REDDEDİLDİ" },
  ENDED: { bg: "#F1F1F3", fg: "#6B7280", text: "SONA ERDİ" },
  DRAFT: { bg: "#F1F1F3", fg: "#6B7280", text: "TASLAK" },
};

const SEKMELER = [
  { key: "", label: "Tümü" },
  { key: "PENDING", label: "Onay bekleyen" },
  { key: "ACTIVE", label: "Yayında" },
  { key: "PAUSED", label: "Duraklatılan" },
  { key: "REJECTED", label: "Reddedilen" },
];

const tl = (n: number) =>
  "₺" + Number(n ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const yuzde = (n: number) => (Number(n ?? 0) * 100).toFixed(2) + "%";
const tarih = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("tr-TR") : "—");
const hedef = (g: GeoTarget[]) =>
  g.length === 0
    ? "Tüm bölgeler"
    : g.map((x) => [x.countryCode, x.regionCode, x.cityName].filter(Boolean).join(" / ")).join(", ");

export default async function Ads({
  searchParams,
}: {
  searchParams: { durum?: string; ok?: string; hata?: string };
}) {
  const s = (await auth()) as { accessToken?: string; roles?: string[] } | null;
  if (!s?.accessToken) redirect("/");
  if (!s.roles?.includes("ADMIN")) redirect("/yetkisiz");

  // Coğrafi pano verisi (ülke + şehir kırılımı tek çağrıda).
  const geo = await adminApi<{
    totalImpressions: number; totalClicks: number; totalSpend: number; ctr: number;
    countries: UlkeSatiri[]; cities: SehirSatiri[];
  }>(process.env.AD_API!, "/api/campaigns/moderation/geo", s.accessToken);

  const durum = searchParams.durum ?? "";
  const items =
    (await adminApi<Campaign[]>(
      process.env.AD_API!,
      `/api/campaigns/moderation/all${durum ? `?status=${durum}` : ""}`,
      s.accessToken,
    )) ?? [];

  // Üst özet, süzgeçten bağımsız olsun diye tüm kampanyalardan hesaplanır.
  const tumu = durum
    ? (await adminApi<Campaign[]>(process.env.AD_API!, "/api/campaigns/moderation/all", s.accessToken)) ?? []
    : items;
  const bekleyen = tumu.filter((c) => c.status === "PENDING").length;
  const yayinda = tumu.filter((c) => c.status === "ACTIVE").length;
  const gunlukHarcama = tumu.reduce((t, c) => t + Number(c.spentToday ?? 0), 0);
  const toplamGosterim = tumu.reduce((t, c) => t + Number(c.impressions ?? 0), 0);

  async function moderate(form: FormData) {
    "use server";
    const session = (await auth()) as { accessToken?: string } | null;
    if (!session?.accessToken) return;
    // approve/reject: /api/campaigns/{id}/... · pause/resume: yönetim ucu
    // (/moderation/{id}/...) — sahiplik arayan uç, başkasının kampanyasında
    // admin'e 404 döner (varlık sızdırmamak için kasıtlı).
    const action = String(form.get("action"));
    const id = String(form.get("id"));
    const path =
      action === "pause" || action === "resume"
        ? `/api/campaigns/moderation/${id}/${action}`
        : `/api/campaigns/${id}/${action}`;
    const ok = await adminPost(process.env.AD_API!, path, session.accessToken);
    const donus = String(form.get("donus") ?? "/reklamlar");
    revalidatePath("/reklamlar");
    redirect(donus + (donus.includes("?") ? "&" : "?") + (ok ? "ok=1" : "hata=1"));
  }

  const back = `/reklamlar${durum ? `?durum=${durum}` : ""}`;

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 32, display: "grid", gap: 22 }}>
      <div>
        <a href="/">← Yönetim merkezi</a>
        <h1 style={{ margin: "8px 0 4px" }}>Reklam Yönetimi</h1>
        <p style={{ color: "var(--gg-muted)", margin: 0 }}>
          Onay bekleyen kampanyalar incelenir; yayındakiler duraklatılabilir. Bütçesi biten kampanya
          sistem tarafından otomatik duraklatılır.
        </p>
      </div>

      {searchParams.ok ? (
        <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>✓ İşlem uygulandı.</div>
      ) : null}
      {searchParams.hata ? (
        <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
          İşlem uygulanamadı.
        </div>
      ) : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { l: "Onay bekleyen", v: String(bekleyen) },
          { l: "Yayında", v: String(yayinda) },
          { l: "Bugünkü harcama", v: tl(gunlukHarcama) },
          { l: "Toplam gösterim", v: toplamGosterim.toLocaleString("tr-TR") },
        ].map((k) => (
          <div key={k.l} className="gg-card" style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, color: "var(--gg-muted)" }}>{k.l}</span>
            <strong style={{ fontSize: 20 }}>{k.v}</strong>
          </div>
        ))}
      </section>

      {/* Coğrafi pano — gösterimlerin dünya üzerindeki dağılımı */}
      {geo && geo.countries.length > 0 ? (
        <section style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 17, margin: 0 }}>🌍 Coğrafi Dağılım</h2>
            <span style={{ fontSize: 12.5, color: "var(--gg-muted)" }}>
              {geo.totalImpressions.toLocaleString("tr-TR")} gösterim ·{" "}
              {geo.totalClicks.toLocaleString("tr-TR")} tık · CTR {(geo.ctr * 100).toFixed(2)}% ·{" "}
              {tl(Number(geo.totalSpend))}
            </span>
          </div>

          <DunyaHaritasi ulkeler={geo.countries} sehirler={geo.cities} />

          {/* Ülke kırılımı — haritanın yanındaki sıralı liste */}
          <div style={{ display: "grid", gap: 6 }}>
            {geo.countries.slice(0, 10).map((c) => {
              const pay = geo.totalImpressions > 0 ? c.impressions / geo.totalImpressions : 0;
              return (
                <div key={c.countryCode}
                     style={{ display: "grid", gridTemplateColumns: "42px 1fr 130px", gap: 10, alignItems: "center", fontSize: 12.5 }}>
                  <strong>{c.countryCode}</strong>
                  <span style={{ height: 8, background: "var(--gg-border, #EEE)", borderRadius: 999, overflow: "hidden" }}>
                    <span style={{ display: "block", height: "100%", width: `${pay * 100}%`, background: "var(--gg-primary, #C56A7A)", borderRadius: 999 }} />
                  </span>
                  <span style={{ color: "var(--gg-muted)", textAlign: "right" }}>
                    {c.impressions.toLocaleString("tr-TR")} gös · {c.clicks} tık · {(c.ctr * 100).toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {SEKMELER.map((t) => (
          <a
            key={t.key}
            href={t.key ? `/reklamlar?durum=${t.key}` : "/reklamlar"}
            className={`gg-btn ${durum === t.key ? "gg-btn-primary" : "gg-btn-ghost"}`}
          >
            {t.label}
          </a>
        ))}
      </div>

      <section>
        <h2 style={{ fontSize: 17 }}>Kampanyalar ({items.length})</h2>
        {items.length === 0 ? (
          <p style={{ color: "var(--gg-muted)" }}>
            {durum === "PENDING"
              ? "Onay bekleyen kampanya yok — tüm başvurular sonuçlandırılmış."
              : "Bu süzgeçle eşleşen kampanya yok."}
          </p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((c) => {
              const d = DURUM[c.status];
              const butceBitti = Number(c.remainingToday ?? 0) <= 0;
              return (
                <article key={c.id} className="gg-card" style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <strong>{c.name}</strong>
                    <span style={{
                      background: d.bg, color: d.fg, borderRadius: 999,
                      padding: "2px 10px", fontSize: 11, fontWeight: 700,
                    }}>{d.text}</span>
                    {butceBitti && c.status === "ACTIVE" ? (
                      <span style={{
                        background: "#FCF2DE", color: "#C98A1E", borderRadius: 999,
                        padding: "2px 10px", fontSize: 11, fontWeight: 700,
                      }}>GÜNLÜK BÜTÇE BİTTİ</span>
                    ) : null}
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 11.5, color: "var(--gg-muted)" }}>
                      {c.placement} · {c.pricingModel}
                    </span>
                  </div>

                  {c.creative?.headline ? (
                    <p style={{ margin: 0, fontSize: 14 }}>
                      “{c.creative.headline}” · <span style={{ color: "var(--gg-muted)" }}>{c.creative.ctaText}</span>
                    </p>
                  ) : null}

                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 10, fontSize: 12.5,
                  }}>
                    <span>Günlük bütçe: <strong>{tl(c.dailyBudget)}</strong></span>
                    <span>Bugün harcanan: <strong>{tl(c.spentToday)}</strong></span>
                    <span>Kalan: <strong>{tl(c.remainingToday)}</strong></span>
                    <span>Gösterim: <strong>{Number(c.impressions ?? 0).toLocaleString("tr-TR")}</strong></span>
                    <span>Tık: <strong>{Number(c.clicks ?? 0).toLocaleString("tr-TR")}</strong></span>
                    <span>CTR: <strong>{yuzde(c.ctr)}</strong></span>
                    <span>Teklif: <strong>{c.pricingModel === "CPC" ? tl(c.cpcBid) : tl(c.cpmBid)}</strong></span>
                    <span>Tarih: <strong>{tarih(c.startsAt)} → {tarih(c.endsAt)}</strong></span>
                  </div>

                  <div style={{ fontSize: 12, color: "var(--gg-muted)" }}>Hedef bölgeler: {hedef(c.geoTargets)}</div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {c.status === "PENDING" ? (
                      <>
                        <form action={moderate}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="action" value="approve" />
                          <input type="hidden" name="donus" value={back} />
                          <button className="gg-btn gg-btn-primary">Onayla</button>
                        </form>
                        <form action={moderate}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="action" value="reject" />
                          <input type="hidden" name="donus" value={back} />
                          <button className="gg-btn gg-btn-ghost">Reddet</button>
                        </form>
                      </>
                    ) : c.status === "ACTIVE" ? (
                      <form action={moderate}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="action" value="pause" />
                        <input type="hidden" name="donus" value={back} />
                        <button className="gg-btn gg-btn-ghost">Duraklat</button>
                      </form>
                    ) : c.status === "PAUSED" ? (
                      <form action={moderate}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="action" value="resume" />
                        <input type="hidden" name="donus" value={back} />
                        <button className="gg-btn gg-btn-primary">Yayına al</button>
                      </form>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
