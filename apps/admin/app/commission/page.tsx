import type { CSSProperties } from "react";
import { auth } from "../../auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminApi, adminSend } from "../lib";

export const metadata = { title: "Komisyon Yönetimi — GlamGuide" };

type CommissionRule = {
  id: string;
  countryCode: string | null;
  regionCode: string | null;
  categoryId: string | null;
  platformRate: number;
  campaignSurcharge: number;
  payoutDelayDays: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  active: boolean;
  note: string | null;
  specificity: number;
  scopeLabel: string;
};

type Preview = { ruleId: string | null; platformRate: number; payoutDelayDays: number };

/** 0.125 → "%12.5" */
const pct = (value: number) => `%${Number((value * 100).toFixed(2))}`;

export default async function Commission({
  searchParams,
}: {
  searchParams: { country?: string; region?: string; campaign?: string; ok?: string; error?: string };
}) {
  const session = (await auth()) as { accessToken?: string; roles?: string[] } | null;
  if (!session?.accessToken) redirect("/");
  if (!session.roles?.includes("ADMIN")) redirect("/forbidden");

  // Komisyon ve gelir defteri accounting-servicee taşındı (muhasebe ayrı bir
  // bağlam: "ödeme geçti mi" ile "bu satış kime ne kazandırdı" farklı sorular).
  const api = process.env.ACCOUNTING_API!;
  const rules = (await adminApi<CommissionRule[]>(api, "/api/commissions", session.accessToken)) ?? [];

  // Önizleme: "bu pazarda oran ne olur?" — kural yazmadan denenir.
  const previewCountry = searchParams.country?.trim() ?? "";
  const previewRegion = searchParams.region?.trim() ?? "";
  const previewCampaign = searchParams.campaign === "1";
  let preview: Preview | null = null;
  if (previewCountry) {
    const query = new URLSearchParams({ country: previewCountry });
    if (previewRegion) query.set("region", previewRegion);
    if (previewCampaign) query.set("campaign", "true");
    preview = await adminApi<Preview>(api, `/api/commissions/preview?${query}`, session.accessToken);
  }

  async function createRule(form: FormData) {
    "use server";
    const s = (await auth()) as { accessToken?: string } | null;
    if (!s?.accessToken) return;

    const rate = Number(form.get("platformRate"));
    const surcharge = Number(form.get("campaignSurcharge") ?? 0);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      redirect("/commission?error=" + encodeURIComponent("Komisyon oranı 0-100 arasında olmalı"));
    }

    const result = await adminSend(process.env.ACCOUNTING_API!, "/api/commissions", s.accessToken, "POST", {
      countryCode: String(form.get("countryCode") ?? "").trim() || null,
      regionCode: String(form.get("regionCode") ?? "").trim() || null,
      categoryId: String(form.get("categoryId") ?? "").trim() || null,
      // Panelde yüzde girilir (12), API oran bekler (0.12)
      platformRate: rate / 100,
      campaignSurcharge: surcharge / 100,
      payoutDelayDays: Number(form.get("payoutDelayDays") ?? 14),
      note: String(form.get("note") ?? "").trim() || null,
    });
    revalidatePath("/commission");
    redirect(result.ok ? "/commission?ok=1" : "/commission?error=" + encodeURIComponent(result.error ?? "error"));
  }

  async function deactivateRule(form: FormData) {
    "use server";
    const s = (await auth()) as { accessToken?: string } | null;
    if (!s?.accessToken) return;
    await adminSend(process.env.ACCOUNTING_API!, `/api/commissions/${form.get("id")}`, s.accessToken, "DELETE");
    revalidatePath("/commission");
  }

  const activeRules = rules.filter((r) => r.active).sort((a, b) => b.specificity - a.specificity);
  const passiveRules = rules.filter((r) => !r.active);
  const label: CSSProperties = { display: "grid", gap: 4, fontSize: 13 };

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 32, display: "grid", gap: 24 }}>
      <div>
        <a href="/">← Yönetim merkezi</a>
        <h1 style={{ margin: "8px 0 4px" }}>Komisyon Yönetimi</h1>
        <p style={{ color: "var(--gg-muted)", margin: 0 }}>
          Komisyon ülkeye, bölgeye ve kategoriye göre tanımlanır. Bir satışta{" "}
          <strong>en özel kural</strong> uygulanır: ülke+bölge+kategori › ülke+bölge › ülke › global.
        </p>
      </div>

      {searchParams.ok ? (
        <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>
          ✓ Kural eklendi — yeni satışlarda geçerli.
        </div>
      ) : null}
      {searchParams.error ? (
        <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
          Hata: {searchParams.error}
        </div>
      ) : null}

      {/* Önizleme aracı */}
      <section className="gg-card">
        <h2 style={{ marginTop: 0, fontSize: 17 }}>🔎 Oran önizleme</h2>
        <p style={{ color: "var(--gg-muted)", fontSize: 13, marginTop: 0 }}>
          Belirli bir pazarda hangi oranın uygulanacağını, kural yazmadan gör.
        </p>
        <form method="get" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={label}>
            Ülke (ISO)
            <input name="country" defaultValue={previewCountry} className="gg-search"
                   placeholder="TR" maxLength={2} style={{ width: 90 }} />
          </label>
          <label style={label}>
            Bölge
            <input name="region" defaultValue={previewRegion} className="gg-search"
                   placeholder="34" style={{ width: 120 }} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input type="checkbox" name="campaign" value="1" defaultChecked={previewCampaign} />
            Kampanyalı
          </label>
          <button className="gg-btn gg-btn-primary" type="submit">Hesapla</button>
        </form>

        {preview ? (
          <div style={{ marginTop: 14, padding: 14, background: "var(--gg-primary-soft)", borderRadius: 10 }}>
            <strong style={{ fontSize: 20, color: "var(--gg-primary-dark)" }}>
              {pct(preview.platformRate)} platform komisyonu
            </strong>
            <div style={{ fontSize: 13, color: "var(--gg-muted)", marginTop: 4 }}>
              Sanatçıya kalan <strong>{pct(1 - preview.platformRate)}</strong> · Ödeme vadesi{" "}
              <strong>T+{preview.payoutDelayDays} gün</strong> ·{" "}
              {preview.ruleId ? `kural ${preview.ruleId.slice(0, 8)}…` : "config varsayılanı (eşleşen kural yok)"}
            </div>
          </div>
        ) : previewCountry ? (
          <p style={{ color: "var(--gg-muted)", fontSize: 13 }}>
            Önizleme alınamadı — accounting-service çalışıyor mu?
          </p>
        ) : null}
      </section>

      {/* Yeni kural */}
      <section className="gg-card">
        <h2 style={{ marginTop: 0, fontSize: 17 }}>➕ Yeni komisyon kuralı</h2>
        <p style={{ color: "var(--gg-muted)", fontSize: 13, marginTop: 0 }}>
          Boş bırakılan scope alanı &quot;hepsi&quot; demektir. Hepsini boş bırakırsan global varsayılan olur.
        </p>
        <form action={createRule} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <label style={label}>
              Ülke (ISO-3166)
              <input name="countryCode" className="gg-search" placeholder="TR (boş = tümü)" maxLength={2} />
            </label>
            <label style={label}>
              Bölge / Eyalet
              <input name="regionCode" className="gg-search" placeholder="34 (boş = tümü)" />
            </label>
            <label style={label}>
              Kategori ID
              <input name="categoryId" className="gg-search" placeholder="UUID (boş = tümü)" />
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <label style={label}>
              Platform komisyonu (%)
              <input name="platformRate" type="number" step="0.01" min="0" max="100" required
                     className="gg-search" placeholder="12" />
            </label>
            <label style={label}>
              Kampanya ek komisyonu (%)
              <input name="campaignSurcharge" type="number" step="0.01" min="0" max="100"
                     className="gg-search" placeholder="2" defaultValue="0" />
            </label>
            <label style={label}>
              Ödeme vadesi (gün)
              <input name="payoutDelayDays" type="number" min="0" max="90"
                     className="gg-search" placeholder="14" defaultValue="14" />
            </label>
          </div>
          <label style={label}>
            Not
            <input name="note" className="gg-search" placeholder="Örn. Türkiye pazarı indirimli komisyon" />
          </label>
          <button className="gg-btn gg-btn-primary" type="submit" style={{ justifySelf: "start" }}>
            Kuralı Ekle
          </button>
        </form>
      </section>

      {/* Aktif kurallar */}
      <section>
        <h2 style={{ fontSize: 17 }}>Aktif kurallar ({activeRules.length})</h2>
        {activeRules.length === 0 ? (
          <p style={{ color: "var(--gg-muted)" }}>
            Aktif kural yok — satışlarda config varsayılanı uygulanır.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {activeRules.map((rule) => (
              <article key={rule.id} className="gg-card"
                       style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <strong style={{ fontSize: 15 }}>{rule.scopeLabel}</strong>
                  <div style={{ fontSize: 12.5, color: "var(--gg-muted)", marginTop: 3 }}>
                    Özgüllük {rule.specificity} · T+{rule.payoutDelayDays} gün
                    {rule.note ? ` · ${rule.note}` : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 19, fontWeight: 700, color: "var(--gg-primary-dark)" }}>
                    {pct(rule.platformRate)}
                  </div>
                  {rule.campaignSurcharge > 0 ? (
                    <div style={{ fontSize: 11.5, color: "var(--gg-muted)" }}>
                      kampanyada +{pct(rule.campaignSurcharge)}
                    </div>
                  ) : null}
                </div>
                <form action={deactivateRule}>
                  <input type="hidden" name="id" value={rule.id} />
                  <button className="gg-btn gg-btn-ghost" type="submit">Devre dışı bırak</button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Denetim izi */}
      {passiveRules.length > 0 ? (
        <section>
          <h2 style={{ fontSize: 17 }}>Geçmiş kurallar ({passiveRules.length})</h2>
          <p style={{ color: "var(--gg-muted)", fontSize: 13, marginTop: 0 }}>
            Kurallar silinmez, devre dışı bırakılır — hangi satışa hangi oranın uygulandığı denetlenebilir kalır.
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {passiveRules.map((rule) => (
              <article key={rule.id} className="gg-card"
                       style={{ display: "flex", gap: 12, alignItems: "center", opacity: 0.65 }}>
                <span style={{ flex: 1 }}>{rule.scopeLabel}</span>
                <strong>{pct(rule.platformRate)}</strong>
                <span style={{ fontSize: 12, color: "var(--gg-muted)" }}>
                  {rule.effectiveTo
                    ? `${new Date(rule.effectiveTo).toLocaleDateString("tr-TR")} tarihinde closeıldı`
                    : "kapatıldı"}
                </span>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
