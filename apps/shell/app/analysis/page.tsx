import type { Metadata } from "next";
import { FaceAnalyzer } from "./FaceAnalyzer";

export const metadata: Metadata = { title: "Yüz Analizi (AI) — GlamGuide" };

// Telefon uygulamasında kullanılacak modelin web kontrol paneli.
// Model: MediaPipe Face Landmarker (478 nokta + blendshape) — aynı model ailesi
// Android/iOS'ta MediaPipe Tasks ile çalışır; burada tarayıcıda (WASM) koşuyor.
export default function AnalysisPage() {
  return <FaceAnalyzer />;
}
