import * as React from "react";
import { Stat } from "@makeup/ui";
import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { api, img, type Post, type Reel } from "../lib";
import { SavedList } from "../interactions";
import { MediaGrid } from "./MediaGrid";

const HILITE = [["🎨", "Makyaj"], ["🧴", "Cilt Bakımı"], ["🤍", "Favoriler"], ["❓", "Q&A"], ["👤", "Ben"]];
const TABS = [
  { ad: "Gönderiler", anahtar: "gonderiler" },
  { ad: "Reels", anahtar: "reels" },
  { ad: "Kaydedilenler", anahtar: "kaydedilenler" },
];

/**
 * JWT'nin sub alanini okur — imza dogrulamadan.
 *
 * Dogrulama gerekmiyor: jeton bizim oturumumuzdan geliyor ve asil dogrulamayi
 * post-service yapiyor. Bu satir yalnizca "hangi profili isteyecegiz"
 * sorusunu cevapliyor.
 */
function jetondanKullanici(token: string): string | null {
  try {
    const govde = token.split(".")[1];
    if (!govde) return null;
    const json = Buffer.from(govde.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return (JSON.parse(json) as { sub?: string }).sub ?? null;
  } catch {
    return null;
  }
}

export default async function Profile({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  const email = session?.user?.email;
  if (!token) {
    redirect("/login?callbackUrl=%2Fprofile");
  }
  const activeTab = searchParams.tab ?? "gonderiler";

  // Yazar kimligi jetondan cozulur; istemciden alinmiyor.
  const yazarId = jetondanKullanici(token);

  const [ilkSayfa, reels] = await Promise.all([
    // Ilk sayfa SUNUCUDA getirilir: kullanici bos ekran gormez ve bu kisim
    // arama motoruna da acik. Devami istemcide, kaydirdikca gelir.
    yazarId
      ? api<{ items: Post[]; nextCursor: string | null }>(
          process.env.POST_API, `/api/posts/author/${yazarId}?limit=24`, token)
      : Promise.resolve(null),
    activeTab === "reels" ? api<Reel[]>(process.env.REELS_API, "/api/reels", token) : Promise.resolve(null),
  ]);


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
            <Stat value={String(ilkSayfa?.items?.length ?? 0) + ((ilkSayfa?.nextCursor) ? "+" : "")} label="Gönderi" />
            <Stat value="18.6K" label="Takipçi" />
            <Stat value="392" label="Takip" />
          </div>
        </div>
        {/* Eskiden işlevsiz bir <button>'dı — artık düzenleme sayfasına gider. */}
        <a href="/profile/edit" className="gg-btn gg-btn-ghost">Profili Düzenle</a>
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
          const active = t.anahtar === activeTab;
          return (
            <a key={t.anahtar} href={`/profile?tab=${t.anahtar}`}
               style={{ padding: "10px 2px", borderBottom: active ? "2px solid var(--gg-primary)" : "2px solid transparent", color: active ? "var(--gg-primary)" : "var(--gg-muted)", fontWeight: 600, fontSize: 14 }}>
              {t.ad}
            </a>
          );
        })}
      </div>

      {/* Sekme içerikleri */}
      {activeTab === "gonderiler" && (
        <MediaGrid ilkSayfa={{ items: (ilkSayfa?.items ?? []) as never[], nextCursor: ilkSayfa?.nextCursor ?? null }} />
      )}

      {activeTab === "reels" && (
        <div className="gg-grid cols-3">
          {(reels ?? []).map((r) => (
            <a key={r.id} href="/reels" className="gg-card" style={{ padding: 12, display: "grid", gap: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(r.id + "r")} alt="" style={{ width: "100%", aspectRatio: "9/12", objectFit: "cover", borderRadius: "var(--gg-r-sm)", display: "block" }} />
              <p style={{ margin: 0, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.caption}</p>
              <span style={{ fontSize: 12, color: "var(--gg-muted)" }}>❤ {r.likeCount} · 👁 {r.viewCount}</span>
            </a>
          ))}
          {(reels ?? []).length === 0 && <p style={{ color: "var(--gg-muted)" }}>Reel yok.</p>}
        </div>
      )}

      {activeTab === "kaydedilenler" && <SavedList />}
    </div>
  );
}
