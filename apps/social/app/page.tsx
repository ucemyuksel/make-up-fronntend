import * as React from "react";
import { SectionHeader, ReelCard, Badge } from "@makeup/ui";
import { auth } from "../auth";
import { api, timeAgo, authorName, type Post, type Reel } from "./lib";

const STORIES = ["Sen", "Melisa", "İrem", "Sena", "Duygu", "Gizem", "Makyaj.Sanatı", "GlowQueen"];

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

  return (
    <div style={{ maxWidth: 720, display: "grid", gap: 22 }}>
      {/* Hikâye şeridi */}
      <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 4 }}>
        {STORIES.map((s, i) => (
          <div key={s} style={{ display: "grid", justifyItems: "center", gap: 6, minWidth: 62 }}>
            <span style={{ width: 58, height: 58, borderRadius: "50%", padding: 2, background: i === 0 ? "var(--gg-border)" : "linear-gradient(135deg, var(--gg-primary), var(--gg-coral))" }}>
              <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", background: "var(--gg-primary-light)", border: "2px solid #fff" }} />
            </span>
            <span style={{ fontSize: 11.5, whiteSpace: "nowrap" }}>{s}</span>
          </div>
        ))}
      </div>

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
              <div style={{ display: "flex", gap: 18, color: "var(--gg-muted)", fontSize: 14 }}>
                <span>❤️ {p.likeCount}</span>
                <span>💬 {p.commentCount}</span>
                <span style={{ marginLeft: "auto" }}>🔖</span>
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
            <ReelCard key={r.id} caption={r.caption} meta={`${r.viewCount} izlenme`} />
          ))}
        </div>
      </section>
    </div>
  );
}
