import * as React from "react";
import { Badge, SectionHeader } from "@makeup/ui";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { requireSeller } from "../../yetki";
import { api, send, type Campaign } from "../../lib";
import { BolgeSecici } from "../../bilesenler/BolgeSecici";

export const metadata = { title: "Kampanya Tanımla — GlamGuide" };

export default async function KampanyaTanimla({ searchParams }: { searchParams: { store?: string; ok?: string; hata?: string } }) {
  // Satıcı kapısı: giriş + STORE_OWNER rolü (menüyü gizlemek yetmez).
  const { token } = await requireSeller("/satici");
  const store = searchParams.store;
  if (!store) return <p>Mağaza seçilmedi. <a href="/satici" className="gg-see-all">← Panele dön</a></p>;

  const campaigns = (await api<Campaign[]>(`/api/stores/${store}/campaigns`, token)) ?? [];

  async function kampanyaEkle(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    const gun = (v: FormDataEntryValue | null) => (v ? new Date(String(v)).toISOString() : null);

    // Bölgesel kampanya: hiç hedef seçilmezse kampanya her yerde geçerli olur.
    let geoTargets: { countryCode: string; regionCode: string | null; cityName: string | null }[] = [];
    try {
      const ham = JSON.parse(String(formData.get("geoTargets") ?? "[]")) as
        { ulke: string; ilKod: string; ilAd: string }[];
      geoTargets = ham.map((h) => ({
        countryCode: h.ulke,
        regionCode: h.ilKod || null,
        cityName: h.ilAd || null,
      }));
    } catch {
      geoTargets = [];
    }

    const r = await send(`/api/stores/${store}/campaigns`, "POST", t, {
      title: String(formData.get("title") ?? "").trim(),
      discountType: String(formData.get("discountType") ?? "PERCENT"),
      discountValue: Number(formData.get("discountValue") ?? 0),
      startsAt: gun(formData.get("startsAt")),
      endsAt: gun(formData.get("endsAt")),
      geoTargets,
    });
    redirect(r.ok ? `/satici/kampanya?store=${store}&ok=1` : `/satici/kampanya?store=${store}&hata=${encodeURIComponent(r.error ?? "hata")}`);
  }

  return (
    <div style={{ maxWidth: 620, display: "grid", gap: 16 }}>
      <a href="/satici" className="gg-see-all">← Satıcı Paneli</a>
      <div>
        <Badge>Promosyon & Kampanya</Badge>
        <h1 style={{ margin: "8px 0 0" }}>Yeni Kampanya</h1>
      </div>
      {searchParams.ok ? <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>✓ Kampanya oluşturuldu.</div> : null}
      {searchParams.hata ? <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>Hata: {searchParams.hata}</div> : null}

      <form action={kampanyaEkle} className="gg-card" style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Kampanya başlığı
          <input name="title" required className="gg-search" placeholder="Yaz İndirimleri" />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>İndirim tipi
            <select name="discountType" className="gg-search">
              <option value="PERCENT">Yüzde (%)</option>
              <option value="AMOUNT">Tutar (₺)</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>İndirim değeri
            <input name="discountValue" type="number" step="0.01" min="0.01" required className="gg-search" placeholder="30" />
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Başlangıç
            <input name="startsAt" type="datetime-local" className="gg-search" />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Bitiş
            <input name="endsAt" type="datetime-local" className="gg-search" />
          </label>
        </div>
        <div style={{ display: "grid", gap: 8, borderTop: "1px solid var(--gg-border)", paddingTop: 12 }}>
          <strong style={{ fontSize: 14 }}>🌍 Nerede geçerli olsun</strong>
          <BolgeSecici />
        </div>
        <button className="gg-btn gg-btn-primary" type="submit" style={{ justifySelf: "start" }}>Kampanyayı Başlat</button>
      </form>

      <section>
        <SectionHeader title={`Mevcut Kampanyalar (${campaigns.length})`} small />
        <div style={{ display: "grid", gap: 8 }}>
          {campaigns.map((c) => (
            <div key={c.id} className="gg-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <strong>{c.title}</strong>
                <div style={{ fontSize: 12.5, color: "var(--gg-muted)" }}>
                  {c.discountType === "PERCENT" ? `%${c.discountValue} indirim` : `₺${c.discountValue} indirim`}
                  {" · "}
                  {c.geoTargets && c.geoTargets.length > 0
                    ? "📍 " + c.geoTargets
                        .map((g) => [g.countryCode, g.cityName].filter(Boolean).join(" "))
                        .join(", ")
                    : "🌍 Tüm bölgeler"}
                </div>
              </div>
              <span style={{ background: c.active ? "#E5F6EC" : "#F3F4F6", color: c.active ? "#1E9E5A" : "#6B7280", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
                {c.active ? "Aktif" : "Pasif"}
              </span>
            </div>
          ))}
          {campaigns.length === 0 ? <p style={{ color: "var(--gg-muted)", fontSize: 13 }}>Henüz kampanya yok.</p> : null}
        </div>
      </section>
    </div>
  );
}
