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
  visibility: "NORMAL" | "LIMITED" | "REMOVED";
  commentsClosed: boolean;
  moderationReason: string | null;
  moderatedAt: string | null;
};

const LEVELS = [
  { value: "NORMAL", label: "Normal", hint: "Tam dağıtım" },
  { value: "LIMITED", label: "Sınırlı", hint: "Akışta kalır, keşfet/öneri dışı" },
  { value: "REMOVED", label: "Kaldırıldı", hint: "Yayından çıkarılır (silinmez)" },
];

const badge = (v: Post["visibility"]) =>
  v === "REMOVED"
    ? { bg: "#FBE6E6", fg: "#B42318", text: "KALDIRILDI" }
    : v === "LIMITED"
      ? { bg: "#FCF2DE", fg: "#C98A1E", text: "SINIRLI" }
      : { bg: "#E5F6EC", fg: "#1E9E5A", text: "NORMAL" };

const postApi = () => process.env.POST_API ?? "http://localhost:8085";
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("tr-TR") : "—");

export default async function Content({
  searchParams,
}: {
  searchParams: { ok?: string; hata?: string; filtre?: string };
}) {
  const session = (await auth()) as { accessToken?: string; roles?: string[] } | null;
  if (!session?.accessToken) redirect("/");
  if (!session.roles?.includes("ADMIN")) redirect("/yetkisiz");

  const onlyDecided = searchParams.filtre === "kararli";
  const path = onlyDecided ? "/api/moderation/posts/decided" : "/api/moderation/posts";
  const items = (await adminApi<Post[]>(postApi(), path, session.accessToken)) ?? [];

  async function moderate(form: FormData) {
    "use server";
    const s = (await auth()) as { accessToken?: string } | null;
    if (!s?.accessToken) return;
    const result = await adminSend(
      postApi(),
      `/api/moderation/posts/${form.get("id")}`,
      s.accessToken,
      "POST",
      {
        visibility: String(form.get("visibility") ?? "NORMAL"),
        commentsClosed: form.get("commentsClosed") === "on",
        reason: String(form.get("reason") ?? "").trim(),
      },
    );
    revalidatePath("/icerikler");
    redirect(result.ok ? "/icerikler?ok=1" : "/icerikler?hata=" + encodeURIComponent(result.error ?? "hata"));
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
      {searchParams.hata ? (
        <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
          Hata: {searchParams.hata}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8 }}>
        <a href="/icerikler" className={`gg-btn ${onlyDecided ? "gg-btn-ghost" : "gg-btn-primary"}`}>
          Tüm içerik
        </a>
        <a href="/icerikler?filtre=kararli" className={`gg-btn ${onlyDecided ? "gg-btn-primary" : "gg-btn-ghost"}`}>
          Karar verilenler
        </a>
      </div>

      <section>
        <h2 style={{ fontSize: 17 }}>{onlyDecided ? "Karar verilen içerikler" : "İçerikler"} ({items.length})</h2>
        {items.length === 0 ? (
          <p style={{ color: "var(--gg-muted)" }}>
            {onlyDecided ? "Henüz moderasyon kararı verilmemiş." : "Gösterilecek içerik yok."}
          </p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((post) => {
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
