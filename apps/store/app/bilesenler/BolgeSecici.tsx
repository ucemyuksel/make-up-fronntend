"use client";

import * as React from "react";

/**
 * Bölgesel hedefleme seçici. Ülke seçilince il listesi ona göre değişir;
 * il boş bırakılırsa hedef "ülkenin tamamı" olur. Serbest metin yerine liste
 * kullanılır — "TR" yerine "Türkiye / İstanbul" yazım hatası olmadan seçilir.
 *
 * Backend sözleşmesi (ad_geo_targets): countryCode = ISO-2, regionCode = il
 * plaka/eyalet kodu, cityName = il adı.
 */

type Il = { kod: string; ad: string };

const ULKELER: { kod: string; ad: string; iller: Il[] }[] = [
  {
    kod: "TR",
    ad: "Türkiye",
    // Nüfus/reklam hacmi yüksek iller önde; tamamı plaka kodlarıyla.
    iller: [
      { kod: "34", ad: "İstanbul" }, { kod: "06", ad: "Ankara" }, { kod: "35", ad: "İzmir" },
      { kod: "16", ad: "Bursa" }, { kod: "07", ad: "Antalya" }, { kod: "01", ad: "Adana" },
      { kod: "42", ad: "Konya" }, { kod: "27", ad: "Gaziantep" }, { kod: "41", ad: "Kocaeli" },
      { kod: "38", ad: "Kayseri" }, { kod: "55", ad: "Samsun" }, { kod: "20", ad: "Denizli" },
      { kod: "31", ad: "Hatay" }, { kod: "45", ad: "Manisa" }, { kod: "61", ad: "Trabzon" },
      { kod: "21", ad: "Diyarbakır" }, { kod: "44", ad: "Malatya" }, { kod: "65", ad: "Van" },
      { kod: "33", ad: "Mersin" }, { kod: "09", ad: "Aydın" }, { kod: "48", ad: "Muğla" },
      { kod: "10", ad: "Balıkesir" }, { kod: "26", ad: "Eskişehir" }, { kod: "22", ad: "Edirne" },
      { kod: "54", ad: "Sakarya" }, { kod: "63", ad: "Şanlıurfa" }, { kod: "25", ad: "Erzurum" },
    ],
  },
  {
    kod: "DE",
    ad: "Almanya",
    iller: [
      { kod: "BE", ad: "Berlin" }, { kod: "BY", ad: "Bayern" }, { kod: "NW", ad: "Nordrhein-Westfalen" },
      { kod: "HE", ad: "Hessen" }, { kod: "HH", ad: "Hamburg" }, { kod: "BW", ad: "Baden-Württemberg" },
    ],
  },
  {
    kod: "NL",
    ad: "Hollanda",
    iller: [{ kod: "NH", ad: "Noord-Holland" }, { kod: "ZH", ad: "Zuid-Holland" }, { kod: "UT", ad: "Utrecht" }],
  },
  {
    kod: "GB",
    ad: "Birleşik Krallık",
    iller: [{ kod: "LND", ad: "London" }, { kod: "MAN", ad: "Manchester" }, { kod: "BIR", ad: "Birmingham" }],
  },
  {
    kod: "US",
    ad: "ABD",
    iller: [
      { kod: "CA", ad: "California" }, { kod: "NY", ad: "New York" }, { kod: "TX", ad: "Texas" },
      { kod: "FL", ad: "Florida" }, { kod: "IL", ad: "Illinois" },
    ],
  },
  { kod: "AZ", ad: "Azerbaycan", iller: [{ kod: "BA", ad: "Bakı" }, { kod: "GA", ad: "Gəncə" }] },
];

type Hedef = { ulke: string; ilKod: string; ilAd: string };

export function BolgeSecici() {
  const [hedefler, setHedefler] = React.useState<Hedef[]>([]);
  const [ulke, setUlke] = React.useState("TR");
  const [il, setIl] = React.useState("");

  const secilenUlke = ULKELER.find((u) => u.kod === ulke)!;

  function ekle() {
    const ilObj = secilenUlke.iller.find((i) => i.kod === il);
    const yeni: Hedef = { ulke, ilKod: ilObj?.kod ?? "", ilAd: ilObj?.ad ?? "" };
    // Aynı hedef iki kez eklenmesin.
    const anahtar = (h: Hedef) => `${h.ulke}|${h.ilKod}`;
    if (hedefler.some((h) => anahtar(h) === anahtar(yeni))) return;
    setHedefler([...hedefler, yeni]);
    setIl("");
  }

  function sil(i: number) {
    setHedefler(hedefler.filter((_, x) => x !== i));
  }

  const adOf = (kod: string) => ULKELER.find((u) => u.kod === kod)?.ad ?? kod;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {/* Sunucuya tek alanda JSON olarak gider; server action parse eder. */}
      <input type="hidden" name="geoTargets" value={JSON.stringify(hedefler)} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }}>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          Ülke
          <select className="gg-search" value={ulke}
                  onChange={(e) => { setUlke(e.target.value); setIl(""); }}>
            {ULKELER.map((u) => <option key={u.kod} value={u.kod}>{u.ad}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          Şehir / Bölge
          <select className="gg-search" value={il} onChange={(e) => setIl(e.target.value)}>
            <option value="">Tümü ({secilenUlke.ad} geneli)</option>
            {secilenUlke.iller.map((i) => <option key={i.kod} value={i.kod}>{i.ad}</option>)}
          </select>
        </label>
        <button type="button" className="gg-btn gg-btn-ghost" onClick={ekle} style={{ alignSelf: "end" }}>
          + Ekle
        </button>
      </div>

      {hedefler.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--gg-muted)" }}>
          Hiç bölge eklemezsen reklam <strong>her yerde</strong> yayınlanır.
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {hedefler.map((h, i) => (
            <span key={`${h.ulke}-${h.ilKod}`} style={{
              background: "var(--gg-primary-soft)", color: "var(--gg-primary-dark)",
              borderRadius: 999, padding: "4px 10px", fontSize: 12.5,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              📍 {adOf(h.ulke)}{h.ilAd ? ` · ${h.ilAd}` : " geneli"}
              <button type="button" onClick={() => sil(i)} aria-label="Kaldır"
                      style={{ border: 0, background: "transparent", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
