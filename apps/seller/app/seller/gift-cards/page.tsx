import * as React from "react";
import { Badge } from "@makeup/ui";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { requireSeller } from "../../authGuard";
import { api, send, tl, type GiftCard, type Store } from "../../lib";

export const metadata = { title: "Hediye Kartları — GlamGuide" };
export const dynamic = "force-dynamic";

const DURUM: Record<string, string> = {
  ACTIVE: "Aktif",
  DEPLETED: "Bakiyesi bitti",
  CANCELLED: "İptal edildi",
};

export default async function GiftCardsPage({
  searchParams,
}: {
  searchParams: { store?: string; kod?: string; error?: string; ok?: string };
}) {
  const { token } = await requireSeller("/seller/gift-cards");

  const stores = (await api<Store[]>("/api/stores/mine", token)) ?? [];
  const store = stores.find((s) => s.id === searchParams.store)?.id ?? stores[0]?.id;
  if (!store) {
    return <p>Önce mağazanızı açmanız gerekiyor. <a href="/seller" className="gg-see-all">← Panele dön</a></p>;
  }

  const cards = (await api<GiftCard[]>(`/api/stores/${store}/gift-cards?size=100`, token)) ?? [];

  async function issueCard(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;

    const eposta = String(formData.get("issuedToEmail") ?? "").trim();
    const tarih = String(formData.get("expiresAt") ?? "").trim();

    const r = await send(`/api/stores/${store}/gift-cards`, "POST", t, {
      amount: Number(formData.get("amount") ?? 0),
      currency: "TRY",
      issuedToEmail: eposta || null,
      expiresAt: tarih ? new Date(tarih).toISOString() : null,
    });

    if (!r.ok) {
      redirect(`/seller/gift-cards?store=${store}&error=${encodeURIComponent(r.error ?? "Kart basılamadı")}`);
    }
    // Ham kod YALNIZ bu yanıtta var ve saklanmıyor; kullanıcıya bir kez
    // göstermek için adrese taşınıyor. Sayfa yenilenince kaybolur — kod
    // yeniden gösterilemez, mağaza yeni kart basar.
    const kod = (r.data as { code?: string } | undefined)?.code ?? "";
    redirect(`/seller/gift-cards?store=${store}&kod=${encodeURIComponent(kod)}`);
  }

  async function cancelCard(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    await send(`/api/gift-cards/${String(formData.get("id"))}`, "DELETE", t);
    redirect(`/seller/gift-cards?store=${store}&ok=1`);
  }

  return (
    <div style={{ maxWidth: 860, display: "grid", gap: 16 }}>
      <a href="/seller" className="gg-see-all">← Satıcı Paneli</a>
      <div>
        <Badge>Promosyon</Badge>
        <h1 style={{ margin: "8px 0 0" }}>Hediye Kartları</h1>
        <p style={{ color: "#666", margin: "6px 0 0", fontSize: 14 }}>
          Hediye kartı <strong>bakiye taşır</strong> — kupondan farkı budur. Kısmen
          harcanabilir; kalan bakiye sonraki alışverişte kullanılır.
        </p>
      </div>

      {searchParams.kod ? (
        <div style={{ background: "#FFF7E6", border: "1px solid #F0C36D", padding: 16, borderRadius: 10 }}>
          <strong>Kart basıldı. Kodu şimdi kaydedin:</strong>
          <p style={{ fontFamily: "monospace", fontSize: 22, letterSpacing: 1, margin: "10px 0" }}>
            {searchParams.kod}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: "#7A5B00" }}>
            Bu kod <strong>bir daha gösterilemez</strong>. Veritabanında kodun kendisi
            değil, geri çevrilemez özeti saklanıyor — kart para taşıdığı için böyle.
            Kaybolursa yeni kart basmanız gerekir.
          </p>
        </div>
      ) : null}
      {searchParams.ok ? (
        <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>✓ Kart iptal edildi.</div>
      ) : null}
      {searchParams.error ? (
        <div role="alert" style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
          Hata: {searchParams.error}
        </div>
      ) : null}

      <section className="gg-card">
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Basılan kartlar</h2>
        {cards.length === 0 ? (
          <p style={{ color: "#666" }}>Henüz hediye kartı basılmamış.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: "left", padding: "6px 8px 6px 0" }}>Kart</th>
                  <th scope="col" style={{ textAlign: "left" }}>Tutar</th>
                  <th scope="col" style={{ textAlign: "left" }}>Kalan</th>
                  <th scope="col" style={{ textAlign: "left" }}>Kime</th>
                  <th scope="col" style={{ textAlign: "left" }}>Durum</th>
                  <th scope="col" style={{ textAlign: "right" }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((g) => (
                  <tr key={g.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: "8px 8px 8px 0", fontFamily: "monospace" }}>•••• {g.codeLast4}</td>
                    <td>{tl(g.initialAmount)}</td>
                    <td>{tl(g.remainingAmount)}</td>
                    <td>{g.issuedToEmail ?? "—"}</td>
                    <td>{DURUM[g.status] ?? g.status}</td>
                    <td style={{ textAlign: "right" }}>
                      {g.status === "ACTIVE" ? (
                        <form action={cancelCard}>
                          <input type="hidden" name="id" value={g.id} />
                          <button type="submit">İptal et</button>
                        </form>
                      ) : <span style={{ color: "#999" }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <form action={issueCard} className="gg-card" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Yeni hediye kartı</h2>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Tutar (₺)
          <input name="amount" type="number" step="0.01" min="0.01" required className="gg-search" placeholder="500" />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Kime verildi (isteğe bağlı)
          <input name="issuedToEmail" type="email" maxLength={200} className="gg-search" placeholder="musteri@ornek.com" />
          <span style={{ color: "#666", fontSize: 12 }}>Yalnız kayıt için; kart bu adrese gönderilmez.</span>
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Son kullanma (isteğe bağlı)
          <input name="expiresAt" type="datetime-local" className="gg-search" />
        </label>
        <button type="submit" className="gg-btn">Kart bas</button>
      </form>
    </div>
  );
}
