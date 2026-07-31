"use client";

import * as React from "react";
import { Badge, Card, SectionHeader } from "@makeup/ui";
import type { FaceLandmarker as FaceLandmarkerT, NormalizedLandmark } from "@mediapipe/tasks-vision";

/** MediaPipe Face Landmarker'ın web kontrol paneli.
 *  Telefonda aynı model MediaPipe Tasks (Android/iOS) ile koşacak; bütün
 *  eşikler ve türetilmiş metrikler burada web üzerinden denenip ayarlanır. */

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// recipes zone ayrı origin (yerelde 3001) — shell'den relative /recipes 404 olur.
const RECIPES_URL = process.env.NEXT_PUBLIC_RECIPES_URL || "http://localhost:3001";
// ŞİMDİLİK: yüz analizine göre tarif eşleştirme henüz yok; buton doğrudan
// ücretsiz "Doğal Günlük Makyaj" tarifinin adım-adım sayfasına gider (V4 seed id).
const ONERILEN_TARIF_ID = "019f5000-0000-7000-8000-000000000001";

type Analiz = {
  yuzSekli: string;
  oran: number;
  cene: number;
  gozAcikligi: number;
  gulumseme: number;
  simetri: number;
  tenTonu: string;
  altTon: "sıcak" | "soğuk" | "nötr";
  rgb: [number, number, number];
  ceneRgb: [number, number, number]; // çene hattı tonu — fondöten testi burada yapılır
};

// Yüz şekline göre makyaj önerileri — tarif (recipe) kategorileriyle hizalı.
const ONERILER: Record<string, string[]> = {
  Oval: ["Hafif kontur yeterli — doğal görünümü koru", "Elmacık kemiğine tarçın tonlu allık", "İnce, doğal kaş çizgisi"],
  Yuvarlak: ["Yanak çukuruna diyagonal kontur", "Allığı elmacık kemiğinin üstüne, yukarı doğru uygula", "Kaşlarda hafif kavis yüzü uzatır"],
  Kare: ["Çene hattını yumuşatan kontur", "Krem allıkla yuvarlak geçişler", "Kavisli kaş modeli sertliği kırar"],
  Kalp: ["Alın kenarlarına hafif kontur", "Allığı yanağın ortasına yatay uygula", "Dudak odaklı makyaj dengeler"],
  Uzun: ["Alın üstü ve çene ucuna yatay kontur", "Allığı yatayda geniş uygula", "Düz kaş modeli yüzü kısaltır"],
};

const ALT_TON_ONERI: Record<Analiz["altTon"], string> = {
  sıcak: "Sarı/altın alt tonlu fondöten; şeftali-mercan ruj ve bronz far uyumlu.",
  soğuk: "Pembe alt tonlu fondöten; vişne-fuşya ruj ve gümüş/gri far uyumlu.",
  nötr: "Nötr fondöten esnektir; hem sıcak hem soğuk paletler kullanılabilir.",
};

function uzaklik(a: NormalizedLandmark, b: NormalizedLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function FaceAnalyzer() {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const landmarkerRef = React.useRef<FaceLandmarkerT | null>(null);
  const rafRef = React.useRef<number>(0);
  const modeRef = React.useRef<"IMAGE" | "VIDEO">("IMAGE");

  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setHataMesaji] = React.useState("");
  const [kamera, setKamera] = React.useState(false);
  const [noktalar, setNoktalar] = React.useState(true);
  const [guven, setGuven] = React.useState(0.5);
  const [fps, setFps] = React.useState(0);
  const [analiz, setAnalizHam] = React.useState<Analiz | null>(null);
  // Analiz sonucu rehberli kameranın da kullanması için localStorage'a yazılır
  // (yüz şekline göre kontür/allık yerleşimi).
  const setAnaliz = React.useCallback((a: Analiz | null) => {
    setAnalizHam(a);
    if (a) {
      localStorage.setItem("gg-yuz-sekli", a.yuzSekli);
      localStorage.setItem("gg-alt-ton", a.altTon);
    }
  }, []);
  const [fotoUrl, setFotoUrl] = React.useState<string | null>(null);

  // Modeli yükle (WASM + .task dosyası CDN'den).
  React.useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
        const lm = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          outputFaceBlendshapes: true,
          runningMode: "IMAGE",
          numFaces: 1,
          minFaceDetectionConfidence: guven,
        });
        if (iptal) return;
        landmarkerRef.current = lm;
        setStatus("ready");
      } catch (e) {
        if (!iptal) {
          setStatus("error");
          setHataMesaji(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      iptal = true;
      cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
    };
    // guven değişince modeli yeniden kurmuyoruz; setOptions ile güncelliyoruz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    landmarkerRef.current?.setOptions({ minFaceDetectionConfidence: guven });
  }, [guven]);

  /** Landmark'lardan türetilmiş metrikler — telefonda birebir aynı formüller kullanılacak. */
  const hesapla = React.useCallback(
    (lms: NormalizedLandmark[], blend: { categoryName: string; score: number }[], kaynak: HTMLVideoElement | HTMLImageElement): Analiz => {
      const width = uzaklik(lms[234], lms[454]); // kulak-kulak
      const height = uzaklik(lms[10], lms[152]); // alın-çene
      const cene = uzaklik(lms[58], lms[288]); // çene köşeleri
      const oran = height / width;
      const ceneOrani = cene / width;

      let yuzSekli = "Oval";
      if (oran > 1.05) yuzSekli = "Uzun";
      else if (oran < 0.82) yuzSekli = "Yuvarlak";
      else if (ceneOrani > 0.78) yuzSekli = "Kare";
      else if (ceneOrani < 0.62) yuzSekli = "Kalp";

      const skor = (ad: string) => blend.find((b) => b.categoryName === ad)?.score ?? 0;
      const gozAcikligi = 1 - (skor("eyeBlinkLeft") + skor("eyeBlinkRight")) / 2;
      const gulumseme = (skor("mouthSmileLeft") + skor("mouthSmileRight")) / 2;

      // Simetri: burun köküne (168) göre sol/sağ elmacık uzaklık farkı.
      const sol = uzaklik(lms[168], lms[234]);
      const sag = uzaklik(lms[168], lms[454]);
      const simetri = Math.max(0, 1 - Math.abs(sol - sag) / Math.max(sol, sag));

      // Ten tonu: yanak landmark'ının (425) piksel rengi.
      const c = document.createElement("canvas");
      const w = kaynak instanceof HTMLVideoElement ? kaynak.videoWidth : kaynak.naturalWidth;
      const h = kaynak instanceof HTMLVideoElement ? kaynak.videoHeight : kaynak.naturalHeight;
      c.width = w; c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(kaynak, 0, 0, w, h);
      const px = ctx.getImageData(Math.round(lms[425].x * w), Math.round(lms[425].y * h), 1, 1).data;
      const [r, g, b] = [px[0], px[1], px[2]];
      // Çene hattı tonu: makyözler fondöten testini elde değil ÇENE HATTINDA yapar
      // (yüz+boyun uyumu birlikte görülür).
      const cpx = ctx.getImageData(Math.round(lms[172].x * w), Math.round(lms[172].y * h), 1, 1).data;
      const ceneRgb: [number, number, number] = [cpx[0], cpx[1], cpx[2]];
      const parlaklik = (r + g + b) / 3;
      const tenTonu = parlaklik > 170 ? "Açık" : parlaklik > 110 ? "Orta" : "Koyu";
      const fark = r - b;
      const altTon: Analiz["altTon"] = fark > 25 ? "sıcak" : fark < 8 ? "soğuk" : "nötr";

      return { yuzSekli, oran, cene: ceneOrani, gozAcikligi, gulumseme, simetri, tenTonu, altTon, rgb: [r, g, b], ceneRgb };
    },
    []
  );

  const ciz = React.useCallback(
    (lms: NormalizedLandmark[] | undefined, kaynak: HTMLVideoElement | HTMLImageElement) => {
      const cv = canvasRef.current;
      if (!cv) return;
      const w = kaynak instanceof HTMLVideoElement ? kaynak.videoWidth : kaynak.naturalWidth;
      const h = kaynak instanceof HTMLVideoElement ? kaynak.videoHeight : kaynak.naturalHeight;
      cv.width = w; cv.height = h;
      const ctx = cv.getContext("2d")!;
      ctx.drawImage(kaynak, 0, 0, w, h);
      if (lms && noktalar) {
        ctx.fillStyle = "#EC2E7A";
        for (const p of lms) {
          ctx.beginPath();
          ctx.arc(p.x * w, p.y * h, Math.max(1, w / 640), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    [noktalar]
  );

  const kameraDur = React.useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const v = videoRef.current;
    if (v?.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      v.srcObject = null;
    }
    setKamera(false);
    setFps(0);
  }, []);

  const startCamera = React.useCallback(async () => {
    const lm = landmarkerRef.current;
    const v = videoRef.current;
    if (!lm || !v) return;
    setFotoUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      v.srcObject = stream;
      await v.play();
      if (modeRef.current !== "VIDEO") {
        await lm.setOptions({ runningMode: "VIDEO" });
        modeRef.current = "VIDEO";
      }
      setKamera(true);
      let sonZaman = performance.now();
      let sonAnaliz = 0;
      const dongu = () => {
        if (!v.srcObject) return;
        const simdi = performance.now();
        const sonuc = lm.detectForVideo(v, simdi);
        setFps(Math.round(1000 / Math.max(1, simdi - sonZaman)));
        sonZaman = simdi;
        const lms = sonuc.faceLandmarks[0];
        ciz(lms, v);
        // Metrikleri her karede değil ~2 saniyede bir güncelle (okunabilirlik).
        if (lms && simdi - sonAnaliz > 2000) {
          sonAnaliz = simdi;
          setAnaliz(hesapla(lms, sonuc.faceBlendshapes?.[0]?.categories ?? [], v));
        }
        rafRef.current = requestAnimationFrame(dongu);
      };
      rafRef.current = requestAnimationFrame(dongu);
    } catch (e) {
      setHataMesaji("Kamera açılamadı: " + (e instanceof Error ? e.message : String(e)));
    }
  }, [ciz, hesapla]);

  const fotoAnalizEt = React.useCallback(
    async (file: File) => {
      const lm = landmarkerRef.current;
      const img = imgRef.current;
      if (!lm || !img) return;
      kameraDur();
      const url = URL.createObjectURL(file);
      setFotoUrl(url);
      await new Promise<void>((cozul) => {
        img.onload = () => cozul();
        img.src = url;
      });
      if (modeRef.current !== "IMAGE") {
        await lm.setOptions({ runningMode: "IMAGE" });
        modeRef.current = "IMAGE";
      }
      const sonuc = lm.detect(img);
      const lms = sonuc.faceLandmarks[0];
      ciz(lms, img);
      setAnaliz(lms ? hesapla(lms, sonuc.faceBlendshapes?.[0]?.categories ?? [], img) : null);
      if (!lms) setHataMesaji("Fotoğrafta yüz bulunamadı — daha net bir kare deneyin.");
      else setHataMesaji("");
    },
    [ciz, hesapla, kameraDur]
  );

  const yuzde = (x: number) => Math.round(x * 100) + "%";

  return (
    <div className="gg-dash">
      <div style={{ display: "grid", gap: 24, minWidth: 0 }}>
        <section>
          <Badge>{status === "ready" ? "MODEL HAZIR · MediaPipe Face Landmarker" : status === "loading" ? "MODEL YÜKLENİYOR…" : "MODEL HATASI"}</Badge>
          <h1 style={{ fontSize: "clamp(24px, 3.5vw, 34px)", margin: "12px 0 6px" }}>Yüz Analizi (AI)</h1>
          <p style={{ color: "var(--gg-muted)", margin: 0 }}>
            Telefon uygulamasında koşacak modelin kontrol paneli: 478 nokta + blendshape, tarayıcıda (WASM) çalışır.
          </p>
          {status === "error" && <p style={{ color: "#c0392b" }}>Model yüklenemedi: {errorMessage}</p>}
        </section>

        <Card>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {!kamera ? (
              <button className="gg-btn gg-btn-primary" disabled={status !== "ready"} onClick={startCamera}>📷 Kamerayı Başlat</button>
            ) : (
              <button className="gg-btn gg-btn-ghost" onClick={kameraDur}>⏹ Kamerayı Durdur</button>
            )}
            <label className="gg-btn gg-btn-ghost" style={{ cursor: "pointer" }}>
              🖼️ Fotoğraf Yükle
              <input type="file" accept="image/*" style={{ display: "none" }} disabled={status !== "ready"}
                     onChange={(e) => e.target.files?.[0] && fotoAnalizEt(e.target.files[0])} />
            </label>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" checked={noktalar} onChange={(e) => setNoktalar(e.target.checked)} /> Noktaları göster
            </label>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13 }}>
              Güven eşiği {guven.toFixed(2)}
              <input type="range" min={0.1} max={0.9} step={0.05} value={guven} onChange={(e) => setGuven(Number(e.target.value))} />
            </label>
            {kamera && <span className="gg-pill">{fps} fps</span>}
          </div>

          <div style={{ marginTop: 14, position: "relative", background: "var(--gg-surface)", borderRadius: "var(--gg-r-lg)", overflow: "hidden", minHeight: 240 }}>
            <video ref={videoRef} playsInline muted style={{ display: "none" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} alt="" style={{ display: "none" }} src={fotoUrl ?? undefined} />
            <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
            {!kamera && !fotoUrl && (
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--gg-muted)", fontSize: 14, textAlign: "center", padding: 20 }}>
                Kamerayı başlat ya da bir fotoğraf yükle — analiz tamamen cihazda yapılır, görüntü sunucuya gönderilmez.
              </div>
            )}
          </div>
        </Card>
      </div>

      <aside className="gg-rail">
        <Card>
          <SectionHeader title="Analiz Sonucu" small />
          {analiz ? (
            <div style={{ display: "grid", gap: 8, fontSize: 13.5 }}>
              <Satir ad="Yüz şekli" deger={analiz.yuzSekli} />
              <Satir ad="Boy/En oranı" deger={analiz.oran.toFixed(2)} />
              <Satir ad="Çene/En oranı" deger={analiz.cene.toFixed(2)} />
              <Satir ad="Simetri" deger={yuzde(analiz.simetri)} />
              <Satir ad="Göz açıklığı" deger={yuzde(analiz.gozAcikligi)} />
              <Satir ad="Gülümseme" deger={yuzde(analiz.gulumseme)} />
              <Satir ad="Ten tonu" deger={`${analiz.tenTonu} · ${analiz.altTon} alt ton`} />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: `rgb(${analiz.rgb.join(",")})`, border: "1px solid var(--gg-border)" }} />
                <span style={{ color: "var(--gg-muted)", fontSize: 12 }}>yanak</span>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: `rgb(${analiz.ceneRgb.join(",")})`, border: "1px solid var(--gg-border)" }} />
                <span style={{ color: "var(--gg-muted)", fontSize: 12 }}>çene hattı</span>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--gg-muted)", lineHeight: 1.5 }}>
                💡 Fondöten tonunu <strong>çene hattında</strong>, doğal ışıkta test et (yüz+boyun uyumu).
                Bilek damarların yeşilse sıcak, mavi/morsa soğuk alt tonlusun.
              </p>
            </div>
          ) : (
            <p style={{ color: "var(--gg-muted)", fontSize: 13 }}>Henüz analiz yok.</p>
          )}
        </Card>

        {analiz && (
          <Card>
            <SectionHeader title={`${analiz.yuzSekli} yüz için öneriler`} small />
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, display: "grid", gap: 6 }}>
              {(ONERILER[analiz.yuzSekli] ?? ONERILER.Oval).map((o) => <li key={o}>{o}</li>)}
              <li>{ALT_TON_ONERI[analiz.altTon]}</li>
            </ul>
            <a href={`${RECIPES_URL}/${ONERILEN_TARIF_ID}`} className="gg-btn gg-btn-primary" style={{ marginTop: 12, width: "100%", justifyContent: "center" }}>
              💄 Uygun Adım Adım Tarife Git
            </a>
          </Card>
        )}

        <Card>
          <SectionHeader title="Model bilgisi" small />
          <div style={{ fontSize: 12.5, color: "var(--gg-muted)", display: "grid", gap: 4 }}>
            <span>Model: face_landmarker (float16)</span>
            <span>Çalışma: WASM/GPU, cihaz üzerinde</span>
            <span>Telefonda: MediaPipe Tasks (Android/iOS) — aynı model, aynı eşikler</span>
          </div>
        </Card>
      </aside>
    </div>
  );
}

function Satir({ ad, deger }: { ad: string; deger: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--gg-border)", paddingBottom: 6 }}>
      <span style={{ color: "var(--gg-muted)" }}>{ad}</span>
      <strong>{deger}</strong>
    </div>
  );
}
