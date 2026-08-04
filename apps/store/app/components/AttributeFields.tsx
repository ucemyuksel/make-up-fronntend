"use client";

import * as React from "react";

/**
 * Kategoriye göre değişen ürün özelliği alanları.
 *
 * <p>Kategori/alt kategori seçilince tanımlar sunucudan çekilir ve form alanları
 * yeniden çizilir. Değerler tek gizli alanda JSON olarak gönderilir — server
 * action tarafında {@code attributes} olarak parse edilir.
 */

type Option = { value: string; label: string };
type Attribute = {
  id: string;
  key: string;
  label: string;
  type: "TEXT" | "NUMBER" | "SELECT" | "BOOLEAN";
  unit: string | null;
  required: boolean;
  variantDefining: boolean;
  options: Option[];
};

type Category = { id: string; name: string; subCategories?: { id: string; name: string }[] };

export function AttributeFields({ categories }: { categories: Category[] }) {
  const [categoryId, setCategoryId] = React.useState("");
  const [subId, setAltId] = React.useState("");
  const [attributes, setAttributes] = React.useState<Attribute[]>([]);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);

  const selected = categories.find((k) => k.id === categoryId);
  const subCategories = selected?.subCategories ?? [];

  React.useEffect(() => {
    if (!categoryId) {
      setAttributes([]);
      setValues({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams({ categoryId: categoryId });
    if (subId) qs.set("subCategoryId", subId);

    fetch(`/api/attributes?${qs}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Attribute[]) => {
        if (cancelled) return;
        setAttributes(Array.isArray(d) ? d : []);
        // Kategori değişince eski değerler taşınmaz — başka kategorinin
        // özelliği yanlışlıkla kaydedilmesin.
        setValues({});
      })
      .catch(() => !cancelled && setAttributes([]))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [categoryId, subId]);

  const write = (key: string, v: string) => setValues((d) => ({ ...d, [key]: v }));
  const lbl: React.CSSProperties = { display: "grid", gap: 4, fontSize: 13 };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <input type="hidden" name="categoryId" value={categoryId} />
      <input type="hidden" name="subCategoryId" value={subId} />
      <input type="hidden" name="attributes" value={JSON.stringify(values)} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={lbl}>
          Kategori
          <select className="gg-search" value={categoryId}
                  onChange={(e) => { setCategoryId(e.target.value); setAltId(""); }}>
            <option value="">Seçiniz…</option>
            {categories.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
        </label>

        <label style={lbl}>
          Alt category
          <select className="gg-search" value={subId} onChange={(e) => setAltId(e.target.value)}
                  disabled={subCategories.length === 0}>
            <option value="">{subCategories.length === 0 ? "Alt kategori yok" : "Tümü"}</option>
            {subCategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>

      {/* Kategoriye özel özellikler */}
      {loading ? (
        <div style={{ fontSize: 13, color: "var(--gg-muted)" }}>Özellikler yükleniyor…</div>
      ) : attributes.length > 0 ? (
        <div style={{ display: "grid", gap: 10, borderTop: "1px solid var(--gg-border)", paddingTop: 12 }}>
          <strong style={{ fontSize: 14 }}>
            📋 {selected?.name} Özellikleri
            <span style={{ fontWeight: 400, fontSize: 12, color: "var(--gg-muted)" }}>
              {" "}— zorunlu alanlar (*) doldurulmadan ürün kaydedilmez
            </span>
          </strong>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {attributes.map((o) => (
              <label key={o.id} style={lbl}>
                {o.label}{o.unit ? ` (${o.unit})` : ""}{o.required ? " *" : ""}
                {o.variantDefining ? (
                  <span style={{ fontSize: 11, color: "var(--gg-primary)" }}>varyant belirleyici</span>
                ) : null}

                {o.type === "SELECT" ? (
                  <select className="gg-search" value={values[o.key] ?? ""} required={o.required}
                          onChange={(e) => write(o.key, e.target.value)}>
                    <option value="">Seçiniz…</option>
                    {o.options.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                ) : o.type === "BOOLEAN" ? (
                  <select className="gg-search" value={values[o.key] ?? ""} required={o.required}
                          onChange={(e) => write(o.key, e.target.value)}>
                    <option value="">Seçiniz…</option>
                    <option value="true">Evet</option>
                    <option value="false">Hayır</option>
                  </select>
                ) : (
                  <input className="gg-search" required={o.required}
                         inputMode={o.type === "NUMBER" ? "decimal" : "text"}
                         value={values[o.key] ?? ""}
                         onChange={(e) => write(o.key, e.target.value)}
                         placeholder={o.type === "NUMBER" ? "ör. 3,5" : ""} />
                )}
              </label>
            ))}
          </div>
        </div>
      ) : categoryId ? (
        <div style={{ fontSize: 12.5, color: "var(--gg-muted)" }}>
          Bu kategoride tanımlı özellik yok.
        </div>
      ) : null}
    </div>
  );
}
