import * as React from "react";
import { Badge, MediaUpload } from "@makeup/ui";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { requireSeller } from "../../authGuard";
import { adSend } from "../../lib";
import { RegionPicker } from "../../components/RegionPicker";
import { BudgetPicker } from "../BudgetPicker";

export const metadata = { title: "Reklam Ver — GlamGuide" };

/**
 * Tek adımda reklam verme. Ön koşul yok: reklam veren kaydı ilk reklamda
 * backend'de otomatik açılır, ayrıca "kampanya tanımlama" adımı gerekmez.
 */
export default async function AdCreate({ searchParams }: { searchParams: { error?: string } }) {
  // Satıcı kapısı: giriş + STORE_OWNER rolü (menüyü gizlemek yetmez).
  const { token } = await requireSeller("/ads/campaigns");

  async function create(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;

    // RegionPicker hedefleri tek gizli alanda JSON olarak gönderir.
    let geoTargets: { countryCode: string; regionCode: string | null; cityName: string | null }[] = [];
    try {
      const ham = JSON.parse(String(formData.get("geoTargets") ?? "[]")) as
        { country: string; provinceCode: string; ilAd: string }[];
      geoTargets = ham.map((h) => ({
        countryCode: h.country,
        regionCode: h.provinceCode || null,
        cityName: h.ilAd || null,
      }));
    } catch {
      geoTargets = []; // bozuk gelirse global yayınlanır, oluşturmayı engelleme
    }

    const r = await adSend("/api/campaigns", "POST", t, {
      name: String(formData.get("name") ?? "").trim(),
      placement: String(formData.get("placement") ?? "STORY"),
      pricingModel: String(formData.get("pricingModel") ?? "CPM_CPC"),
      cpmBid: Number(formData.get("cpmBid") ?? 0),
      cpcBid: Number(formData.get("cpcBid") ?? 0),
      dailyBudget: Number(formData.get("dailyBudget") ?? 0),
      mediaUrl: String(formData.get("mediaUrl") ?? "").trim(),
      mediaType: String(formData.get("mediaType") ?? "IMAGE"),
      headline: String(formData.get("headline") ?? "").trim(),
      ctaText: String(formData.get("ctaText") ?? "İncele").trim(),
      ctaUrl: String(formData.get("ctaUrl") ?? "").trim(),
      geoTargets,
    });
    redirect(r.ok ? "/ads?ok=1" : `/ads/campaigns?error=${encodeURIComponent(r.error ?? "error")}`);
  }

  const lbl: React.CSSProperties = { display: "grid", gap: 4, fontSize: 13 };
  const section: React.CSSProperties = {
    display: "grid", gap: 10, borderTop: "1px solid var(--gg-border)", paddingTop: 14,
  };

  return (
    <div style={{ maxWidth: 680, display: "grid", gap: 16 }}>
      <a href="/ads" className="gg-see-all">← Reklamlarım</a>
      <div>
        <Badge>Reklam Ver</Badge>
        <h1 style={{ margin: "8px 0 0" }}>Yeni Reklam</h1>
        <p style={{ color: "var(--gg-muted)", margin: "6px 0 0", fontSize: 13.5 }}>
          Bölgeni ve bütçeni seç, görselini yükle — tek adımda yayına gönder.
        </p>
      </div>
      {searchParams.error ? (
        <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
          Hata: {searchParams.error}
        </div>
      ) : null}

      <form action={create} className="gg-card" style={{ display: "grid", gap: 16 }}>
        <label style={lbl}>
          Reklam adı
          <input name="name" required className="gg-search" placeholder="Yaz Koleksiyonu Lansmanı" />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={lbl}>
            Nerede gösterilsin
            <select name="placement" className="gg-search">
              <option value="STORY">Hikaye (hikayeler arası)</option>
              <option value="FEED">Akış</option>
              <option value="REELS">Reels</option>
            </select>
          </label>
          <label style={lbl}>
            Ücretlendirme
            <select name="pricingModel" className="gg-search" defaultValue="CPM_CPC">
              <option value="CPM_CPC">Gösterim + tık (önerilen)</option>
              <option value="CPM">Sadece gösterim (CPM)</option>
              <option value="CPC">Sadece tık (CPC)</option>
            </select>
          </label>
        </div>

        <div style={section}>
          <strong style={{ fontSize: 14 }}>🌍 Nerede yayınlansın</strong>
          <RegionPicker />
        </div>

        <div style={section}>
          <strong style={{ fontSize: 14 }}>💰 Bütçe</strong>
          <BudgetPicker />
        </div>

        <div style={section}>
          <strong style={{ fontSize: 14 }}>🖼️ Görsel</strong>
          <label style={lbl}>
            Görsel/Video URL (9:16 dikey)
            <input id="ad-medya" name="mediaUrl" required className="gg-search"
                   placeholder="https://... (yükleyince otomatik dolar)" />
          </label>
          <MediaUpload targetId="ad-medya" label="📤 Görsel yükle" accept="image/*,video/*" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={lbl}>
              Medya türü
              <select name="mediaType" className="gg-search">
                <option value="IMAGE">Görsel</option>
                <option value="VIDEO">Video</option>
              </select>
            </label>
            <label style={lbl}>
              Buton metni
              <input name="ctaText" className="gg-search" placeholder="İncele" defaultValue="İncele" />
            </label>
          </div>
          <label style={lbl}>
            Başlık
            <input name="headline" required className="gg-search" placeholder="Yeni sezon %50 indirimle" />
          </label>
          <label style={lbl}>
            Tıklayınca gidilecek address
            <input name="ctaUrl" required className="gg-search" placeholder="https://store.com/campaigns" />
          </label>
        </div>

        <div style={{
          background: "var(--gg-primary-soft)", color: "var(--gg-primary-dark)",
          borderRadius: 10, padding: "10px 12px", fontSize: 12.5,
        }}>
          ℹ️ Reklam <strong>onaya</strong> gider; platform onayladıktan sonra yayına çıkar.
        </div>
        <button className="gg-btn gg-btn-primary" type="submit" style={{ justifySelf: "start" }}>
          Reklamı Yayına Gönder
        </button>
      </form>
    </div>
  );
}
