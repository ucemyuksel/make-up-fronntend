import * as React from "react";
import { auth } from "../../../auth";
import { api, img, timeAgo, type Post } from "../../lib";
import { Yorumlar } from "./Yorumlar";

export const metadata = { title: "Gönderi — GlamGuide" };

/** Gönderi detayı: içerik + iş parçacıklı yorumlar. */
export default async function GonderiDetay({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { yhata?: string };
}) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;

  const p = await api<Post & { commentsClosed?: boolean }>(
    process.env.POST_API,
    `/api/posts/${params.id}`,
    token ?? "",
  );
  if (!p) {
    return (
      <div style={{ maxWidth: 620 }}>
        <a href="/" className="gg-see-all">‹ Akışa dön</a>
        <p style={{ color: "var(--gg-muted)" }}>Gönderi bulunamadı.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 620, display: "grid", gap: 4 }}>
      <a href="/" className="gg-see-all" style={{ marginBottom: 10 }}>‹ Akışa dön</a>

      <article className="gg-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 14px", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{
            width: 34, height: 34, borderRadius: "50%",
            background: p.authorAvatarColorHex ?? "var(--gg-primary-light)",
          }} />
          <div>
            <strong style={{ fontSize: 14 }}>
              {p.authorName ?? `Kullanıcı ${p.authorUserId.slice(0, 6)}`}
            </strong>
            <div style={{ fontSize: 11.5, color: "var(--gg-muted)" }}>{timeAgo(p.createdAt)}</div>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(p.id)} alt="" style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover", display: "block" }} />
        <div style={{ padding: 14 }}>
          <p style={{ margin: "0 0 8px" }}>{p.text}</p>
          <div style={{ display: "flex", gap: 16, color: "var(--gg-muted)", fontSize: 13.5 }}>
            <span>❤️ {p.likeCount}</span>
            <span>💬 {p.commentCount}</span>
          </div>
        </div>
      </article>

      <Yorumlar postId={p.id} yorumlarKapali={p.commentsClosed === true} hata={searchParams.yhata} />
    </div>
  );
}
