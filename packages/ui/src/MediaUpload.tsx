"use client";
import * as React from "react";

/**
 * MinIO'ya doğrudan yükleme (presigned PUT). Başarıda hedef input'u ({@code targetId})
 * public URL ile doldurur → aynı alan hem elle URL hem yükleme kabul eder.
 * Backend byte taşımaz (ölçeklenir); prod'da public URL CDN kökünü kullanır.
 */
export function MediaUpload({ targetId, label = "Görsel yükle", accept = "image/*" }: {
  targetId: string; label?: string; accept?: string;
}) {
  const [durum, setDurum] = React.useState<"" | "yukleniyor" | "ok" | "hata">("");
  const [onizleme, setOnizleme] = React.useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setDurum("yukleniyor");
    try {
      const ext = (f.name.split(".").pop() || "").slice(0, 5);
      const pres = await fetch(`/api/media/presign?ext=${encodeURIComponent(ext)}`, { method: "POST" });
      if (!pres.ok) throw new Error("presign");
      const { uploadUrl, publicUrl } = await pres.json();
      const put = await fetch(uploadUrl, {
        method: "PUT",
        body: f,
        headers: { "Content-Type": f.type || "application/octet-stream" },
      });
      if (!put.ok) throw new Error("upload");
      const el = document.getElementById(targetId) as HTMLInputElement | null;
      if (el) el.value = publicUrl;
      setOnizleme(publicUrl);
      setDurum("ok");
    } catch {
      setDurum("hata");
    }
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontSize: 12.5, display: "grid", gap: 4, color: "var(--gg-muted)" }}>
        {label}
        <input type="file" accept={accept} onChange={onFile} className="gg-search" />
      </label>
      {durum === "yukleniyor" ? <span style={{ fontSize: 12, color: "var(--gg-muted)" }}>Yükleniyor…</span> : null}
      {durum === "ok" ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "var(--gg-primary)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={onizleme} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8 }} />
          Yüklendi ✓
        </div>
      ) : null}
      {durum === "hata" ? <span style={{ fontSize: 12, color: "#B42318" }}>Yükleme başarısız — URL'yi elle girebilirsiniz.</span> : null}
    </div>
  );
}
