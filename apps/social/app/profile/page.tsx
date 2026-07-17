import * as React from "react";
import { Stat } from "@makeup/ui";
import { auth } from "../../auth";
import { api, type Post } from "../lib";

const HILITE = [["🎨", "Makyaj"], ["🧴", "Cilt Bakımı"], ["🤍", "Favoriler"], ["❓", "Q&A"], ["👤", "Ben"]];
const TABS = ["Gönderiler", "Reels", "Kaydedilenler"];

export default async function Profile() {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  const email = session?.user?.email;
  if (!token) {
    return <a href="/api/auth/signin?callbackUrl=%2Fprofile" className="gg-btn gg-btn-primary">Giriş yap</a>;
  }
  const posts = (await api<Post[]>(process.env.POST_API, "/api/posts", token)) ?? [];

  return (
    <div style={{ maxWidth: 820, display: "grid", gap: 20 }}>
      {/* Başlık */}
      <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ width: 96, height: 96, borderRadius: "50%", background: "var(--gg-primary-light)", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ margin: 0 }}>Melisa Güler</h1>
            <span style={{ color: "var(--gg-primary)" }}>✔️</span>
          </div>
          <div style={{ color: "var(--gg-muted)", fontSize: 14 }}>Dijital İçerik Üreticisi · İstanbul, Türkiye</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Makyaj | Güzellik | Cilt Bakımı</div>
          <div style={{ fontSize: 13, color: "var(--gg-muted)" }}>{email}</div>
          <div style={{ display: "flex", gap: 28, marginTop: 12 }}>
            <Stat value={String(posts.length)} label="Gönderi" />
            <Stat value="18.6K" label="Takipçi" />
            <Stat value="392" label="Takip" />
          </div>
        </div>
        <button className="gg-btn gg-btn-ghost">Profili Düzenle</button>
      </div>

      {/* Öne çıkanlar */}
      <div style={{ display: "flex", gap: 22, overflowX: "auto" }}>
        {HILITE.map(([ic, l]) => (
          <div key={l} style={{ display: "grid", justifyItems: "center", gap: 6, minWidth: 64 }}>
            <span style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--gg-surface)", border: "1px solid var(--gg-border)", display: "grid", placeItems: "center", fontSize: 22 }}>{ic}</span>
            <span style={{ fontSize: 12 }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Sekmeler */}
      <div style={{ display: "flex", gap: 20, borderBottom: "1px solid var(--gg-border)" }}>
        {TABS.map((t, i) => (
          <span key={t} style={{ padding: "10px 2px", borderBottom: i === 0 ? "2px solid var(--gg-primary)" : "2px solid transparent", color: i === 0 ? "var(--gg-primary)" : "var(--gg-muted)", fontWeight: 600, fontSize: 14 }}>{t}</span>
        ))}
      </div>

      {/* Gönderi ızgarası (canlı) */}
      <div className="gg-grid cols-3">
        {posts.map((p) => (
          <div key={p.id} style={{ aspectRatio: "1/1", borderRadius: "var(--gg-r-sm)", background: "linear-gradient(135deg, var(--gg-primary-soft), var(--gg-coral-soft))", position: "relative" }}>
            <span style={{ position: "absolute", bottom: 8, left: 8, color: "#fff", fontSize: 12, textShadow: "0 1px 2px rgba(0,0,0,.3)" }}>❤️ {p.likeCount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
