import * as React from "react";
import { Card, Badge, SectionHeader, ProductCard, ReelCard, Stat } from "@makeup/ui";
import { auth } from "../auth";

const CATEGORIES = [
  ["👁️", "Göz"], ["👄", "Dudak"], ["🙂", "Yüz"], ["🌸", "Allık"], ["🖌️", "Kontür"],
  ["🧴", "Cilt Bakımı"], ["💇", "Saç"], ["🌷", "Parfüm"], ["⋯", "Tümü"],
];

// Oturum yokken gösterilen örnek içerik (mockup ile birebir).
const MOCK_PRODUCTS = [
  { id: "m1", name: "Nude Far Paleti", brand: "Soft Colors", priceAmount: 1249 },
  { id: "m2", name: "Double Wear Fondöten", brand: "Estée Lauder", priceAmount: 1599 },
  { id: "m3", name: "Mat Ruj - Velvet Teddy", brand: "MAC", priceAmount: 899 },
  { id: "m4", name: "Lash Sensational", brand: "Maybelline", priceAmount: 439.9 },
  { id: "m5", name: "Vanilla Highlighter", brand: "Becca", priceAmount: 699 },
];
const MOCK_MESSAGES = [
  { name: "İrem Kaya", text: "Ürün linkini atabilir misin?", time: "10:30", unread: 2 },
  { name: "Melisa A.", text: "Harika, teşekkürler! 💕", time: "09:45", unread: 1 },
  { name: "Sena Yıldız", text: "Tamamdır görüşürüz 😊", time: "Dün", unread: 0 },
];
const MOCK_REELS = [
  { caption: "Doğal Günlük Makyaj", meta: "12 Adım" },
  { caption: "Bronz & Glow Makyaj", meta: "10 Adım" },
  { caption: "Dumanlı Göz Makyajı", meta: "11 Adım" },
];

// Zone origin'leri (AppShell ile aynı mantık) — zone'lar arası linkler tam URL.
const STORE = process.env.NEXT_PUBLIC_STORE_URL || "http://localhost:3002";
const SOCIAL = process.env.NEXT_PUBLIC_SOCIAL_URL || "http://localhost:3003";
const RECIPES = process.env.NEXT_PUBLIC_RECIPES_URL || "http://localhost:3001";

const tl = (n: number) =>
  "₺" + Number(n).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return Math.max(1, Math.floor(s / 60)) + " dk";
  if (s < 86400) return Math.floor(s / 3600) + " sa";
  return Math.floor(s / 86400) + " gün";
};

async function api<T>(base: string | undefined, path: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export default async function Dashboard() {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  const live = Boolean(token);

  // Canlı veri (oturum varsa) — her widget kendi servisinden.
  let products = MOCK_PRODUCTS as { id: string; name: string; brand: string; priceAmount: number }[];
  let conversations: { id: string; otherUserId: string; lastMessageText: string | null; lastMessageAt: string | null; unread: number }[] = [];
  let reels = MOCK_REELS as { caption: string; meta?: string }[];
  let postCount: number | null = null;
  let lastOrder: { id: string; status: string; amountTry: number } | null = null;

  if (token) {
    const [p, c, r, posts, orders] = await Promise.all([
      api<typeof products>(process.env.STORE_API, "/api/products", token),
      api<typeof conversations>(process.env.MESSAGING_API, "/api/conversations", token),
      api<{ caption: string; viewCount: number; durationSeconds: number }[]>(process.env.REELS_API, "/api/reels", token),
      api<unknown[]>(process.env.POST_API, "/api/posts", token),
      api<{ id: string; status: string; amountTry: number }[]>(process.env.PURCHASE_API, "/api/purchases", token),
    ]);
    if (p) products = p.slice(0, 5);
    if (c) conversations = c.slice(0, 3);
    if (r) reels = r.slice(0, 3).map((x) => ({ caption: x.caption, meta: `${x.viewCount} izlenme` }));
    if (posts) postCount = posts.length;
    if (orders && orders.length > 0) lastOrder = orders[0];
  }

  return (
    <div className="gg-dash">
      {/* ---- Ana sütun ---- */}
      <div style={{ display: "grid", gap: 24, minWidth: 0 }}>
        <section style={{ background: "linear-gradient(120deg, var(--gg-primary-soft) 0%, #fff 60%)", borderRadius: "var(--gg-r-lg)", padding: 36, position: "relative", overflow: "hidden" }}>
          <div style={{ maxWidth: 460 }}>
            <Badge>{live ? "AI DESTEKLİ · CANLI" : "AI DESTEKLİ"}</Badge>
            <h1 style={{ fontSize: "clamp(26px, 4vw, 38px)", lineHeight: 1.1, margin: "14px 0 10px" }}>
              Adım Adım<br />Makyaj Rehberin
            </h1>
            <p style={{ color: "var(--gg-muted)", fontSize: 16, margin: 0 }}>
              Yüzünü analiz et, sana özel makyaj adımlarını öğren ve kusursuz görün!
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
              <a href={`${RECIPES}/`} className="gg-btn gg-btn-primary">✨ Hemen Başla</a>
              <a href="/analysis" className="gg-btn gg-btn-ghost">🎯 Yüz Analizi Yap</a>
              {!live && (
                <a href="/api/auth/signin?callbackUrl=%2F" className="gg-btn gg-btn-ghost">🔑 Giriş yap (canlı veri)</a>
              )}
            </div>
          </div>
        </section>

        <section style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 4 }}>
          {CATEGORIES.map(([icon, label]) => (
            <a key={label} href={`${STORE}/`} style={{ display: "grid", justifyItems: "center", gap: 8, minWidth: 68 }}>
              <span style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--gg-surface)", border: "1px solid var(--gg-border)", display: "grid", placeItems: "center", fontSize: 22 }}>{icon}</span>
              <span style={{ fontSize: 12.5 }}>{label}</span>
            </a>
          ))}
        </section>

        <section>
          <SectionHeader title={live ? `Sana Özel Öneriler (canlı · ${products.length})` : "Sana Özel Öneriler"} href={`${STORE}/`} />
          <div className="gg-grid cols-5">
            {products.map((p) => (
              <ProductCard key={p.id} name={p.name} brand={p.brand} price={tl(p.priceAmount)} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="Trend Olan Reels" href={`${SOCIAL}/reels`} />
          <div className="gg-grid cols-4">
            {reels.map((r) => <ReelCard key={r.caption} caption={r.caption} meta={r.meta} />)}
          </div>
        </section>
      </div>

      {/* ---- Sağ panel ---- */}
      <aside className="gg-rail">
        <Card>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ width: 46, height: 46, borderRadius: "50%", background: "var(--gg-primary-light)" }} />
            <div>
              <strong>{session?.user?.name ?? "Melisa Güler"}</strong>
              <div style={{ fontSize: 12, color: "var(--gg-muted)" }}>
                {session?.user?.email ?? "Dijital İçerik Üreticisi"}
              </div>
              <a href={`${SOCIAL}/profile`} className="gg-see-all">Profili Gör</a>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
            <Stat value={postCount != null ? String(postCount) : "128"} label="Gönderi" />
            <Stat value="18.6K" label="Takipçi" />
            <Stat value="392" label="Takip" />
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 12, color: "var(--gg-muted)" }}>Tarif Mağazası</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, gap: 10 }}>
            <strong style={{ fontSize: 15 }}>Adım adım makyaj tarifleri</strong>
            <a href={`${RECIPES}/`} className="gg-pill">Tariflere Göz At</a>
          </div>
        </Card>

        <Card>
          <SectionHeader title={lastOrder ? "Son Siparişin (canlı)" : "Siparişin Yolda"} href={`${STORE}/orders`} small />
          {lastOrder ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ width: 44, height: 44, borderRadius: 10, background: "var(--gg-coral-soft)" }} />
              <div style={{ fontSize: 12.5 }}>
                <strong>#{lastOrder.id.replace(/-/g, "").slice(-6).toUpperCase()} · {tl(lastOrder.amountTry)}</strong>
                <div style={{ color: "var(--gg-muted)" }}>Durum: {lastOrder.status}</div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ width: 44, height: 44, borderRadius: 10, background: "var(--gg-coral-soft)" }} />
              <div style={{ fontSize: 12.5 }}>
                <strong>Nude Far Paleti</strong>
                <div style={{ color: "var(--gg-muted)" }}>Tahmini Teslimat 16 Mayıs 2024</div>
              </div>
            </div>
          )}
          <div style={{ marginTop: 10, background: "var(--gg-primary-soft)", color: "var(--gg-primary)", borderRadius: "var(--gg-r-pill)", padding: "8px 0", textAlign: "center", fontSize: 12.5, fontWeight: 700 }}>🚚 Kargoyu Takip Et</div>
        </Card>

        <Card>
          <SectionHeader title={live ? "Son Mesajlar (canlı)" : "Son Mesajlar"} href={`${SOCIAL}/messages`} small />
          {(live && conversations.length > 0
            ? conversations.map((cv) => ({
                name: "Kullanıcı " + cv.otherUserId.slice(0, 4).toUpperCase(),
                text: cv.lastMessageText ?? "—",
                time: cv.lastMessageAt ? timeAgo(cv.lastMessageAt) : "",
                unread: cv.unread,
              }))
            : MOCK_MESSAGES
          ).map((m) => (
            <div key={m.name + m.time} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--gg-border)" }}>
              <span style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--gg-primary-light)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "var(--gg-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.text}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--gg-muted)" }}>{m.time}</div>
                {m.unread ? <span className="gg-badge-count">{m.unread}</span> : null}
              </div>
            </div>
          ))}
        </Card>
      </aside>
    </div>
  );
}
