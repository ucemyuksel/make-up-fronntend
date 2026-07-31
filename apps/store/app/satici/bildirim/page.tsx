import * as React from "react";
import { Badge } from "@makeup/ui";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { requireSeller } from "../../authGuard";

export const metadata = { title: "Mesaj & Bildirimler — GlamGuide" };

type Notification = {
  id: string;
  type: string;
  icon: string | null;
  text: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};
type Conversation = {
  id: string;
  otherUserId: string;
  otherName: string | null;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  unread: number;
};

const NOTIF_API = () => process.env.NOTIFICATION_API ?? "http://localhost:8089";
const MSG_API = () => process.env.MESSAGING_API ?? "http://localhost:8086";
const SOCIAL = process.env.NEXT_PUBLIC_SOCIAL_URL || "http://localhost:3003";

const zaman = (iso: string | null) => {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return Math.max(1, Math.floor(s / 60)) + " dk önce";
  if (s < 86400) return Math.floor(s / 3600) + " saat önce";
  return Math.floor(s / 86400) + " gün önce";
};

async function getir<T>(base: string, path: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null; // servis kapalıysa sayfa yine açılsın
  }
}

/**
 * Satıcının message ve bildirim merkezi. Sipariş, yorum ve reklam bildirimleri
 * tek yerde; sohbetler sosyal uygulamada sürüyor (aynı messaging-service).
 */
export default async function SellerNotifications({
  searchParams,
}: {
  searchParams: { ok?: string };
}) {
  const { token } = await requireSeller("/satici/bildirim");

  const [bildirimler, sohbetler] = await Promise.all([
    getir<Notification[]>(NOTIF_API(), "/api/notifications", token),
    getir<Conversation[]>(MSG_API(), "/api/conversations", token),
  ]);
  const list = bildirimler ?? [];
  const okunmamis = list.filter((n) => !n.read).length;
  const sohbetListesi = sohbetler ?? [];
  const unreadMessages = sohbetListesi.reduce((t, c) => t + Number(c.unread ?? 0), 0);

  async function markAllRead() {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    try {
      await fetch(`${NOTIF_API()}/api/notifications/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      });
    } catch { /* sessiz — sayfa yine yenilenir */ }
    revalidatePath("/satici/bildirim");
    redirect("/satici/bildirim?ok=1");
  }

  return (
    <div style={{ maxWidth: 860, display: "grid", gap: 18 }}>
      <a href="/satici" className="gg-see-all">← Satıcı Paneli</a>
      <div>
        <Badge>İletişim</Badge>
        <h1 style={{ margin: "8px 0 0" }}>Mesaj & Bildirimler</h1>
        <p style={{ color: "var(--gg-muted)", margin: "6px 0 0", fontSize: 13.5 }}>
          Sipariş, yorum ve reklam bildirimlerin burada; müşteri sohbetleri mesajlar bölümünde sürer.
        </p>
      </div>

      {searchParams.ok ? (
        <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>
          ✓ Bildirimler okundu işaretlendi.
        </div>
      ) : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {[
          { l: "Okunmamış bildirim", v: String(okunmamis) },
          { l: "Okunmamış mesaj", v: String(unreadMessages) },
          { l: "Aktif sohbet", v: String(sohbetListesi.length) },
        ].map((k) => (
          <div key={k.l} className="gg-card" style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, color: "var(--gg-muted)" }}>{k.l}</span>
            <strong style={{ fontSize: 21 }}>{k.v}</strong>
          </div>
        ))}
      </section>

      {/* Mesajlar */}
      <section style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 style={{ fontSize: 17, margin: 0 }}>💬 Müşteri Mesajları</h2>
          <a href={`${SOCIAL}/messages`} className="gg-see-all">Tümünü aç ›</a>
        </div>
        {sohbetListesi.length === 0 ? (
          <p style={{ color: "var(--gg-muted)", fontSize: 13.5, margin: 0 }}>Henüz mesaj yok.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {sohbetListesi.slice(0, 6).map((c) => (
              <a key={c.id} href={`${SOCIAL}/messages?c=${c.id}`} className="gg-card"
                 style={{ display: "flex", gap: 10, alignItems: "center", textDecoration: "none", color: "inherit" }}>
                <span style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--gg-primary-light)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: 13.5 }}>
                    {c.otherName ?? `Kullanıcı ${c.otherUserId.slice(0, 6)}`}
                  </strong>
                  <div style={{ fontSize: 12.5, color: "var(--gg-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.lastMessageText ?? "—"}
                  </div>
                </div>
                <span style={{ fontSize: 11.5, color: "var(--gg-muted)" }}>{zaman(c.lastMessageAt)}</span>
                {c.unread > 0 ? <span className="gg-badge-count">{c.unread}</span> : null}
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Bildirimler */}
      <section style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 17, margin: 0 }}>🔔 Bildirimler ({list.length})</h2>
          <span style={{ flex: 1 }} />
          {okunmamis > 0 ? (
            <form action={markAllRead}>
              <button className="gg-btn gg-btn-ghost" type="submit" style={{ fontSize: 12.5 }}>
                Hepsini okundu işaretle
              </button>
            </form>
          ) : null}
        </div>

        {list.length === 0 ? (
          <p style={{ color: "var(--gg-muted)", fontSize: 13.5, margin: 0 }}>
            Henüz bildirim yok. Sipariş, yorum ve reklam olayları burada görünecek.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {list.slice(0, 30).map((n) => (
              <article key={n.id} className="gg-card"
                       style={{
                         display: "flex", gap: 10, alignItems: "center",
                         // Okunmamışlar sol kenar çizgisiyle belirgin.
                         borderLeft: n.read ? "3px solid transparent" : "3px solid var(--gg-primary)",
                       }}>
                <span style={{ fontSize: 18 }}>{n.icon ?? "🔔"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: n.read ? 400 : 600 }}>{n.text}</div>
                  <div style={{ fontSize: 11.5, color: "var(--gg-muted)" }}>
                    {n.type} · {zaman(n.createdAt)}
                  </div>
                </div>
                {n.link ? (
                  <a href={n.link} className="gg-see-all" style={{ fontSize: 12.5 }}>Aç ›</a>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
