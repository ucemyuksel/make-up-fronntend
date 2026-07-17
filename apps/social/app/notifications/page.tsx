import * as React from "react";
import { SectionHeader } from "@makeup/ui";

// NOT: Backend'de ayrı bir notification-service henüz yok; bu ekran mockup'taki
// düzeni component-base kurar. Servis eklendiğinde canlı bağlanacak.
const ITEMS = [
  { icon: "❤️", text: "Melisa A. senin yorumunu beğendi.", time: "5 dk önce", unread: true },
  { icon: "🔐", text: "Güvenlik: yeni bir cihazdan giriş yapıldı.", time: "1 saat önce", unread: true },
  { icon: "💬", text: "Bildirim: İrem yeni bir mesaj gönderdi.", time: "2 saat önce", unread: true },
  { icon: "📦", text: "Siparişin kargoya verildi. #123456", time: "Dün", unread: false },
];

export default function Notifications() {
  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionHeader title="Bildirimler" small />
        <span className="gg-pill">Tümünü Okundu İşaretle</span>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        {ITEMS.map((n) => (
          <div key={n.text} className="gg-card" style={{ display: "flex", gap: 12, alignItems: "center", borderLeft: n.unread ? "3px solid var(--gg-primary)" : "3px solid transparent" }}>
            <span style={{ fontSize: 18 }}>{n.icon}</span>
            <div style={{ flex: 1, fontSize: 13.5 }}>{n.text}</div>
            <span style={{ fontSize: 11.5, color: "var(--gg-muted)", flexShrink: 0 }}>{n.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
