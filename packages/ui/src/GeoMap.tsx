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
  yukseklik = 420,
  merkez = [20, 25],
  zoom = 1.6,
}: {
  noktalar: HaritaNoktasi[];
  yukseklik?: number;
  /** [boylam, enlem] */
  merkez?: [number, number];
  zoom?: number;
}) {
  const kutuRef = React.useRef<HTMLDivElement | null>(null);
  const ipucuRef = React.useRef<HTMLDivElement | null>(null);
  const [ipucu, setIpucu] = React.useState<string | null>(null);

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
      view: new View({ center: fromLonLat(merkez), zoom, minZoom: 1, maxZoom: 12 }),
      controls: [],
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

    return () => harita.setTarget(undefined);
  }, [noktalar, merkez, zoom]);

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={kutuRef}
        style={{
          height: yukseklik,
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
