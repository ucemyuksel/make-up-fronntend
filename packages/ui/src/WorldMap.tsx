import * as React from "react";
import { GeoMap, type MapPoint } from "./GeoMap";
import { findCoordinates } from "./coordinates";

/**
 * The ad geography board - city bubbles on a real map (OpenLayers +
 * OpenStreetMap). Used by both the seller and the admin panel.
 *
 * <p>Turns the data into map points; the drawing is done by the client
 * component {@link GeoMap} (tiles load in the browser, so our server is not
 * involved).
 */

export type CountryRow = {
  countryCode: string;
  impressions: number;
  clicks: number;
  spend: number;
  cityCount: number;
  ctr: number;
};
export type CityRow = {
  countryCode: string;
  cityName: string;
  impressions: number;
  clicks: number;
  spend: number;
};

const tl = (n: number) =>
  "₺" + Number(n ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export function WorldMap({
  countries,
  cities,
  height,
}: {
  countries: CountryRow[];
  cities: CityRow[];
  height?: number;
}) {
  const points = cities
    .map((s): MapPoint | null => {
      const koord = findCoordinates(s.countryCode, s.cityName);
      if (!koord) return null; // konumu bilinmeyen şehir uydurulmaz
      return {
        anahtar: `${s.countryCode}|${s.cityName}`,
        ad: s.cityName,
        countryCode: s.countryCode,
        lat: koord[0],
        lon: koord[1],
        weight: s.impressions,
        ikincil: s.clicks,
        detail: `${s.cityName} (${s.countryCode}) · ${s.impressions} gösterim · ${s.clicks} tık · ${tl(s.spend)}`,
      };
    })
    .filter((n): n is MapPoint => n !== null);

  const konumsuz = cities.length - points.length;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <GeoMap points={points} height={height ?? 420} />
      <div style={{ display: "flex", gap: 18, alignItems: "center", fontSize: 12, color: "var(--gg-muted)", flexWrap: "wrap" }}>
        <span>Kabarcık boyu = gösterim sayısı · fare ile üzerine gel</span>
        <span>{points.length} şehir · {countries.length} ülke</span>
        {konumsuz > 0 ? <span>({konumsuz} kaydın konumu bilinmiyor)</span> : null}
      </div>
    </div>
  );
}
