import * as React from "react";
import { SectionHeader } from "@makeup/ui";
import { revalidatePath } from "next/cache";
import { auth } from "../../auth";
import { api, type Reel } from "../lib";
import { ShareButton, SaveButton } from "../etkilesim";

export default async function ReelsPage() {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    return <a href="/api/auth/signin?callbackUrl=%2Freels" className="gg-btn gg-btn-primary">Giriş yap</a>;
  }
  const reels = (await api<Reel[]>(process.env.REELS_API, "/api/reels", token)) ?? [];

  async function likeReel(id: string) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (t) {
      await fetch(`${process.env.REELS_API}/api/reels/${id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      }).catch(() => null);
      revalidatePath("/reels");
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <SectionHeader title={`Reels (${reels.length})`} />
      <div className="gg-grid cols-3">
        {reels.map((r) => (
          <div key={r.id} className="gg-card" style={{ padding: 0, overflow: "hidden" }}>
            {r.videoUrl ? (
              <video
                src={r.videoUrl}
                controls
                loop
                muted
                playsInline
                preload="metadata"
                style={{ width: "100%", aspectRatio: "9/12", objectFit: "cover", display: "block", background: "#000" }}
              />
            ) : (
              <div style={{ aspectRatio: "9/12", background: "linear-gradient(160deg, var(--gg-primary-soft), var(--gg-coral-soft))", display: "grid", placeItems: "center", fontSize: 30 }}>🎬</div>
            )}
            <div style={{ padding: 12 }}>
              <p style={{ margin: "0 0 8px", fontSize: 13.5, fontWeight: 600 }}>{r.caption}</p>
              <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 13, color: "var(--gg-muted)" }}>
                <form action={likeReel.bind(null, r.id)} style={{ display: "inline" }}>
                  <button type="submit" title="Beğen" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--gg-muted)" }}>
                    ❤️ {r.likeCount}
                  </button>
                </form>
                <span>👁 {r.viewCount}</span>
                <span style={{ marginLeft: "auto", display: "inline-flex", gap: 12, alignItems: "center" }}>
                  <ShareButton baslik={r.caption} />
                  <SaveButton id={r.id} tip="reel" baslik={r.caption} />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {reels.length === 0 && <p style={{ color: "var(--gg-muted)" }}>Reel yok.</p>}
    </div>
  );
}
