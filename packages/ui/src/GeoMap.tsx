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
 * Gerçek harita üzerinde reklam yoğunluğu (OpenLayers + OpenStreetMap).
 *
 * <p>Elle çizilmiş kıta siluetleri yerine gerçek tile haritası kullanılır;
 * kabarcıklar şehir koordinatlarına oturur, yakınlaştırma/kaydırma çalışır.
 * Tile'lar OSM'den gelir — istemci tarafında yüklenir, sunucuya yük bindirmez.
 */

export type HaritaNoktasi = {
  /** Benzersiz anahtar (ülke|şehir). */
  anahtar: string;
  ad: string;
  ulkeKodu: string;
  lat: number;
  lon: number;
  /** Kabarcık boyutunu belirleyen ana ölçü. */
  agirlik: number;
  /** İkincil ölçü — doluysa iç nokta çizilir (ör. tık). */
  ikincil?: number;
  /** Fare üzerine gelince gösterilecek satırlar. */
  detay?: string;
};

export function GeoMap({
  noktalar,
  height = 420,
  merkez = [20, 25],
  zoom = 1.6,
  aramaGoster = true,
}: {
  noktalar: HaritaNoktasi[];
  height?: number;
  /** [boylam, enlem] */
  merkez?: [number, number];
  zoom?: number;
  /** Şehir/ülke arama kutusu gösterilsin mi? */
  aramaGoster?: boolean;
}) {
  const kutuRef = React.useRef<HTMLDivElement | null>(null);
  const ipucuRef = React.useRef<HTMLDivElement | null>(null);
  const haritaRef = React.useRef<Map | null>(null);
  const [ipucu, setIpucu] = React.useState<string | null>(null);
  const [arama, setArama] = React.useState("");

  /** Bir noktaya yumuşak geçişle yakınlaş (arama sonucu / kabarcık tıklaması). */
  const odaklan = React.useCallback((lat: number, lon: number, hedefZoom = 8) => {
    const g = haritaRef.current?.getView();
    if (!g) return;
    g.animate({ center: fromLonLat([lon, lat]), zoom: hedefZoom, duration: 550 });
  }, []);

  React.useEffect(() => {
    if (!kutuRef.current) return;

    const enBuyuk = Math.max(1, ...noktalar.map((n) => n.agirlik));
    // Yarıçap alanla orantılı (sqrt) — büyük değerler haritayı ezmesin.
    const yaricap = (a: number) => 6 + Math.sqrt(a / enBuyuk) * 22;

    const source = new VectorSource({
      features: noktalar.map((n) => {
        const f = new Feature({ geometry: new Point(fromLonLat([n.lon, n.lat])) });
        f.setProperties({ nokta: n });
        return f;
      }),
    });

    const katman = new VectorLayer({
      source,
      style: (feature) => {
        const n = feature.get("nokta") as HaritaNoktasi;
        const r = yaricap(n.agirlik);
        return new Style({
          image: new CircleStyle({
            radius: r,
            fill: new Fill({ color: "rgba(197, 106, 122, 0.38)" }),
            stroke: new Stroke({ color: "rgba(138, 63, 82, 0.9)", width: 1.4 }),
          }),
          // Yeterince büyük kabarcıklarda şehir adı da yazılır.
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

    const ipucuOverlay = new Overlay({
      element: ipucuRef.current ?? undefined,
      offset: [0, -14],
      positioning: "bottom-center",
    });

    const harita = new Map({
      target: kutuRef.current,
      layers: [new TileLayer({ source: new OSM() }), katman],
      overlays: [ipucuOverlay],
      view: new View({ center: fromLonLat(merkez), zoom, minZoom: 1, maxZoom: 14 }),
      controls: [],
    });
    haritaRef.current = harita;

    // Süzgeç değişince (ör. "Yayında" kartına tıklanınca) harita kalan
    // noktalara kendiliğinden odaklanır.
    const kapsam = source.getExtent();
    if (noktalar.length > 0 && kapsam && isFinite(kapsam[0])) {
      harita.getView().fit(kapsam, {
        padding: [50, 50, 50, 50],
        maxZoom: noktalar.length === 1 ? 8 : 6,
        duration: 500,
      });
    }

    // Kabarcığa tıklayınca o şehre yakınlaş.
    harita.on("click", (evt) => {
      const f = harita.forEachFeatureAtPixel(evt.pixel, (x) => x);
      if (f) {
        const n = f.get("nokta") as HaritaNoktasi;
        harita.getView().animate({ center: fromLonLat([n.lon, n.lat]), zoom: 9, duration: 550 });
      }
    });

    harita.on("pointermove", (evt) => {
      const f = harita.forEachFeatureAtPixel(evt.pixel, (x) => x);
      if (f) {
        const n = f.get("nokta") as HaritaNoktasi;
        setIpucu(n.detay ?? `${n.ad} — ${n.agirlik}`);
        ipucuOverlay.setPosition(evt.coordinate);
        harita.getTargetElement().style.cursor = "pointer";
      } else {
        setIpucu(null);
        harita.getTargetElement().style.cursor = "";
      }
    });

    return () => {
      harita.setTarget(undefined);
      haritaRef.current = null;
    };
  }, [noktalar, merkez, zoom]);

  // Arama: şehir veya ülke kodu. Türkçe karakterler eşleşsin diye aksanlar sökülür.
  const normalize = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("tr");
  const sonuclar = arama.trim().length < 2
    ? []
    : noktalar
        .filter((n) => normalize(n.ad).includes(normalize(arama)) ||
                       normalize(n.ulkeKodu).includes(normalize(arama)))
        .slice(0, 8);

  return (
    <div style={{ position: "relative" }}>
      {aramaGoster ? (
        <div style={{ position: "absolute", top: 10, left: 10, zIndex: 5, width: 240 }}>
          <input
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Şehir veya ülke ara…"
            aria-label="Haritada şehir veya ülke ara"
            style={{
              width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 13,
              border: "1px solid rgba(0,0,0,.15)", background: "rgba(255,255,255,.95)",
              boxShadow: "0 2px 8px rgba(0,0,0,.12)",
            }}
          />
          {sonuclar.length > 0 ? (
            <ul style={{
              listStyle: "none", margin: "4px 0 0", padding: 4, background: "#fff",
              borderRadius: 8, boxShadow: "0 4px 14px rgba(0,0,0,.16)", maxHeight: 220, overflowY: "auto",
            }}>
              {sonuclar.map((n) => (
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
                    <span style={{ color: "#777" }}>{n.ulkeKodu} · {n.agirlik} gösterim</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <div
        ref={kutuRef}
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
        ref={ipucuRef}
        style={{
          display: ipucu ? "block" : "none",
          background: "rgba(30,20,25,.92)",
          color: "#fff",
          padding: "6px 9px",
          borderRadius: 8,
          fontSize: 12,
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {ipucu}
      </div>
    </div>
  );
}
