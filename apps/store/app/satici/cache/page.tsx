import * as React from "react";
import { SectionHeader, Badge } from "@makeup/ui";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { requireSeller } from "../../yetki";
import { api, type Store } from "../../lib";

export const metadata = { title: "Cache Yönetimi — GlamGuide" };

export default async function CacheYonetim({ searchParams }: { searchParams: { ok?: string; hata?: string } }) {
  // Satıcı kapısı: giriş + STORE_OWNER rolü (menüyü gizlemek yetmez).
  const { token } = await requireSeller("/satici/cache");
  const stores = (await api<Store[]>("/api/stores", token)) ?? [];

  async function cacheTemizle(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    const storeId = String(formData.get("storeId") ?? "");
    const res = await fetch(`${process.env.STORE_API}/api/stores/${storeId}/cache/purge`, {
      method: "POST",
      headers: { Authorization: `Bearer ${t}` },
      cache: "no-store",
    });
    let purged = 0;
    const ok = res.ok;
    try {
      const j = await res.json();
      purged = Number(j.purged ?? 0);
    } catch { /* gövde yok */ }
    revalidatePath("/satici/cache");
    redirect(ok ? `/satici/cache?ok=${purged}` : `/satici/cache?hata=1`);
  }

  return (
    <div style={{ maxWidth: 760, display: "grid", gap: 20 }}>
      <a href="/satici" className="gg-see-all">← Satıcı Paneli</a>
      <div>
        <Badge>Cache Yönetimi</Badge>
        <h1 style={{ margin: "8px 0 0" }}>Mağaza Önbelleği</h1>
      </div>

      {/* Bilgilendirme */}
      <div style={{ background: "var(--gg-primary-soft)", color: "var(--gg-primary-dark)", borderRadius: 12, padding: "14px 16px", fontSize: 13.5, lineHeight: 1.5 }}>
        Ürünler hız için <strong>önbelleğe</strong> alınır (varsayılan 120 sn). Fiyat/stok
        değişikliği ve moderasyon otomatik yansır. Ancak <strong>bir kampanya başlattığınızda
        veya ürün görsellerini güncellediğinizde</strong> değişikliğin anında görünmesi için
        önbelleği elle temizleyebilirsiniz. Temizleme mağazanızın ürün listelerini ve
        detaylarını tazeler; site kısa süre sonra tekrar önbelleğe alır.
      </div>

      {searchParams.ok ? (
        <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>
          ✓ Önbellek temizlendi ({searchParams.ok} anahtar). Güncel içerik artık anında görünür.
        </div>
      ) : null}
      {searchParams.hata ? (
        <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
          Temizleme başarısız. Yetkiniz olan bir mağaza mı seçtiniz?
        </div>
      ) : null}

      <section>
        <SectionHeader title={`Mağazalarım (${stores.length})`} />
        <div style={{ display: "grid", gap: 12 }}>
          {stores.map((st) => (
            <div key={st.id} className="gg-card" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ width: 46, height: 46, borderRadius: "50%", background: st.colorHex, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800 }}>
                {st.name.slice(0, 2).toUpperCase()}
              </span>
              <div style={{ flex: 1, minWidth: 160 }}>
                <strong>{st.name}</strong>
                <div style={{ fontSize: 12.5, color: "var(--gg-muted)" }}>{st.productCount} ürün · önbellek kısa ömürlü (120 sn)</div>
              </div>
              <form action={cacheTemizle}>
                <input type="hidden" name="storeId" value={st.id} />
                <button className="gg-btn gg-btn-primary" type="submit">🧹 Cache&apos;i Temizle</button>
              </form>
            </div>
          ))}
          {stores.length === 0 ? <p style={{ color: "var(--gg-muted)" }}>Mağazanız yok. <a href="/satici" className="gg-see-all">Panelden açın ›</a></p> : null}
        </div>
      </section>
    </div>
  );
}
