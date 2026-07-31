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
type Ozellik = {
  id: string;
  key: string;
  label: string;
  type: "TEXT" | "NUMBER" | "SELECT" | "BOOLEAN";
  unit: string | null;
  required: boolean;
  variantDefining: boolean;
  options: Option[];
};

type Kategori = { id: string; name: string; subCategories?: { id: string; name: string }[] };

export function AttributeFields({ kategoriler }: { kategoriler: Kategori[] }) {
  const [kategoriId, setKategoriId] = React.useState("");
  const [altId, setAltId] = React.useState("");
  const [ozellikler, setOzellikler] = React.useState<Ozellik[]>([]);
  const [degerler, setDegerler] = React.useState<Record<string, string>>({});
  const [yukleniyor, setYukleniyor] = React.useState(false);

  const secili = kategoriler.find((k) => k.id === kategoriId);
  const altlar = secili?.subCategories ?? [];

  React.useEffect(() => {
    if (!kategoriId) {
      setOzellikler([]);
      setDegerler({});
      return;
    }
    let iptal = false;
    setYukleniyor(true);
    const qs = new URLSearchParams({ categoryId: kategoriId });
    if (altId) qs.set("subCategoryId", altId);

    fetch(`/api/ozellikler?${qs}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Ozellik[]) => {
        if (iptal) return;
        setOzellikler(Array.isArray(d) ? d : []);
        // Kategori değişince eski değerler taşınmaz — başka kategorinin
        // özelliği yanlışlıkla kaydedilmesin.
        setDegerler({});
      })
      .catch(() => !iptal && setOzellikler([]))
      .finally(() => !iptal && setYukleniyor(false));

    return () => {
      iptal = true;
    };
  }, [kategoriId, altId]);

  const yaz = (key: string, v: string) => setDegerler((d) => ({ ...d, [key]: v }));
  const lbl: React.CSSProperties = { display: "grid", gap: 4, fontSize: 13 };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <input type="hidden" name="categoryId" value={kategoriId} />
      <input type="hidden" name="subCategoryId" value={altId} />
      <input type="hidden" name="attributes" value={JSON.stringify(degerler)} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={lbl}>
          Kategori
          <select className="gg-search" value={kategoriId}
                  onChange={(e) => { setKategoriId(e.target.value); setAltId(""); }}>
            <option value="">Seçiniz…</option>
            {kategoriler.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
        </label>

        <label style={lbl}>
          Alt kategori
          <select className="gg-search" value={altId} onChange={(e) => setAltId(e.target.value)}
                  disabled={altlar.length === 0}>
            <option value="">{altlar.length === 0 ? "Alt kategori yok" : "Tümü"}</option>
            {altlar.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>

      {/* Kategoriye özel özellikler */}
      {yukleniyor ? (
        <div style={{ fontSize: 13, color: "var(--gg-muted)" }}>Özellikler yükleniyor…</div>
      ) : ozellikler.length > 0 ? (
        <div style={{ display: "grid", gap: 10, borderTop: "1px solid var(--gg-border)", paddingTop: 12 }}>
          <strong style={{ fontSize: 14 }}>
            📋 {secili?.name} Özellikleri
            <span style={{ fontWeight: 400, fontSize: 12, color: "var(--gg-muted)" }}>
              {" "}— zorunlu alanlar (*) doldurulmadan ürün kaydedilmez
            </span>
          </strong>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {ozellikler.map((o) => (
              <label key={o.id} style={lbl}>
                {o.label}{o.unit ? ` (${o.unit})` : ""}{o.required ? " *" : ""}
                {o.variantDefining ? (
                  <span style={{ fontSize: 11, color: "var(--gg-primary)" }}>varyant belirleyici</span>
                ) : null}

                {o.type === "SELECT" ? (
                  <select className="gg-search" value={degerler[o.key] ?? ""} required={o.required}
                          onChange={(e) => yaz(o.key, e.target.value)}>
                    <option value="">Seçiniz…</option>
                    {o.options.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                ) : o.type === "BOOLEAN" ? (
                  <select className="gg-search" value={degerler[o.key] ?? ""} required={o.required}
                          onChange={(e) => yaz(o.key, e.target.value)}>
                    <option value="">Seçiniz…</option>
                    <option value="true">Evet</option>
                    <option value="false">Hayır</option>
                  </select>
                ) : (
                  <input className="gg-search" required={o.required}
                         inputMode={o.type === "NUMBER" ? "decimal" : "text"}
                         value={degerler[o.key] ?? ""}
                         onChange={(e) => yaz(o.key, e.target.value)}
                         placeholder={o.type === "NUMBER" ? "ör. 3,5" : ""} />
                )}
              </label>
            ))}
          </div>
        </div>
      ) : kategoriId ? (
        <div style={{ fontSize: 12.5, color: "var(--gg-muted)" }}>
          Bu kategoride tanımlı özellik yok.
        </div>
      ) : null}
    </div>
  );
}
