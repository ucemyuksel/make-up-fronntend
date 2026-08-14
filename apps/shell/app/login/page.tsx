import * as React from "react";
import { redirect } from "next/navigation";
import { Card, LoginForm } from "@makeup/ui";
import { AuthError } from "next-auth";
import { enabledCountries } from "@makeup/auth";
import { auth, signIn } from "../../auth";

export const metadata = { title: "Giriş yap · GlamGuide" };

/**
 * Giriş — <b>kendi formumuz</b>.
 *
 * <p>Kimlik doğrulama Keycloak'ta; kullanıcı Keycloak'ın barındırdığı sayfaya
 * <b>gitmiyor</b>. Form, marka ve hata metinleri bizde. Keycloak arkada
 * kimlik sağlayıcı olarak kalıyor: kullanıcılar, roller, parola politikası ve
 * kaba kuvvet koruması orada.
 *
 * <p>Ülke seçimi var çünkü her ülkenin hesapları ayrı realm'de tutuluyor;
 * hangi realm'e sorulacağı kullanıcıdan öğrenilmeli.
 *
 * <p><b>Hata mesajı bilerek tek tip:</b> "kullanıcı yok" ile "parola yanlış"
 * ayrımı, hangi e-postaların kayıtlı olduğunu sızdırırdı.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string; country?: string };
}) {
  const session = await auth();
  if (session) redirect(searchParams.callbackUrl ?? "/");

  const countries = enabledCountries();
  const callbackUrl = searchParams.callbackUrl ?? "/";

  async function girisYap(formData: FormData) {
    "use server";
    const country = String(formData.get("country") ?? "tr");
    try {
      await signIn("kendi-form", {
        email: String(formData.get("email") ?? "").trim(),
        password: String(formData.get("password") ?? ""),
        country: country,
        redirectTo: callbackUrl,
      });
    } catch (e) {
      // signIn başarıda da yönlendirme için hata fırlatır; onu yutarsak
      // giriş hiç çalışmaz. Yalnız AuthError yakalanır.
      if (e instanceof AuthError) {
        redirect(`/login?error=1&ulke=${country}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }
      throw e;
    }
  }

  return (
    <main style={{ maxWidth: 440, margin: "10vh auto", padding: "0 20px" }}>
      <Card>
        <div style={{ padding: 28 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 26 }}>Giriş yap</h1>
          <p style={{ margin: "0 0 22px", opacity: 0.7, fontSize: 14 }}>
            Hesabınla devam et.
          </p>

          <LoginForm
            action={girisYap}
            countries={countries}
            defaultCountry={searchParams.country}
            error={Boolean(searchParams.error)}
          />

          <p style={{ margin: "22px 0 0", fontSize: 14, textAlign: "center" }}>
            Hesabın yok mu? <a href="/register">Üye ol</a>
          </p>
          <p style={{ margin: "10px 0 0", fontSize: 13, textAlign: "center", opacity: 0.7 }}>
            Mağaza sahibi misin?{" "}
            <a href={process.env.NEXT_PUBLIC_SELLER_URL ?? "http://localhost:3006"}>Satıcı girişi</a>
          </p>
        </div>
      </Card>
    </main>
  );
}
