"use client";

import * as React from "react";
import type { FaceLandmarker as FaceLandmarkerT, NormalizedLandmark } from "@mediapipe/tasks-vision";

/**
 * Adım-adım tarifte canlı ayna (MediaPipe Face Landmarker):
 *  - Sürülecek alan: yumuşatılmış (spline) hassas sınır + küçük pembe tarama
 *    noktaları + ürün renginde hafif 45° taralı dolgu.
 *  - Sürme yönü: İNCE FIRÇA ANİMASYONU — ince bir fırça ucu, sürme yönünde
 *    tekrar tekrar süpürerek yönü gösterir (statik ok yok).
 *  - TON TAKİBİ: bölgenin ortalama rengi adım başındaki cilt tonundan ürün
 *    tonuna yeterince yaklaşınca alan YEŞİL taralıya döner ("✓ ton tamam") —
 *    aynı alana tekrar sürüp malzeme harcamayı/ton kaçırmayı önler.
 * Analiz tamamen cihazda; telefonda aynı model MediaPipe Tasks ile koşacak.
 */

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const PEMBE = "#EC2E7A";   // tarama noktaları
const YESIL = "#22C55E";   // ton tamam → yeşil taralı
const TON_ESIK = 0.6;      // hedefe yakınlık eşiği (EMA'lı ilerleme 0..1)

type Yama = { pts: number[]; arrows: [number, number][] };
type BolgeTanim = { yamalar: Yama[]; firca: string; yon: string };

// MediaPipe Face Mesh (468) indeksleriyle bölge tanımları — sınırlar sıralı
// kontur olarak verilir; çizimde spline ile yumuşatılır.
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
      { pts: [133, 155, 154, 153, 145, 144, 163, 110, 24, 23, 22, 26, 112], arrows: [[133, 143]] },
      { pts: [362, 382, 381, 380, 374, 373, 390, 339, 254, 253, 252, 256, 341], arrows: [[362, 372]] },
    ],
    firca: "Küçük kapatıcı fırçası (yumuşak uçlu)",
    yon: "İç köşeden dışa, hafif dokunuşlarla",
  },
  "elmacik kemigi": {
    yamalar: [
      { pts: [50, 101, 100, 118, 117, 111, 116, 123, 147, 187, 205], arrows: [[205, 127]] },
      { pts: [280, 330, 329, 347, 346, 340, 345, 352, 376, 411, 425], arrows: [[425, 356]] },
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
      { pts: [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7], arrows: [[145, 159]] },
      { pts: [263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249], arrows: [[374, 386]] },
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

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hexRgba(hex: string, a: number): string {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

type Pt = [number, number];

/** Kapalı konturu yumuşatılmış eğriyle çizer (orta-nokta quadratic spline). */
function puruzsuzYol(ctx: CanvasRenderingContext2D, path: Pt[]) {
  const n = path.length;
  ctx.beginPath();
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let m = mid(path[0], path[1]);
  ctx.moveTo(m[0], m[1]);
  for (let i = 1; i <= n; i++) {
    const p = path[i % n];
    const m2 = mid(p, path[(i + 1) % n]);
    ctx.quadraticCurveTo(p[0], p[1], m2[0], m2[1]);
  }
  ctx.closePath();
}

/** Işın testi: nokta çokgenin içinde mi. */
function icinde(x: number, y: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function GuidedCamera({ region, colorHex, stepTitle }: { region: string; colorHex: string; stepTitle: string }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const lmRef = React.useRef<FaceLandmarkerT | null>(null);
  const rafRef = React.useRef<number>(0);
  const cfgRef = React.useRef({ region, colorHex });
  // Ton takibi durumu (yama başına): adım başı cilt tonu, EMA ilerleme, tamam bayrağı.
  const tonRef = React.useRef<{ region: string; base: ([number, number, number] | null)[]; ema: number[]; done: boolean[]; kare: number }>({ region: "", base: [], ema: [], done: [], kare: 0 });
  cfgRef.current = { region, colorHex };

  const [durum, setDurum] = React.useState<"kapalı" | "yükleniyor" | "açık" | "hata">("kapalı");
  const [hata, setHata] = React.useState("");
  const [ilerleme, setIlerleme] = React.useState(0);   // %
  const [tamam, setTamam] = React.useState(false);

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

  const ciz = React.useCallback((lms: NormalizedLandmark[] | undefined, simdi: number) => {
    const cv = canvasRef.current, v = videoRef.current;
    if (!cv || !v) return;
    const w = v.videoWidth, h = v.videoHeight;
    if (!w || !h) return;
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d", { willReadFrequently: true })!;
    ctx.save();
    ctx.translate(w, 0); ctx.scale(-1, 1); // ayna
    ctx.drawImage(v, 0, 0, w, h);

    if (!lms) { ctx.restore(); return; }
    const { region: reg, colorHex: col } = cfgRef.current;

    // Bölge değiştiyse ton takibini sıfırla (yeni adım = yeni taban cilt tonu).
    const ton = tonRef.current;
    if (ton.region !== reg) {
      tonRef.current = { region: reg, base: [], ema: [], done: [], kare: 0 };
    }
    tonRef.current.kare++;
    const hedef = hexRgb(col);

    let yamaNo = 0;
    let toplamIlerleme = 0, yamaSayisi = 0;
    for (const tanim of bolgeleriBul(reg)) {
      for (const yama of tanim.yamalar) {
        const idx = yamaNo++;
        const path: Pt[] = yama.pts.map((i) => lms[i]).filter(Boolean).map((p) => [p.x * w, p.y * h]);
        if (path.length < 3) continue;

        // --- TON ÖRNEKLEME (6 karede bir; ayna nedeniyle piksel x = w - x) ---
        const t2 = tonRef.current;
        if (t2.kare % 6 === 0 && !t2.done[idx]) {
          const xs = path.map((p) => p[0]), ys = path.map((p) => p[1]);
          const x0 = Math.max(0, Math.min(...xs)), x1 = Math.min(w, Math.max(...xs));
          const y0 = Math.max(0, Math.min(...ys)), y1 = Math.min(h, Math.max(...ys));
          const adim = Math.max(6, Math.floor((x1 - x0) / 12));
          let r = 0, g = 0, b = 0, sayi = 0;
          for (let y = y0; y < y1; y += adim) {
            for (let x = x0; x < x1; x += adim) {
              if (!icinde(x, y, path)) continue;
              const px = ctx.getImageData(Math.round(w - x), Math.round(y), 1, 1).data;
              r += px[0]; g += px[1]; b += px[2]; sayi++;
            }
          }
          if (sayi > 3) {
            const ort: [number, number, number] = [r / sayi, g / sayi, b / sayi];
            if (!t2.base[idx]) {
              t2.base[idx] = ort;                       // adım başı cilt tonu
              t2.ema[idx] = 0;
            } else {
              const base = t2.base[idx]!;
              const d = (a: number[], c: number[]) => Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]);
              const gereken = d(base, hedef);
              // İlerleme: taban→hedef mesafesinin ne kadarı katedildi. Taban zaten
              // hedefe çok yakınsa belirgin renk değişimini ölçüt al.
              const p = gereken > 25 ? Math.max(0, Math.min(1, 1 - d(ort, hedef) / gereken)) : Math.min(1, d(ort, base) / 18);
              t2.ema[idx] = t2.ema[idx] * 0.7 + p * 0.3; // titremeyi süz
              if (t2.ema[idx] >= TON_ESIK) t2.done[idx] = true;
            }
          }
        }
        const bitti = !!t2.done[idx];
        toplamIlerleme += bitti ? 1 : (t2.ema[idx] ?? 0);
        yamaSayisi++;

        const alanRenk = bitti ? YESIL : col;

        // --- 1) HASSAS SINIR + TARALI ALAN (spline yumuşatma + clip'li hatch) ---
        ctx.save();
        puruzsuzYol(ctx, path);
        ctx.fillStyle = hexRgba(alanRenk, bitti ? 0.16 : 0.10);
        ctx.fill();
        ctx.strokeStyle = hexRgba(alanRenk, 0.55);
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.clip();
        ctx.strokeStyle = hexRgba(alanRenk, bitti ? 0.5 : 0.32);
        ctx.lineWidth = 1;
        const aralik = Math.max(7, w * 0.014);
        for (let d0 = -h; d0 < w + h; d0 += aralik) {
          ctx.beginPath(); ctx.moveTo(d0, 0); ctx.lineTo(d0 + h, h); ctx.stroke();
        }
        ctx.restore();

        // --- 2) Küçük pembe tarama noktaları (bitince yeşile döner) ---
        ctx.fillStyle = bitti ? YESIL : PEMBE;
        const nokta = Math.max(1.2, w * 0.003);
        for (const [x, y] of path) {
          ctx.beginPath(); ctx.arc(x, y, nokta, 0, Math.PI * 2); ctx.fill();
        }

        // --- 3) İNCE FIRÇA SÜRME ANİMASYONU (bitmemişse) ---
        if (!bitti) {
          for (const [ai, bi] of yama.arrows) {
            const a = lms[ai], b = lms[bi];
            if (!a || !b) continue;
            const x1 = a.x * w, y1 = a.y * h, x2 = b.x * w, y2 = b.y * h;
            const faz = ((simdi + (ai * 137) % 700) % 1600) / 1600; // yamalar eşzamansız
            if (faz > 0.85) continue;                    // kısa nefes payı
            const t = Math.min(1, faz / 0.85);
            const ux = x2 - x1, uy = y2 - y1;
            const px = x1 + ux * t, py = y1 + uy * t;    // fırça ucu konumu
            const ang = Math.atan2(uy, ux);
            const iz = Math.max(0, t - 0.35);            // iz başlangıcı (kuyruk)
            const izx = x1 + ux * iz, izy = y1 + uy * iz;
            // sürülen iz: uca doğru incelen yarı saydam şerit
            const grad = ctx.createLinearGradient(izx, izy, px, py);
            grad.addColorStop(0, hexRgba(col, 0));
            grad.addColorStop(1, hexRgba(col, 0.75));
            ctx.strokeStyle = grad;
            ctx.lineCap = "round";
            ctx.lineWidth = Math.max(2, w * 0.004);
            ctx.beginPath(); ctx.moveTo(izx, izy); ctx.lineTo(px, py); ctx.stroke();
            // ince fırça ucu: yöne dik küçük kıl demeti
            ctx.save();
            ctx.translate(px, py); ctx.rotate(ang + Math.PI / 2);
            ctx.strokeStyle = "rgba(255,255,255,.9)";
            ctx.lineWidth = 1;
            const kil = Math.max(4, w * 0.009);
            for (let k = -2; k <= 2; k++) {
              ctx.beginPath(); ctx.moveTo(k * 1.6, 0); ctx.lineTo(k * 1.2, -kil); ctx.stroke();
            }
            ctx.restore();
          }
        } else {
          // bitti: alanın ortasına onay işareti
          const cx = path.reduce((s, p) => s + p[0], 0) / path.length;
          const cy = path.reduce((s, p) => s + p[1], 0) / path.length;
          ctx.save();
          ctx.translate(cx, cy); ctx.scale(-1, 1);       // ayna içinde yazı düz dursun
          ctx.font = `600 ${Math.max(13, w * 0.03)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillStyle = "rgba(255,255,255,.95)";
          ctx.fillText("✓", 0, 0);
          ctx.restore();
        }
      }
    }
    ctx.restore();

    // UI durumunu düşük frekansta güncelle (re-render fırtınası olmasın).
    if (tonRef.current.kare % 12 === 0 && yamaSayisi > 0) {
      const pct = Math.round((toplamIlerleme / yamaSayisi) * 100);
      setIlerleme(pct);
      setTamam(tonRef.current.done.length > 0 && tonRef.current.done.filter(Boolean).length === yamaSayisi);
    }
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
      tonRef.current = { region: "", base: [], ema: [], done: [], kare: 0 }; // taban tonu yeniden ölç
      setTamam(false); setIlerleme(0);
      setDurum("açık");
      const dongu = () => {
        if (!v.srcObject) return;
        const simdi = performance.now();
        const res = lmRef.current!.detectForVideo(v, simdi);
        ciz(res.faceLandmarks[0], simdi);
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
          <div style={{ position: "absolute", top: 10, left: 10, display: "grid", gap: 6, maxWidth: "70%" }}>
            {tanimlar.map((t) => (
              <span key={t.firca} style={{ background: "rgba(255,255,255,.92)", borderRadius: 999, padding: "5px 12px", fontSize: 12.5, fontWeight: 600, boxShadow: "0 1px 4px rgba(0,0,0,.15)" }}>
                🖌️ {t.firca} · <span style={{ color: PEMBE }}>{t.yon}</span>
              </span>
            ))}
            <span style={{ background: tamam ? "rgba(34,197,94,.95)" : "rgba(255,255,255,.92)", color: tamam ? "#fff" : "inherit", borderRadius: 999, padding: "5px 12px", fontSize: 12.5, fontWeight: 700, boxShadow: "0 1px 4px rgba(0,0,0,.15)", justifySelf: "start" }}>
              {tamam ? "✓ Ton tamam — bu bölgeye daha fazla sürme" : `Ton ilerlemesi: %${ilerleme}`}
            </span>
          </div>
        )}
        {durum !== "açık" && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", padding: 20, gap: 10 }}>
            <div style={{ fontSize: 34 }}>📷</div>
            <div style={{ fontSize: 14, color: "var(--gg-muted)", maxWidth: 340 }}>
              {durum === "hata"
                ? "Kamera açılamadı: " + hata
                : durum === "yükleniyor"
                ? "Model yükleniyor…"
                : `Kamerayı aç: "${stepTitle}" adımında alan taralı gösterilir, ince fırça animasyonu yönü gösterir; ton yerine oturunca alan yeşile döner.`}
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
          Taralı alan: <strong style={{ color: "var(--gg-text)" }}>{region}</strong> · fırça animasyonu = sürme yönü · yeşil = ton tamam. Analiz cihazda.
        </div>
      )}
    </div>
  );
}
