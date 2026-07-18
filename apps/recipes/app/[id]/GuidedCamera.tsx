"use client";

import * as React from "react";
import type { FaceLandmarker as FaceLandmarkerT, NormalizedLandmark } from "@mediapipe/tasks-vision";

/**
 * Adım-adım tarifte canlı ayna (MediaPipe Face Landmarker):
 *  - HÜCRE BAZLI KAPLAMA: sürülecek alan küçük hücrelere bölünür; her hücrenin
 *    tonu ayrı izlenir. Doğru tona ulaşan hücrenin taraması/noktası SİLİNİR →
 *    yalnız eksik kalan yerler taralı kalır, aynı yere tekrar sürülmez.
 *  - PROGRESS BAR: videonun altında toplam kaplama ilerlemesi.
 *  - Renk durumu: az=SARI → tamam=temiz (tarama kalkar) → fazla=KIRMIZI.
 *  - Düz sürülen tekniklerde DÜZ kılavuz; gerçekçi araç (fırça/ruj/sünger) süpürür.
 *  - Profil: düşük eşikli takip + 4sn grace; arkada kalan yama/ok gizlenir.
 * Analiz tamamen cihazda; telefonda aynı model MediaPipe Tasks ile koşacak.
 */

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const PEMBE = "#EC2E7A";
const SARI = "#FACC15";
const YESIL = "#22C55E";
const KIRMIZI = "#EF4444";
const HOLO = "#38BDF8";
const TAMAM_ALT = 0.85;        // hücre uygulama oranı eşiği → hücre "tamam"
const FAZLA_UST = 1.3;         // üstü → hücre "fazla sürüldü" (kırmızı)
const HUCRE = 14;              // yama bbox'ı HUCRE x HUCRE ızgaraya bölünür
const YUZ_GRACE_MS = 4000;

type Yama = {
  pts: number[];
  arrows: [number, number, number?][]; // [başlangıç, bitiş, kavis?] — kavis 0 = DÜZ
  alinUzat?: boolean;
  hull?: boolean;
  serit?: boolean;
};
type BolgeTanim = { yamalar: Yama[]; firca: string; yon: string; arac: "firca" | "ruj" | "sunger" };

const BOLGELER: Record<string, BolgeTanim> = {
  yuz: {
    yamalar: [
      { pts: [10, 338, 297, 332, 284, 454, 366, 361, 397, 152, 172, 132, 137, 234, 54, 103, 67, 109, 1, 4, 5, 19, 94, 197], arrows: [[4, 205], [4, 425], [168, 10]], alinUzat: true, hull: true },
    ],
    firca: "Nemli sünger / fondöten fırçası", yon: "Ortadan dışa doğru", arac: "sunger",
  },
  kontur: {
    yamalar: [
      { pts: [227, 123, 50, 205, 187, 147, 177, 137], arrows: [[205, 234]] },
      { pts: [447, 352, 280, 425, 411, 376, 401, 366], arrows: [[425, 454]] },
    ],
    firca: "Açılı kontür fırçası", yon: "Elmacık altından kulağa, yukarı harmanla", arac: "firca",
  },
  "goz alti": {
    yamalar: [
      { pts: [133, 155, 154, 153, 145, 144, 163, 110, 24, 23, 22, 26, 112], arrows: [[133, 143]] },
      { pts: [362, 382, 381, 380, 374, 373, 390, 339, 254, 253, 252, 256, 341], arrows: [[362, 372]] },
    ],
    firca: "Küçük kapatıcı fırçası (yumuşak uçlu)", yon: "İç köşeden dışa, hafif dokunuşlarla", arac: "firca",
  },
  "elmacik kemigi": {
    yamalar: [
      { pts: [50, 101, 100, 118, 117, 111, 116, 123, 147, 187, 205], arrows: [[205, 127]] },
      { pts: [280, 330, 329, 347, 346, 340, 345, 352, 376, 411, 425], arrows: [[425, 356]] },
    ],
    firca: "Açılı allık fırçası", yon: "Elmacıktan şakağa, yukarı-dışa", arac: "firca",
  },
  dudak: {
    yamalar: [
      { pts: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146], arrows: [[0, 61], [0, 291]] },
    ],
    firca: "Dudak fırçası / aplikatör", yon: "Ortadan kenarlara", arac: "ruj",
  },
  goz: {
    yamalar: [
      { pts: [33, 246, 161, 160, 159, 158, 157, 173, 133], arrows: [[159, 105]], serit: true },
      { pts: [263, 466, 388, 387, 386, 385, 384, 398, 362], arrows: [[386, 334]], serit: true },
    ],
    firca: "Maskara fırçası / far fırçası", yon: "Kirpik dibinden uca, aşağıdan yukarı", arac: "firca",
  },
  yanak: {
    yamalar: [
      { pts: [50, 101, 100, 118, 117, 111, 116, 123, 147, 187, 205], arrows: [[205, 127]] },
      { pts: [280, 330, 329, 347, 346, 340, 345, 352, 376, 411, 425], arrows: [[425, 356]] },
    ],
    firca: "Allık fırçası", yon: "Yukarı-dışa doğru", arac: "firca",
  },
  kas: {
    // Kaş bantları (şerit) — iç uçtan dışa doğru kıl taklidi çizgiler.
    yamalar: [
      { pts: [107, 66, 105, 63, 70], arrows: [[107, 70]], serit: true },
      { pts: [336, 296, 334, 293, 300], arrows: [[336, 300]], serit: true },
    ],
    firca: "Kaş kalemi + kaş fırçası", yon: "İç uçtan dışa, kısa kıl çizgileri", arac: "firca",
  },
};

/** /analysis'in ölçtüğü yüz şekline göre ek kontür yamaları ve ipuçları.
 *  (Makyöz kuralı: kalp yüzde alın kenarları yumuşatılır; yuvarlak/kare yüzde
 *  çene hattı belirginleştirilir.) */
const SEKIL_EK: Record<string, { bolge: "kontur"; yama: Yama[]; ipucu: string }> = {
  Kalp: {
    bolge: "kontur",
    yama: [
      { pts: [54, 103, 67], arrows: [[67, 54]], serit: true },     // sol alın kenarı
      { pts: [284, 332, 297], arrows: [[297, 284]], serit: true }, // sağ alın kenarı
    ],
    ipucu: "Kalp yüz: alın kenarlarını da hafifçe karart, çene ucunu dengede tut.",
  },
  Yuvarlak: {
    bolge: "kontur",
    yama: [
      { pts: [58, 172, 136, 150, 149], arrows: [[149, 58]], serit: true },     // sol çene hattı
      { pts: [288, 397, 365, 379, 378], arrows: [[378, 288]], serit: true },   // sağ çene hattı
    ],
    ipucu: "Yuvarlak yüz: çene hattını da karart — yüz belirginleşir ve incelir.",
  },
  Kare: {
    bolge: "kontur",
    yama: [
      { pts: [58, 172, 136, 150], arrows: [[150, 58]], serit: true },
      { pts: [288, 397, 365, 379], arrows: [[379, 288]], serit: true },
    ],
    ipucu: "Kare yüz: çene köşelerini yumuşat; allığı üst elmacıkta tut, buruna yaklaştırma.",
  },
  Uzun: {
    bolge: "kontur",
    yama: [],
    ipucu: "Uzun yüz: kontürü yatay tut (alın üstü + çene ucu); dikey hatlardan kaçın.",
  },
};

function bolgeleriBul(region: string, sekil?: string | null): BolgeTanim[] {
  const r = region.toLocaleLowerCase("tr").trim();
  const out: BolgeTanim[] = [];
  if (r.includes("kaş") || r.includes("kas")) out.push(BOLGELER["kas"]);
  if (r.includes("kontür") || r.includes("kontur")) {
    const ek = sekil ? SEKIL_EK[sekil] : undefined;
    // Yüz şekline göre ek kontür yamaları (kalp: alın kenarı, yuvarlak/kare: çene hattı).
    out.push(ek && ek.yama.length > 0
      ? { ...BOLGELER["kontur"], yamalar: [...BOLGELER["kontur"].yamalar, ...ek.yama] }
      : BOLGELER["kontur"]);
  }
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
function rgba(c: [number, number, number], a: number): string {
  return `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${a})`;
}
function karisim(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  const k = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

type Pt = [number, number];

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

function zarf(points: Pt[]): Pt[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const alt: Pt[] = [];
  for (const p of pts) {
    while (alt.length >= 2 && cross(alt[alt.length - 2], alt[alt.length - 1], p) <= 0) alt.pop();
    alt.push(p);
  }
  const ust: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (ust.length >= 2 && cross(ust[ust.length - 2], ust[ust.length - 1], p) <= 0) ust.pop();
    ust.push(p);
  }
  alt.pop(); ust.pop();
  return alt.concat(ust);
}

function icinde(x: number, y: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function kavis(a: Pt, c: Pt, b: Pt, t: number): { p: Pt; ang: number } {
  const u = 1 - t;
  const p: Pt = [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
  const dx = 2 * u * (c[0] - a[0]) + 2 * t * (b[0] - c[0]);
  const dy = 2 * u * (c[1] - a[1]) + 2 * t * (b[1] - c[1]);
  return { p, ang: Math.atan2(dy, dx) };
}

function swooshCiz(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, boyOlcek: number, kavisK: number) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L = Math.hypot(dx, dy);
  if (L < 4) return;
  let px = -dy / L, py = dx / L;
  if (py > 0) { px = -px; py = -py; }
  const c: Pt = [(a[0] + b[0]) / 2 + px * L * kavisK, (a[1] + b[1]) / 2 + py * L * kavisK];

  const N = 22;
  const wMax = Math.max(5, boyOlcek * 0.016);
  const sol: Pt[] = [], sag: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const { p, ang } = kavis(a, c, b, t);
    const hw = wMax * (0.12 + 0.88 * t);
    const nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2);
    sol.push([p[0] + nx * hw, p[1] + ny * hw]);
    sag.push([p[0] - nx * hw, p[1] - ny * hw]);
  }
  ctx.save();
  ctx.shadowColor = hexRgba(HOLO, 0.9);
  ctx.shadowBlur = wMax * 1.6;
  const grad = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
  grad.addColorStop(0, hexRgba(HOLO, 0.05));
  grad.addColorStop(0.55, hexRgba(HOLO, 0.35));
  grad.addColorStop(1, hexRgba(HOLO, 0.6));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(sol[0][0], sol[0][1]);
  for (const [x, y] of sol.slice(1)) ctx.lineTo(x, y);
  for (let i = sag.length - 1; i >= 0; i--) ctx.lineTo(sag[i][0], sag[i][1]);
  ctx.closePath();
  ctx.fill();
  const uc = kavis(a, c, b, 1);
  const bas = wMax * 2.6;
  ctx.fillStyle = hexRgba(HOLO, 0.75);
  ctx.beginPath();
  ctx.moveTo(uc.p[0] + Math.cos(uc.ang) * bas, uc.p[1] + Math.sin(uc.ang) * bas);
  ctx.lineTo(uc.p[0] + Math.cos(uc.ang + 2.5) * bas, uc.p[1] + Math.sin(uc.ang + 2.5) * bas);
  ctx.lineTo(uc.p[0] + Math.cos(uc.ang - 2.5) * bas, uc.p[1] + Math.sin(uc.ang - 2.5) * bas);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function aracCiz(ctx: CanvasRenderingContext2D, tip: "firca" | "ruj" | "sunger", x: number, y: number, boy: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.85);
  ctx.shadowColor = hexRgba(HOLO, 0.95);
  ctx.shadowBlur = boy * 0.22;

  if (tip === "firca") {
    const kg = ctx.createRadialGradient(0, 0, 1, 0, 0, boy * 0.16);
    kg.addColorStop(0, "rgba(224,242,254,.95)");
    kg.addColorStop(1, hexRgba(HOLO, 0.55));
    ctx.fillStyle = kg;
    ctx.beginPath();
    ctx.ellipse(0, 0, boy * 0.09, boy * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(186,230,253,.85)";
    ctx.beginPath();
    ctx.roundRect(-boy * 0.045, boy * 0.13, boy * 0.09, boy * 0.1, boy * 0.02);
    ctx.fill();
    const sg = ctx.createLinearGradient(0, boy * 0.2, 0, boy);
    sg.addColorStop(0, hexRgba(HOLO, 0.8));
    sg.addColorStop(1, hexRgba(HOLO, 0.25));
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(-boy * 0.04, boy * 0.23);
    ctx.lineTo(boy * 0.04, boy * 0.23);
    ctx.lineTo(boy * 0.018, boy);
    ctx.lineTo(-boy * 0.018, boy);
    ctx.closePath();
    ctx.fill();
  } else if (tip === "ruj") {
    const rg = ctx.createLinearGradient(0, 0, 0, boy * 0.3);
    rg.addColorStop(0, "rgba(254,205,211,.95)");
    rg.addColorStop(1, hexRgba(HOLO, 0.6));
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(-boy * 0.05, boy * 0.28);
    ctx.lineTo(-boy * 0.05, boy * 0.06);
    ctx.quadraticCurveTo(-boy * 0.05, -boy * 0.02, boy * 0.02, 0);
    ctx.lineTo(boy * 0.05, boy * 0.1);
    ctx.lineTo(boy * 0.05, boy * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(186,230,253,.9)";
    ctx.beginPath(); ctx.roundRect(-boy * 0.06, boy * 0.28, boy * 0.12, boy * 0.08, boy * 0.015); ctx.fill();
    const tg = ctx.createLinearGradient(0, boy * 0.36, 0, boy * 0.95);
    tg.addColorStop(0, hexRgba(HOLO, 0.8));
    tg.addColorStop(1, hexRgba(HOLO, 0.3));
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.roundRect(-boy * 0.065, boy * 0.36, boy * 0.13, boy * 0.6, boy * 0.03); ctx.fill();
  } else {
    const eg = ctx.createRadialGradient(0, boy * 0.06, 2, 0, boy * 0.12, boy * 0.3);
    eg.addColorStop(0, "rgba(224,242,254,.95)");
    eg.addColorStop(1, hexRgba(HOLO, 0.5));
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.ellipse(0, boy * 0.14, boy * 0.12, boy * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

type Hucre = { b: [number, number, number] | null; e: number };

export function GuidedCamera({ region, colorHex, stepTitle }: { region: string; colorHex: string; stepTitle: string }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const lmRef = React.useRef<FaceLandmarkerT | null>(null);
  const rafRef = React.useRef<number>(0);
  const cfgRef = React.useRef({ region, colorHex });
  // Hücre bazlı kaplama: yama anahtarı → HUCRE x HUCRE ızgara durumu.
  const tonRef = React.useRef<{ region: string; kare: number; hucreler: Record<string, Map<string, Hucre>> }>({ region: "", kare: 0, hucreler: {} });
  const sonYuzRef = React.useRef<{ lms: NormalizedLandmark[] | null; t: number }>({ lms: null, t: 0 });
  const zoomRef = React.useRef({ s: 1, cx: 0, cy: 0 });
  const zoomAcikRef = React.useRef(true);
  cfgRef.current = { region, colorHex };

  const [durum, setDurum] = React.useState<"kapalı" | "yükleniyor" | "açık" | "hata">("kapalı");
  const [hata, setHata] = React.useState("");
  const [ilerleme, setIlerleme] = React.useState(0);
  const [tamam, setTamam] = React.useState(false);
  const [fazla, setFazla] = React.useState(false);
  const [yuzVar, setYuzVar] = React.useState(true);
  const [zoomAcik, setZoomAcik] = React.useState(true);
  const [isikAz, setIsikAz] = React.useState(false);
  const [sekil, setSekil] = React.useState<string | null>(null);
  const sekilRef = React.useRef<string | null>(null);
  zoomAcikRef.current = zoomAcik;

  // /analysis sayfası yüz şeklini localStorage'a yazar; rehber yerleşimi ona uyar.
  React.useEffect(() => {
    const s = localStorage.getItem("gg-yuz-sekli");
    setSekil(s); sekilRef.current = s;
  }, []);

  const tanimlar = bolgeleriBul(region, sekil);
  const sekilIpucu = sekil ? SEKIL_EK[sekil]?.ipucu : undefined;

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

  const ciz = React.useCallback((tespit: NormalizedLandmark[] | undefined, simdi: number) => {
    const cv = canvasRef.current, v = videoRef.current;
    if (!cv || !v) return;
    const w = v.videoWidth, h = v.videoHeight;
    if (!w || !h) return;

    if (tespit) sonYuzRef.current = { lms: tespit, t: simdi };
    const taze = simdi - sonYuzRef.current.t < YUZ_GRACE_MS;
    const lms = tespit ?? (taze ? sonYuzRef.current.lms : null) ?? undefined;

    const { region: reg, colorHex: col } = cfgRef.current;
    if (tonRef.current.region !== reg) tonRef.current = { region: reg, kare: 0, hucreler: {} };
    tonRef.current.kare++;
    const hedef = hexRgb(col);

    // Yamaları hesapla (+ profil işleme).
    const tumYamalar: { path: Pt[]; yama: Yama; tanim: BolgeTanim; anahtar: string }[] = [];
    if (lms) {
      for (const tanim of bolgeleriBul(reg, sekilRef.current)) {
        const adaylar: { path: Pt[]; yama: Yama; tanim: BolgeTanim; z: number; anahtar: string }[] = [];
        for (const yama of tanim.yamalar) {
          const ham = yama.pts.map((i) => lms[i]).filter(Boolean);
          if (ham.length < 3) continue;
          let path: Pt[] = ham.map((p) => [p.x * w, p.y * h]);
          const zOrt = ham.reduce((s, p) => s + (p.z ?? 0), 0) / ham.length;
          if (yama.serit) {
            const L0 = Math.hypot(path[path.length - 1][0] - path[0][0], path[path.length - 1][1] - path[0][1]);
            const d = Math.max(4, L0 * 0.16);
            const ust = path.map(([x, y]) => [x, y - d] as Pt).reverse();
            path = [...path, ...ust];
          } else {
            if (yama.alinUzat) {
              const my = path.reduce((s, p) => s + p[1], 0) / path.length;
              path = path.map(([x, y]) => [x, y < my ? Math.max(0, my - (my - y) * 1.55) : y]);
            }
            if (yama.hull) path = zarf(path);
          }
          adaylar.push({ path, yama, tanim, z: zOrt, anahtar: `${tanim.firca}:${yama.pts[0]}` });
        }
        if (adaylar.length === 2 && Math.abs(adaylar[0].z - adaylar[1].z) > 0.06) {
          adaylar.sort((a, b) => a.z - b.z);
          adaylar.pop();
        }
        for (const a of adaylar) tumYamalar.push(a);
      }
    }

    // Akıllı zoom.
    const z = zoomRef.current;
    let hs = 1, hcx = w / 2, hcy = h / 2;
    if (zoomAcikRef.current && tumYamalar.length > 0) {
      const xs = tumYamalar.flatMap((y) => y.path.map((p) => p[0]));
      const ys = tumYamalar.flatMap((y) => y.path.map((p) => p[1]));
      const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
      hcx = (Math.max(...xs) + Math.min(...xs)) / 2;
      hcy = (Math.max(...ys) + Math.min(...ys)) / 2;
      hs = Math.max(1, Math.min(2.4, Math.min(w / (bw * 2.1), h / (bh * 2.1))));
    }
    z.s += (hs - z.s) * 0.07;
    z.cx += (hcx - z.cx) * 0.07;
    z.cy += (hcy - z.cy) * 0.07;
    const gw = w / z.s / 2, gh = h / z.s / 2;
    const cx = Math.max(gw, Math.min(w - gw, z.cx));
    const cy = Math.max(gh, Math.min(h - gh, z.cy));

    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d", { willReadFrequently: true })!;
    ctx.save();
    ctx.translate(w, 0); ctx.scale(-1, 1);
    ctx.translate(cx, cy); ctx.scale(z.s, z.s); ctx.translate(-cx, -cy);
    ctx.drawImage(v, 0, 0, w, h);

    // IŞIK KONTROLÜ: makyaj (ve ton takibi) yeterli ışık ister — kare parlaklığını ölç.
    if (tonRef.current.kare % 30 === 0) {
      let toplam = 0;
      const noktalar = [[w / 2, h / 2], [w / 4, h / 3], [(3 * w) / 4, h / 3], [w / 2, (3 * h) / 4]];
      for (const [px, py] of noktalar) {
        const d = ctx.getImageData(Math.round(px), Math.round(py), 1, 1).data;
        toplam += (d[0] + d[1] + d[2]) / 3;
      }
      setIsikAz(toplam / noktalar.length < 55);
    }

    if (!lms) {
      ctx.restore();
      if (tonRef.current.kare % 12 === 0) setYuzVar(false);
      return;
    }
    if (tonRef.current.kare % 12 === 0) setYuzVar(true);

    const pikselX = (x: number) => w - (cx + (x - cx) * z.s);
    const pikselY = (y: number) => cy + (y - cy) * z.s;

    let hucreToplam = 0, hucreBitti = 0, ilerlemeTop = 0;
    let fazlaVar = false;

    for (const { path, yama, tanim, anahtar } of tumYamalar) {
      const t2 = tonRef.current;
      if (!t2.hucreler[anahtar]) t2.hucreler[anahtar] = new Map();
      const hucreler = t2.hucreler[anahtar];

      const bxs = path.map((p) => p[0]), bys = path.map((p) => p[1]);
      const x0 = Math.min(...bxs), x1 = Math.max(...bxs);
      const y0 = Math.min(...bys), y1 = Math.max(...bys);
      // Hücre SAYISI eksen başına dinamik: hücre kenarını ~ video genişliğinin
      // %2'sinde hedefle, en az 2. Böylece göz altı gibi ince şeritlerde de
      // (eskiden HUCRE=14 ile ch<2 olup bölge tümüyle atlanıyordu) hücre üretilir.
      const hedefKenar = Math.max(8, w * 0.02);
      const nx = Math.max(2, Math.min(HUCRE, Math.round((x1 - x0) / hedefKenar)));
      const ny = Math.max(2, Math.min(HUCRE, Math.round((y1 - y0) / hedefKenar)));
      const cw = (x1 - x0) / nx, ch = (y1 - y0) / ny;
      if (cw < 1 || ch < 1) continue;

      const ornekle = t2.kare % 6 === 0 && !!tespit;

      // Yama sınırı (ince) — durum rengi yerine nötr; hücreler asıl göstergedir.
      ctx.save();
      puruzsuzYol(ctx, path);
      ctx.strokeStyle = hexRgba(SARI, 0.55);
      ctx.lineWidth = 1.2 / z.s;
      ctx.stroke();
      ctx.clip(); // hücre çizimleri alan dışına taşmasın

      let yamaIci = 0, yamaBittiSay = 0, yamaFazla = 0, yamaOranTop = 0;
      const aralik = Math.max(6, w * 0.012) / z.s;
      const nokta = Math.max(1.2, w * 0.003) / Math.sqrt(z.s);

      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          const mx = x0 + (i + 0.5) * cw, my = y0 + (j + 0.5) * ch;
          if (!icinde(mx, my, path)) continue;
          yamaIci++;
          const key = i + ":" + j;
          let hc = hucreler.get(key);
          if (!hc) { hc = { b: null, e: 0 }; hucreler.set(key, hc); }

          // Ton örneklemesi: hücre merkez pikseli (taze tespitte).
          if (ornekle) {
            const sx = Math.round(pikselX(mx)), sy = Math.round(pikselY(my));
            if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
              const px = ctx.getImageData(sx, sy, 1, 1).data;
              const c2: [number, number, number] = [px[0], px[1], px[2]];
              if (!hc.b) hc.b = c2;
              else {
                const d = (a: number[], b2: number[]) => Math.hypot(a[0] - b2[0], a[1] - b2[1], a[2] - b2[2]);
                const oran = d(c2, hc.b) / Math.max(d(hc.b, hedef), 20);
                hc.e = hc.e * 0.6 + oran * 0.4;
              }
            }
          }

          const tamamHc = hc.e >= TAMAM_ALT && hc.e <= FAZLA_UST;
          const fazlaHc = hc.e > FAZLA_UST;
          yamaOranTop += Math.min(1, hc.e);
          if (tamamHc) { yamaBittiSay++; continue; } // TAMAM → tarama/nokta YOK (temiz)
          if (fazlaHc) yamaFazla++;

          // Eksik/fazla hücre: hafif dolgu + çapraz tarama + pembe nokta.
          const renk: [number, number, number] = fazlaHc
            ? hexRgb(KIRMIZI)
            : karisim(hexRgb(SARI), hexRgb(YESIL), hc.e / TAMAM_ALT);
          ctx.fillStyle = rgba(renk, fazlaHc ? 0.22 : 0.13);
          ctx.fillRect(mx - cw / 2, my - ch / 2, cw, ch);
          ctx.strokeStyle = rgba(renk, 0.4);
          ctx.lineWidth = 1 / z.s;
          ctx.beginPath();
          ctx.moveTo(mx - cw / 2, my + ch / 2);
          ctx.lineTo(mx + cw / 2, my - ch / 2);
          ctx.stroke();
          ctx.fillStyle = fazlaHc ? hexRgba(KIRMIZI, 0.85) : hexRgba(PEMBE, 0.85);
          ctx.beginPath(); ctx.arc(mx, my, nokta * 0.8, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();

      // Sınır tarama noktaları (sık, pembe).
      ctx.fillStyle = PEMBE;
      for (let i = 0; i < path.length; i++) {
        const p1 = path[i], p2 = path[(i + 1) % path.length];
        ctx.beginPath(); ctx.arc(p1[0], p1[1], nokta, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, nokta * 0.8, 0, Math.PI * 2); ctx.fill();
      }

      hucreToplam += yamaIci;
      hucreBitti += yamaBittiSay;
      ilerlemeTop += yamaOranTop;
      if (yamaIci > 0 && yamaFazla / yamaIci > 0.12) fazlaVar = true;

      const yamaTamam = yamaIci > 0 && yamaBittiSay / yamaIci >= 0.9;

      // Kılavuz + araç: yama bitmediyse.
      if (!yamaTamam) {
        for (const [ai, bi, kv] of yama.arrows) {
          const a0 = lms[ai], b0 = lms[bi];
          if (!a0 || !b0) continue;
          if ((b0.z ?? 0) - (a0.z ?? 0) > 0.08) continue;
          const kavisK = kv ?? 0;
          const A: Pt = [a0.x * w, a0.y * h];
          let B: Pt = [b0.x * w, b0.y * h];
          B = [A[0] + (B[0] - A[0]) * 0.75, A[1] + (B[1] - A[1]) * 0.75];
          swooshCiz(ctx, A, B, Math.hypot(B[0] - A[0], B[1] - A[1]) * 3, kavisK);

          const dx = B[0] - A[0], dy = B[1] - A[1];
          const L = Math.hypot(dx, dy);
          let px2 = -dy / L, py2 = dx / L;
          if (py2 > 0) { px2 = -px2; py2 = -py2; }
          const C: Pt = [(A[0] + B[0]) / 2 + px2 * L * kavisK, (A[1] + B[1]) / 2 + py2 * L * kavisK];
          const faz = ((simdi + (ai * 137) % 700) % 2000) / 2000;
          if (faz <= 0.8) {
            const t = faz / 0.8;
            const { p } = kavis(A, C, B, t);
            ctx.save();
            ctx.strokeStyle = hexRgba(col, 0.55);
            ctx.lineCap = "round";
            ctx.lineWidth = Math.max(2.5, w * 0.005);
            ctx.beginPath();
            const izBas = Math.max(0, t - 0.45);
            const ilkP = kavis(A, C, B, izBas).p;
            ctx.moveTo(ilkP[0], ilkP[1]);
            for (let k = 1; k <= 10; k++) {
              const tt = izBas + (t - izBas) * (k / 10);
              const q = kavis(A, C, B, tt).p;
              ctx.lineTo(q[0], q[1]);
            }
            ctx.stroke();
            ctx.restore();
            aracCiz(ctx, tanim.arac, p[0], p[1], Math.max(38, Math.min(85, L * 0.7)));
          }
        }
      } else {
        const cxm = path.reduce((s, p) => s + p[0], 0) / path.length;
        const cym = path.reduce((s, p) => s + p[1], 0) / path.length;
        ctx.save();
        ctx.translate(cxm, cym); ctx.scale(-1, 1);
        ctx.font = `600 ${Math.max(13, w * 0.03) / z.s}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = hexRgba(YESIL, 0.95);
        ctx.fillText("✓", 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();

    if (tonRef.current.kare % 12 === 0 && hucreToplam > 0) {
      setIlerleme(Math.round((ilerlemeTop / hucreToplam) * 100));
      setTamam(hucreBitti / hucreToplam >= 0.9);
      setFazla(fazlaVar);
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
          minFaceDetectionConfidence: 0.1,
          minFacePresenceConfidence: 0.1,
          minTrackingConfidence: 0.1,
        });
      }
      const v = videoRef.current!;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
      v.srcObject = stream;
      await v.play();
      tonRef.current = { region: "", kare: 0, hucreler: {} };
      zoomRef.current = { s: 1, cx: v.videoWidth / 2 || 640, cy: v.videoHeight / 2 || 360 };
      setTamam(false); setFazla(false); setIlerleme(0);
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
            {sekilIpucu && (
              <span style={{ background: "rgba(236,46,122,.92)", color: "#fff", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 600, justifySelf: "start" }}>
                💡 {sekilIpucu}
              </span>
            )}
            {isikAz && (
              <span style={{ background: "rgba(250,204,21,.95)", borderRadius: 999, padding: "5px 12px", fontSize: 12.5, fontWeight: 700, justifySelf: "start" }}>
                💡 Işık yetersiz — makyajı ve ton takibini doğal/parlak ışıkta yap
              </span>
            )}
            {!yuzVar && (
              <span style={{ background: "rgba(250,204,21,.95)", borderRadius: 999, padding: "5px 12px", fontSize: 12.5, fontWeight: 700, justifySelf: "start" }}>
                👤 Yüz aranıyor — kameraya biraz dön
              </span>
            )}
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
                : `Kamerayı aç: "${stepTitle}" adımında doğru tona ulaşan bölgelerin taraması silinir — kalan taralı yerlere sür.`}
            </div>
            {durum !== "yükleniyor" && (
              <button className="gg-btn gg-btn-primary" onClick={baslat}>📷 Kamerayı Aç</button>
            )}
          </div>
        )}
        {durum === "açık" && (
          <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 8 }}>
            <button className="gg-btn gg-btn-ghost" onClick={() => setZoomAcik((x) => !x)} style={{ background: "rgba(255,255,255,.85)" }}>
              🔍 {zoomAcik ? "Uzaklaş" : "Yakınlaş"}
            </button>
            <button className="gg-btn gg-btn-ghost" onClick={durdur} style={{ background: "rgba(255,255,255,.85)" }}>
              ⏹ Kapat
            </button>
          </div>
        )}
      </div>
      {durum === "açık" && (
        <div style={{ display: "grid", gap: 6 }}>
          {/* KAPLAMA PROGRESS BAR: taralı alanın ne kadarı doğru tona ulaştı */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
            <span style={{ fontWeight: 700, color: fazla ? KIRMIZI : tamam ? YESIL : "var(--gg-text)" }}>
              {fazla ? "⚠️ Bazı yerlere fazla sürüldü" : tamam ? "✓ Bölge tamamlandı — sonraki adıma geç" : "Kaplama ilerlemesi"}
            </span>
            <span style={{ color: "var(--gg-muted)" }}>%{ilerleme}</span>
          </div>
          <div style={{ height: 10, background: "var(--gg-border)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{
              width: `${Math.min(100, ilerleme)}%`, height: "100%", transition: "width .4s",
              background: fazla ? KIRMIZI : `linear-gradient(90deg, ${SARI}, ${YESIL})`,
            }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--gg-muted)" }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: colorHex, border: "1px solid var(--gg-border)" }} />
            Taralı = sürülecek · temiz = tamam (tekrar sürme) · kırmızı = fazla. Analiz cihazda.
          </div>
        </div>
      )}
    </div>
  );
}
