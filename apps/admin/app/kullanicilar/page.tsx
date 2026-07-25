import type { CSSProperties } from "react";
import { auth } from "../../auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminApi, adminSend } from "../lib";

export const metadata = { title: "Kullanıcı Kısıtları — GlamGuide" };

type Restriction = {
  id: string;
  userId: string;
  scope: string;
  reason: string;
  startsAt: string;
  endsAt: string | null;
  permanent: boolean;
  inEffect: boolean;
  liftedAt: string | null;
  liftNote: string | null;
  createdBy: string;
};

const SCOPES = [
  { value: "LOGIN", label: "Giriş (tam askı)" },
  { value: "POST", label: "Paylaşım" },
  { value: "COMMENT", label: "Yorum" },
  { value: "MESSAGE", label: "Mesaj" },
  { value: "STORE_OPEN", label: "Mağaza açma" },
];

const scopeLabel = (value: string) => SCOPES.find((s) => s.value === value)?.label ?? value;
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("tr-TR") : "—");
const userApi = () => process.env.USER_API ?? "http://localhost:8082";

export default async function Users({
  searchParams,
}: {
  searchParams: { user?: string; ok?: string; hata?: string };
}) {
  const session = (await auth()) as { accessToken?: string; roles?: string[] } | null;
  if (!session?.accessToken) redirect("/");
  if (!session.roles?.includes("ADMIN")) redirect("/yetkisiz");

  const filterUser = searchParams.user?.trim() ?? "";
  const query = filterUser ? `?userId=${encodeURIComponent(filterUser)}` : "";
  const items = (await adminApi<Restriction[]>(userApi(), `/api/restrictions${query}`, session.accessToken)) ?? [];

  async function applyRestriction(form: FormData) {
    "use server";
    const s = (await auth()) as { accessToken?: string } | null;
    if (!s?.accessToken) return;

    const days = Number(form.get("days") ?? 0);
    const endsAt = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null;

    const result = await adminSend(userApi(), "/api/restrictions", s.accessToken, "POST", {
      userId: String(form.get("userId") ?? "").trim(),
      scope: String(form.get("scope") ?? "POST"),
      reason: String(form.get("reason") ?? "").trim(),
      endsAt,
    });
    revalidatePath("/kullanicilar");
    redirect(result.ok ? "/kullanicilar?ok=1" : "/kullanicilar?hata=" + encodeURIComponent(result.error ?? "hata"));
  }

  async function liftRestriction(form: FormData) {
    "use server";
    const s = (await auth()) as { accessToken?: string } | null;
    if (!s?.accessToken) return;
    await adminSend(userApi(), `/api/restrictions/${form.get("id")}/lift`, s.accessToken, "POST", {
      note: String(form.get("note") ?? "").trim() || "Yönetici kararıyla kaldırıldı",
    });
    revalidatePath("/kullanicilar");
  }

  const label: CSSProperties = { display: "grid", gap: 4, fontSize: 13 };
  const inEffect = items.filter((r) => r.inEffect);
  const history = items.filter((r) => !r.inEffect);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 32, display: "grid", gap: 24 }}>
      <div>
        <a href="/">← Yönetim merkezi</a>
        <h1 style={{ margin: "8px 0 4px" }}>Kullanıcı Kısıtları</h1>
        <p style={{ color: "var(--gg-muted)", margin: 0 }}>
          Yaptırımlar <strong>gerekçe ve süre</strong> ile uygulanır. Kayıtlar silinmez — kaldırılan
          kısıtlar geçmişte kalır; kim uyguladı, kim kaldırdı görünür.
        </p>
      </div>

      {searchParams.ok ? (
        <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>
          ✓ Kısıt uygulandı.
        </div>
      ) : null}
      {searchParams.hata ? (
        <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
          Hata: {searchParams.hata}
        </div>
      ) : null}

      {/* Kısıt uygula */}
      <section className="gg-card">
        <h2 style={{ marginTop: 0, fontSize: 17 }}>⛔ Kısıt uygula</h2>
        <form action={applyRestriction} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label style={label}>
              Kullanıcı ID (Keycloak sub)
              <input name="userId" required className="gg-search" placeholder="UUID" />
            </label>
            <label style={label}>
              Kapsam
              <select name="scope" className="gg-search" defaultValue="POST">
                {SCOPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
            <label style={label}>
              Süre (gün · 0 = kalıcı)
              <input name="days" type="number" min="0" max="3650" className="gg-search" defaultValue="7" />
            </label>
          </div>
          <label style={label}>
            Gerekçe (zorunlu)
            <input name="reason" required maxLength={500} className="gg-search"
                   placeholder="Örn. Tekrarlayan spam paylaşımı — 3. uyarı" />
          </label>
          <button className="gg-btn gg-btn-primary" type="submit" style={{ justifySelf: "start" }}>
            Kısıtı Uygula
          </button>
        </form>
      </section>

      {/* Filtre */}
      <section className="gg-card">
        <form method="get" style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
          <label style={label}>
            Kullanıcıya göre filtrele (tüm geçmişini gösterir)
            <input name="user" defaultValue={filterUser} className="gg-search"
                   placeholder="Kullanıcı UUID" style={{ minWidth: 320 }} />
          </label>
          <button className="gg-btn gg-btn-primary" type="submit">Filtrele</button>
          {filterUser ? <a href="/kullanicilar" className="gg-btn gg-btn-ghost">Temizle</a> : null}
        </form>
      </section>

      {/* Yürürlükteki kısıtlar */}
      <section>
        <h2 style={{ fontSize: 17 }}>Yürürlükteki kısıtlar ({inEffect.length})</h2>
        {inEffect.length === 0 ? (
          <p style={{ color: "var(--gg-muted)" }}>Yürürlükte kısıt yok.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {inEffect.map((r) => (
              <article key={r.id} className="gg-card" style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <strong>{scopeLabel(r.scope)}</strong>
                  <span style={{
                    background: r.permanent ? "#FBE6E6" : "#FCF2DE",
                    color: r.permanent ? "#B42318" : "#C98A1E",
                    borderRadius: 999, padding: "2px 10px", fontSize: 11.5, fontWeight: 700,
                  }}>
                    {r.permanent ? "KALICI" : `${dt(r.endsAt)} tarihine kadar`}
                  </span>
                  <span style={{ flex: 1 }} />
                  <code style={{ fontSize: 11, color: "var(--gg-muted)" }}>{r.userId.slice(0, 8)}…</code>
                </div>
                <div style={{ fontSize: 13.5 }}>{r.reason}</div>
                <div style={{ fontSize: 11.5, color: "var(--gg-muted)" }}>
                  Başlangıç {dt(r.startsAt)} · uygulayan {r.createdBy.slice(0, 8)}…
                </div>
                <form action={liftRestriction} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input type="hidden" name="id" value={r.id} />
                  <input name="note" className="gg-search"
                         placeholder="Kaldırma gerekçesi (ör. itiraz kabul edildi)"
                         style={{ flex: 1, minWidth: 220 }} />
                  <button className="gg-btn gg-btn-ghost" type="submit">Kısıtı Kaldır</button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Geçmiş — denetim izi */}
      {history.length > 0 ? (
        <section>
          <h2 style={{ fontSize: 17 }}>Geçmiş ({history.length})</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {history.map((r) => (
              <article key={r.id} className="gg-card" style={{ opacity: 0.7, display: "grid", gap: 4 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <strong>{scopeLabel(r.scope)}</strong>
                  <span style={{ fontSize: 12, color: "var(--gg-muted)" }}>
                    {r.liftedAt ? `${dt(r.liftedAt)} kaldırıldı` : "süresi doldu"}
                  </span>
                </div>
                <div style={{ fontSize: 13 }}>{r.reason}</div>
                {r.liftNote ? (
                  <div style={{ fontSize: 12, color: "var(--gg-muted)" }}>Kaldırma notu: {r.liftNote}</div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
