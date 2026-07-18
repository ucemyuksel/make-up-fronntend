"use client";

import * as React from "react";
import type { FaceLandmarker as FaceLandmarkerT, NormalizedLandmark } from "@mediapipe/tasks-vision";

/**
 * Adım-adım tarifte canlı ayna (MediaPipe Face Landmarker):
 *  - PROFİL DAYANIKLILIĞI: düşük eşikli takip + kısa kayıplarda son landmark'larla
 *    devam (grace) → yüz yana dönünce çizim anında kaybolmaz.
 *  - AKILLI ZOOM: aktif bölgeye yumuşak yakınlaştırma → sürülecek alan net görünür.
 *  - GERÇEKÇİ ARAÇ: hologram stili parlayan fırça / ruj / sünger vektör çizimi,
 *    kavisli yön kılavuzu (profesyonel mavi swoosh + ok başı) üzerinde süpürür.
 *  - TON TAKİBİ: az uygulandı=SARI → hedefe yaklaştıkça YEŞİL → aşınca KIRMIZI.
 * Analiz tamamen cihazda; telefonda aynı model MediaPipe Tasks ile koşacak.
 */

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const PEMBE = "#EC2E7A";
const SARI = "#FACC15";
const YESIL = "#22C55E";
const KIRMIZI = "#EF4444";
const HOLO = "#38BDF8";        // hologram mavi (kılavuz + araç)
const TAMAM_ALT = 0.85;        // uygulama oranı bandı → "ton tamam"
const FAZLA_UST = 1.3;         // üstü → "fazla sürüldü"
const YUZ_GRACE_MS = 4000;     // yüz kaybolunca son landmark'larla devam süresi

type Yama = {
  pts: number[];
  // [başlangıç, bitiş, kavis?] — kavis 0 (varsayılan) = DÜZ ok; yalnız gerçekten
  // kavisli sürülen tekniklerde (allık/kontür) > 0 verilir.
  arrows: [number, number, number?][];
  alinUzat?: boolean; // üst yarıyı yukarı uzat (alın saç çizgisine kadar dahil olsun)
  hull?: boolean;     // dışbükey zarf al (profilde dışarı taşan burun alana dahil olur)
  serit?: boolean;    // pts açık çizgidir; yukarı ofsetli BANT yapılır (kirpik hattı gibi)
};
type BolgeTanim = { yamalar: Yama[]; firca: string; yon: string; arac: "firca" | "ruj" | "sunger" };

const BOLGELER: Record<string, BolgeTanim> = {
  yuz: {
    yamalar: [
      // Yüz ovali + burun köprüsü/ucu → hull ile profilde burun alana dahil kalır;
      // alinUzat ile alın saç çizgisine kadar taranır.
      // Oklar yanak HİZASINDA (4→205/425) — göz üstünden geçmez; alna dikey (168→10).
      { pts: [10, 338, 297, 332, 284, 454, 366, 361, 397, 152, 172, 132, 137, 234, 54, 103, 67, 109, 1, 4, 5, 19, 94, 197], arrows: [[4, 205], [4, 425], [168, 10]], alinUzat: true, hull: true },
    ],
    firca: "Nemli sünger / fondöten fırçası", yon: "Ortadan dışa doğru", arac: "sunger",
  },
  kontur: {
    yamalar: [
      // Elmacık altı çukuru + çene hattına inen bant (sol/sağ ayrı).
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
    // Maskara GÖZÜN İÇİNE değil KİRPİĞE sürülür: üst kapak çizgisi boyunca
    // yukarı ofsetli ince BANT taranır (göz küresi taranmaz).
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
};

function bolgeleriBul(region: string): BolgeTanim[] {
  const r = region.toLocaleLowerCase("tr").trim();
  const out: BolgeTanim[] = [];
  if (r.includes("kontür") || r.includes("kontur")) out.push(BOLGELER["kontur"]);
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

/** Dışbükey zarf (monotone chain) — profilde burun gibi taşan noktaları alana katar. */
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

/** Kavis üzerindeki nokta ve teğet (quadratic bezier). */
function kavis(a: Pt, c: Pt, b: Pt, t: number): { p: Pt; ang: number } {
  const u = 1 - t;
  const p: Pt = [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
  const dx = 2 * u * (c[0] - a[0]) + 2 * t * (b[0] - c[0]);
  const dy = 2 * u * (c[1] - a[1]) + 2 * t * (b[1] - c[1]);
  return { p, ang: Math.atan2(dy, dx) };
}

/** Yön kılavuzu: uca doğru genişleyen parlayan swoosh + ok başı.
 *  kavisK=0 → DÜZ ok (varsayılan); >0 → o oranda yukarı kavis (allık/kontür). */
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
    const hw = wMax * (0.12 + 0.88 * t);           // uca doğru genişler
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
  // Ok başı: kavisin ucundaki teğet yönünde.
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

/** Hologram stili gerçekçi araç çizimi — ucu (0,0)'da, sap sağ-alta uzanır. */
function aracCiz(ctx: CanvasRenderingContext2D, tip: "firca" | "ruj" | "sunger", x: number, y: number, boy: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.85);                                 // elde tutulmuş eğim (sap sağ-alt)
  ctx.shadowColor = hexRgba(HOLO, 0.95);
  ctx.shadowBlur = boy * 0.22;

  if (tip === "firca") {
    // Kıl başı: yumuşak damla (radial gradient)
    const kg = ctx.createRadialGradient(0, 0, 1, 0, 0, boy * 0.16);
    kg.addColorStop(0, "rgba(224,242,254,.95)");
    kg.addColorStop(1, hexRgba(HOLO, 0.55));
    ctx.fillStyle = kg;
    ctx.beginPath();
    ctx.ellipse(0, 0, boy * 0.09, boy * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    // Bilezik (ferrule)
    ctx.fillStyle = "rgba(186,230,253,.85)";
    ctx.beginPath();
    ctx.roundRect(-boy * 0.045, boy * 0.13, boy * 0.09, boy * 0.1, boy * 0.02);
    ctx.fill();
    // Sap: uca doğru incelen
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
    // Eğik kesim ruj ucu
    const rg = ctx.createLinearGradient(0, 0, 0, boy * 0.3);
    rg.addColorStop(0, "rgba(254,205,211,.95)");
    rg.addColorStop(1, hexRgba(HOLO, 0.6));
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(-boy * 0.05, boy * 0.28);
    ctx.lineTo(-boy * 0.05, boy * 0.06);
    ctx.quadraticCurveTo(-boy * 0.05, -boy * 0.02, boy * 0.02, 0); // eğik uç
    ctx.lineTo(boy * 0.05, boy * 0.1);
    ctx.lineTo(boy * 0.05, boy * 0.28);
    ctx.closePath();
    ctx.fill();
    // Metal bilezik + tüp
    ctx.fillStyle = "rgba(186,230,253,.9)";
    ctx.beginPath(); ctx.roundRect(-boy * 0.06, boy * 0.28, boy * 0.12, boy * 0.08, boy * 0.015); ctx.fill();
    const tg = ctx.createLinearGradient(0, boy * 0.36, 0, boy * 0.95);
    tg.addColorStop(0, hexRgba(HOLO, 0.8));
    tg.addColorStop(1, hexRgba(HOLO, 0.3));
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.roundRect(-boy * 0.065, boy * 0.36, boy * 0.13, boy * 0.6, boy * 0.03); ctx.fill();
  } else {
    // Sünger: yumurta formu
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

export function GuidedCamera({ region, colorHex, stepTitle }: { region: string; colorHex: string; stepTitle: string }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const lmRef = React.useRef<FaceLandmarkerT | null>(null);
  const rafRef = React.useRef<number>(0);
  const cfgRef = React.useRef({ region, colorHex });
  const tonRef = React.useRef<{ region: string; base: ([number, number, number] | null)[]; ema: number[]; kare: number }>({ region: "", base: [], ema: [], kare: 0 });
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
  zoomAcikRef.current = zoomAcik;

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

  const ciz = React.useCallback((tespit: NormalizedLandmark[] | undefined, simdi: number) => {
    const cv = canvasRef.current, v = videoRef.current;
    if (!cv || !v) return;
    const w = v.videoWidth, h = v.videoHeight;
    if (!w || !h) return;

    // Profil dayanıklılığı: tespit varsa kaydet; yoksa grace süresi boyunca sonuncuyu kullan.
    if (tespit) sonYuzRef.current = { lms: tespit, t: simdi };
    const taze = simdi - sonYuzRef.current.t < YUZ_GRACE_MS;
    const lms = tespit ?? (taze ? sonYuzRef.current.lms : null) ?? undefined;

    const { region: reg, colorHex: col } = cfgRef.current;
    const ton = tonRef.current;
    if (ton.region !== reg) tonRef.current = { region: reg, base: [], ema: [], kare: 0 };
    tonRef.current.kare++;
    const hedef = hexRgb(col);

    // Yamaları önceden hesapla (zoom hedefi için) + profil işleme.
    const tumYamalar: { path: Pt[]; yama: Yama; tanim: BolgeTanim }[] = [];
    if (lms) {
      for (const tanim of bolgeleriBul(reg)) {
        const adaylar: { path: Pt[]; yama: Yama; tanim: BolgeTanim; z: number }[] = [];
        for (const yama of tanim.yamalar) {
          const ham = yama.pts.map((i) => lms[i]).filter(Boolean);
          if (ham.length < 3) continue;
          let path: Pt[] = ham.map((p) => [p.x * w, p.y * h]);
          const zOrt = ham.reduce((s, p) => s + (p.z ?? 0), 0) / ham.length;
          if (yama.serit) {
            // Açık çizgiden BANT: çizgi + yukarı ofsetli kopyası (kirpik hattı bandı).
            const L0 = Math.hypot(path[path.length - 1][0] - path[0][0], path[path.length - 1][1] - path[0][1]);
            const d = Math.max(4, L0 * 0.16);
            const ust = path.map(([x, y]) => [x, y - d] as Pt).reverse();
            path = [...path, ...ust];
          } else {
            if (yama.alinUzat) {
              // Üst yarıyı yukarı uzat: alın saç çizgisine kadar taramaya dahil.
              const my = path.reduce((s, p) => s + p[1], 0) / path.length;
              path = path.map(([x, y]) => [x, y < my ? Math.max(0, my - (my - y) * 1.55) : y]);
            }
            if (yama.hull) path = zarf(path); // profilde burun alana dahil, sınır toparlanır
          }
          adaylar.push({ path, yama, tanim, z: zOrt });
        }
        // Yan profilde ARKADA kalan ikiz yama (uzak yanak/göz) gizlenir —
        // görünmeyen tarafta saçma alan/ok çizilmez, ton örneklemesi bozulmaz.
        if (adaylar.length === 2 && Math.abs(adaylar[0].z - adaylar[1].z) > 0.06) {
          adaylar.sort((a, b) => a.z - b.z); // küçük z = kameraya yakın
          adaylar.pop();
        }
        for (const a of adaylar) tumYamalar.push({ path: a.path, yama: a.yama, tanim: a.tanim });
      }
    }

    // AKILLI ZOOM: tüm aktif yamaların bbox'ına yumuşak yakınlaş.
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
    z.s += (hs - z.s) * 0.07;                       // yumuşat (titreme yok)
    z.cx += (hcx - z.cx) * 0.07;
    z.cy += (hcy - z.cy) * 0.07;
    // Zoom penceresi kadraj dışına taşmasın.
    const gw = w / z.s / 2, gh = h / z.s / 2;
    const cx = Math.max(gw, Math.min(w - gw, z.cx));
    const cy = Math.max(gh, Math.min(h - gh, z.cy));

    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d", { willReadFrequently: true })!;
    ctx.save();
    ctx.translate(w, 0); ctx.scale(-1, 1);          // ayna
    ctx.translate(cx, cy); ctx.scale(z.s, z.s); ctx.translate(-cx, -cy); // zoom
    ctx.drawImage(v, 0, 0, w, h);

    if (!lms) {
      ctx.restore();
      if (tonRef.current.kare % 12 === 0) setYuzVar(false);
      return;
    }
    if (tonRef.current.kare % 12 === 0) setYuzVar(true);

    // Video koordinatı → canvas pikseli (ayna + zoom) — ton örneklemesi için.
    const pikselX = (x: number) => w - (cx + (x - cx) * z.s);
    const pikselY = (y: number) => cy + (y - cy) * z.s;

    let yamaNo = 0;
    let toplamIlerleme = 0, yamaSayisi = 0;
    let fazlaVar = false, hepsiTamam = true;

    for (const { path, yama, tanim } of tumYamalar) {
      const idx = yamaNo++;

      // --- TON ÖRNEKLEME (6 karede bir; fazla sürme için sürekli) ---
      // Yalnız TAZE tespitte örnekle: grace sırasında (bayat landmark) yüz kaymış
      // olabilir, yanlış pikselden ölçüm ton takibini bozar.
      const t2 = tonRef.current;
      if (t2.kare % 6 === 0 && tespit) {
        const xs = path.map((p) => p[0]), ys = path.map((p) => p[1]);
        const x0 = Math.max(0, Math.min(...xs)), x1 = Math.min(w, Math.max(...xs));
        const y0 = Math.max(0, Math.min(...ys)), y1 = Math.min(h, Math.max(...ys));
        const adim = Math.max(6, Math.floor((x1 - x0) / 12));
        let r = 0, g = 0, b = 0, sayi = 0;
        for (let y = y0; y < y1; y += adim) {
          for (let x = x0; x < x1; x += adim) {
            if (!icinde(x, y, path)) continue;
            const sx = Math.round(pikselX(x)), sy = Math.round(pikselY(y));
            if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
            const px = ctx.getImageData(sx, sy, 1, 1).data;
            r += px[0]; g += px[1]; b += px[2]; sayi++;
          }
        }
        if (sayi > 3) {
          const ort: [number, number, number] = [r / sayi, g / sayi, b / sayi];
          if (!t2.base[idx]) {
            t2.base[idx] = ort;
            t2.ema[idx] = 0;
          } else {
            const base = t2.base[idx]!;
            const d = (a: number[], c2: number[]) => Math.hypot(a[0] - c2[0], a[1] - c2[1], a[2] - c2[2]);
            const oran = d(ort, base) / Math.max(d(base, hedef), 20);
            t2.ema[idx] = t2.ema[idx] * 0.7 + oran * 0.3;
          }
        }
      }
      const oranE = t2.ema[idx] ?? 0;
      const tamamMi = oranE >= TAMAM_ALT && oranE <= FAZLA_UST;
      const fazlaMi = oranE > FAZLA_UST;
      if (fazlaMi) fazlaVar = true;
      if (!tamamMi && !fazlaMi) hepsiTamam = false;
      toplamIlerleme += Math.min(1, oranE);
      yamaSayisi++;

      const alanC: [number, number, number] = fazlaMi
        ? hexRgb(KIRMIZI)
        : karisim(hexRgb(SARI), hexRgb(YESIL), oranE / TAMAM_ALT);
      const bitti = tamamMi || fazlaMi;

      // --- 1) Hassas sınır + taralı alan ---
      ctx.save();
      puruzsuzYol(ctx, path);
      ctx.fillStyle = rgba(alanC, bitti ? 0.16 : 0.12);
      ctx.fill();
      ctx.strokeStyle = rgba(alanC, 0.6);
      ctx.lineWidth = 1.2 / z.s;
      ctx.stroke();
      ctx.clip();
      ctx.strokeStyle = rgba(alanC, bitti ? 0.5 : 0.38);
      ctx.lineWidth = 1 / z.s;
      const aralik = Math.max(7, w * 0.014) / z.s;
      for (let d0 = -h; d0 < w + h; d0 += aralik) {
        ctx.beginPath(); ctx.moveTo(d0, 0); ctx.lineTo(d0 + h, h); ctx.stroke();
      }
      ctx.restore();

      // --- 2) Tarama noktaları: sınırda SIK (ara noktalarla), içeride seyrek ızgara ---
      const noktaRenk = fazlaMi ? KIRMIZI : tamamMi ? YESIL : PEMBE;
      ctx.fillStyle = noktaRenk;
      const nokta = Math.max(1.2, w * 0.003) / Math.sqrt(z.s);
      for (let i = 0; i < path.length; i++) {
        const p1 = path[i], p2 = path[(i + 1) % path.length];
        ctx.beginPath(); ctx.arc(p1[0], p1[1], nokta, 0, Math.PI * 2); ctx.fill();
        // ara nokta → sınır çizgisi nokta nokta belirgin (yüz-tarama görünümü)
        ctx.beginPath(); ctx.arc((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, nokta * 0.8, 0, Math.PI * 2); ctx.fill();
      }
      // İç ızgara: taralı alanın İÇİ de pembe noktalarla dokulu.
      ctx.fillStyle = fazlaMi ? hexRgba(KIRMIZI, 0.65) : tamamMi ? hexRgba(YESIL, 0.65) : hexRgba(PEMBE, 0.65);
      const gAdim = Math.max(12, w * 0.024);
      const bxs = path.map((p) => p[0]), bys = path.map((p) => p[1]);
      const gx0 = Math.min(...bxs), gx1 = Math.max(...bxs);
      const gy0 = Math.min(...bys), gy1 = Math.max(...bys);
      for (let gy = gy0 + gAdim / 2; gy < gy1; gy += gAdim) {
        for (let gx = gx0 + gAdim / 2; gx < gx1; gx += gAdim) {
          if (!icinde(gx, gy, path)) continue;
          ctx.beginPath(); ctx.arc(gx, gy, nokta * 0.75, 0, Math.PI * 2); ctx.fill();
        }
      }

      // --- 3) Kavisli kılavuz + gerçekçi araç animasyonu ---
      if (!bitti) {
        for (const [ai, bi, kv] of yama.arrows) {
          const a0 = lms[ai], b0 = lms[bi];
          if (!a0 || !b0) continue;
          // Kılavuzun ucu kafanın arkasına dönükse (profil) o oku çizme —
          // yüzü kesen anlamsız oklar oluşmasın.
          if ((b0.z ?? 0) - (a0.z ?? 0) > 0.08) continue;
          const kavisK = kv ?? 0; // 0 = düz ok (teknik düz süredir); >0 = kavisli teknik
          const A: Pt = [a0.x * w, a0.y * h];
          let B: Pt = [b0.x * w, b0.y * h];
          // Ok, hedefe %75 mesafede biter — ucu kulağa/kenara taşmaz.
          B = [A[0] + (B[0] - A[0]) * 0.75, A[1] + (B[1] - A[1]) * 0.75];
          swooshCiz(ctx, A, B, Math.hypot(B[0] - A[0], B[1] - A[1]) * 3, kavisK);

          // Araç, kılavuzla aynı yol üzerinde süpürür (düzse düz).
          const dx = B[0] - A[0], dy = B[1] - A[1];
          const L = Math.hypot(dx, dy);
          let px2 = -dy / L, py2 = dx / L;
          if (py2 > 0) { px2 = -px2; py2 = -py2; }
          const C: Pt = [(A[0] + B[0]) / 2 + px2 * L * kavisK, (A[1] + B[1]) / 2 + py2 * L * kavisK];
          const faz = ((simdi + (ai * 137) % 700) % 2000) / 2000;
          if (faz <= 0.8) {
            const t = faz / 0.8;
            const { p } = kavis(A, C, B, t);
            // Ürün izi: başlangıçtan araca kadar kavis boyunca renkli iz.
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
            // Gerçekçi araç: ucu yol üzerinde; boyu sınırlı (yüzü kapatan dev görsel yok).
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
        ctx.fillStyle = "rgba(255,255,255,.95)";
        ctx.fillText(fazlaMi ? "⚠" : "✓", 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();

    if (tonRef.current.kare % 12 === 0 && yamaSayisi > 0) {
      const pct = Math.round((toplamIlerleme / yamaSayisi) * 100);
      setIlerleme(pct);
      setTamam(hepsiTamam && tonRef.current.base.length > 0);
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
          // Profil dayanıklılığı: eşikler minimum → yan dönüşte takip kolay kopmaz.
          minFaceDetectionConfidence: 0.1,
          minFacePresenceConfidence: 0.1,
          minTrackingConfidence: 0.1,
        });
      }
      const v = videoRef.current!;
      // Yüksek çözünürlük: loş ışıkta ve yan açılarda tespit belirgin iyileşir.
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
      v.srcObject = stream;
      await v.play();
      tonRef.current = { region: "", base: [], ema: [], kare: 0 };
      zoomRef.current = { s: 1, cx: v.videoWidth / 2 || 320, cy: v.videoHeight / 2 || 240 };
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
            <span style={{ background: fazla ? "rgba(239,68,68,.95)" : tamam ? "rgba(34,197,94,.95)" : "rgba(255,255,255,.92)", color: fazla || tamam ? "#fff" : "inherit", borderRadius: 999, padding: "5px 12px", fontSize: 12.5, fontWeight: 700, boxShadow: "0 1px 4px rgba(0,0,0,.15)", justifySelf: "start" }}>
              {fazla ? "⚠️ Fazla sürüldü — bu bölgeye ara ver" : tamam ? "✓ Ton tamam — daha fazla sürme" : `Ton ilerlemesi: %${ilerleme}`}
            </span>
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
                : `Kamerayı aç: "${stepTitle}" adımında bölge yakınlaştırılır, gerçek fırça/ruj görseli sürme yönünü gösterir; renk sarı→yeşil→kırmızı ile yoğunluğu izler.`}
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--gg-muted)" }}>
          <span style={{ width: 14, height: 14, borderRadius: 4, background: colorHex, border: "1px solid var(--gg-border)" }} />
          Sarı=az · Yeşil=tamam · Kırmızı=fazla · mavi kılavuz=sürme yönü. Analiz cihazda, görüntü sunucuya gitmez.
        </div>
      )}
    </div>
  );
}
