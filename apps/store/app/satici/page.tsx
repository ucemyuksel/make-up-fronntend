import * as React from "react";
import { SectionHeader, Badge } from "@makeup/ui";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { api, send, type Store } from "../lib";

export const metadata = { title: "Satıcı Paneli — GlamGuide" };

export default async function SaticiPanel({ searchParams }: { searchParams: { ok?: string; hata?: string } }) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  if (!token) redirect("/api/auth/signin?callbackUrl=%2Fsatici");
  const stores = (await api<Store[]>("/api/stores", token)) ?? [];

  async function magazaAc(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const r = await send("/api/stores", "POST", t, {
      name,
      slug,
      kind: String(formData.get("kind") ?? "MARKA"),
      colorHex: String(formData.get("colorHex") ?? "#EC2E7A"),
      tagline: String(formData.get("tagline") ?? ""),
    });
    revalidatePath("/satici");
    if (!r.ok) redirect(`/satici?hata=${encodeURIComponent(r.error ?? "hata")}`);
  }

  return (
    <div style={{ maxWidth: 860, display: "grid", gap: 22 }}>
      <div>
        <Badge>Satıcı Paneli</Badge>
        <h1 style={{ margin: "8px 0 0" }}>Mağazalarım</h1>
      </div>

      {searchParams.hata ? <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>Hata: {searchParams.hata}</div> : null}

      {/* Mağaza aç */}
      <form action={magazaAc} className="gg-card" style={{ display: "grid", gap: 10 }}>
        <strong>➕ Yeni Mağaza Aç</strong>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input name="name" required className="gg-search" placeholder="Mağaza adı (ör. Gratis)" />
          <input name="slug" className="gg-search" placeholder="slug (boş bırak: otomatik)" />
          <select name="kind" className="gg-search">
            <option value="MARKA">Marka</option>
            <option value="PERAKENDECI">Perakendeci</option>
          </select>
          <input name="colorHex" className="gg-search" placeholder="Renk (#EC2E7A)" defaultValue="#EC2E7A" />
        </div>
        <input name="tagline" className="gg-search" placeholder="Slogan (ör. Güzelliğin adresi)" />
        <button className="gg-btn gg-btn-primary" type="submit" style={{ justifySelf: "start" }}>Mağaza Aç</button>
      </form>

      <section>
        <SectionHeader title={`Mağazalar (${stores.length})`} />
        <div style={{ display: "grid", gap: 12 }}>
          {stores.map((st) => (
            <div key={st.id} className="gg-card" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ width: 46, height: 46, borderRadius: "50%", background: st.colorHex, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800 }}>
                {st.name.slice(0, 2).toUpperCase()}
              </span>
              <div style={{ flex: 1, minWidth: 160 }}>
                <strong>{st.name} {st.verified ? "✔️" : ""}</strong>
                <div style={{ fontSize: 12.5, color: "var(--gg-muted)" }}>{st.kind} · {st.productCount} ürün · {st.tagline}</div>
              </div>
              <a href={`/satici/urun?store=${st.id}`} className="gg-btn gg-btn-primary">Ürün Ekle</a>
              <a href={`/satici/kampanya?store=${st.id}`} className="gg-btn gg-btn-ghost">Kampanya</a>
              <a href="/satici/cache" className="gg-btn gg-btn-ghost">🧹 Cache</a>
            </div>
          ))}
          {stores.length === 0 ? <p style={{ color: "var(--gg-muted)" }}>Henüz mağaza yok — yukarıdan aç.</p> : null}
        </div>
      </section>
    </div>
  );
}
