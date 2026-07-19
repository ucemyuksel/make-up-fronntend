import * as React from "react";
import { Badge, MediaUpload } from "@makeup/ui";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { api, send, type Category } from "../../lib";

export const metadata = { title: "Ürün Tanımla — GlamGuide" };

export default async function UrunTanimla({ searchParams }: { searchParams: { store?: string; ok?: string; hata?: string } }) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  if (!token) redirect("/api/auth/signin?callbackUrl=%2Fsatici");
  const store = searchParams.store;
  if (!store) return <p>Mağaza seçilmedi. <a href="/satici" className="gg-see-all">← Panele dön</a></p>;

  const categories = (await api<Category[]>("/api/categories", token)) ?? [];

  async function urunEkle(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    const catId = String(formData.get("categoryId") ?? "");
    const r = await send(`/api/stores/${store}/products`, "POST", t, {
      name: String(formData.get("name") ?? "").trim(),
      brand: String(formData.get("brand") ?? "").trim(),
      description: String(formData.get("description") ?? ""),
      priceAmount: Number(formData.get("price") ?? 0),
      currency: "TRY",
      stock: Number(formData.get("stock") ?? 0),
      imageUrl: String(formData.get("imageUrl") ?? ""),
      categoryId: catId || null,
      barcode: String(formData.get("barcode") ?? ""),
      variant: String(formData.get("variant") ?? ""),
    });
    redirect(r.ok ? `/satici/urun?store=${store}&ok=1` : `/satici/urun?store=${store}&hata=${encodeURIComponent(r.error ?? "hata")}`);
  }

  return (
    <div style={{ maxWidth: 620, display: "grid", gap: 16 }}>
      <a href="/satici" className="gg-see-all">← Satıcı Paneli</a>
      <div>
        <Badge>Ürün Tanımlama</Badge>
        <h1 style={{ margin: "8px 0 0" }}>Yeni Ürün + Fiyat</h1>
      </div>
      {searchParams.ok ? <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>✓ Ürün eklendi.</div> : null}
      {searchParams.hata ? <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>Hata: {searchParams.hata}</div> : null}

      <form action={urunEkle} className="gg-card" style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Ürün adı
          <input name="name" required className="gg-search" placeholder="Nude Far Paleti" />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Marka
            <input name="brand" className="gg-search" placeholder="Soft Colors" />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Kategori
            <select name="categoryId" className="gg-search">
              <option value="">— Seç —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Fiyat (₺)
            <input name="price" type="number" step="0.01" min="0" required className="gg-search" placeholder="1249.00" />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Stok
            <input name="stock" type="number" min="0" defaultValue={0} className="gg-search" />
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Barkod / Stok Kodu
            <input name="barcode" className="gg-search" placeholder="8690000000001 (benzersiz, opsiyonel)" />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Varyant (renk/ton/ml)
            <input name="variant" className="gg-search" placeholder="Velvet Teddy / 50ml" />
          </label>
        </div>
        <div style={{ background: "var(--gg-primary-soft)", color: "var(--gg-primary-dark)", borderRadius: 10, padding: "10px 12px", fontSize: 12.5 }}>
          ℹ️ Eklenen ürün <strong>onay bekler (PENDING)</strong>; platform onayından sonra mağazada yayınlanır.
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Görsel URL
            <input id="urun-gorsel" name="imageUrl" className="gg-search" placeholder="https://... (yükleyince otomatik dolar)" />
          </label>
          <MediaUpload targetId="urun-gorsel" label="📤 Görsel yükle (MinIO)" accept="image/*" />
        </div>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Açıklama
          <textarea name="description" className="gg-search" rows={3} placeholder="Ürün açıklaması" style={{ resize: "vertical" }} />
        </label>
        <button className="gg-btn gg-btn-primary" type="submit" style={{ justifySelf: "start" }}>Ürünü Kaydet</button>
      </form>
    </div>
  );
}
