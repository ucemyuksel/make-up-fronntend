import * as React from "react";
import { SectionHeader } from "@makeup/ui";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { api, type Reel } from "../lib";
import { ShareButton, SaveButton } from "../etkilesim";

export default async function ReelsPage() {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    redirect("/api/auth/signin?callbackUrl=%2Freels");
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
          <article key={r.id} className="gg-card gg-reel-card">
            {r.videoUrl ? (
              /* poster: ilk karede siyah kutu yerine kapak görseli görünsün */
              <video
                src={r.videoUrl}
                poster={r.thumbnailUrl ?? undefined}
                controls
                loop
                muted
                playsInline
                preload="metadata"
                className="gg-reel-video"
              />
            ) : (
              <div className="gg-reel-video gg-reel-placeholder">🎬</div>
            )}

            <div className="gg-reel-body">
              <p className="gg-reel-caption">{r.caption}</p>

              <div className="gg-reel-actions">
                <form action={likeReel.bind(null, r.id)}>
                  <button type="submit" className="gg-icon-btn" title="Beğen" aria-label="Beğen">
                    <span aria-hidden="true">❤️</span>
                    <span>{r.likeCount}</span>
                  </button>
                </form>
                <span className="gg-icon-btn" title="İzlenme">
                  <span aria-hidden="true">👁</span>
                  <span>{r.viewCount}</span>
                </span>
                <span className="gg-reel-actions-end">
                  <ShareButton baslik={r.caption} />
                  <SaveButton id={r.id} tip="reel" baslik={r.caption} />
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
      {reels.length === 0 && <p style={{ color: "var(--gg-muted)" }}>Reel yok.</p>}
    </div>
  );
}
