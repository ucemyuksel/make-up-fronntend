"use client";
import * as React from "react";

/** Yükleniyor ekranı (RSC loading.tsx için) — erişilebilir spinner. */
export function LoadingScreen({ label = "Yükleniyor…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" style={{ display: "grid", placeItems: "center", padding: "64px 16px", gap: 14 }}>
      <span className="gg-spinner" aria-hidden="true" />
      <span style={{ color: "var(--gg-muted)", fontSize: 14 }}>{label}</span>
    </div>
  );
}

/** 404 ekranı (not-found.tsx için). */
export function NotFoundScreen({ homeHref = "/" }: { homeHref?: string }) {
  return (
    <div style={{ display: "grid", placeItems: "center", padding: "64px 16px", gap: 12, textAlign: "center" }}>
      <div style={{ fontSize: 54 }}>🔎</div>
      <h1 style={{ margin: 0, fontSize: 22 }}>Sayfa bulunamadı</h1>
      <p style={{ color: "var(--gg-muted)", margin: 0 }}>Aradığın sayfa taşınmış veya hiç var olmamış olabilir.</p>
      <a href={homeHref} className="gg-btn gg-btn-primary" style={{ marginTop: 6 }}>Ana sayfaya dön</a>
    </div>
  );
}

/** Hata sınırı ekranı (error.tsx için) — reset ile tekrar dener. */
export function ErrorScreen({ reset, message = "Bir şeyler ters gitti." }: { reset?: () => void; message?: string }) {
  return (
    <div role="alert" style={{ display: "grid", placeItems: "center", padding: "64px 16px", gap: 12, textAlign: "center" }}>
      <div style={{ fontSize: 54 }}>⚠️</div>
      <h1 style={{ margin: 0, fontSize: 22 }}>{message}</h1>
      <p style={{ color: "var(--gg-muted)", margin: 0 }}>Lütfen tekrar deneyin; sorun sürerse birazdan tekrar bakın.</p>
      {reset ? (
        <button onClick={reset} className="gg-btn gg-btn-primary" style={{ marginTop: 6 }}>Tekrar dene</button>
      ) : null}
    </div>
  );
}
