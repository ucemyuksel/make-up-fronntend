import * as React from "react";
import { Badge, MediaUpload } from "@makeup/ui";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { requireSeller } from "../../authGuard";
import { api, send, type Category } from "../../lib";
import { AttributeFields } from "../../components/AttributeFields";

export const metadata = { title: "Ürün Tanımla — GlamGuide" };

export default async function ProductForm({ searchParams }: { searchParams: { store?: string; ok?: string; error?: string } }) {
  // Satıcı kapısı: giriş + STORE_OWNER rolü (menüyü gizlemek yetmez).
  const { token } = await requireSeller("/seller");
  const store = searchParams.store;
  if (!store) return <p>Mağaza seçilmedi. <a href="/seller" className="gg-see-all">← Panele dön</a></p>;

  const categories = (await api<Category[]>("/api/categories", token)) ?? [];

  async function addProduct(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    const catId = String(formData.get("categoryId") ?? "");
    const subId = String(formData.get("subCategoryId") ?? "");

    // Kategoriye özel özellikler tek gizli alanda JSON olarak gelir.
    let attributes: Record<string, string> = {};
    try {
      const ham = JSON.parse(String(formData.get("attributes") ?? "{}"));
      if (ham && typeof ham === "object") attributes = ham as Record<string, string>;
    } catch {
      attributes = {}; // bozuk gelirse backend zorunlu alan hatası verir
    }

    const r = await send(`/api/stores/${store}/products`, "POST", t, {
      name: String(formData.get("name") ?? "").trim(),
      brand: String(formData.get("brand") ?? "").trim(),
      description: String(formData.get("description") ?? ""),
      priceAmount: Number(formData.get("price") ?? 0),
      currency: "TRY",
      stock: Number(formData.get("stock") ?? 0),
      imageUrl: String(formData.get("imageUrl") ?? ""),
      categoryId: catId || null,
      subCategoryId: subId || null,
      barcode: String(formData.get("barcode") ?? ""),
      variant: String(formData.get("variant") ?? ""),
      attributes,
    });
    redirect(r.ok ? `/seller/products?store=${store}&ok=1` : `/seller/products?store=${store}&error=${encodeURIComponent(r.error ?? "error")}`);
  }

  return (
    <div style={{ maxWidth: 620, display: "grid", gap: 16 }}>
      <a href="/seller" className="gg-see-all">← Satıcı Paneli</a>
      <div>
        <Badge>Ürün Tanımlama</Badge>
        <h1 style={{ margin: "8px 0 0" }}>Yeni Ürün + Fiyat</h1>
      </div>
      {searchParams.ok ? <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>✓ Ürün eklendi.</div> : null}
      {searchParams.error ? <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>Hata: {searchParams.error}</div> : null}

      <form action={addProduct} className="gg-card" style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Ürün adı
          <input name="name" required className="gg-search" placeholder="Nude Far Paleti" />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Marka
            <input name="brand" className="gg-search" placeholder="Soft Colors" />
          </label>
        </div>

        {/* Kategori + alt category + kategoriye özel özellikler (dinamik) */}
        <AttributeFields categories={categories} />
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
            <input id="product-gorsel" name="imageUrl" className="gg-search" placeholder="https://... (yükleyince otomatik dolar)" />
          </label>
          <MediaUpload targetId="product-gorsel" label="📤 Görsel yükle (MinIO)" accept="image/*" />
        </div>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Açıklama
          <textarea name="description" className="gg-search" rows={3} placeholder="Ürün açıklaması" style={{ resize: "vertical" }} />
        </label>
        <button className="gg-btn gg-btn-primary" type="submit" style={{ justifySelf: "start" }}>Ürünü Kaydet</button>
      </form>
    </div>
  );
}
