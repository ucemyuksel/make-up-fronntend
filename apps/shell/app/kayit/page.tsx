import * as React from "react";
import { redirect } from "next/navigation";
import { Card } from "@makeup/ui";
import { enabledCountries } from "@makeup/auth";

export const metadata = { title: "Üye ol · GlamGuide" };

const USER_API = process.env.USER_API ?? "http://localhost:8082";

type ApiError = { message?: string; violations?: { message?: string }[] };

/**
 * Üyelik formu. Hesap Keycloak'ta seçilen ülkenin realm'inde açılır; parola
 * buraya yalnızca iletilir, saklanmaz — kimlik tümüyle Keycloak'ta durur.
 */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: { error?: string; tur?: string };
}) {
  const countries = enabledCountries();
  const isStore = searchParams.tur === "magaza";

  async function register(form: FormData) {
    "use server";

    const accountType = form.get("accountType") === "STORE" ? "STORE" : "CUSTOMER";
    const body = {
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
      fullName: String(form.get("fullName") ?? "").trim(),
      countryCode: String(form.get("countryCode") ?? "TR"),
      accountType,
      phoneCountryCode: String(form.get("phoneCountryCode") ?? "").trim() || undefined,
      phone: String(form.get("phone") ?? "").trim() || undefined,
    };

    let message: string | null = null;
    try {
      const res = await fetch(`${USER_API}/api/registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as ApiError;
        message = err.violations?.[0]?.message ?? err.message ?? "Kayıt tamamlanamadı.";
      }
    } catch {
      message = "Sunucuya ulaşılamadı. Lütfen tekrar dene.";
    }

    // redirect() try/catch DIŞINDA olmalı: NEXT_REDIRECT bir istisna olarak
    // atılır ve catch onu yutarsa yönlendirme sessizce kaybolur.
    if (message) {
      redirect(`/kayit?tur=${searchParams.tur ?? ""}&error=${encodeURIComponent(message)}`);
    }
    redirect("/giris?kayit=tamam");
  }

  return (
    <main style={{ maxWidth: 480, margin: "8vh auto", padding: "0 20px" }}>
      <Card>
        <form action={register} style={{ padding: 28, display: "grid", gap: 14 }}>
          <div>
            <h1 style={{ margin: "0 0 6px", fontSize: 26 }}>
              {isStore ? "Mağaza hesabı aç" : "Üye ol"}
            </h1>
            <p style={{ margin: 0, opacity: 0.7, fontSize: 14 }}>
              {isStore
                ? "Ürünlerini satmak için mağaza hesabı oluştur."
                : "Tarifleri kaydet, reels paylaş, alışveriş yap."}
            </p>
          </div>

          {searchParams.error ? (
            <p
              role="alert"
              style={{
                margin: 0, padding: "10px 12px", borderRadius: 8,
                background: "rgba(200,40,40,.1)", color: "#b02", fontSize: 14,
              }}
            >
              {searchParams.error}
            </p>
          ) : null}

          <input type="hidden" name="accountType" value={isStore ? "STORE" : "CUSTOMER"} />

          <label style={{ display: "grid", gap: 6, fontSize: 14 }}>
            {isStore ? "Mağaza adı" : "Ad soyad"}
            <input
              name="fullName" required maxLength={120} autoComplete="name"
              className="gg-search" placeholder={isStore ? "Güzellik Durağı" : "Ayşe Yılmaz"}
            />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 14 }}>
            E-posta
            <input
              name="email" type="email" required autoComplete="email"
              className="gg-search" placeholder="ornek@eposta.com"
            />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 14 }}>
            Ülke
            <select name="countryCode" defaultValue="TR" className="gg-search">
              {countries.map((c) => (
                <option key={c.code} value={c.code.toUpperCase()}>
                  {c.label}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 12, opacity: 0.6 }}>
              Hesabın bu ülkede açılır ve sonradan değiştirilemez.
            </span>
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 14 }}>
            Parola
            <input
              name="password" type="password" required minLength={10} autoComplete="new-password"
              className="gg-search"
            />
            <span style={{ fontSize: 12, opacity: 0.6 }}>
              En az 10 karakter; büyük harf, küçük harf ve rakam içermeli.
            </span>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 14 }}>
              Kod
              <input name="phoneCountryCode" defaultValue="+90" maxLength={6} className="gg-search" />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 14 }}>
              Telefon (isteğe bağlı)
              <input
                name="phone" inputMode="tel" maxLength={24} autoComplete="tel"
                className="gg-search" placeholder="532 111 22 33"
              />
            </label>
          </div>

          <button type="submit" className="gg-btn gg-btn-primary" style={{ marginTop: 4 }}>
            {isStore ? "Mağaza hesabı oluştur" : "Üye ol"}
          </button>

          <p style={{ margin: 0, fontSize: 14, textAlign: "center" }}>
            {isStore ? (
              <a href="/kayit">Bireysel hesap aç</a>
            ) : (
              <a href="/kayit?tur=magaza">Mağaza hesabı açmak istiyorum</a>
            )}
            {" · "}
            <a href="/giris">Zaten hesabım var</a>
          </p>
        </form>
      </Card>
    </main>
  );
}
