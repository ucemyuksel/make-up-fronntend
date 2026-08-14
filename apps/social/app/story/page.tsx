import * as React from "react";
import { Badge, MediaUpload } from "@makeup/ui";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../auth";

export const metadata = { title: "Hikaye Paylaş — GlamGuide" };

type Story = {
  id: string;
  mediaUrl: string;
  mediaType: string;
  text: string;
  viewCount: number;
  remainingHours: number;
};

/** Hikaye paylaşma + kendi aktif hikayelerim. Hikaye 24 saat sonra düşer. */
export default async function StoryComposer({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string };
}) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    redirect("/login?callbackUrl=%2Fhikaye");
  }

  let benimkiler: Story[] = [];
  try {
    const res = await fetch(`${process.env.POST_API}/api/stories/mine`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) benimkiler = (await res.json()) as Story[];
  } catch { /* servis kapalıysa sayfa yine açılsın */ }

  async function share(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;

    const mediaUrl = String(formData.get("mediaUrl") ?? "").trim();
    let res: Response | null = null;
    try {
      res = await fetch(`${process.env.POST_API}/api/stories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaUrl,
          mediaType: String(formData.get("mediaType") ?? "IMAGE"),
          text: String(formData.get("text") ?? "").trim(),
        }),
        cache: "no-store",
      });
    } catch {
      res = null;
    }
    revalidatePath("/story");
    revalidatePath("/");
    // redirect() try/catch dışında — NEXT_REDIRECT yutulmasın.
    if (!res || !res.ok) {
      redirect(`/story?error=${encodeURIComponent(res ? `HTTP ${res.status}` : "Sunucuya ulaşılamadı")}`);
    }
    redirect("/story?ok=1");
  }

  return (
    <div style={{ maxWidth: 560, display: "grid", gap: 16 }}>
      <a href="/" className="gg-see-all">‹ Akışa dön</a>
      <div>
        <Badge>Hikaye</Badge>
        <h1 style={{ margin: "8px 0 0" }}>Hikaye Paylaş</h1>
        <p style={{ color: "var(--gg-muted)", margin: "6px 0 0", fontSize: 13.5 }}>
          Hikayen <strong>24 saat</strong> boyunca akışta kalır, sonra kendiliğinden düşer.
        </p>
      </div>

      {searchParams.ok ? (
        <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>
          ✓ Hikayen paylaşıldı.
        </div>
      ) : null}
      {searchParams.error ? (
        <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
          Paylaşılamadı: {searchParams.error}
        </div>
      ) : null}

      <form action={share} className="gg-card" style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          Görsel / video
          <input id="story-medya" name="mediaUrl" required className="gg-search"
                 placeholder="https://... (yükleyince otomatik dolar)" />
        </label>
        <MediaUpload targetId="story-medya" label="📤 Hikaye görseli yükle" accept="image/*,video/*" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Medya türü
            <select name="mediaType" className="gg-search">
              <option value="IMAGE">Görsel</option>
              <option value="VIDEO">Video</option>
            </select>
          </label>
        </div>

        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          Metin (opsiyonel)
          <input name="text" maxLength={300} className="gg-search" placeholder="Bugünün makyajı 💄" />
        </label>

        <button className="gg-btn gg-btn-primary" type="submit" style={{ justifySelf: "start" }}>
          Hikayeyi Paylaş
        </button>
      </form>

      <section>
        <h2 style={{ fontSize: 16, margin: "4px 0 10px" }}>Aktif myStories ({benimkiler.length})</h2>
        {benimkiler.length === 0 ? (
          <p style={{ color: "var(--gg-muted)", fontSize: 13.5, margin: 0 }}>
            Şu an yayında hikayen yok.
          </p>
        ) : (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {benimkiler.map((s) => (
              <div key={s.id} style={{ width: 120 }}>
                {s.mediaType === "VIDEO" ? (
                  <video src={s.mediaUrl} muted playsInline preload="metadata"
                         style={{ width: "100%", aspectRatio: "9/16", objectFit: "cover", borderRadius: 10, background: "#111" }} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.mediaUrl} alt={s.text || "Hikaye"}
                       style={{ width: "100%", aspectRatio: "9/16", objectFit: "cover", borderRadius: 10, background: "#eee" }} />
                )}
                <div style={{ fontSize: 11.5, color: "var(--gg-muted)", marginTop: 4 }}>
                  👁 {s.viewCount} · {s.remainingHours}sa kaldı
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
