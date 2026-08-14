import { revalidatePath } from "next/cache";
import { auth } from "../../../auth";
import { requireStoreOwner } from "../../authGuard";
import { api, send, type Store } from "../../lib";

export const dynamic = "force-dynamic";
export const metadata = { title: "Personel — GlamGuide" };

type Staff = {
  userId: string;
  email: string;
  fullName: string;
  storeId: string;
  enabled: boolean;
};

const MAX_STAFF = 5;

/**
 * Personel yönetimi — YALNIZCA MAĞAZA SAHİBİ.
 *
 * Personel bu sayfayı göremez. Sebep hiyerarşi değil güvenlik: personel
 * buraya girebilseydi kendi tanıdığını mağazaya ekler, hatta diğer
 * personelin erişimini kapatabilirdi. Yetkiyi veren, yetkiyi alan kişi
 * olmamalı.
 *
 * Menüde gizlemek koruma değildir — adresi elle yazan da girememeli. Son söz
 * yine de API'de: uçlar STORE_OWNER istiyor ve mağazanın gerçekten çağırana
 * ait olduğunu ayrıca doğruluyor.
 */
export default async function StaffPage({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string };
}) {
  const { token } = await requireStoreOwner("/seller/staff");

  // Mağaza jetondan türetilir, address çubuğundan değil: ?store=<baska-id>
  // yazarak başkasının personeline bakma denemesi burada kapanır.
  const stores = (await api<Store[]>("/api/stores/mine", token)) ?? [];
  const store = stores[0];

  if (!store) {
    return (
      <main style={{ padding: "1.5rem", maxWidth: 880, margin: "0 auto" }}>
        <h1>Personel</h1>
        <p role="alert">Önce mağazanızı açmanız gerekiyor.</p>
      </main>
    );
  }

  const staff = (await api<Staff[]>(`/api/stores/${store.id}/members`, token)) ?? [];
  const aktif = staff.filter((p) => p.enabled).length;
  const dolu = aktif >= MAX_STAFF;

  async function addStaff(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    const r = await send(`/api/stores/${store.id}/members`, "POST", t, {
      email: String(formData.get("email") ?? "").trim(),
      fullName: String(formData.get("fullName") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    });
    // Hata metni backend'den aynen taşınır (parola politikası, limit, çakışan
    // e-posta). Burada yeniden yazsaydık kullanıcı gerçek sebebi göremezdi.
    revalidatePath("/seller/staff");
    if (!r.ok) throw new Error(r.error ?? "Personel eklenemedi");
  }

  async function removeStaff(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    const userId = String(formData.get("userId") ?? "");
    await send(`/api/stores/${store.id}/members/${userId}`, "DELETE", t);
    revalidatePath("/seller/staff");
  }

  return (
    <main style={{ padding: "1.5rem", maxWidth: 880, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: ".25rem" }}>Personel</h1>
      <p style={{ color: "#666", marginBottom: "1.25rem" }}>
        {store.name} — {aktif}/{MAX_STAFF} personel (sizinle birlikte toplam{" "}
        {aktif + 1} kişi). Personel ürün, stok, sipariş ve kampanyaları
        yönetebilir; personel ekleyip çıkaramaz.
      </p>

      <section aria-labelledby="liste-baslik">
        <h2 id="liste-baslik" style={{ fontSize: "1.1rem" }}>
          Çalışanlar
        </h2>
        {staff.length === 0 ? (
          <p style={{ color: "#666" }}>Henüz personel eklenmemiş.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1.5rem" }}>
            <thead>
              <tr>
                <th scope="col" style={{ textAlign: "left", padding: ".5rem 0" }}>Ad Soyad</th>
                <th scope="col" style={{ textAlign: "left" }}>E-posta</th>
                <th scope="col" style={{ textAlign: "left" }}>Durum</th>
                <th scope="col" style={{ textAlign: "right" }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((p) => (
                <tr key={p.userId} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: ".5rem 0" }}>{p.fullName}</td>
                  <td>{p.email}</td>
                  <td>{p.enabled ? "Aktif" : "Kapalı"}</td>
                  <td style={{ textAlign: "right" }}>
                    {p.enabled ? (
                      <form action={removeStaff}>
                        <input type="hidden" name="userId" value={p.userId} />
                        <button type="submit">Erişimi kapat</button>
                      </form>
                    ) : (
                      <span style={{ color: "#999" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-labelledby="ekle-baslik">
        <h2 id="ekle-baslik" style={{ fontSize: "1.1rem" }}>
          Personel ekle
        </h2>
        {dolu ? (
          <p role="status" style={{ color: "#b00" }}>
            Personel sınırına ulaştınız. Yeni personel için önce mevcut bir
            hesabın erişimini kapatın — kapalı hesaplar limite sayılmaz.
          </p>
        ) : (
          <form action={addStaff} style={{ display: "grid", gap: ".75rem", maxWidth: 420 }}>
            <label>
              Ad Soyad
              <input name="fullName" required style={{ width: "100%" }} />
            </label>
            <label>
              E-posta
              <input name="email" type="email" required style={{ width: "100%" }} />
            </label>
            <label>
              Geçici parola
              <input name="password" type="password" required minLength={8} style={{ width: "100%" }} />
            </label>
            <button type="submit">Personel ekle</button>
          </form>
        )}
      </section>
    </main>
  );
}
