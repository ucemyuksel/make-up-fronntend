import * as React from "react";
import { redirect } from "next/navigation";
import { Card, LoginForm } from "@makeup/ui";
import { AuthError } from "next-auth";
import { enabledCountries } from "@makeup/auth";
import { auth, signIn } from "../../auth";

export const metadata = { title: "Giriş yap · Mağaza" };

/**
 * Giris - KENDI formumuz. Kimlik dogrulama Keycloak'ta; kullanici Keycloak'in
 * barindirdigi sayfaya GITMEZ.
 *
 * <p>Bu sayfa eksikti: createAuth {@code pages.signIn = "/login"} ayarliyor ve
 * oturumsuz kullanici buraya gonderiliyordu, ama sayfa olmadigi icin 404
 * goruyordu.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string; ulke?: string };
}) {
  const session = await auth();
  if (session) redirect(searchParams.callbackUrl ?? "/");

  const ulkeler = enabledCountries();
  const callbackUrl = searchParams.callbackUrl ?? "/";

  async function girisYap(formData: FormData) {
    "use server";
    const ulke = String(formData.get("country") ?? "tr");
    try {
      await signIn("kendi-form", {
        email: String(formData.get("email") ?? "").trim(),
        password: String(formData.get("password") ?? ""),
        country: ulke,
        redirectTo: callbackUrl,
      });
    } catch (e) {
      // signIn basarida da yonlendirme icin hata firlatir; yutarsak giris
      // hic calismaz. Yalniz AuthError yakalanir.
      if (e instanceof AuthError) {
        redirect(`/login?error=1&ulke=${ulke}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }
      throw e;
    }
  }

  return (
    <main style={{ maxWidth: 440, margin: "10vh auto", padding: "0 20px" }}>
      <Card>
        <div style={{ padding: 28 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 26 }}>Giriş yap</h1>
          <p style={{ margin: "0 0 22px", opacity: 0.7, fontSize: 14, lineHeight: 1.6 }}>
            Alışverişe devam etmek için giriş yapın.
          </p>

          <LoginForm
            action={girisYap}
            countries={ulkeler}
            defaultCountry={searchParams.ulke}
            error={Boolean(searchParams.error)}
          />

          <p style={{ margin: "20px 0 0", fontSize: 13, textAlign: "center", opacity: 0.7 }}>
            Mağaza sahibi misiniz?{" "}
            <a href={process.env.NEXT_PUBLIC_SELLER_URL ?? "http://localhost:3006"}>Satıcı girişi</a>
          </p>
        </div>
      </Card>
    </main>
  );
}
