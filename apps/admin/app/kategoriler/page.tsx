import { auth } from "../../auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminApi, adminSend } from "../lib";

export const metadata = { title: "Kategori & Özellik Yönetimi — GlamGuide" };

type SubCategory = { id: string; name: string; slug: string };
type Category = { id: string; name: string; slug: string; subCategories: SubCategory[] };
type Attribute = {
  id: string;
  subCategoryId: string | null;
  key: string;
  label: string;
  type: string;
  unit: string | null;
  required: boolean;
  variantDefining: boolean;
  options: { value: string; label: string }[];
};

const storeApi = () => process.env.STORE_API ?? "http://localhost:8084";

const TIPLER = [
  { v: "TEXT", l: "Metin" },
  { v: "NUMBER", l: "Sayı" },
  { v: "SELECT", l: "Seçenek listesi" },
  { v: "BOOLEAN", l: "Evet / Hayır" },
];

/**
 * Kategori, alt kategori ve kategoriye özel ürün özellikleri.
 *
 * <p>Burada tanımlanan özellikler satıcının ürün formunda otomatik alan olur;
 * zorunlu işaretlenenler doldurulmadan ürün kaydedilemez.
 */
export default async function Kategoriler({
  searchParams,
}: {
  searchParams: { sec?: string; ok?: string; hata?: string };
}) {
  const s = (await auth()) as { accessToken?: string; roles?: string[] } | null;
  if (!s?.accessToken) redirect("/");
  if (!s.roles?.includes("ADMIN")) redirect("/yetkisiz");

  const kategoriler = (await adminApi<Category[]>(storeApi(), "/api/categories", s.accessToken)) ?? [];
  const secili = searchParams.sec ?? kategoriler[0]?.id;
  const ozellikler = secili
    ? (await adminApi<Attribute[]>(storeApi(), `/api/categories/${secili}/attributes`, s.accessToken)) ?? []
    : [];
  const seciliKat = kategoriler.find((k) => k.id === secili);

  async function kategoriEkle(form: FormData) {
    "use server";
    const ses = (await auth()) as { accessToken?: string } | null;
    if (!ses?.accessToken) return;
    const ad = String(form.get("name") ?? "").trim();
    const r = await adminSend(storeApi(), "/api/categories", ses.accessToken, "POST", {
      name: ad,
      slug: String(form.get("slug") ?? "").trim() || ad.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    });
    revalidatePath("/kategoriler");
    redirect(r.ok ? "/kategoriler?ok=1" : `/kategoriler?hata=${encodeURIComponent(r.error ?? "hata")}`);
  }

  async function altKategoriEkle(form: FormData) {
    "use server";
    const ses = (await auth()) as { accessToken?: string } | null;
    if (!ses?.accessToken) return;
    const kat = String(form.get("categoryId"));
    const ad = String(form.get("name") ?? "").trim();
    const r = await adminSend(storeApi(), `/api/categories/${kat}/subcategories`, ses.accessToken, "POST", {
      name: ad,
      slug: String(form.get("slug") ?? "").trim() || ad.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    });
    revalidatePath("/kategoriler");
    redirect(r.ok ? `/kategoriler?sec=${kat}&ok=1` : `/kategoriler?sec=${kat}&hata=${encodeURIComponent(r.error ?? "hata")}`);
  }

  async function ozellikEkle(form: FormData) {
    "use server";
    const ses = (await auth()) as { accessToken?: string } | null;
    if (!ses?.accessToken) return;
    const kat = String(form.get("categoryId"));
    const tip = String(form.get("type") ?? "TEXT");

    // "mat=Mat, parlak=Parlak" biçimi; etiket verilmezse değer etiket olur.
    const options = tip === "SELECT"
      ? String(form.get("options") ?? "")
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => {
            const [value, label] = p.split("=").map((x) => x.trim());
            return { value, label: label || value };
          })
      : null;

    const altSec = String(form.get("subCategoryId") ?? "");
    const r = await adminSend(storeApi(), `/api/categories/${kat}/attributes`, ses.accessToken, "POST", {
      subCategoryId: altSec || null,
      key: String(form.get("key") ?? "").trim(),
      label: String(form.get("label") ?? "").trim(),
      type: tip,
      unit: String(form.get("unit") ?? "").trim() || null,
      required: form.get("required") === "on",
      variantDefining: form.get("variantDefining") === "on",
      displayOrder: Number(form.get("displayOrder") ?? 0),
      options,
    });
    revalidatePath("/kategoriler");
    redirect(r.ok ? `/kategoriler?sec=${kat}&ok=1` : `/kategoriler?sec=${kat}&hata=${encodeURIComponent(r.error ?? "hata")}`);
  }

  async function ozellikSil(form: FormData) {
    "use server";
    const ses = (await auth()) as { accessToken?: string } | null;
    if (!ses?.accessToken) return;
    const kat = String(form.get("categoryId"));
    const r = await adminSend(storeApi(), `/api/categories/attributes/${form.get("id")}`,
      ses.accessToken, "DELETE");
    revalidatePath("/kategoriler");
    redirect(r.ok ? `/kategoriler?sec=${kat}&ok=1` : `/kategoriler?sec=${kat}&hata=${encodeURIComponent(r.error ?? "hata")}`);
  }

  const lbl = { display: "grid", gap: 4, fontSize: 12.5 } as const;

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 32, display: "grid", gap: 20 }}>
      <div>
        <a href="/">← Yönetim merkezi</a>
        <h1 style={{ margin: "8px 0 4px" }}>Kategori & Özellik Yönetimi</h1>
        <p style={{ color: "var(--gg-muted)", margin: 0 }}>
          Burada tanımlanan özellikler satıcının ürün formunda otomatik alan olur.
          <strong> Zorunlu</strong> işaretlenenler doldurulmadan ürün kaydedilemez.
        </p>
      </div>

      {searchParams.ok ? (
        <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>✓ Kaydedildi.</div>
      ) : null}
      {searchParams.hata ? (
        <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
          Hata: {searchParams.hata}
        </div>
      ) : null}

      {/* Kategori listesi + yeni kategori */}
      <section style={{ display: "grid", gap: 10 }}>
        <h2 style={{ fontSize: 17, margin: 0 }}>Kategoriler ({kategoriler.length})</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {kategoriler.map((k) => (
            <a key={k.id} href={`/kategoriler?sec=${k.id}`}
               className={`gg-btn ${k.id === secili ? "gg-btn-primary" : "gg-btn-ghost"}`}
               style={{ fontSize: 12.5, padding: "5px 12px" }}>
              {k.name} {k.subCategories.length > 0 ? `(${k.subCategories.length})` : ""}
            </a>
          ))}
        </div>
        <form action={kategoriEkle} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input name="name" required className="gg-search" placeholder="Yeni kategori adı"
                 style={{ flex: 1, minWidth: 200 }} />
          <input name="slug" className="gg-search" placeholder="slug (otomatik)" style={{ width: 160 }} />
          <button className="gg-btn gg-btn-primary" type="submit">+ Kategori</button>
        </form>
      </section>

      {seciliKat ? (
        <>
          {/* Alt kategoriler */}
          <section style={{ display: "grid", gap: 10 }}>
            <h2 style={{ fontSize: 17, margin: 0 }}>
              {seciliKat.name} · Alt Kategoriler ({seciliKat.subCategories.length})
            </h2>
            {seciliKat.subCategories.length === 0 ? (
              <p style={{ color: "var(--gg-muted)", fontSize: 13.5, margin: 0 }}>Alt kategori yok.</p>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {seciliKat.subCategories.map((sc) => (
                  <span key={sc.id} style={{
                    background: "var(--gg-primary-soft)", color: "var(--gg-primary-dark)",
                    borderRadius: 999, padding: "4px 12px", fontSize: 12.5,
                  }}>{sc.name}</span>
                ))}
              </div>
            )}
            <form action={altKategoriEkle} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input type="hidden" name="categoryId" value={seciliKat.id} />
              <input name="name" required className="gg-search" placeholder="Alt kategori adı"
                     style={{ flex: 1, minWidth: 200 }} />
              <button className="gg-btn gg-btn-ghost" type="submit">+ Alt kategori</button>
            </form>
          </section>

          {/* Özellikler */}
          <section style={{ display: "grid", gap: 10 }}>
            <h2 style={{ fontSize: 17, margin: 0 }}>
              {seciliKat.name} · Ürün Özellikleri ({ozellikler.length})
            </h2>

            {ozellikler.length === 0 ? (
              <p style={{ color: "var(--gg-muted)", fontSize: 13.5, margin: 0 }}>
                Bu kategoride özellik tanımlı değil.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {ozellikler.map((o) => (
                  <article key={o.id} className="gg-card"
                           style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <strong style={{ fontSize: 14 }}>{o.label}</strong>
                      <span style={{ fontSize: 12, color: "var(--gg-muted)" }}> · {o.key}</span>
                      <div style={{ fontSize: 12.5, color: "var(--gg-muted)" }}>
                        {TIPLER.find((t) => t.v === o.type)?.l ?? o.type}
                        {o.unit ? ` · ${o.unit}` : ""}
                        {o.options.length > 0 ? ` · ${o.options.map((x) => x.label).join(" / ")}` : ""}
                        {o.subCategoryId ? " · alt kategoriye özel" : ""}
                      </div>
                    </div>
                    {o.required ? (
                      <span style={{ background: "#FBE6E6", color: "#B42318", borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>ZORUNLU</span>
                    ) : null}
                    {o.variantDefining ? (
                      <span style={{ background: "#EDE7FB", color: "#6D3FD1", borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>VARYANT</span>
                    ) : null}
                    <form action={ozellikSil}>
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="categoryId" value={seciliKat.id} />
                      <button className="gg-btn gg-btn-ghost" type="submit" style={{ fontSize: 12 }}>Sil</button>
                    </form>
                  </article>
                ))}
              </div>
            )}

            <form action={ozellikEkle} className="gg-card" style={{ display: "grid", gap: 10 }}>
              <input type="hidden" name="categoryId" value={seciliKat.id} />
              <strong style={{ fontSize: 14 }}>Yeni özellik tanımla</strong>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                <label style={lbl}>
                  Etiket (görünen)
                  <input name="label" required className="gg-search" placeholder="Bitiş" />
                </label>
                <label style={lbl}>
                  Anahtar (makine adı)
                  <input name="key" required className="gg-search" placeholder="bitis" />
                </label>
                <label style={lbl}>
                  Tip
                  <select name="type" className="gg-search">
                    {TIPLER.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </label>
                <label style={lbl}>
                  Birim (ops.)
                  <input name="unit" className="gg-search" placeholder="ml" />
                </label>
                <label style={lbl}>
                  Alt kategori (ops.)
                  <select name="subCategoryId" className="gg-search">
                    <option value="">Tüm kategori</option>
                    {seciliKat.subCategories.map((sc) => (
                      <option key={sc.id} value={sc.id}>{sc.name}</option>
                    ))}
                  </select>
                </label>
                <label style={lbl}>
                  Sıra
                  <input name="displayOrder" type="number" defaultValue={0} className="gg-search" />
                </label>
              </div>

              <label style={lbl}>
                Seçenekler (yalnızca &quot;Seçenek listesi&quot; tipinde)
                <input name="options" className="gg-search"
                       placeholder="mat=Mat, parlak=Parlak, saten=Saten" />
              </label>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" name="required" /> Zorunlu
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" name="variantDefining" /> Varyant belirleyici (renk/ton gibi)
                </label>
              </div>

              <button className="gg-btn gg-btn-primary" type="submit" style={{ justifySelf: "start" }}>
                Özelliği Ekle
              </button>
            </form>
          </section>
        </>
      ) : null}
    </main>
  );
}
