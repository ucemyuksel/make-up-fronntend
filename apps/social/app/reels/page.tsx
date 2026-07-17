import * as React from "react";
import { SectionHeader, ReelCard } from "@makeup/ui";
import { auth } from "../../auth";
import { api, type Reel } from "../lib";

export default async function ReelsPage() {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    return <a href="/api/auth/signin?callbackUrl=%2Freels" className="gg-btn gg-btn-primary">Giriş yap</a>;
  }
  const reels = (await api<Reel[]>(process.env.REELS_API, "/api/reels", token)) ?? [];

  return (
    <div>
      <SectionHeader title={`Reels (${reels.length})`} />
      <div className="gg-grid cols-5">
        {reels.map((r) => (
          <ReelCard key={r.id} caption={r.caption} meta={`❤ ${r.likeCount} · ${r.viewCount} izlenme`} />
        ))}
      </div>
      {reels.length === 0 && <p style={{ color: "var(--gg-muted)" }}>Reel yok.</p>}
    </div>
  );
}
