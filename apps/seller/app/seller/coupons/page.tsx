import * as React from "react";
import { Badge } from "@makeup/ui";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { requireSeller } from "../../authGuard";
import { api, send, tl, type Coupon, type Product, type Store } from "../../lib";

export const metadata = { title: "Kuponlar — GlamGuide" };
export const dynamic = "force-dynamic";

export default async function CouponsPage({
  searchParams,
}: {
  searchParams: { store?: string; ok?: string; error?: string };
}) {
  const { token } = await requireSeller("/seller/coupons");

  // Mağaza JETONDAN çözülür, address çubuğundan değil: personelin ?store=
  // parametresi yok ve elle yazılan bir kimlikle başka mağazaya bakma
  // denemesi de bu sayede kapanır. ?store= yalnızca birden fazla mağazası
  // olan owner için seçim aracı.
  const stores = (await api<Store[]>("/api/stores/mine", token)) ?? [];
  const store = stores.find((s) => s.id === searchParams.store)?.id ?? stores[0]?.id;
  if (!store) {
    return <p>Önce mağazanızı açmanız gerekiyor. <a href="/seller" className="gg-see-all">← Panele dön</a></p>;
  }

  const coupons = (await api<Coupon[]>(`/api/stores/${store}/coupons?size=100`, token)) ?? [];
  const products = (await api<Product[]>(`/api/stores/${store}/products?size=100`, token)) ?? [];

  async function addCoupon(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;

    const toIso = (v: FormDataEntryValue | null) => (v ? new Date(String(v)).toISOString() : null);
    const sayi = (v: FormDataEntryValue | null) => {
      const n = Number(v);
      return v === null || String(v).trim() === "" || Number.isNaN(n) ? null : n;
    };

    // Hiç ürün seçilmezse kupon MAĞAZANIN TÜMÜNDE geçerli olur; bu yüzden
    // boş liste gönderilir, "hepsi" diye ayrı bir işaret yok.
    const productIds = formData.getAll("productIds").map(String).filter(Boolean);

    const r = await send(`/api/stores/${store}/coupons`, "POST", t, {
      code: String(formData.get("code") ?? "").trim(),
      discountType: String(formData.get("discountType") ?? "PERCENT"),
      discountValue: Number(formData.get("discountValue") ?? 0),
      maxDiscountAmount: sayi(formData.get("maxDiscountAmount")),
      minOrderAmount: sayi(formData.get("minOrderAmount")) ?? 0,
      currency: "TRY",
      startsAt: toIso(formData.get("startsAt")),
      endsAt: toIso(formData.get("endsAt")),
      maxUses: sayi(formData.get("maxUses")),
      perUserLimit: sayi(formData.get("perUserLimit")) ?? 1,
      productIds,
    });
    redirect(r.ok
      ? `/seller/coupons?store=${store}&ok=1`
      : `/seller/coupons?store=${store}&error=${encodeURIComponent(r.error ?? "Kupon oluşturulamadı")}`);
  }

  async function closeCoupon(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    await send(`/api/coupons/${String(formData.get("id"))}`, "DELETE", t);
    redirect(`/seller/coupons?store=${store}&ok=2`);
  }

  return (
    <div style={{ maxWidth: 860, display: "grid", gap: 16 }}>
      <a href="/seller" className="gg-see-all">← Satıcı Paneli</a>
      <div>
        <Badge>Promosyon</Badge>
        <h1 style={{ margin: "8px 0 0" }}>Kupon Kodları</h1>
        <p style={{ color: "#666", margin: "6px 0 0", fontSize: 14 }}>
          Kupon bir <strong>indirim kuralıdır</strong>, bakiyesi yoktur. Müşteri
          sepette kodu author, şartlar tutuyorsa indirim uygulanır.
        </p>
      </div>

      {searchParams.ok === "1" ? (
        <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>✓ Kupon oluşturuldu.</div>
      ) : null}
      {searchParams.ok === "2" ? (
        <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>✓ Kupon kapatıldı.</div>
      ) : null}
      {searchParams.error ? (
        <div role="alert" style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
          Hata: {searchParams.error}
        </div>
      ) : null}

      <section className="gg-card">
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Mevcut kuponlar</h2>
        {coupons.length === 0 ? (
          <p style={{ color: "#666" }}>Henüz kupon tanımlanmamış.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: "left", padding: "6px 8px 6px 0" }}>Kod</th>
                  <th scope="col" style={{ textAlign: "left" }}>İndirim</th>
                  <th scope="col" style={{ textAlign: "left" }}>Alt sınır</th>
                  <th scope="col" style={{ textAlign: "left" }}>Kullanım</th>
                  <th scope="col" style={{ textAlign: "left" }}>Kapsam</th>
                  <th scope="col" style={{ textAlign: "left" }}>Durum</th>
                  <th scope="col" style={{ textAlign: "right" }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: "8px 8px 8px 0", fontFamily: "monospace" }}>{c.code}</td>
                    <td>
                      {c.discountType === "PERCENT" ? `%${c.discountValue}` : tl(c.discountValue)}
                      {c.maxDiscountAmount ? <span style={{ color: "#666" }}> (en çok {tl(c.maxDiscountAmount)})</span> : null}
                    </td>
                    <td>{c.minOrderAmount > 0 ? tl(c.minOrderAmount) : "—"}</td>
                    <td>{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                    <td>{c.productIds.length === 0 ? "Tüm mağaza" : `${c.productIds.length} ürün`}</td>
                    <td>{c.active ? "Aktif" : "Kapalı"}</td>
                    <td style={{ textAlign: "right" }}>
                      {c.active ? (
                        <form action={closeCoupon}>
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit">Kapat</button>
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

      <form action={addCoupon} className="gg-card" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Yeni kupon</h2>

        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Kod
          <input name="code" required minLength={3} maxLength={40} className="gg-search"
                 placeholder="YAZ25" style={{ textTransform: "uppercase" }} />
          <span style={{ color: "#666", fontSize: 12 }}>
            Müşterinin yazacağı kod. Mağazanız içinde eşsiz olmalı; büyük harfe çevrilir.
          </span>
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>İndirim tipi
            <select name="discountType" className="gg-search">
              <option value="PERCENT">Yüzde (%)</option>
              <option value="AMOUNT">Tutar (₺)</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>İndirim değeri
            <input name="discountValue" type="number" step="0.01" min="0.01" required className="gg-search" />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>En fazla indirim (₺)
            <input name="maxDiscountAmount" type="number" step="0.01" min="0" className="gg-search" placeholder="100" />
            <span style={{ color: "#666", fontSize: 12 }}>
              Yüzde indirimde <strong>üst sınır</strong>. Boş bırakırsanız büyük sepetlerde
              indirim sınırsız büyür.
            </span>
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Alt sipariş tutarı (₺)
            <input name="minOrderAmount" type="number" step="0.01" min="0" className="gg-search" placeholder="200" />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Başlangıç
            <input name="startsAt" type="datetime-local" className="gg-search" />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Bitiş
            <input name="endsAt" type="datetime-local" className="gg-search" />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Toplam kullanım sınırı
            <input name="maxUses" type="number" min="1" className="gg-search" placeholder="sınırsız" />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Kişi başı sınır
            <input name="perUserLimit" type="number" min="1" defaultValue={1} className="gg-search" />
          </label>
        </div>

        <fieldset style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
          <legend style={{ fontSize: 13, padding: "0 6px" }}>Geçerli ürünler</legend>
          <p style={{ color: "#666", fontSize: 12, margin: "0 0 8px" }}>
            Hiçbirini seçmezseniz kupon <strong>mağazanın tümünde</strong> geçerli olur.
          </p>
          {products.length === 0 ? (
            <p style={{ color: "#666", fontSize: 13, margin: 0 }}>Mağazanızda ürün yok.</p>
          ) : (
            <div style={{ display: "grid", gap: 6, maxHeight: 220, overflowY: "auto" }}>
              {products.map((p) => (
                <label key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                  <input type="checkbox" name="productIds" value={p.id} />
                  <span>{p.name} <span style={{ color: "#666" }}>· {tl(p.priceAmount)}</span></span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <button type="submit" className="gg-btn">Kupon oluştur</button>
      </form>
    </div>
  );
}
