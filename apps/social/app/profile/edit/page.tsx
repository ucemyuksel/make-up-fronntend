import * as React from "react";
import { Badge } from "@makeup/ui";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";

export const metadata = { title: "Profili Düzenle — GlamGuide" };

type Profile = {
  displayName: string;
  phoneCountryCode: string | null;
  phone: string | null;
  phoneE164: string | null;
  bio: string | null;
  avatarColorHex: string | null;
};
type Country = { code: string; name: string; dialCode: string | null; featured: boolean };

const USER_API = () => process.env.USER_API ?? "http://localhost:8082";
const STORE_API = () => process.env.STORE_API ?? "http://localhost:8084";

/**
 * Profil düzenleme. Telefon <b>ülke kodu + ulusal numara</b> olarak alınır;
 * kod listesi store-service'teki coğrafi referans verisinden gelir (sabit
 * kodlu list yok).
 */
export default async function ProfileEdit({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string };
}) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    redirect("/login?callbackUrl=%2Fprofile%2Fduzenle");
  }

  const [profile, countries] = await Promise.all([
    fetch(`${USER_API()}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).then((r) => (r.ok ? (r.json() as Promise<Profile>) : null)).catch(() => null),
    fetch(`${STORE_API()}/api/geo/countries`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Country[]>) : []))
      .catch(() => [] as Country[]),
  ]);

  const kodlu = countries.filter((u) => u.dialCode);
  const selectedCode = profile?.phoneCountryCode ?? "+90";

  async function save(formData: FormData) {
    "use server";
    const s = await auth();
    const t = (s as unknown as { accessToken?: string } | null)?.accessToken;
    if (!t) return;

    let res: Response | null = null;
    try {
      res = await fetch(`${USER_API()}/api/users/me`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: String(formData.get("displayName") ?? "").trim(),
          phoneCountryCode: String(formData.get("phoneCountryCode") ?? "+90"),
          phone: String(formData.get("phone") ?? "").trim(),
          bio: String(formData.get("bio") ?? "").trim(),
          avatarColorHex: String(formData.get("avatarColorHex") ?? "#F6C6D8"),
        }),
        cache: "no-store",
      });
    } catch {
      res = null;
    }
    revalidatePath("/profile/edit");
    revalidatePath("/profile");
    // redirect() try/catch dışında — NEXT_REDIRECT yutulmasın.
    if (!res || !res.ok) {
      redirect(`/profile/edit?error=${encodeURIComponent(res ? `HTTP ${res.status}` : "Sunucuya ulaşılamadı")}`);
    }
    redirect("/profile/edit?ok=1");
  }

  const lbl: React.CSSProperties = { display: "grid", gap: 4, fontSize: 13 };

  return (
    <div style={{ maxWidth: 520, display: "grid", gap: 16 }}>
      <a href="/profile" className="gg-see-all">‹ Profile dön</a>
      <div>
        <Badge>Profil</Badge>
        <h1 style={{ margin: "8px 0 0" }}>Profili Düzenle</h1>
      </div>

      {searchParams.ok ? (
        <div style={{ background: "#E5F6EC", color: "#1E9E5A", padding: 12, borderRadius: 10 }}>
          ✓ Profilin güncellendi.
        </div>
      ) : null}
      {searchParams.error ? (
        <div style={{ background: "#FBE6E6", color: "#B42318", padding: 12, borderRadius: 10 }}>
          Kaydedilemedi: {searchParams.error}
        </div>
      ) : null}

      <form action={save} className="gg-card" style={{ display: "grid", gap: 12 }}>
        <label style={lbl}>
          Görünen ad
          <input name="displayName" required maxLength={120} className="gg-search"
                 defaultValue={profile?.displayName ?? ""} />
        </label>

        <div style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13 }}>Telefon</span>
          <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", gap: 8 }}>
            <select name="phoneCountryCode" className="gg-search" defaultValue={selectedCode}
                    aria-label="Ülke kodu">
              {kodlu.map((u) => (
                <option key={u.code} value={u.dialCode!}>
                  {u.dialCode} {u.name}
                </option>
              ))}
            </select>
            <input name="phone" className="gg-search" inputMode="tel" maxLength={24}
                   defaultValue={profile?.phone ?? ""} placeholder="532 111 22 33"
                   aria-label="Telefon numarası" />
          </div>
          <span style={{ fontSize: 11.5, color: "var(--gg-muted)" }}>
            {profile?.phoneE164
              ? `Kayıtlı: ${profile.phoneE164}`
              : "Baştaki 0'ı yazmana gerek yok — numara uluslararası biçime çevrilir."}
          </span>
        </div>

        <label style={lbl}>
          Hakkımda
          <textarea name="bio" rows={3} maxLength={500} className="gg-search"
                    defaultValue={profile?.bio ?? ""} />
        </label>

        <label style={lbl}>
          Profil rengi
          <input name="avatarColorHex" type="color" className="gg-search"
                 defaultValue={profile?.avatarColorHex ?? "#F6C6D8"}
                 style={{ height: 40, padding: 4 }} />
        </label>

        <button className="gg-btn gg-btn-primary" type="submit" style={{ justifySelf: "start" }}>
          Kaydet
        </button>
      </form>
    </div>
  );
}
