import * as React from "react";
import { Stat } from "@makeup/ui";
import { revalidatePath } from "next/cache";
import { auth } from "../../auth";
import { api, type Post, type Reel } from "../lib";
import { KaydedilenlerListesi, DislikeButton, ShareButton } from "../etkilesim";

const HILITE = [["🎨", "Makyaj"], ["🧴", "Cilt Bakımı"], ["🤍", "Favoriler"], ["❓", "Q&A"], ["👤", "Ben"]];
const TABS = [
  { ad: "Gönderiler", anahtar: "gonderiler" },
  { ad: "Reels", anahtar: "reels" },
  { ad: "Kaydedilenler", anahtar: "kaydedilenler" },
];

export default async function Profile({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  const email = session?.user?.email;
  if (!token) {
    return <a href="/api/auth/signin?callbackUrl=%2Fprofile" className="gg-btn gg-btn-primary">Giriş yap</a>;
  }
  const aktifTab = searchParams.tab ?? "gonderiler";

  const [posts, reels] = await Promise.all([
    api<Post[]>(process.env.POST_API, "/api/posts", token),
    aktifTab === "reels" ? api<Reel[]>(process.env.REELS_API, "/api/reels", token) : Promise.resolve(null),
  ]);

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
      revalidatePath("/profile");
    }
  }

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
            <Stat value={String((posts ?? []).length)} label="Gönderi" />
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

      {/* Sekmeler — tıklanabilir (?tab=) */}
      <div style={{ display: "flex", gap: 20, borderBottom: "1px solid var(--gg-border)" }}>
        {TABS.map((t) => {
          const aktif = t.anahtar === aktifTab;
          return (
            <a key={t.anahtar} href={`/profile?tab=${t.anahtar}`}
               style={{ padding: "10px 2px", borderBottom: aktif ? "2px solid var(--gg-primary)" : "2px solid transparent", color: aktif ? "var(--gg-primary)" : "var(--gg-muted)", fontWeight: 600, fontSize: 14 }}>
              {t.ad}
            </a>
          );
        })}
      </div>

      {/* Sekme içerikleri */}
      {aktifTab === "gonderiler" && (
        <div className="gg-grid cols-3">
          {(posts ?? []).map((p) => (
            <div key={p.id} className="gg-card" style={{ padding: 12, display: "grid", gap: 8 }}>
              <div style={{ aspectRatio: "1/1", borderRadius: "var(--gg-r-sm)", background: "linear-gradient(135deg, var(--gg-primary-soft), var(--gg-coral-soft))" }} />
              <p style={{ margin: 0, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.text}</p>
              <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}>
                <form action={likePost.bind(null, p.id)} style={{ display: "inline" }}>
                  <button type="submit" title="Beğen" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--gg-muted)" }}>
                    ❤️ {p.likeCount}
                  </button>
                </form>
                <DislikeButton id={p.id} />
                <span style={{ marginLeft: "auto" }}><ShareButton baslik={p.text.slice(0, 60)} /></span>
              </div>
            </div>
          ))}
          {(posts ?? []).length === 0 && <p style={{ color: "var(--gg-muted)" }}>Gönderi yok.</p>}
        </div>
      )}

      {aktifTab === "reels" && (
        <div className="gg-grid cols-3">
          {(reels ?? []).map((r) => (
            <a key={r.id} href="/reels" className="gg-card" style={{ padding: 12, display: "grid", gap: 8 }}>
              <div style={{ aspectRatio: "9/12", borderRadius: "var(--gg-r-sm)", background: "linear-gradient(160deg, var(--gg-primary-soft), var(--gg-coral-soft))", display: "grid", placeItems: "center", fontSize: 26 }}>🎬</div>
              <p style={{ margin: 0, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.caption}</p>
              <span style={{ fontSize: 12, color: "var(--gg-muted)" }}>❤ {r.likeCount} · 👁 {r.viewCount}</span>
            </a>
          ))}
          {(reels ?? []).length === 0 && <p style={{ color: "var(--gg-muted)" }}>Reel yok.</p>}
        </div>
      )}

      {aktifTab === "kaydedilenler" && <KaydedilenlerListesi />}
    </div>
  );
}
