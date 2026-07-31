"use client";

import * as React from "react";
import { ULKELER, ONE_CIKAN_ULKELER, ulkeAdi } from "./ulkeler";
import { BOLGELER, bolgeAdi, bolgeleriOlan } from "./bolgeler";

/**
 * Coğrafi hedefleme seçici — dünyanın tamamı.
 *
 * Ülke seçilince bölge listesi ona göre değişir; bölge listesi olmayan
 * ülkelerde serbest şehir girişi açılır. Hiç hedef eklenmezse "tüm dünya"
 * anlamına gelir.
 *
 * Backend sözleşmesi: countryCode = ISO-2, regionCode = il/eyalet kodu
 * (boş = ülke geneli), cityName = görünen ad.
 */

type Hedef = { ulke: string; ilKod: string; ilAd: string };

export function BolgeSecici() {
  const [hedefler, setHedefler] = React.useState<Hedef[]>([]);
  const [ulke, setUlke] = React.useState("TR");
  const [bolge, setBolge] = React.useState("");
  const [serbestSehir, setSerbestSehir] = React.useState("");

  const bolgeListesi = BOLGELER[ulke];
  const listeVar = bolgeleriOlan(ulke);

  // Öne çıkan pazarlar üstte ayrı grupta; kalanlar alfabetik.
  const isFeatured = ONE_CIKAN_ULKELER
    .map((k) => ULKELER.find((u) => u.kod === k))
    .filter((u): u is { kod: string; ad: string } => Boolean(u));
  const digerleri = ULKELER.filter((u) => !ONE_CIKAN_ULKELER.includes(u.kod));

  function ekle() {
    const yeni: Hedef = listeVar
      ? { ulke, ilKod: bolge, ilAd: bolge ? bolgeAdi(ulke, bolge) : "" }
      : { ulke, ilKod: "", ilAd: serbestSehir.trim() };

    const anahtar = (h: Hedef) => `${h.ulke}|${h.ilKod}|${h.ilAd.toLowerCase()}`;
    if (hedefler.some((h) => anahtar(h) === anahtar(yeni))) return;

    setHedefler([...hedefler, yeni]);
    setBolge("");
    setSerbestSehir("");
  }

  function sil(i: number) {
    setHedefler(hedefler.filter((_, x) => x !== i));
  }

  const etiket = (h: Hedef) =>
    h.ilAd ? `${ulkeAdi(h.ulke)} · ${h.ilAd}` : `${ulkeAdi(h.ulke)} geneli`;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {/* Sunucuya tek alanda JSON olarak gider; server action parse eder. */}
      <input type="hidden" name="geoTargets" value={JSON.stringify(hedefler)} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
        <label style={{ display: "grid", gap: 4, fontSize: 13, minWidth: 0 }}>
          Ülke
          <select className="gg-search" value={ulke}
                  onChange={(e) => { setUlke(e.target.value); setBolge(""); setSerbestSehir(""); }}>
            <optgroup label="Öne çıkan pazarlar">
              {isFeatured.map((u) => <option key={u.kod} value={u.kod}>{u.ad}</option>)}
            </optgroup>
            <optgroup label="Tüm ülkeler">
              {digerleri.map((u) => <option key={u.kod} value={u.kod}>{u.ad}</option>)}
            </optgroup>
          </select>
        </label>

        {listeVar ? (
          <label style={{ display: "grid", gap: 4, fontSize: 13, minWidth: 0 }}>
            Şehir / Bölge
            <select className="gg-search" value={bolge} onChange={(e) => setBolge(e.target.value)}>
              <option value="">Tümü ({ulkeAdi(ulke)} geneli)</option>
              {bolgeListesi.map((b) => <option key={b.kod} value={b.kod}>{b.ad}</option>)}
            </select>
          </label>
        ) : (
          <label style={{ display: "grid", gap: 4, fontSize: 13, minWidth: 0 }}>
            Şehir (opsiyonel)
            <input className="gg-search" value={serbestSehir} maxLength={80}
                   placeholder={`Boş = ${ulkeAdi(ulke)} geneli`}
                   onChange={(e) => setSerbestSehir(e.target.value)} />
          </label>
        )}

        <button type="button" className="gg-btn gg-btn-ghost" onClick={ekle}>+ Ekle</button>
      </div>

      {hedefler.length === 0 ? (
        <div style={{
          fontSize: 12.5, color: "var(--gg-muted)",
          background: "var(--gg-primary-soft)", borderRadius: 8, padding: "8px 10px",
        }}>
          🌍 Şu an <strong>tüm dünya</strong> hedefleniyor. Belirli ülke/şehirlerle sınırlamak
          istersen yukarıdan ekle.
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {hedefler.map((h, i) => (
            <span key={`${h.ulke}-${h.ilKod}-${h.ilAd}`} style={{
              background: "var(--gg-primary-soft)", color: "var(--gg-primary-dark)",
              borderRadius: 999, padding: "4px 10px", fontSize: 12.5,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              📍 {etiket(h)}
              <button type="button" onClick={() => sil(i)} aria-label={`${etiket(h)} hedefini kaldır`}
                      style={{ border: 0, background: "transparent", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>
                ×
              </button>
            </span>
          ))}
          <button type="button" className="gg-btn gg-btn-ghost" onClick={() => setHedefler([])}
                  style={{ fontSize: 12 }}>
            Tümünü temizle (dünya geneli)
          </button>
        </div>
      )}
    </div>
  );
}
