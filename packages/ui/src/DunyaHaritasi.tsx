import * as React from "react";
import { GeoMap, type HaritaNoktasi } from "./GeoMap";
import { koordinatBul } from "./koordinat";

/**
 * Reklam coğrafi panosu — gerçek harita (OpenLayers + OpenStreetMap) üzerinde
 * şehir kabarcıkları. Hem satıcı hem yönetim panelinde kullanılır.
 *
 * <p>Veriyi harita noktalarına çevirir; çizimi istemci bileşeni {@link GeoMap}
 * yapar (tile'lar tarayıcıda yüklenir, sunucuya yük binmez).
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

const tl = (n: number) =>
  "₺" + Number(n ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export function DunyaHaritasi({
  ulkeler,
  sehirler,
  height,
}: {
  ulkeler: UlkeSatiri[];
  sehirler: SehirSatiri[];
  height?: number;
}) {
  const noktalar = sehirler
    .map((s): HaritaNoktasi | null => {
      const koord = koordinatBul(s.countryCode, s.cityName);
      if (!koord) return null; // konumu bilinmeyen şehir uydurulmaz
      return {
        anahtar: `${s.countryCode}|${s.cityName}`,
        ad: s.cityName,
        ulkeKodu: s.countryCode,
        lat: koord[0],
        lon: koord[1],
        agirlik: s.impressions,
        ikincil: s.clicks,
        detay: `${s.cityName} (${s.countryCode}) · ${s.impressions} gösterim · ${s.clicks} tık · ${tl(s.spend)}`,
      };
    })
    .filter((n): n is HaritaNoktasi => n !== null);

  const konumsuz = sehirler.length - noktalar.length;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <GeoMap noktalar={noktalar} height={height ?? 420} />
      <div style={{ display: "flex", gap: 18, alignItems: "center", fontSize: 12, color: "var(--gg-muted)", flexWrap: "wrap" }}>
        <span>Kabarcık boyu = gösterim sayısı · fare ile üzerine gel</span>
        <span>{noktalar.length} şehir · {ulkeler.length} ülke</span>
        {konumsuz > 0 ? <span>({konumsuz} kaydın konumu bilinmiyor)</span> : null}
      </div>
    </div>
  );
}
