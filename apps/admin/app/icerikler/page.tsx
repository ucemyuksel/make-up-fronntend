import type { CSSProperties } from "react";
import { auth } from "../../auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminApi, adminSend } from "../lib";

export const metadata = { title: "İçerik Moderasyonu — GlamGuide" };

type Post = {
  id: string;
  authorUserId: string;
  authorName: string | null;
  text: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  visibility: "FEATURED" | "NORMAL" | "LIMITED" | "REMOVED";
  commentsClosed: boolean;
  moderationReason: string | null;
  moderatedAt: string | null;
};

const LEVELS = [
  { value: "FEATURED", label: "Öne çıkar", hint: "Keşfette üst sırada gösterilir" },
  { value: "NORMAL", label: "Normal", hint: "Tam dağıtım" },
  { value: "LIMITED", label: "Sınırlı", hint: "Akışta kalır, keşfet/öneri dışı" },
  { value: "REMOVED", label: "Kaldırıldı", hint: "Yayından çıkarılır (silinmez)" },
];

const badge = (v: Post["visibility"]) =>
  v === "REMOVED"
    ? { bg: "#FBE6E6", fg: "#B42318", text: "KALDIRILDI" }
    : v === "LIMITED"
      ? { bg: "#FCF2DE", fg: "#C98A1E", text: "SINIRLI" }
      : v === "FEATURED"
        ? { bg: "#EDE7FB", fg: "#6D3FD1", text: "⭐ ÖNE ÇIKAN" }
        : { bg: "#E5F6EC", fg: "#1E9E5A", text: "NORMAL" };

const postApi = () => process.env.POST_API ?? "http://localhost:8085";
const reelsApi = () => process.env.REELS_API ?? "http://localhost:8087";
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("tr-TR") : "—");

/** Video, gönderiyle aynı karar modelini kullanır; alan adları reels-service'ten. */
type Reel = {
  id: string;
  authorUserId: string;
  caption: string;
  thumbnailUrl: string | null;
  durationSeconds: number;
  likeCount: number;
  viewCount: number;
  createdAt: string;
  visibility: "FEATURED" | "NORMAL" | "LIMITED" | "REMOVED";
  recommendable: boolean;
  moderationReason: string | null;
  moderatedAt: string | null;
};

export default async function Content({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string; filtre?: string; tur?: string };
}) {
  const session = (await auth()) as { accessToken?: string; roles?: string[] } | null;
  if (!session?.accessToken) redirect("/");
  if (!session.roles?.includes("ADMIN")) redirect("/yetkisiz");

  const isReels = searchParams.tur === "video";
  const onlyDecided = searchParams.filtre === "kararli";
  const kind = isReels ? "reels" : "posts";
  const path = `/api/moderation/${kind}${onlyDecided ? "/decided" : ""}`;
  const base = isReels ? reelsApi() : postApi();

  const posts = isReels ? [] : (await adminApi<Post[]>(base, path, session.accessToken)) ?? [];
  const reels = isReels ? (await adminApi<Reel[]>(base, path, session.accessToken)) ?? [] : [];
  const count = isReels ? reels.length : posts.length;

  // Sekme + filtre durumunu koruyan geri dönüş adresi.
  const back = `/icerikler?${new URLSearchParams({
    ...(isReels ? { tur: "video" } : {}),
    ...(onlyDecided ? { filtre: "kararli" } : {}),
  })}`;

  async function moderate(form: FormData) {
    "use server";
    const s = (await auth()) as { accessToken?: string } | null;
    if (!s?.accessToken) return;
    const video = form.get("tur") === "video";
    const result = await adminSend(
      video ? reelsApi() : postApi(),
      `/api/moderation/${video ? "reels" : "posts"}/${form.get("id")}`,
      s.accessToken,
      "POST",
      video
        ? {
            visibility: String(form.get("visibility") ?? "NORMAL"),
            reason: String(form.get("reason") ?? "").trim(),
          }
        : {
            visibility: String(form.get("visibility") ?? "NORMAL"),
            commentsClosed: form.get("commentsClosed") === "on",
            reason: String(form.get("reason") ?? "").trim(),
          },
    );
    const returnTo = String(form.get("returnTo") ?? "/icerikler");
    revalidatePath("/icerikler");
    const ek = returnTo.includes("?") ? "&" : "?";
    redirect(result.ok ? `${returnTo}${ek}ok=1` : `${returnTo}${ek}error=` + encodeURIComponent(result.error ?? "error"));
  }

  const label: CSSProperties = { display: "grid", gap: 4, fontSize: 12.5 };

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 32, display: "grid", gap: 22 }}>
      <div>
        <a href="/">← Yönetim merkezi</a>
        <h1 style={{ margin: "8px 0 4px" }}>İçerik Moderasyonu</h1>
        <p style={{ color: "var(--gg-muted)", margin: 0 }}>
          İçerik <strong>silinmez</strong> — dağıtım seviyesi verilir. Görünürlük azaltma yalnızca
          politika ihlali, spam veya güvenlik riski gibi <strong>gerekçeli</strong> durumlarda yapılır;
          karar, uygulayan ve zaman kaydedilir.
        </p>
      </div>

      {searchParams.ok ? (
        <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>
          ✓ Karar uygulandı.
        </div>
      ) : null}
      {searchParams.error ? (
        <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
          Hata: {searchParams.error}
        </div>
      ) : null}

      {/* İçerik türü — gönderi ve video aynı karar modelini paylaşır. */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--gg-border, #EEE)", paddingBottom: 10 }}>
        <a href={`/icerikler${onlyDecided ? "?filtre=kararli" : ""}`}
           className={`gg-btn ${isReels ? "gg-btn-ghost" : "gg-btn-primary"}`}>
          📝 Gönderiler
        </a>
        <a href={`/icerikler?tur=video${onlyDecided ? "&filtre=kararli" : ""}`}
           className={`gg-btn ${isReels ? "gg-btn-primary" : "gg-btn-ghost"}`}>
          🎬 Videolar
        </a>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <a href={isReels ? "/icerikler?tur=video" : "/icerikler"}
           className={`gg-btn ${onlyDecided ? "gg-btn-ghost" : "gg-btn-primary"}`}>
          Tüm içerik
        </a>
        <a href={isReels ? "/icerikler?tur=video&filtre=kararli" : "/icerikler?filtre=kararli"}
           className={`gg-btn ${onlyDecided ? "gg-btn-primary" : "gg-btn-ghost"}`}>
          Karar verilenler
        </a>
      </div>

      <section>
        <h2 style={{ fontSize: 17 }}>
          {onlyDecided ? "Karar verilenler" : isReels ? "Videolar" : "İçerikler"} ({count})
        </h2>
        {count === 0 ? (
          <p style={{ color: "var(--gg-muted)" }}>
            {onlyDecided ? "Henüz moderasyon kararı verilmemiş." : "Gösterilecek içerik yok."}
          </p>
        ) : isReels ? (
          <div style={{ display: "grid", gap: 12 }}>
            {reels.map((reel) => {
              const b = badge(reel.visibility);
              return (
                <article key={reel.id} className="gg-card" style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <strong>Kullanıcı {reel.authorUserId.slice(0, 6)}</strong>
                    <span style={{
                      background: b.bg, color: b.fg, borderRadius: 999,
                      padding: "2px 10px", fontSize: 11, fontWeight: 700,
                    }}>{b.text}</span>
                    {!reel.recommendable && reel.visibility !== "REMOVED" ? (
                      <span style={{
                        background: "#F1F1F3", color: "#6B7280", borderRadius: 999,
                        padding: "2px 10px", fontSize: 11, fontWeight: 700,
                      }}>KEŞFETTE ÇIKMAZ</span>
                    ) : null}
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 11.5, color: "var(--gg-muted)" }}>
                      ♥ {reel.likeCount} · ▶ {reel.viewCount} · {reel.durationSeconds}sn · {dt(reel.createdAt)}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    {reel.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={reel.thumbnailUrl} alt="" width={64} height={96}
                           style={{ objectFit: "cover", borderRadius: 8, background: "#EEE" }} />
                    ) : (
                      <div style={{ width: 64, height: 96, borderRadius: 8, background: "#EEE",
                                    display: "grid", placeItems: "center", fontSize: 22 }}>🎬</div>
                    )}
                    <p style={{ margin: 0, fontSize: 14 }}>{reel.caption || <em>(açıklama yok)</em>}</p>
                  </div>

                  {reel.moderationReason ? (
                    <div style={{
                      fontSize: 12, color: "var(--gg-muted)",
                      background: "var(--gg-primary-soft)", padding: "8px 10px", borderRadius: 8,
                    }}>
                      Son karar: <strong>{reel.moderationReason}</strong> · {dt(reel.moderatedAt)}
                    </div>
                  ) : null}

                  <form action={moderate} style={{ display: "grid", gap: 8 }}>
                    <input type="hidden" name="id" value={reel.id} />
                    <input type="hidden" name="tur" value="video" />
                    <input type="hidden" name="returnTo" value={back} />
                    <label style={label}>
                      Dağıtım seviyesi
                      <select name="visibility" className="gg-search" defaultValue={reel.visibility}
                              style={{ maxWidth: 380 }}>
                        {LEVELS.map((l) => (
                          <option key={l.value} value={l.value}>{l.label} — {l.hint}</option>
                        ))}
                      </select>
                    </label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <input name="reason" required maxLength={500} className="gg-search"
                             placeholder="Gerekçe (zorunlu) — ör. telif / politika ihlali"
                             style={{ flex: 1, minWidth: 240 }} />
                      <button className="gg-btn gg-btn-primary" type="submit">Kararı Uygula</button>
                    </div>
                  </form>
                </article>
              );
            })}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {posts.map((post) => {
              const b = badge(post.visibility);
              return (
                <article key={post.id} className="gg-card" style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <strong>{post.authorName ?? `Kullanıcı ${post.authorUserId.slice(0, 6)}`}</strong>
                    <span style={{
                      background: b.bg, color: b.fg, borderRadius: 999,
                      padding: "2px 10px", fontSize: 11, fontWeight: 700,
                    }}>{b.text}</span>
                    {post.commentsClosed ? (
                      <span style={{
                        background: "#F1F1F3", color: "#6B7280", borderRadius: 999,
                        padding: "2px 10px", fontSize: 11, fontWeight: 700,
                      }}>YORUMLAR KAPALI</span>
                    ) : null}
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 11.5, color: "var(--gg-muted)" }}>
                      ♥ {post.likeCount} · 💬 {post.commentCount} · {dt(post.createdAt)}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: 14 }}>{post.text || <em>(metin yok)</em>}</p>

                  {post.moderationReason ? (
                    <div style={{
                      fontSize: 12, color: "var(--gg-muted)",
                      background: "var(--gg-primary-soft)", padding: "8px 10px", borderRadius: 8,
                    }}>
                      Son karar: <strong>{post.moderationReason}</strong> · {dt(post.moderatedAt)}
                    </div>
                  ) : null}

                  <form action={moderate} style={{ display: "grid", gap: 8 }}>
                    <input type="hidden" name="id" value={post.id} />
                    <input type="hidden" name="tur" value="gonderi" />
                    <input type="hidden" name="returnTo" value={back} />
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
                      <label style={label}>
                        Dağıtım seviyesi
                        <select name="visibility" className="gg-search" defaultValue={post.visibility}>
                          {LEVELS.map((l) => (
                            <option key={l.value} value={l.value}>{l.label} — {l.hint}</option>
                          ))}
                        </select>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                        <input type="checkbox" name="commentsClosed" defaultChecked={post.commentsClosed} />
                        Yorumları kapat
                      </label>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <input name="reason" required maxLength={500} className="gg-search"
                             placeholder="Gerekçe (zorunlu) — ör. spam / politika ihlali"
                             style={{ flex: 1, minWidth: 240 }} />
                      <button className="gg-btn gg-btn-primary" type="submit">Kararı Uygula</button>
                    </div>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
