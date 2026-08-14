"use client";

import * as React from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import OSM from "ol/source/OSM";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { fromLonLat } from "ol/proj";
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style";
import Overlay from "ol/Overlay";

/**
 * Ad density on a real map (OpenLayers + OpenStreetMap).
 *
 * <p>A real tile map replaces hand-drawn continent outlines; bubbles sit on
 * city coordinates and zoom/pan work. Tiles come from OSM and are loaded
 * client-side, so they put no load on our server.
 */

export type MapPoint = {
  /** Unique key (country|city). */
  anahtar: string;
  ad: string;
  countryCode: string;
  lat: number;
  lon: number;
  /** The primary measure that drives bubble size. */
  weight: number;
  /** Secondary measure - when present an inner dot is drawn (e.g. clicks). */
  ikincil?: number;
  /** Lines shown on hover. */
  detail?: string;
};

export function GeoMap({
  points,
  height = 420,
  center = [20, 25],
  zoom = 1.6,
  showSearch = true,
}: {
  points: MapPoint[];
  height?: number;
  /** [boylam, enlem] */
  center?: [number, number];
  zoom?: number;
  /** Whether to show the city/country search box. */
  showSearch?: boolean;
}) {
  const boxRef = React.useRef<HTMLDivElement | null>(null);
  const hintRef = React.useRef<HTMLDivElement | null>(null);
  const haritaRef = React.useRef<Map | null>(null);
  const [hint, setHint] = React.useState<string | null>(null);
  const [search, setArama] = React.useState("");

  /** Smoothly zoom to a point (search result / bubble click). */
  const odaklan = React.useCallback((lat: number, lon: number, hedefZoom = 8) => {
    const g = haritaRef.current?.getView();
    if (!g) return;
    g.animate({ center: fromLonLat([lon, lat]), zoom: hedefZoom, duration: 550 });
  }, []);

  React.useEffect(() => {
    if (!boxRef.current) return;

    const enBuyuk = Math.max(1, ...points.map((n) => n.weight));
    // Radius scales with area (sqrt) so large values do not swamp the map.
    const yaricap = (a: number) => 6 + Math.sqrt(a / enBuyuk) * 22;

    const source = new VectorSource({
      features: points.map((n) => {
        const f = new Feature({ geometry: new Point(fromLonLat([n.lon, n.lat])) });
        f.setProperties({ point: n });
        return f;
      }),
    });

    const katman = new VectorLayer({
      source,
      style: (feature) => {
        const n = feature.get("nokta") as MapPoint;
        const r = yaricap(n.weight);
        return new Style({
          image: new CircleStyle({
            radius: r,
            fill: new Fill({ color: "rgba(197, 106, 122, 0.38)" }),
            stroke: new Stroke({ color: "rgba(138, 63, 82, 0.9)", width: 1.4 }),
          }),
          // Big enough bubbles also carry the city name.
          text: r > 14
            ? new Text({
                text: n.ad,
                offsetY: -(r + 9),
                font: "600 11px system-ui, sans-serif",
                fill: new Fill({ color: "#5B3B45" }),
                stroke: new Stroke({ color: "rgba(255,255,255,0.9)", width: 3 }),
              })
            : undefined,
        });
      },
    });

    const hintOverlay = new Overlay({
      element: hintRef.current ?? undefined,
      offset: [0, -14],
      positioning: "bottom-center",
    });

    const harita = new Map({
      target: boxRef.current,
      layers: [new TileLayer({ source: new OSM() }), katman],
      overlays: [hintOverlay],
      view: new View({ center: fromLonLat(center), zoom, minZoom: 1, maxZoom: 14 }),
      controls: [],
    });
    haritaRef.current = harita;

    // When the filter changes (e.g. clicking the "Live" card) the map refocuses
    // on the remaining points by itself.
    const kapsam = source.getExtent();
    if (points.length > 0 && kapsam && isFinite(kapsam[0])) {
      harita.getView().fit(kapsam, {
        padding: [50, 50, 50, 50],
        maxZoom: points.length === 1 ? 8 : 6,
        duration: 500,
      });
    }

    // Clicking a bubble zooms to that city.
    harita.on("click", (evt) => {
      const f = harita.forEachFeatureAtPixel(evt.pixel, (x) => x);
      if (f) {
        const n = f.get("nokta") as MapPoint;
        harita.getView().animate({ center: fromLonLat([n.lon, n.lat]), zoom: 9, duration: 550 });
      }
    });

    harita.on("pointermove", (evt) => {
      const f = harita.forEachFeatureAtPixel(evt.pixel, (x) => x);
      if (f) {
        const n = f.get("nokta") as MapPoint;
        setHint(n.detail ?? `${n.ad} — ${n.weight}`);
        hintOverlay.setPosition(evt.coordinate);
        harita.getTargetElement().style.cursor = "pointer";
      } else {
        setHint(null);
        harita.getTargetElement().style.cursor = "";
      }
    });

    return () => {
      harita.setTarget(undefined);
      haritaRef.current = null;
    };
  }, [points, center, zoom]);

  // Search by city or country code. Accents are stripped so Turkish characters match.
  const normalize = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("tr");
  const results = search.trim().length < 2
    ? []
    : points
        .filter((n) => normalize(n.ad).includes(normalize(search)) ||
                       normalize(n.countryCode).includes(normalize(search)))
        .slice(0, 8);

  return (
    <div style={{ position: "relative" }}>
      {showSearch ? (
        <div style={{ position: "absolute", top: 10, left: 10, zIndex: 5, width: 240 }}>
          <input
            value={search}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Şehir veya ülke ara…"
            aria-label="Haritada şehir veya ülke ara"
            style={{
              width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 13,
              border: "1px solid rgba(0,0,0,.15)", background: "rgba(255,255,255,.95)",
              boxShadow: "0 2px 8px rgba(0,0,0,.12)",
            }}
          />
          {results.length > 0 ? (
            <ul style={{
              listStyle: "none", margin: "4px 0 0", padding: 4, background: "#fff",
              borderRadius: 8, boxShadow: "0 4px 14px rgba(0,0,0,.16)", maxHeight: 220, overflowY: "auto",
            }}>
              {results.map((n) => (
                <li key={n.anahtar}>
                  <button
                    type="button"
                    onClick={() => { odaklan(n.lat, n.lon); setArama(""); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left", border: 0,
                      background: "none", padding: "6px 8px", cursor: "pointer", fontSize: 12.5,
                    }}
                  >
                    <strong>{n.ad}</strong>{" "}
                    <span style={{ color: "#777" }}>{n.countryCode} · {n.weight} gösterim</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <div
        ref={boxRef}
        style={{
          height: height,
          width: "100%",
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid var(--gg-border, #EEE)",
          background: "#EAE7F0",
        }}
        role="img"
        aria-label="Reklam gösterimlerinin harita üzerindeki dağılımı"
      />
      <div
        ref={hintRef}
        style={{
          display: hint ? "block" : "none",
          background: "rgba(30,20,25,.92)",
          color: "#fff",
          padding: "6px 9px",
          borderRadius: 8,
          fontSize: 12,
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {hint}
      </div>
    </div>
  );
}
