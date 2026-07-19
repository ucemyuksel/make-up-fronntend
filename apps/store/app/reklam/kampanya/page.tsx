import * as React from "react";
import { Badge, MediaUpload } from "@makeup/ui";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { adApi, adSend, type Advertiser } from "../../lib";

export const metadata = { title: "Yeni Kampanya — GlamGuide" };

export default async function YeniKampanya({ searchParams }: { searchParams: { hata?: string } }) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  if (!token) redirect("/api/auth/signin?callbackUrl=%2Freklam%2Fkampanya");

  const advertiser = await adApi<Advertiser>("/api/advertisers/me", token);
  if (!advertiser) redirect("/reklam"); // önce reklam veren kaydı

  async function olustur(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;

    // Global coğrafi hedefler: 3 satıra kadar (ülke zorunlu, bölge/şehir opsiyonel). Boşlar atlanır.
    const geoTargets: { countryCode: string; regionCode: string | null; cityName: string | null }[] = [];
    for (let i = 1; i <= 3; i++) {
      const c = String(formData.get(`ulke${i}`) ?? "").trim();
      if (!c) continue;
      geoTargets.push({
        countryCode: c.toUpperCase(),
        regionCode: String(formData.get(`bolge${i}`) ?? "").trim() || null,
        cityName: String(formData.get(`sehir${i}`) ?? "").trim() || null,
      });
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
    redirect(r.ok ? "/reklam?ok=1" : `/reklam/kampanya?hata=${encodeURIComponent(r.error ?? "hata")}`);
  }

  const lbl: React.CSSProperties = { display: "grid", gap: 4, fontSize: 13 };
  const geoRow = (i: number) => (
    <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr", gap: 8 }}>
      <input name={`ulke${i}`} className="gg-search" placeholder={i === 1 ? "TR*" : "Ülke"} maxLength={2} />
      <input name={`bolge${i}`} className="gg-search" placeholder="Bölge/Eyalet (ops.)" />
      <input name={`sehir${i}`} className="gg-search" placeholder="Şehir (ops.)" />
    </div>
  );

  return (
    <div style={{ maxWidth: 640, display: "grid", gap: 16 }}>
      <a href="/reklam" className="gg-see-all">← Reklam Paneli</a>
      <div>
        <Badge>Yeni Kampanya</Badge>
        <h1 style={{ margin: "8px 0 0" }}>Kampanya Oluştur</h1>
      </div>
      {searchParams.hata ? <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>Hata: {searchParams.hata}</div> : null}

      <form action={olustur} className="gg-card" style={{ display: "grid", gap: 14 }}>
        <label style={lbl}>Kampanya adı
          <input name="name" required className="gg-search" placeholder="Yaz Koleksiyonu Lansmanı" />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={lbl}>Gösterim yeri
            <select name="placement" className="gg-search">
              <option value="STORY">Story (hikaye arası)</option>
              <option value="FEED">Feed</option>
              <option value="REELS">Reels</option>
            </select>
          </label>
          <label style={lbl}>Fiyat modeli
            <select name="pricingModel" className="gg-search" defaultValue="CPM_CPC">
              <option value="CPM_CPC">CPM + CPC</option>
              <option value="CPM">Sadece CPM (bin gösterim)</option>
              <option value="CPC">Sadece CPC (tık)</option>
            </select>
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <label style={lbl}>CPM teklifi (₺/1000)
            <input name="cpmBid" type="number" step="0.01" min="0" className="gg-search" placeholder="15.00" defaultValue="15" />
          </label>
          <label style={lbl}>CPC teklifi (₺/tık)
            <input name="cpcBid" type="number" step="0.01" min="0" className="gg-search" placeholder="2.50" defaultValue="2.5" />
          </label>
          <label style={lbl}>Günlük bütçe (₺)
            <input name="dailyBudget" type="number" step="0.01" min="0" required className="gg-search" placeholder="100.00" />
          </label>
        </div>

        {/* Global coğrafi hedefleme */}
        <div style={{ display: "grid", gap: 8 }}>
          <strong style={{ fontSize: 14 }}>🌍 Bölgesel Hedefleme</strong>
          <div style={{ fontSize: 12, color: "var(--gg-muted)" }}>Ülke → Bölge/Eyalet → Şehir. Boş bırakılan alt kapsam "tümü" demektir. Hiç ülke girmezsen kampanya <strong>global</strong> yayınlanır.</div>
          {[1, 2, 3].map(geoRow)}
        </div>

        {/* Kreatif */}
        <div style={{ display: "grid", gap: 10, borderTop: "1px solid var(--gg-border)", paddingTop: 12 }}>
          <strong style={{ fontSize: 14 }}>🖼️ Kreatif</strong>
          <label style={lbl}>Görsel/Video URL (9:16 dikey)
            <input id="reklam-medya" name="mediaUrl" required className="gg-search" placeholder="https://... (yükleyince otomatik dolar)" />
          </label>
          <MediaUpload targetId="reklam-medya" label="📤 Kreatif yükle (MinIO)" accept="image/*,video/*" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={lbl}>Medya türü
              <select name="mediaType" className="gg-search"><option value="IMAGE">Görsel</option><option value="VIDEO">Video</option></select>
            </label>
            <label style={lbl}>CTA metni
              <input name="ctaText" className="gg-search" placeholder="İncele" defaultValue="İncele" />
            </label>
          </div>
          <label style={lbl}>Başlık
            <input name="headline" required className="gg-search" placeholder="Yeni sezon %50 indirimle" />
          </label>
          <label style={lbl}>CTA hedef URL
            <input name="ctaUrl" required className="gg-search" placeholder="https://magaza.com/kampanya" />
          </label>
        </div>

        <div style={{ background: "var(--gg-primary-soft)", color: "var(--gg-primary-dark)", borderRadius: 10, padding: "10px 12px", fontSize: 12.5 }}>
          ℹ️ Kampanya <strong>onay bekler</strong>; platform onayından sonra yayına çıkar. Günlük bütçe dolunca otomatik duraklar.
        </div>
        <button className="gg-btn gg-btn-primary" type="submit" style={{ justifySelf: "start" }}>Kampanyayı Oluştur</button>
      </form>
    </div>
  );
}
