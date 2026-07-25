import * as React from "react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { api, timeAgo } from "../../lib";

/**
 * Gönderi yorumları — tek seviye iş parçacığı: her kök yorumun cevapları
 * hemen altında girintili gösterilir. Backend zaten iş parçacığı sırasında
 * döndürüyor; burada yalnızca köke göre gruplanır.
 */

type Comment = {
  id: string;
  postId: string;
  authorUserId: string;
  text: string;
  parentCommentId: string | null;
  createdAt: string;
};

export async function Yorumlar({
  postId,
  yorumlarKapali,
  hata,
}: {
  postId: string;
  yorumlarKapali: boolean;
  hata?: string;
}) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;

  const hepsi = (await api<Comment[]>(process.env.POST_API, `/api/posts/${postId}/comments`, token ?? "")) ?? [];
  const kokler = hepsi.filter((c) => !c.parentCommentId);
  const cevaplar = new Map<string, Comment[]>();
  for (const c of hepsi) {
    if (c.parentCommentId) {
      cevaplar.set(c.parentCommentId, [...(cevaplar.get(c.parentCommentId) ?? []), c]);
    }
  }

  async function yorumEkle(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    const parent = String(formData.get("parentCommentId") ?? "").trim();

    let res: Response | null = null;
    try {
      res = await fetch(`${process.env.POST_API}/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: String(formData.get("text") ?? "").trim(),
          parentCommentId: parent || null,
        }),
        cache: "no-store",
      });
    } catch {
      res = null;
    }
    revalidatePath(`/gonderi/${postId}`);
    // redirect() try/catch dışında — NEXT_REDIRECT yutulmasın.
    if (!res || !res.ok) {
      const kod = res ? String(res.status) : "baglanti";
      redirect(`/gonderi/${postId}?yhata=${encodeURIComponent(kod)}`);
    }
    redirect(`/gonderi/${postId}`);
  }

  const kisi = (id: string) => `Kullanıcı ${id.slice(0, 6)}`;

  const yorumFormu = (parentId?: string) => (
    <form action={yorumEkle} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {parentId ? <input type="hidden" name="parentCommentId" value={parentId} /> : null}
      <input name="text" required maxLength={2000} className="gg-search"
             style={{ flex: 1, minWidth: 200 }}
             placeholder={parentId ? "Cevap yaz…" : "Yorum yaz…"} />
      <button className="gg-btn gg-btn-primary" type="submit">
        {parentId ? "Cevapla" : "Gönder"}
      </button>
    </form>
  );

  return (
    <section style={{ display: "grid", gap: 14, marginTop: 20 }}>
      <h2 style={{ margin: 0, fontSize: 17 }}>Yorumlar ({hepsi.length})</h2>

      {hata ? (
        <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
          Yorum eklenemedi ({hata}).
        </div>
      ) : null}

      {yorumlarKapali ? (
        <div style={{ background: "#F1F1F3", color: "#6B7280", padding: 12, borderRadius: 10, fontSize: 13.5 }}>
          🔒 Bu gönderide yorumlar kapatıldı.
        </div>
      ) : !token ? (
        <p style={{ color: "var(--gg-muted)", fontSize: 13.5, margin: 0 }}>
          Yorum yazmak için <a href="/api/auth/signin" className="gg-see-all">giriş yap</a>.
        </p>
      ) : (
        yorumFormu()
      )}

      <div style={{ display: "grid", gap: 14 }}>
        {kokler.map((k) => (
          <div key={k.id} style={{ display: "grid", gap: 8 }}>
            <article className="gg-card" style={{ display: "grid", gap: 4 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <strong style={{ fontSize: 13.5 }}>{kisi(k.authorUserId)}</strong>
                <span style={{ fontSize: 11.5, color: "var(--gg-muted)" }}>{timeAgo(k.createdAt)}</span>
              </div>
              <p style={{ margin: 0, fontSize: 14 }}>{k.text}</p>
            </article>

            {/* Cevaplar: girintili, sol çizgiyle iş parçacığı belli edilir. */}
            <div style={{ display: "grid", gap: 8, marginLeft: 26, paddingLeft: 12, borderLeft: "2px solid var(--gg-border)" }}>
              {(cevaplar.get(k.id) ?? []).map((c) => (
                <article key={c.id} className="gg-card" style={{ display: "grid", gap: 4, padding: "10px 12px" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <strong style={{ fontSize: 13 }}>{kisi(c.authorUserId)}</strong>
                    <span style={{ fontSize: 11.5, color: "var(--gg-muted)" }}>{timeAgo(c.createdAt)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13.5 }}>{c.text}</p>
                </article>
              ))}
              {token && !yorumlarKapali ? yorumFormu(k.id) : null}
            </div>
          </div>
        ))}
        {hepsi.length === 0 ? (
          <p style={{ color: "var(--gg-muted)", fontSize: 13.5, margin: 0 }}>İlk yorumu sen yaz.</p>
        ) : null}
      </div>
    </section>
  );
}
