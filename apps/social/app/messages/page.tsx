import * as React from "react";
import { SectionHeader } from "@makeup/ui";
import { revalidatePath } from "next/cache";
import { auth } from "../../auth";
import { api, timeAgo } from "../lib";

type Conversation = {
  id: string;
  otherUserId: string;
  otherName: string | null;          // user-service olaylarından (Kafka read-model)
  otherAvatarColorHex: string | null;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  unread: number;
};
type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  recipeId: string | null;
  createdAt: string;
  read: boolean;
};

// Gerçek ad user read-model'den (conversation.otherName); yoksa sunumsal ada düş.
const nameOf = (id: string) => "Kullanıcı " + id.slice(0, 4).toUpperCase();
const convName = (c: Conversation) => c.otherName ?? nameOf(c.otherUserId);

export default async function Messages({ searchParams }: { searchParams: { c?: string } }) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    return <a href="/api/auth/signin?callbackUrl=%2Fmessages" className="gg-btn gg-btn-primary">Giriş yap</a>;
  }

  const conversations = (await api<Conversation[]>(process.env.MESSAGING_API, "/api/conversations", token)) ?? [];
  const selectedId = searchParams.c ?? conversations[0]?.id;
  // Konuşma açılınca karşıdan gelen mesajlar "görüldü" işaretlenir (okundu bilgisi).
  if (selectedId) {
    await fetch(`${process.env.MESSAGING_API}/api/conversations/${selectedId}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => null);
  }
  const messages = selectedId
    ? (await api<Message[]>(process.env.MESSAGING_API, `/api/conversations/${selectedId}/messages`, token)) ?? []
    : [];
  const selected = conversations.find((c) => c.id === selectedId);
  // Benim mesajım = karşı tarafın (otherUserId) OLMAYAN gönderici.
  const isMine = (m: Message) => selected ? m.senderId !== selected.otherUserId : false;

  async function send(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    const text = String(formData.get("text") ?? "").trim();
    const cid = String(formData.get("cid") ?? "");
    if (!t || !text || !cid) return;
    await fetch(`${process.env.MESSAGING_API}/api/conversations/${cid}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    revalidatePath("/messages");
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, maxWidth: 900, alignItems: "start" }} className="gg-messages">
      {/* Konuşma listesi */}
      <div className="gg-card" style={{ padding: 10 }}>
        <SectionHeader title="Mesajlar" small />
        <input className="gg-search" style={{ width: "100%", marginBottom: 8 }} placeholder="Ara" />
        <div style={{ display: "grid" }}>
          {conversations.map((c) => (
            <a key={c.id} href={`/messages?c=${c.id}`} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 8px", borderRadius: "var(--gg-r-sm)", background: c.id === selectedId ? "var(--gg-primary-soft)" : "transparent" }}>
              <span style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--gg-primary-light)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{convName(c)}</div>
                <div style={{ fontSize: 12, color: "var(--gg-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.lastMessageText ?? "—"}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {c.lastMessageAt ? <div style={{ fontSize: 10.5, color: "var(--gg-muted)" }}>{timeAgo(c.lastMessageAt)}</div> : null}
                {c.unread > 0 ? <span className="gg-badge-count">{c.unread}</span> : null}
              </div>
            </a>
          ))}
          {conversations.length === 0 && <p style={{ color: "var(--gg-muted)", fontSize: 13 }}>Konuşma yok.</p>}
        </div>
      </div>

      {/* Sohbet */}
      <div className="gg-card" style={{ display: "grid", gap: 12, minHeight: 420, gridTemplateRows: "auto 1fr auto" }}>
        {selected ? (
          <>
            <div style={{ display: "flex", gap: 10, alignItems: "center", borderBottom: "1px solid var(--gg-border)", paddingBottom: 10 }}>
              <span style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--gg-primary-light)" }} />
              <div>
                <strong>{convName(selected)}</strong>
                <div style={{ fontSize: 11.5, color: "#1E9E5A" }}>çevrimiçi</div>
              </div>
            </div>
            <div style={{ display: "grid", gap: 8, alignContent: "start", overflowY: "auto", maxHeight: 420 }}>
              {messages.map((m) => (
                <div key={m.id} style={{ justifySelf: isMine(m) ? "end" : "start", maxWidth: "72%", background: isMine(m) ? "var(--gg-primary)" : "var(--gg-bg)", color: isMine(m) ? "#fff" : "var(--gg-text)", borderRadius: 14, padding: "9px 13px", fontSize: 13.5 }}>
                  {m.text}
                  <div style={{ fontSize: 10, opacity: 0.75, marginTop: 3, textAlign: "right", display: "flex", gap: 5, justifyContent: "flex-end", alignItems: "center" }}>
                    {timeAgo(m.createdAt)}
                    {/* Tikler: sunucuya ulaştı = iletildi (✓✓ soluk); karşı taraf okudu = görüldü (✓✓ parlak). */}
                    {isMine(m) && (
                      <span title={m.read ? "Görüldü" : "İletildi"}
                            style={{ fontWeight: 700, letterSpacing: -1, opacity: m.read ? 1 : 0.55, color: m.read ? "#B9F3FF" : "#fff" }}>
                        ✓✓
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <form action={send} style={{ display: "flex", gap: 8 }}>
              <input type="hidden" name="cid" value={selected.id} />
              <input name="text" className="gg-search" style={{ flex: 1 }} placeholder="Mesaj yaz..." autoComplete="off" />
              <button className="gg-btn gg-btn-primary" type="submit">➤</button>
            </form>
          </>
        ) : (
          <p style={{ color: "var(--gg-muted)" }}>Bir konuşma seçin.</p>
        )}
      </div>
    </div>
  );
}
