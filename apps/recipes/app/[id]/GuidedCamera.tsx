"use client";

import * as React from "react";
import type { FaceLandmarker as FaceLandmarkerT, NormalizedLandmark } from "@mediapipe/tasks-vision";

/**
 * Adım-adım tarifte canlı ayna: kamerayı açar, MediaPipe Face Landmarker ile
 * yüzü izler ve aktif adımın sürülecek ALANINI gösterir:
 *  - alan sınırı: küçük pembe "yüz tarama" noktaları
 *  - alan içi: ürün renginde hafif TARALI (hatch) dolgu
 *  - sürme YÖNÜ: ok(lar) — fırçayı hangi yöne çekeceğini gösterir
 *  - hangi FIRÇA: sol üstte rozet
 * Analiz cihazda yapılır; telefonda aynı model MediaPipe Tasks ile koşacak.
 */

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const PEMBE = "#EC2E7A"; // tarama noktaları her zaman pembe (face-scan görünümü)

/** Bir bölge yaması: alan noktaları (dış hat için) + yön okları (landmark çifti: başlangıç→bitiş). */
type Yama = { pts: number[]; arrows: [number, number][] };
type BolgeTanim = { yamalar: Yama[]; firca: string; yon: string };

// MediaPipe Face Mesh (468 nokta) indeksleriyle bölge tanımları.
// Sol/sağ ayrı yama → her yanağa/göze kendi taralı alanı ve oku çizilir.
const BOLGELER: Record<string, BolgeTanim> = {
  yuz: {
    yamalar: [
      { pts: [10, 338, 297, 332, 284, 454, 366, 361, 397, 152, 172, 132, 137, 234, 54, 103, 67, 109], arrows: [[5, 234], [5, 454], [168, 10]] },
    ],
    firca: "Nemli sünger / fondöten fırçası",
    yon: "Ortadan dışa doğru",
  },
  "goz alti": {
    yamalar: [
      { pts: [133, 155, 154, 153, 145, 144, 163, 110, 24, 23, 22, 26, 112], arrows: [[133, 143]] },   // sol göz altı: içten dışa
      { pts: [362, 382, 381, 380, 374, 373, 390, 339, 254, 253, 252, 256, 341], arrows: [[362, 372]] }, // sağ göz altı
    ],
    firca: "Küçük kapatıcı fırçası (yumuşak uçlu)",
    yon: "İç köşeden dışa, hafif dokunuşlarla",
  },
  "elmacik kemigi": {
    yamalar: [
      { pts: [50, 101, 100, 118, 117, 111, 116, 123, 147, 187, 205], arrows: [[205, 127]] },  // sol yanak → şakağa doğru
      { pts: [280, 330, 329, 347, 346, 340, 345, 352, 376, 411, 425], arrows: [[425, 356]] }, // sağ yanak → şakağa doğru
    ],
    firca: "Açılı allık fırçası",
    yon: "Elmacıktan şakağa, yukarı-dışa",
  },
  dudak: {
    yamalar: [
      { pts: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146], arrows: [[0, 61], [0, 291]] },
    ],
    firca: "Dudak fırçası / aplikatör",
    yon: "Ortadan kenarlara",
  },
  goz: {
    yamalar: [
      { pts: [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7], arrows: [[145, 159]] },   // sol: aşağıdan yukarı
      { pts: [263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249], arrows: [[374, 386]] }, // sağ
    ],
    firca: "Maskara fırçası / far fırçası",
    yon: "Kirpik dibinden uca, aşağıdan yukarı",
  },
  yanak: {
    yamalar: [
      { pts: [50, 101, 100, 118, 117, 111, 116, 123, 147, 187, 205], arrows: [[205, 127]] },
      { pts: [280, 330, 329, 347, 346, 340, 345, 352, 376, 411, 425], arrows: [[425, 356]] },
    ],
    firca: "Allık fırçası",
    yon: "Yukarı-dışa doğru",
  },
};

/** Region metnini tanımlara eşler ("Göz / Dudak" gibi bileşikler birden çok tanım döndürür). */
function bolgeleriBul(region: string): BolgeTanim[] {
  const r = region.toLocaleLowerCase("tr").trim();
  const out: BolgeTanim[] = [];
  if (r.includes("göz altı") || r.includes("goz alti")) out.push(BOLGELER["goz alti"]);
  else if (r.includes("göz") || r.includes("goz")) out.push(BOLGELER["goz"]);
  if (r.includes("elmacık") || r.includes("elmacik")) out.push(BOLGELER["elmacik kemigi"]);
  else if (r.includes("yanak")) out.push(BOLGELER["yanak"]);
  if (r.includes("dudak")) out.push(BOLGELER["dudak"]);
  if (out.length === 0 || r.includes("yüz") || r.includes("yuz")) out.push(BOLGELER["yuz"]);
  return out;
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
  const cfgRef = React.useRef({ region, colorHex });
  cfgRef.current = { region, colorHex };

  const [durum, setDurum] = React.useState<"kapalı" | "yükleniyor" | "açık" | "hata">("kapalı");
  const [hata, setHata] = React.useState("");

  const tanimlar = bolgeleriBul(region);

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
    ctx.save();
    ctx.translate(w, 0); ctx.scale(-1, 1); // ayna (selfie)
    ctx.drawImage(v, 0, 0, w, h);

    if (lms) {
      const { region: reg, colorHex: col } = cfgRef.current;
      for (const tanim of bolgeleriBul(reg)) {
        for (const yama of tanim.yamalar) {
          const path = yama.pts
            .map((i) => lms[i])
            .filter(Boolean)
            .map((p) => [p.x * w, p.y * h] as [number, number]);
          if (path.length < 3) continue;

          // 1) Alan: çok hafif renk + TARALI (hatch) dolgu — alanı belli eder, yüzü kapatmaz.
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(path[0][0], path[0][1]);
          for (const [x, y] of path.slice(1)) ctx.lineTo(x, y);
          ctx.closePath();
          ctx.fillStyle = hexRgba(col, 0.10);
          ctx.fill();
          ctx.clip(); // taramayı alanın içine kilitle
          ctx.strokeStyle = hexRgba(col, 0.35);
          ctx.lineWidth = 1;
          const aralik = Math.max(7, w * 0.014);
          for (let d = -h; d < w + h; d += aralik) { // 45° çapraz tarama çizgileri
            ctx.beginPath();
            ctx.moveTo(d, 0);
            ctx.lineTo(d + h, h);
            ctx.stroke();
          }
          ctx.restore();

          // 2) Sınır: küçük PEMBE tarama noktaları (face-scan görünümü).
          ctx.fillStyle = PEMBE;
          const nokta = Math.max(1.3, w * 0.0035);
          for (const [x, y] of path) {
            ctx.beginPath();
            ctx.arc(x, y, nokta, 0, Math.PI * 2);
            ctx.fill();
          }

          // 3) Yön okları: fırçayı hangi yöne çekeceğin.
          for (const [ai, bi] of yama.arrows) {
            const a = lms[ai], b = lms[bi];
            if (!a || !b) continue;
            const x1 = a.x * w, y1 = a.y * h, x2 = b.x * w, y2 = b.y * h;
            const ang = Math.atan2(y2 - y1, x2 - x1);
            const bas = Math.max(7, w * 0.016);
            ctx.strokeStyle = "rgba(255,255,255,.95)";
            ctx.lineWidth = Math.max(2.5, w * 0.005);
            ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            ctx.fillStyle = "rgba(255,255,255,.95)";
            ctx.beginPath(); // ok başı
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - bas * Math.cos(ang - 0.45), y2 - bas * Math.sin(ang - 0.45));
            ctx.lineTo(x2 - bas * Math.cos(ang + 0.45), y2 - bas * Math.sin(ang + 0.45));
            ctx.closePath(); ctx.fill();
            // okun altına ince pembe gölge çizgisi (görünürlük için)
            ctx.strokeStyle = hexRgba(PEMBE, 0.9);
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          }
        }
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
        {durum === "açık" && (
          <div style={{ position: "absolute", top: 10, left: 10, display: "grid", gap: 6 }}>
            {tanimlar.map((t) => (
              <span key={t.firca} style={{ background: "rgba(255,255,255,.92)", borderRadius: 999, padding: "5px 12px", fontSize: 12.5, fontWeight: 600, boxShadow: "0 1px 4px rgba(0,0,0,.15)" }}>
                🖌️ {t.firca} · <span style={{ color: PEMBE }}>{t.yon}</span>
              </span>
            ))}
          </div>
        )}
        {durum !== "açık" && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", padding: 20, gap: 10 }}>
            <div style={{ fontSize: 34 }}>📷</div>
            <div style={{ fontSize: 14, color: "var(--gg-muted)", maxWidth: 320 }}>
              {durum === "hata"
                ? "Kamera açılamadı: " + hata
                : durum === "yükleniyor"
                ? "Model yükleniyor…"
                : `Kamerayı aç, "${stepTitle}" adımında ürünü nereye ve hangi yöne süreceğini canlı gör.`}
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
          Taralı alan: <strong style={{ color: "var(--gg-text)" }}>{region}</strong> · ok = sürme yönü — analiz cihazında, görüntü sunucuya gitmez.
        </div>
      )}
    </div>
  );
}
