/**
 * Şehir/ülke koordinatları — harita kabarcıklarını konumlandırmak için.
 *
 * Şehir bilinmiyorsa ülke merkezine düşülür; ülke de bilinmiyorsa nokta
 * haritada gösterilmez (uydurma konum çizmektense eksik göstermek yeğdir).
 */

export const SEHIR_KOORD: Record<string, [number, number]> = {
  "TR|İstanbul": [41.01, 28.98], "TR|Istanbul": [41.01, 28.98],
  "TR|Ankara": [39.93, 32.86], "TR|İzmir": [38.42, 27.14], "TR|Izmir": [38.42, 27.14],
  "TR|Bursa": [40.19, 29.06], "TR|Antalya": [36.9, 30.7], "TR|Adana": [37.0, 35.32],
  "TR|Konya": [37.87, 32.48], "TR|Gaziantep": [37.07, 37.38], "TR|Kocaeli": [40.85, 29.88],
  "DE|Berlin": [52.52, 13.4], "DE|Köln": [50.94, 6.96], "DE|Koln": [50.94, 6.96],
  "DE|München": [48.14, 11.58], "DE|Hamburg": [53.55, 9.99], "DE|Frankfurt": [50.11, 8.68],
  "NL|Amsterdam": [52.37, 4.9], "NL|Rotterdam": [51.92, 4.48],
  "GB|Londra": [51.51, -0.13], "GB|London": [51.51, -0.13], "GB|Manchester": [53.48, -2.24],
  "FR|Paris": [48.86, 2.35], "FR|Lyon": [45.76, 4.84], "FR|Marsilya": [43.3, 5.37],
  "US|Los Angeles": [34.05, -118.24], "US|New York": [40.71, -74.01],
  "US|San Francisco": [37.77, -122.42], "US|Chicago": [41.88, -87.63], "US|Miami": [25.76, -80.19],
  "AE|Dubai": [25.2, 55.27], "AE|Abu Dabi": [24.45, 54.38],
  "AZ|Bakü": [40.41, 49.87], "AZ|Baku": [40.41, 49.87],
  "JP|Tokyo": [35.68, 139.69], "JP|Osaka": [34.69, 135.5],
  "BR|São Paulo": [-23.55, -46.63], "BR|Sao Paulo": [-23.55, -46.63], "BR|Rio de Janeiro": [-22.91, -43.17],
  "CA|Toronto": [43.65, -79.38], "CA|Vancouver": [49.28, -123.12],
  "AU|Sydney": [-33.87, 151.21], "AU|Melbourne": [-37.81, 144.96],
  "ES|Madrid": [40.42, -3.7], "ES|Barcelona": [41.39, 2.17],
  "IT|Milano": [45.46, 9.19], "IT|Roma": [41.9, 12.5],
};

export const ULKE_KOORD: Record<string, [number, number]> = {
  TR: [39.0, 35.0], DE: [51.2, 10.4], NL: [52.1, 5.3], GB: [54.0, -2.0], FR: [46.6, 2.2],
  US: [39.8, -98.6], AE: [24.0, 54.0], AZ: [40.3, 47.7], JP: [36.2, 138.3], BR: [-14.2, -51.9],
  CA: [56.1, -106.3], AU: [-25.3, 133.8], ES: [40.0, -3.7], IT: [42.8, 12.6], RU: [61.5, 105.3],
  IN: [20.6, 79.0], CN: [35.9, 104.2], EG: [26.8, 30.8], ZA: [-30.6, 22.9], MX: [23.6, -102.6],
  AR: [-38.4, -63.6], SE: [60.1, 18.6], PL: [51.9, 19.1], UA: [48.4, 31.2], SA: [23.9, 45.1],
  KR: [35.9, 127.8], ID: [-0.8, 113.9], NG: [9.1, 8.7], PK: [30.4, 69.3], BE: [50.5, 4.5],
  CH: [46.8, 8.2], AT: [47.5, 14.6], PT: [39.4, -8.2], GR: [39.1, 21.8], NO: [60.5, 8.5],
  DK: [56.3, 9.5], FI: [61.9, 25.7], IE: [53.4, -8.2], CZ: [49.8, 15.5], RO: [45.9, 25.0],
  HU: [47.2, 19.5], BG: [42.7, 25.5], IL: [31.0, 34.9], QA: [25.4, 51.2], KW: [29.3, 47.5],
  MA: [31.8, -7.1], DZ: [28.0, 1.7], TN: [33.9, 9.6], KZ: [48.0, 66.9], UZ: [41.4, 64.6],
  TH: [15.9, 100.99], VN: [14.06, 108.28], MY: [4.2, 101.98], SG: [1.35, 103.82], PH: [12.88, 121.77],
};

/** Şehir → koordinat; yoksa ülke merkezi; o da yoksa null. */
export function koordinatBul(ulkeKodu: string, sehir?: string | null): [number, number] | null {
  if (sehir) {
    const s = SEHIR_KOORD[`${ulkeKodu}|${sehir}`];
    if (s) return s;
  }
  return ULKE_KOORD[ulkeKodu] ?? null;
}
