import * as React from "react";
import { SectionHeader } from "@makeup/ui";
import { revalidatePath } from "next/cache";
import { auth } from "../../auth";
import { api, timeAgo } from "../lib";

type Notification = {
  id: string;
  type: string;
  icon: string;
  text: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

// Oturum yokken gösterilecek örnek içerik (backend'e ulaşılamazsa da aynısı).
const MOCK: Notification[] = [
  { id: "m1", type: "LIKE", icon: "❤️", text: "Melisa A. senin yorumunu beğendi.", link: null, read: false, createdAt: new Date(Date.now() - 3e5).toISOString() },
  { id: "m2", type: "SECURITY", icon: "🔐", text: "Güvenlik: yeni bir cihazdan giriş yapıldı.", link: null, read: false, createdAt: new Date(Date.now() - 36e5).toISOString() },
  { id: "m3", type: "ORDER", icon: "📦", text: "Siparişin kargoya verildi. #123456", link: "/store/orders", read: true, createdAt: new Date(Date.now() - 864e5).toISOString() },
];

async function markAllRead() {
  "use server";
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  if (token) {
    await fetch(`${process.env.NOTIFICATION_API}/api/notifications/read-all`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => null);
    revalidatePath("/notifications");
  }
}

export default async function Notifications() {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;

  // Canlı: notification-service; oturum/servis yoksa örnek içerik.
  const live = token
    ? await api<Notification[]>(process.env.NOTIFICATION_API, "/api/notifications", token)
    : null;
  const items = live ?? MOCK;
  const unread = items.filter((n) => !n.read).length;

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionHeader title={live ? `Bildirimler (canlı · ${unread} okunmamış)` : "Bildirimler"} small />
        {live && unread > 0 ? (
          <form action={markAllRead}>
            <button className="gg-pill" type="submit">Tümünü Okundu İşaretle</button>
          </form>
        ) : (
          <span className="gg-pill">Tümünü Okundu İşaretle</span>
        )}
      </div>

      {items.length === 0 ? (
        <p style={{ color: "var(--gg-muted)", fontSize: 13.5, marginTop: 16 }}>Henüz bildirimin yok.</p>
      ) : (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {items.map((n) => {
            const inner = (
              <>
                <span style={{ fontSize: 18 }}>{n.icon}</span>
                <div style={{ flex: 1, fontSize: 13.5 }}>{n.text}</div>
                <span style={{ fontSize: 11.5, color: "var(--gg-muted)", flexShrink: 0 }}>{timeAgo(n.createdAt)}</span>
              </>
            );
            const style: React.CSSProperties = {
              display: "flex", gap: 12, alignItems: "center",
              borderLeft: n.read ? "3px solid transparent" : "3px solid var(--gg-primary)",
              textDecoration: "none", color: "inherit",
            };
            return n.link ? (
              <a key={n.id} href={n.link} className="gg-card" style={style}>{inner}</a>
            ) : (
              <div key={n.id} className="gg-card" style={style}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
