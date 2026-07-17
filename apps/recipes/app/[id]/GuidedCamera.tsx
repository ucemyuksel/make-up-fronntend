"use client";

import * as React from "react";
import type { FaceLandmarker as FaceLandmarkerT, NormalizedLandmark } from "@mediapipe/tasks-vision";

/**
 * Adım-adım tarifte canlı ayna: kamerayı açar, MediaPipe Face Landmarker ile
 * yüzü izler ve o adımın BÖLGESİNİ (region) adımın ürün renginde vurgular —
 * kullanıcı ürünü yüzünün neresine süreceğini canlı görür.
 * Telefonda aynı model MediaPipe Tasks (Android/iOS) ile çalışacak.
 */

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// Bölge → yüz landmark indeksleri (MediaPipe Face Mesh 468). Bu noktalara
// yarı saydam renk basınca o alan vurgulanmış görünür.
const BOLGE_NOKTALARI: Record<string, number[]> = {
  yuz: [10, 338, 297, 332, 234, 454, 132, 361, 205, 425, 50, 280, 152], // tüm yüz geneli
  "goz alti": [230, 231, 232, 233, 228, 450, 451, 452, 453, 448], // göz altı
  "elmacik kemigi": [50, 101, 118, 205, 206, 280, 330, 347, 425, 426], // elmacık
  dudak: [61, 40, 37, 0, 267, 291, 321, 314, 17, 84, 91, 146, 13, 14], // dudaklar
  goz: [33, 159, 145, 133, 263, 386, 374, 362], // gözler
  "yanak": [50, 101, 118, 280, 330, 347],
};

// "Göz / Dudak" gibi bileşik bölgeler için anahtar-eşleşme.
function noktalariBul(region: string): number[] {
  const r = region.toLocaleLowerCase("tr").trim();
  const bul = (k: string) => (r.includes(k) ? BOLGE_NOKTALARI[k] : []);
  const birlesik = [
    ...bul("goz alti"),
    ...bul("elmacik kemigi"),
    ...bul("dudak"),
    ...(r.includes("göz") || r.includes("goz") ? BOLGE_NOKTALARI["goz"] : []),
    ...(r.includes("yüz") || r.includes("yuz") ? BOLGE_NOKTALARI["yuz"] : []),
    ...(r.includes("yanak") ? BOLGE_NOKTALARI["yanak"] : []),
  ];
  return birlesik.length ? Array.from(new Set(birlesik)) : BOLGE_NOKTALARI["yuz"];
}

function hexRgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export function GuidedCamera({ region, colorHex, stepTitle }: { region: string; colorHex: string; stepTitle: string }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const lmRef = React.useRef<FaceLandmarkerT | null>(null);
  const rafRef = React.useRef<number>(0);
  const regionRef = React.useRef({ region, colorHex });
  regionRef.current = { region, colorHex };

  const [durum, setDurum] = React.useState<"kapalı" | "yükleniyor" | "açık" | "hata">("kapalı");
  const [hata, setHata] = React.useState("");

  const durdur = React.useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const v = videoRef.current;
    if (v?.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      v.srcObject = null;
    }
    setDurum("kapalı");
  }, []);

  React.useEffect(() => () => durdur(), [durdur]);

  const ciz = React.useCallback((lms: NormalizedLandmark[] | undefined) => {
    const cv = canvasRef.current, v = videoRef.current;
    if (!cv || !v) return;
    const w = v.videoWidth, h = v.videoHeight;
    if (!w || !h) return;
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d")!;
    // Ayna görünümü (selfie): yatay çevir.
    ctx.save();
    ctx.translate(w, 0); ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0, w, h);
    if (lms) {
      const { region: reg, colorHex: col } = regionRef.current;
      const pts = noktalariBul(reg);
      const rad = Math.max(10, w * 0.035);
      ctx.fillStyle = hexRgba(col, 0.38);
      for (const i of pts) {
        const p = lms[i];
        if (!p) continue;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      // Merkez işaret noktaları (daha belirgin).
      ctx.fillStyle = hexRgba(col, 0.95);
      for (const i of pts) {
        const p = lms[i];
        if (!p) continue;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, Math.max(2, w * 0.006), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }, []);

  const baslat = React.useCallback(async () => {
    setDurum("yükleniyor");
    setHata("");
    try {
      if (!lmRef.current) {
        const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
        lmRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
        });
      }
      const v = videoRef.current!;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      v.srcObject = stream;
      await v.play();
      setDurum("açık");
      const dongu = () => {
        if (!v.srcObject) return;
        const res = lmRef.current!.detectForVideo(v, performance.now());
        ciz(res.faceLandmarks[0]);
        rafRef.current = requestAnimationFrame(dongu);
      };
      rafRef.current = requestAnimationFrame(dongu);
    } catch (e) {
      setDurum("hata");
      setHata(e instanceof Error ? e.message : String(e));
    }
  }, [ciz]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ position: "relative", background: "var(--gg-surface)", borderRadius: "var(--gg-r-lg)", overflow: "hidden", aspectRatio: "4 / 3" }}>
        <video ref={videoRef} playsInline muted style={{ display: "none" }} />
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", objectFit: "cover", display: durum === "açık" ? "block" : "none" }} />
        {durum !== "açık" && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", padding: 20, gap: 10 }}>
            <div style={{ fontSize: 34 }}>📷</div>
            <div style={{ fontSize: 14, color: "var(--gg-muted)", maxWidth: 320 }}>
              {durum === "hata"
                ? "Kamera açılamadı: " + hata
                : durum === "yükleniyor"
                ? "Model yükleniyor…"
                : `Kamerayı aç, "${stepTitle}" adımını yüzünde nereye süreceğini canlı gör.`}
            </div>
            {durum !== "yükleniyor" && (
              <button className="gg-btn gg-btn-primary" onClick={baslat}>📷 Kamerayı Aç</button>
            )}
          </div>
        )}
        {durum === "açık" && (
          <button className="gg-btn gg-btn-ghost" onClick={durdur}
                  style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,.85)" }}>
            ⏹ Kapat
          </button>
        )}
      </div>
      {durum === "açık" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--gg-muted)" }}>
          <span style={{ width: 14, height: 14, borderRadius: 4, background: colorHex, border: "1px solid var(--gg-border)" }} />
          Vurgulanan bölge: <strong style={{ color: "var(--gg-text)" }}>{region}</strong> — analiz cihazında yapılır, görüntü sunucuya gitmez.
        </div>
      )}
    </div>
  );
}
