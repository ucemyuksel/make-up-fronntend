"use client";

import * as React from "react";
import { COUNTRIES, FEATURED_COUNTRIES, countryName } from "./countries";
import { REGIONS, regionName, withRegions } from "./regions";

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

type Hedef = { country: string; provinceCode: string; ilAd: string };

export function RegionPicker() {
  const [hedefler, setHedefler] = React.useState<Hedef[]>([]);
  const [country, setCountry] = React.useState("TR");
  const [region, setRegion] = React.useState("");
  const [freeCity, setFreeCity] = React.useState("");

  const regionList = REGIONS[country];
  const hasList = withRegions(country);

  // Öne çıkan pazarlar üstte ayrı grupta; kalanlar alfabetik.
  const isFeatured = FEATURED_COUNTRIES
    .map((k) => COUNTRIES.find((u) => u.code === k))
    .filter((u): u is { code: string; ad: string } => Boolean(u));
  const digerleri = COUNTRIES.filter((u) => !FEATURED_COUNTRIES.includes(u.code));

  function add() {
    const next: Hedef = hasList
      ? { country, provinceCode: region, ilAd: region ? regionName(country, region) : "" }
      : { country, provinceCode: "", ilAd: freeCity.trim() };

    const anahtar = (h: Hedef) => `${h.country}|${h.provinceCode}|${h.ilAd.toLowerCase()}`;
    if (hedefler.some((h) => anahtar(h) === anahtar(next))) return;

    setHedefler([...hedefler, next]);
    setRegion("");
    setFreeCity("");
  }

  function remove(i: number) {
    setHedefler(hedefler.filter((_, x) => x !== i));
  }

  const etiket = (h: Hedef) =>
    h.ilAd ? `${countryName(h.country)} · ${h.ilAd}` : `${countryName(h.country)} geneli`;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {/* Sunucuya tek alanda JSON olarak gider; server action parse eder. */}
      <input type="hidden" name="geoTargets" value={JSON.stringify(hedefler)} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
        <label style={{ display: "grid", gap: 4, fontSize: 13, minWidth: 0 }}>
          Ülke
          <select className="gg-search" value={country}
                  onChange={(e) => { setCountry(e.target.value); setRegion(""); setFreeCity(""); }}>
            <optgroup label="Öne çıkan pazarlar">
              {isFeatured.map((u) => <option key={u.code} value={u.code}>{u.ad}</option>)}
            </optgroup>
            <optgroup label="Tüm ülkeler">
              {digerleri.map((u) => <option key={u.code} value={u.code}>{u.ad}</option>)}
            </optgroup>
          </select>
        </label>

        {hasList ? (
          <label style={{ display: "grid", gap: 4, fontSize: 13, minWidth: 0 }}>
            Şehir / Bölge
            <select className="gg-search" value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">Tümü ({countryName(country)} geneli)</option>
              {regionList.map((b) => <option key={b.code} value={b.code}>{b.ad}</option>)}
            </select>
          </label>
        ) : (
          <label style={{ display: "grid", gap: 4, fontSize: 13, minWidth: 0 }}>
            Şehir (opsiyonel)
            <input className="gg-search" value={freeCity} maxLength={80}
                   placeholder={`Boş = ${countryName(country)} geneli`}
                   onChange={(e) => setFreeCity(e.target.value)} />
          </label>
        )}

        <button type="button" className="gg-btn gg-btn-ghost" onClick={add}>+ Ekle</button>
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
            <span key={`${h.country}-${h.provinceCode}-${h.ilAd}`} style={{
              background: "var(--gg-primary-soft)", color: "var(--gg-primary-dark)",
              borderRadius: 999, padding: "4px 10px", fontSize: 12.5,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              📍 {etiket(h)}
              <button type="button" onClick={() => remove(i)} aria-label={`${etiket(h)} hedefini kaldır`}
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
