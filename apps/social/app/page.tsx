import * as React from "react";
import { SectionHeader, ReelCard, Badge } from "@makeup/ui";
import { revalidatePath } from "next/cache";
import { auth } from "../auth";
import { api, timeAgo, authorName, yazarAdi, img, type Post, type Reel } from "./lib";
import { StoryBar, ShareButton, SaveButton, DislikeButton, type Story } from "./interactions";

/** post-service /api/stories yanıtı. */
type ApiStory = {
  id: string;
  authorUserId: string;
  mediaUrl: string;
  mediaType: string;
  text: string;
  backgroundHex: string | null;
};

const COLORS = ["#F6C6D8", "#EFB3C8", "#F3D9DE", "#E8B48F", "#E79A9A", "#C56A7A", "#F0C6A0", "#DCA8B9"];

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

  const [posts, reels, storiesRaw] = await Promise.all([
    api<Post[]>(process.env.POST_API, "/api/posts", token),
    api<Reel[]>(process.env.REELS_API, "/api/reels", token),
    api<ApiStory[]>(process.env.POST_API, "/api/stories", token),
  ]);

  // Hikâyeler artık gerçek: post-service'teki stories tablosundan gelir ve
  // 24 saat sonra kendiliğinden düşer. İlk halka her zaman "hikaye paylaş".
  const stories: Story[] = [
    { ad: "Hikayen", text: "Hikaye paylaş ✨", color: "#F3D9DE", href: "/story" },
    ...(storiesRaw ?? []).slice(0, 12).map((s, i) => ({
      ad: `Kullanıcı ${s.authorUserId.slice(0, 4).toUpperCase()}`,
      text: s.text,
      color: s.backgroundHex ?? COLORS[i % COLORS.length],
      medyaUrl: s.mediaUrl,
      medyaTuru: s.mediaType,
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
      <StoryBar stories={stories} />

      <SectionHeader title="Haber Akışı" />
      <div style={{ display: "grid", gap: 16 }}>
        {(posts ?? []).map((p, i) => (
          <article key={p.id} className="gg-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 14 }}>
              <span style={{ width: 38, height: 38, borderRadius: "50%", background: p.authorAvatarColorHex ?? "var(--gg-primary-light)" }} />
              <div style={{ flex: 1 }}>
                <strong>{yazarAdi(p, i)}</strong>
                <div style={{ fontSize: 12, color: "var(--gg-muted)" }}>{timeAgo(p.createdAt)}</div>
              </div>
              <span style={{ color: "var(--gg-muted)" }}>⋯</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(p.id)} alt="" style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover", display: "block" }} />
            <div style={{ padding: 14 }}>
              <p style={{ margin: "0 0 10px" }}>{p.text}</p>
              <div style={{ display: "flex", gap: 16, alignItems: "center", color: "var(--gg-muted)", fontSize: 14 }}>
                <form action={likePost.bind(null, p.id)} style={{ display: "inline" }}>
                  <button type="submit" title="Beğen" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--gg-muted)" }}>
                    ❤️ {p.likeCount}
                  </button>
                </form>
                <DislikeButton id={p.id} />
                {/* Yorumlar detay sayfasında (iş parçacıklı cevaplarla). */}
                <a href={`/post/${p.id}`} style={{ color: "var(--gg-muted)", textDecoration: "none" }}>
                  💬 {p.commentCount}
                </a>
                <span style={{ marginLeft: "auto", display: "inline-flex", gap: 14, alignItems: "center" }}>
                  <ShareButton title={p.text.slice(0, 60)} />
                  <SaveButton id={p.id} tip="post" title={p.text.slice(0, 60)} />
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
              <ReelCard caption={r.caption} meta={`${r.viewCount} izlenme`} image={img(r.id + "r")} />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
