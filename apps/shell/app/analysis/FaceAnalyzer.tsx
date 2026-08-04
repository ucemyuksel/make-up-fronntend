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
const SUGGESTED_RECIPE_ID = "019f5000-0000-7000-8000-000000000001";

type Analysis = {
  faceShape: string;
  ratio: number;
  chin: number;
  eyeOpenness: number;
  gulumseme: number;
  simetri: number;
  skinTone: string;
  undertone: "sıcak" | "soğuk" | "nötr";
  rgb: [number, number, number];
  chinRgb: [number, number, number]; // çene hattı tonu — fondöten testi burada yapılır
};

// Yüz şekline göre makyaj önerileri — tarif (recipe) kategorileriyle hizalı.
const ONERILER: Record<string, string[]> = {
  Oval: ["Hafif kontur yeterli — doğal görünümü koru", "Elmacık kemiğine tarçın tonlu allık", "İnce, doğal kaş çizgisi"],
  Round: ["Yanak çukuruna diyagonal kontur", "Allığı elmacık kemiğinin üstüne, yukarı doğru uygula", "Kaşlarda hafif kavis yüzü uzatır"],
  Square: ["Çene hattını yumuşatan kontur", "Krem allıkla yuvarlak geçişler", "Kavisli kaş modeli sertliği kırar"],
  Kalp: ["Alın kenarlarına hafif kontur", "Allığı yanağın ortasına yatay uygula", "Dudak odaklı makyaj dengeler"],
  Uzun: ["Alın üstü ve çene ucuna yatay kontur", "Allığı yatayda geniş uygula", "Düz kaş modeli yüzü kısaltır"],
};

const UNDERTONE_SUGGESTION: Record<Analysis["undertone"], string> = {
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
  const [errorMessage, setErrorMessage] = React.useState("");
  const [camera, setCamera] = React.useState(false);
  const [points, setPoints] = React.useState(true);
  const [confidence, setConfidence] = React.useState(0.5);
  const [fps, setFps] = React.useState(0);
  const [analysis, setAnalysisRaw] = React.useState<Analysis | null>(null);
  // Analiz sonucu rehberli kameranın da kullanması için localStorage'a yazılır
  // (yüz şekline göre kontür/allık yerleşimi).
  const setAnalysis = React.useCallback((a: Analysis | null) => {
    setAnalysisRaw(a);
    if (a) {
      localStorage.setItem("gg-yuz-sekli", a.faceShape);
      localStorage.setItem("gg-alt-ton", a.undertone);
    }
  }, []);
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);

  // Modeli yükle (WASM + .task dosyası CDN'den).
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
        const lm = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          outputFaceBlendshapes: true,
          runningMode: "IMAGE",
          numFaces: 1,
          minFaceDetectionConfidence: confidence,
        });
        if (cancelled) return;
        landmarkerRef.current = lm;
        setStatus("ready");
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
    };
    // guven değişince modeli yeniden kurmuyoruz; setOptions ile güncelliyoruz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    landmarkerRef.current?.setOptions({ minFaceDetectionConfidence: confidence });
  }, [confidence]);

  /** Landmark'lardan türetilmiş metrikler — telefonda birebir aynı formüller kullanılacak. */
  const compute = React.useCallback(
    (lms: NormalizedLandmark[], blend: { categoryName: string; score: number }[], source: HTMLVideoElement | HTMLImageElement): Analysis => {
      const width = uzaklik(lms[234], lms[454]); // kulak-kulak
      const height = uzaklik(lms[10], lms[152]); // alın-çene
      const chin = uzaklik(lms[58], lms[288]); // çene köşeleri
      const ratio = height / width;
      const chinRatio = chin / width;

      let faceShape = "Oval";
      if (ratio > 1.05) faceShape = "Uzun";
      else if (ratio < 0.82) faceShape = "Yuvarlak";
      else if (chinRatio > 0.78) faceShape = "Kare";
      else if (chinRatio < 0.62) faceShape = "Kalp";

      const skor = (ad: string) => blend.find((b) => b.categoryName === ad)?.score ?? 0;
      const eyeOpenness = 1 - (skor("eyeBlinkLeft") + skor("eyeBlinkRight")) / 2;
      const gulumseme = (skor("mouthSmileLeft") + skor("mouthSmileRight")) / 2;

      // Simetri: burun köküne (168) göre sol/sağ elmacık uzaklık farkı.
      const left = uzaklik(lms[168], lms[234]);
      const right = uzaklik(lms[168], lms[454]);
      const simetri = Math.max(0, 1 - Math.abs(left - right) / Math.max(left, right));

      // Ten tonu: yanak landmark'ının (425) piksel rengi.
      const c = document.createElement("canvas");
      const w = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
      const h = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
      c.width = w; c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(source, 0, 0, w, h);
      const px = ctx.getImageData(Math.round(lms[425].x * w), Math.round(lms[425].y * h), 1, 1).data;
      const [r, g, b] = [px[0], px[1], px[2]];
      // Çene hattı tonu: makyözler fondöten testini elde değil ÇENE HATTINDA yapar
      // (yüz+boyun uyumu birlikte görülür).
      const cpx = ctx.getImageData(Math.round(lms[172].x * w), Math.round(lms[172].y * h), 1, 1).data;
      const chinRgb: [number, number, number] = [cpx[0], cpx[1], cpx[2]];
      const brightness = (r + g + b) / 3;
      const skinTone = brightness > 170 ? "Açık" : brightness > 110 ? "Orta" : "Koyu";
      const difference = r - b;
      const undertone: Analysis["undertone"] = difference > 25 ? "sıcak" : difference < 8 ? "soğuk" : "nötr";

      return { faceShape, ratio, chin: chinRatio, eyeOpenness, gulumseme, simetri, skinTone, undertone, rgb: [r, g, b], chinRgb };
    },
    []
  );

  const ciz = React.useCallback(
    (lms: NormalizedLandmark[] | undefined, source: HTMLVideoElement | HTMLImageElement) => {
      const cv = canvasRef.current;
      if (!cv) return;
      const w = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
      const h = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
      cv.width = w; cv.height = h;
      const ctx = cv.getContext("2d")!;
      ctx.drawImage(source, 0, 0, w, h);
      if (lms && points) {
        ctx.fillStyle = "#EC2E7A";
        for (const p of lms) {
          ctx.beginPath();
          ctx.arc(p.x * w, p.y * h, Math.max(1, w / 640), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    [points]
  );

  const stopCamera = React.useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const v = videoRef.current;
    if (v?.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      v.srcObject = null;
    }
    setCamera(false);
    setFps(0);
  }, []);

  const startCamera = React.useCallback(async () => {
    const lm = landmarkerRef.current;
    const v = videoRef.current;
    if (!lm || !v) return;
    setPhotoUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      v.srcObject = stream;
      await v.play();
      if (modeRef.current !== "VIDEO") {
        await lm.setOptions({ runningMode: "VIDEO" });
        modeRef.current = "VIDEO";
      }
      setCamera(true);
      let lastTime = performance.now();
      let lastAnalysisAt = 0;
      const dongu = () => {
        if (!v.srcObject) return;
        const now = performance.now();
        const result = lm.detectForVideo(v, now);
        setFps(Math.round(1000 / Math.max(1, now - lastTime)));
        lastTime = now;
        const lms = result.faceLandmarks[0];
        ciz(lms, v);
        // Metrikleri her karede değil ~2 saniyede bir güncelle (okunabilirlik).
        if (lms && now - lastAnalysisAt > 2000) {
          lastAnalysisAt = now;
          setAnalysis(compute(lms, result.faceBlendshapes?.[0]?.categories ?? [], v));
        }
        rafRef.current = requestAnimationFrame(dongu);
      };
      rafRef.current = requestAnimationFrame(dongu);
    } catch (e) {
      setErrorMessage("Kamera açılamadı: " + (e instanceof Error ? e.message : String(e)));
    }
  }, [ciz, compute]);

  const analyzePhoto = React.useCallback(
    async (file: File) => {
      const lm = landmarkerRef.current;
      const img = imgRef.current;
      if (!lm || !img) return;
      stopCamera();
      const url = URL.createObjectURL(file);
      setPhotoUrl(url);
      await new Promise<void>((cozul) => {
        img.onload = () => cozul();
        img.src = url;
      });
      if (modeRef.current !== "IMAGE") {
        await lm.setOptions({ runningMode: "IMAGE" });
        modeRef.current = "IMAGE";
      }
      const result = lm.detect(img);
      const lms = result.faceLandmarks[0];
      ciz(lms, img);
      setAnalysis(lms ? compute(lms, result.faceBlendshapes?.[0]?.categories ?? [], img) : null);
      if (!lms) setErrorMessage("Fotoğrafta yüz bulunamadı — daha net bir kare deneyin.");
      else setErrorMessage("");
    },
    [ciz, compute, stopCamera]
  );

  const percent = (x: number) => Math.round(x * 100) + "%";

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
            {!camera ? (
              <button className="gg-btn gg-btn-primary" disabled={status !== "ready"} onClick={startCamera}>📷 Kamerayı Başlat</button>
            ) : (
              <button className="gg-btn gg-btn-ghost" onClick={stopCamera}>⏹ Kamerayı Durdur</button>
            )}
            <label className="gg-btn gg-btn-ghost" style={{ cursor: "pointer" }}>
              🖼️ Fotoğraf Yükle
              <input type="file" accept="image/*" style={{ display: "none" }} disabled={status !== "ready"}
                     onChange={(e) => e.target.files?.[0] && analyzePhoto(e.target.files[0])} />
            </label>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" checked={points} onChange={(e) => setPoints(e.target.checked)} /> Noktaları göster
            </label>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13 }}>
              Güven eşiği {confidence.toFixed(2)}
              <input type="range" min={0.1} max={0.9} step={0.05} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} />
            </label>
            {camera && <span className="gg-pill">{fps} fps</span>}
          </div>

          <div style={{ marginTop: 14, position: "relative", background: "var(--gg-surface)", borderRadius: "var(--gg-r-lg)", overflow: "hidden", minHeight: 240 }}>
            <video ref={videoRef} playsInline muted style={{ display: "none" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} alt="" style={{ display: "none" }} src={photoUrl ?? undefined} />
            <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
            {!camera && !photoUrl && (
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
          {analysis ? (
            <div style={{ display: "grid", gap: 8, fontSize: 13.5 }}>
              <Row ad="Yüz şekli" value={analysis.faceShape} />
              <Row ad="Boy/En oranı" value={analysis.ratio.toFixed(2)} />
              <Row ad="Çene/En oranı" value={analysis.chin.toFixed(2)} />
              <Row ad="Simetri" value={percent(analysis.simetri)} />
              <Row ad="Göz açıklığı" value={percent(analysis.eyeOpenness)} />
              <Row ad="Gülümseme" value={percent(analysis.gulumseme)} />
              <Row ad="Ten tonu" value={`${analysis.skinTone} · ${analysis.undertone} alt ton`} />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: `rgb(${analysis.rgb.join(",")})`, border: "1px solid var(--gg-border)" }} />
                <span style={{ color: "var(--gg-muted)", fontSize: 12 }}>yanak</span>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: `rgb(${analysis.chinRgb.join(",")})`, border: "1px solid var(--gg-border)" }} />
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

        {analysis && (
          <Card>
            <SectionHeader title={`${analysis.faceShape} yüz için öneriler`} small />
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, display: "grid", gap: 6 }}>
              {(ONERILER[analysis.faceShape] ?? ONERILER.Oval).map((o) => <li key={o}>{o}</li>)}
              <li>{UNDERTONE_SUGGESTION[analysis.undertone]}</li>
            </ul>
            <a href={`${RECIPES_URL}/${SUGGESTED_RECIPE_ID}`} className="gg-btn gg-btn-primary" style={{ marginTop: 12, width: "100%", justifyContent: "center" }}>
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

function Row({ ad, value }: { ad: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--gg-border)", paddingBottom: 6 }}>
      <span style={{ color: "var(--gg-muted)" }}>{ad}</span>
      <strong>{value}</strong>
    </div>
  );
}
