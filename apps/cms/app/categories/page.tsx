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
export default async function Categories({
  searchParams,
}: {
  searchParams: { pick?: string; ok?: string; error?: string };
}) {
  const s = (await auth()) as { accessToken?: string; roles?: string[] } | null;
  if (!s?.accessToken) redirect("/");
  if (!s.roles?.includes("ADMIN")) redirect("/forbidden");

  const categories = (await adminApi<Category[]>(storeApi(), "/api/categories", s.accessToken)) ?? [];
  const selected = searchParams.pick ?? categories[0]?.id;
  const attributes = selected
    ? (await adminApi<Attribute[]>(storeApi(), `/api/categories/${selected}/attributes`, s.accessToken)) ?? []
    : [];
  const selectedCategory = categories.find((k) => k.id === selected);

  async function addCategory(form: FormData) {
    "use server";
    const ses = (await auth()) as { accessToken?: string } | null;
    if (!ses?.accessToken) return;
    const ad = String(form.get("name") ?? "").trim();
    const r = await adminSend(storeApi(), "/api/categories", ses.accessToken, "POST", {
      name: ad,
      slug: String(form.get("slug") ?? "").trim() || ad.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    });
    revalidatePath("/categories");
    redirect(r.ok ? "/categories?ok=1" : `/categories?error=${encodeURIComponent(r.error ?? "error")}`);
  }

  async function addSubCategory(form: FormData) {
    "use server";
    const ses = (await auth()) as { accessToken?: string } | null;
    if (!ses?.accessToken) return;
    const categoryId = String(form.get("categoryId"));
    const ad = String(form.get("name") ?? "").trim();
    const r = await adminSend(storeApi(), `/api/categories/${categoryId}/subcategories`, ses.accessToken, "POST", {
      name: ad,
      slug: String(form.get("slug") ?? "").trim() || ad.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    });
    revalidatePath("/categories");
    redirect(r.ok ? `/categories?pick=${categoryId}&ok=1` : `/categories?pick=${categoryId}&error=${encodeURIComponent(r.error ?? "error")}`);
  }

  async function addAttribute(form: FormData) {
    "use server";
    const ses = (await auth()) as { accessToken?: string } | null;
    if (!ses?.accessToken) return;
    const categoryId = String(form.get("categoryId"));
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

    const subCategoryId = String(form.get("subCategoryId") ?? "");
    const r = await adminSend(storeApi(), `/api/categories/${categoryId}/attributes`, ses.accessToken, "POST", {
      subCategoryId: subCategoryId || null,
      key: String(form.get("key") ?? "").trim(),
      label: String(form.get("label") ?? "").trim(),
      type: tip,
      unit: String(form.get("unit") ?? "").trim() || null,
      required: form.get("required") === "on",
      variantDefining: form.get("variantDefining") === "on",
      displayOrder: Number(form.get("displayOrder") ?? 0),
      options,
    });
    revalidatePath("/categories");
    redirect(r.ok ? `/categories?pick=${categoryId}&ok=1` : `/categories?pick=${categoryId}&error=${encodeURIComponent(r.error ?? "error")}`);
  }

  async function removeAttribute(form: FormData) {
    "use server";
    const ses = (await auth()) as { accessToken?: string } | null;
    if (!ses?.accessToken) return;
    const categoryId = String(form.get("categoryId"));
    const r = await adminSend(storeApi(), `/api/categories/attributes/${form.get("id")}`,
      ses.accessToken, "DELETE");
    revalidatePath("/categories");
    redirect(r.ok ? `/categories?pick=${categoryId}&ok=1` : `/categories?pick=${categoryId}&error=${encodeURIComponent(r.error ?? "error")}`);
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
      {searchParams.error ? (
        <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
          Hata: {searchParams.error}
        </div>
      ) : null}

      {/* Kategori listesi + yeni category */}
      <section style={{ display: "grid", gap: 10 }}>
        <h2 style={{ fontSize: 17, margin: 0 }}>Kategoriler ({categories.length})</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {categories.map((k) => (
            <a key={k.id} href={`/categories?pick=${k.id}`}
               className={`gg-btn ${k.id === selected ? "gg-btn-primary" : "gg-btn-ghost"}`}
               style={{ fontSize: 12.5, padding: "5px 12px" }}>
              {k.name} {k.subCategories.length > 0 ? `(${k.subCategories.length})` : ""}
            </a>
          ))}
        </div>
        <form action={addCategory} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input name="name" required className="gg-search" placeholder="Yeni kategori adı"
                 style={{ flex: 1, minWidth: 200 }} />
          <input name="slug" className="gg-search" placeholder="slug (otomatik)" style={{ width: 160 }} />
          <button className="gg-btn gg-btn-primary" type="submit">+ Kategori</button>
        </form>
      </section>

      {selectedCategory ? (
        <>
          {/* Alt categories */}
          <section style={{ display: "grid", gap: 10 }}>
            <h2 style={{ fontSize: 17, margin: 0 }}>
              {selectedCategory.name} · Alt Kategoriler ({selectedCategory.subCategories.length})
            </h2>
            {selectedCategory.subCategories.length === 0 ? (
              <p style={{ color: "var(--gg-muted)", fontSize: 13.5, margin: 0 }}>Alt category yok.</p>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selectedCategory.subCategories.map((sc) => (
                  <span key={sc.id} style={{
                    background: "var(--gg-primary-soft)", color: "var(--gg-primary-dark)",
                    borderRadius: 999, padding: "4px 12px", fontSize: 12.5,
                  }}>{sc.name}</span>
                ))}
              </div>
            )}
            <form action={addSubCategory} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input type="hidden" name="categoryId" value={selectedCategory.id} />
              <input name="name" required className="gg-search" placeholder="Alt kategori adı"
                     style={{ flex: 1, minWidth: 200 }} />
              <button className="gg-btn gg-btn-ghost" type="submit">+ Alt category</button>
            </form>
          </section>

          {/* Özellikler */}
          <section style={{ display: "grid", gap: 10 }}>
            <h2 style={{ fontSize: 17, margin: 0 }}>
              {selectedCategory.name} · Ürün Özellikleri ({attributes.length})
            </h2>

            {attributes.length === 0 ? (
              <p style={{ color: "var(--gg-muted)", fontSize: 13.5, margin: 0 }}>
                Bu kategoride özellik tanımlı değil.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {attributes.map((o) => (
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
                    <form action={removeAttribute}>
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="categoryId" value={selectedCategory.id} />
                      <button className="gg-btn gg-btn-ghost" type="submit" style={{ fontSize: 12 }}>Sil</button>
                    </form>
                  </article>
                ))}
              </div>
            )}

            <form action={addAttribute} className="gg-card" style={{ display: "grid", gap: 10 }}>
              <input type="hidden" name="categoryId" value={selectedCategory.id} />
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
                  Alt category (ops.)
                  <select name="subCategoryId" className="gg-search">
                    <option value="">Tüm kategoriler</option>
                    {selectedCategory.subCategories.map((sc) => (
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
