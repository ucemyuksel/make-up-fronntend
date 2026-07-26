import * as React from "react";

/**
 * Dünya haritası üzerinde reklam yoğunluğu (Google Analytics tarzı kabarcık
 * haritası). Harici kütüphane YOK — düz SVG.
 *
 * <p>Projeksiyon: equirectangular (enlem/boylam doğrudan x/y'ye ölçeklenir).
 * Ülke sınırları yerine kıta silueti + kabarcık kullanılır: düşük çözünürlüklü
 * sınır çizimi yanlış görünür, kabarcık ise veriyi dürüstçe anlatır ve şehir
 * kırılımını da aynı haritada gösterebilir.
 */

export type UlkeSatiri = {
  countryCode: string;
  impressions: number;
  clicks: number;
  spend: number;
  cityCount: number;
  ctr: number;
};
export type SehirSatiri = {
  countryCode: string;
  cityName: string;
  impressions: number;
  clicks: number;
  spend: number;
};

/** Şehir koordinatları (enlem, boylam). Bilinmeyen şehir ülke merkezine düşer. */
const SEHIR_KOORD: Record<string, [number, number]> = {
  "TR|İstanbul": [41.01, 28.98], "TR|Ankara": [39.93, 32.86], "TR|İzmir": [38.42, 27.14],
  "TR|Bursa": [40.19, 29.06], "TR|Antalya": [36.9, 30.7], "TR|Istanbul": [41.01, 28.98],
  "DE|Berlin": [52.52, 13.4], "DE|Köln": [50.94, 6.96], "DE|Koln": [50.94, 6.96],
  "NL|Amsterdam": [52.37, 4.9], "GB|Londra": [51.51, -0.13], "GB|London": [51.51, -0.13],
  "FR|Paris": [48.86, 2.35], "US|Los Angeles": [34.05, -118.24], "US|New York": [40.71, -74.01],
  "US|San Francisco": [37.77, -122.42], "AE|Dubai": [25.2, 55.27], "AZ|Bakü": [40.41, 49.87],
  "AZ|Baku": [40.41, 49.87], "JP|Tokyo": [35.68, 139.69], "BR|São Paulo": [-23.55, -46.63],
  "BR|Sao Paulo": [-23.55, -46.63], "CA|Toronto": [43.65, -79.38], "AU|Sydney": [-33.87, 151.21],
  "ES|Madrid": [40.42, -3.7], "IT|Milano": [45.46, 9.19],
};

/** Ülke merkezleri — şehir bilinmiyorsa buraya düşülür. */
const ULKE_KOORD: Record<string, [number, number]> = {
  TR: [39.0, 35.0], DE: [51.2, 10.4], NL: [52.1, 5.3], GB: [54.0, -2.0], FR: [46.6, 2.2],
  US: [39.8, -98.6], AE: [24.0, 54.0], AZ: [40.3, 47.7], JP: [36.2, 138.3], BR: [-14.2, -51.9],
  CA: [56.1, -106.3], AU: [-25.3, 133.8], ES: [40.0, -3.7], IT: [42.8, 12.6], RU: [61.5, 105.3],
  IN: [20.6, 79.0], CN: [35.9, 104.2], EG: [26.8, 30.8], ZA: [-30.6, 22.9], MX: [23.6, -102.6],
  AR: [-38.4, -63.6], SE: [60.1, 18.6], PL: [51.9, 19.1], UA: [48.4, 31.2], SA: [23.9, 45.1],
  KR: [35.9, 127.8], ID: [-0.8, 113.9], NG: [9.1, 8.7], PK: [30.4, 69.3], BE: [50.5, 4.5],
  CH: [46.8, 8.2], AT: [47.5, 14.6], PT: [39.4, -8.2], GR: [39.1, 21.8], NO: [60.5, 8.5],
  DK: [56.3, 9.5], FI: [61.9, 25.7], IE: [53.4, -8.2], CZ: [49.8, 15.5], RO: [45.9, 25.0],
  HU: [47.2, 19.5], BG: [42.7, 25.5], IL: [31.0, 34.9], QA: [25.4, 51.2], KW: [29.3, 47.5],
};

const G = 1000; // viewBox genişliği
const Y = 500;  // viewBox yüksekliği

/** Equirectangular: boylam → x, enlem → y. */
const konum = (lat: number, lon: number): [number, number] => [
  ((lon + 180) / 360) * G,
  ((90 - lat) / 180) * Y,
];

/**
 * Kıta siluetleri — kaba, tanınabilir çokgenler (equirectangular koordinatlar).
 * Amaç coğrafi doğruluk değil, kabarcıklara bağlam vermek.
 */
const KITALAR: [number, number][][] = [
  // Kuzey Amerika
  [[71, -168], [72, -125], [69, -95], [61, -64], [47, -52], [42, -70], [25, -80], [18, -92],
   [15, -95], [23, -110], [33, -118], [48, -125], [60, -140], [71, -168]],
  // Güney Amerika
  [[12, -72], [11, -60], [5, -50], [-5, -35], [-23, -41], [-34, -54], [-52, -69], [-40, -73],
   [-18, -70], [-5, -81], [8, -78], [12, -72]],
  // Afrika
  [[37, -6], [33, 11], [31, 25], [31, 34], [12, 43], [-1, 42], [-16, 40], [-26, 33], [-34, 20],
   [-30, 17], [-12, 13], [0, 9], [5, -4], [14, -17], [28, -13], [37, -6]],
  // Avrupa
  [[71, 25], [69, 30], [60, 30], [55, 21], [54, 14], [51, 3], [48, -4], [43, -9], [36, -6],
   [37, 15], [41, 20], [45, 29], [55, 25], [65, 22], [71, 25]],
  // Asya
  [[77, 60], [73, 140], [66, 180], [60, 160], [50, 142], [43, 132], [35, 129], [31, 122],
   [22, 114], [10, 105], [1, 104], [8, 78], [23, 68], [25, 57], [30, 48], [37, 35], [41, 28],
   [55, 40], [66, 45], [77, 60]],
  // Avustralya
  [[-11, 132], [-12, 142], [-19, 147], [-28, 153], [-38, 145], [-35, 137], [-32, 116],
   [-22, 114], [-14, 126], [-11, 132]],
];

const cizgi = (nokta: [number, number][]) =>
  nokta.map(([lat, lon]) => konum(lat, lon).join(",")).join(" ");

const tl = (n: number) =>
  "₺" + Number(n ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export function DunyaHaritasi({
  ulkeler,
  sehirler,
}: {
  ulkeler: UlkeSatiri[];
  sehirler: SehirSatiri[];
}) {
  const enYuksek = Math.max(1, ...sehirler.map((s) => s.impressions));

  // Kabarcık yarıçapı: alan gösterimle orantılı (sqrt), böylece büyük değerler
  // haritayı ezmez.
  const yaricap = (gosterim: number) => 4 + Math.sqrt(gosterim / enYuksek) * 22;

  const noktalar = sehirler
    .map((s) => {
      const koord = SEHIR_KOORD[`${s.countryCode}|${s.cityName}`] ?? ULKE_KOORD[s.countryCode];
      if (!koord) return null;
      const [x, y] = konum(koord[0], koord[1]);
      return { ...s, x, y, r: yaricap(s.impressions) };
    })
    .filter((n): n is NonNullable<typeof n> => n !== null)
    // Büyük kabarcıklar altta kalsın ki küçükler görünür olsun.
    .sort((a, b) => b.r - a.r);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{
        background: "linear-gradient(180deg, #F7F5FA, #FFFFFF)",
        border: "1px solid var(--gg-border, #EEE)", borderRadius: 14, overflow: "hidden",
      }}>
        <svg viewBox={`0 0 ${G} ${Y}`} width="100%" role="img"
             aria-label="Reklam gösterimlerinin dünya üzerindeki dağılımı"
             style={{ display: "block" }}>
          {/* Paralel/meridyen ızgarası */}
          <g stroke="#E7E3EF" strokeWidth="0.6">
            {[-60, -30, 0, 30, 60].map((lat) => (
              <line key={`p${lat}`} x1={0} x2={G} y1={konum(lat, 0)[1]} y2={konum(lat, 0)[1]} />
            ))}
            {[-120, -60, 0, 60, 120].map((lon) => (
              <line key={`m${lon}`} y1={0} y2={Y} x1={konum(0, lon)[0]} x2={konum(0, lon)[0]} />
            ))}
          </g>

          {/* Kıtalar */}
          <g fill="#E4E0EC" stroke="#D6D1E0" strokeWidth="1">
            {KITALAR.map((k, i) => <polygon key={i} points={cizgi(k)} />)}
          </g>

          {/* Kabarcıklar: yarıçap = gösterim, iç nokta = tık */}
          <g>
            {noktalar.map((n) => (
              <g key={`${n.countryCode}-${n.cityName}`}>
                <circle cx={n.x} cy={n.y} r={n.r} fill="var(--gg-primary, #C56A7A)" fillOpacity={0.35}
                        stroke="var(--gg-primary, #C56A7A)" strokeWidth="1.2" />
                {n.clicks > 0 ? (
                  <circle cx={n.x} cy={n.y} r={Math.max(2, n.r * 0.35)} fill="var(--gg-primary-dark, #8A3F52)" />
                ) : null}
                <title>{`${n.cityName} (${n.countryCode}) — ${n.impressions} gösterim, ${n.clicks} tık, ${tl(n.spend)}`}</title>
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* Gösterge */}
      <div style={{ display: "flex", gap: 18, alignItems: "center", fontSize: 12, color: "var(--gg-muted)", flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <svg width="34" height="18" aria-hidden="true">
            <circle cx="9" cy="9" r="7" fill="var(--gg-primary, #C56A7A)" fillOpacity="0.35" stroke="var(--gg-primary, #C56A7A)" />
            <circle cx="26" cy="9" r="4" fill="var(--gg-primary, #C56A7A)" fillOpacity="0.35" stroke="var(--gg-primary, #C56A7A)" />
          </svg>
          Kabarcık boyu = gösterim
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <svg width="16" height="16" aria-hidden="true">
            <circle cx="8" cy="8" r="4" fill="var(--gg-primary-dark, #8A3F52)" />
          </svg>
          İç nokta = tık alındı
        </span>
        <span>{noktalar.length} şehir · {ulkeler.length} ülke</span>
      </div>
    </div>
  );
}
