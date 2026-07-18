import * as React from "react";
import { SectionHeader, ReelCard, Badge } from "@makeup/ui";
import { revalidatePath } from "next/cache";
import { auth } from "../auth";
import { api, timeAgo, authorName, type Post, type Reel } from "./lib";
import { StoryBar, ShareButton, SaveButton, DislikeButton, type Hikaye } from "./etkilesim";

const RENKLER = ["#F6C6D8", "#EFB3C8", "#F3D9DE", "#E8B48F", "#E79A9A", "#C56A7A", "#F0C6A0", "#DCA8B9"];

export default async function Feed() {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    return (
      <div style={{ maxWidth: 440, display: "grid", gap: 14 }}>
        <Badge>Sosyal · Keycloak OIDC</Badge>
        <h1 style={{ margin: 0 }}>Haber akışına giriş</h1>
        <a href="/api/auth/signin?callbackUrl=%2F" className="gg-btn gg-btn-primary" style={{ justifySelf: "start" }}>
          Keycloak ile giriş yap
        </a>
      </div>
    );
  }

  const [posts, reels] = await Promise.all([
    api<Post[]>(process.env.POST_API, "/api/posts", token),
    api<Reel[]>(process.env.REELS_API, "/api/reels", token),
  ]);

  // Hikâyeler: son gönderilerden türetilir (ayrı story backend'i yok — dürüst MVP).
  const hikayeler: Hikaye[] = [
    { ad: "Sen", metin: "Hikayeni paylaşmak için gönderi oluştur ✨", renk: "#F3D9DE" },
    ...(posts ?? []).slice(0, 7).map((p, i) => ({
      ad: authorName(i),
      metin: p.text,
      renk: RENKLER[i % RENKLER.length],
    })),
  ];

  async function likePost(id: string) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (t) {
      await fetch(`${process.env.POST_API}/api/posts/${id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      }).catch(() => null);
      revalidatePath("/");
    }
  }

  return (
    <div style={{ maxWidth: 720, display: "grid", gap: 22 }}>
      {/* Hikâye şeridi — tıklanınca tam ekran görüntüleyici (ilerleme çubuklu) */}
      <StoryBar hikayeler={hikayeler} />

      <SectionHeader title="Haber Akışı" />
      <div style={{ display: "grid", gap: 16 }}>
        {(posts ?? []).map((p, i) => (
          <article key={p.id} className="gg-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 14 }}>
              <span style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--gg-primary-light)" }} />
              <div style={{ flex: 1 }}>
                <strong>{authorName(i)}</strong>
                <div style={{ fontSize: 12, color: "var(--gg-muted)" }}>{timeAgo(p.createdAt)}</div>
              </div>
              <span style={{ color: "var(--gg-muted)" }}>⋯</span>
            </div>
            <div style={{ aspectRatio: "16/10", background: "linear-gradient(135deg, var(--gg-primary-soft), var(--gg-coral-soft))", display: "grid", placeItems: "center" }}>
              <span style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(255,255,255,.85)", display: "grid", placeItems: "center" }}>▶️</span>
            </div>
            <div style={{ padding: 14 }}>
              <p style={{ margin: "0 0 10px" }}>{p.text}</p>
              <div style={{ display: "flex", gap: 16, alignItems: "center", color: "var(--gg-muted)", fontSize: 14 }}>
                <form action={likePost.bind(null, p.id)} style={{ display: "inline" }}>
                  <button type="submit" title="Beğen" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--gg-muted)" }}>
                    ❤️ {p.likeCount}
                  </button>
                </form>
                <DislikeButton id={p.id} />
                <span>💬 {p.commentCount}</span>
                <span style={{ marginLeft: "auto", display: "inline-flex", gap: 14, alignItems: "center" }}>
                  <ShareButton baslik={p.text.slice(0, 60)} />
                  <SaveButton id={p.id} tip="post" baslik={p.text.slice(0, 60)} />
                </span>
              </div>
            </div>
          </article>
        ))}
        {(!posts || posts.length === 0) && <p style={{ color: "var(--gg-muted)" }}>Gönderi yok.</p>}
      </div>

      <section>
        <SectionHeader title="Önerilen Reels" href="/reels" />
        <div className="gg-grid cols-5">
          {(reels ?? []).slice(0, 5).map((r) => (
            <a key={r.id} href="/reels">
              <ReelCard caption={r.caption} meta={`${r.viewCount} izlenme`} />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
