import * as React from "react";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { LoginForm } from "@makeup/ui";
import { enabledCountries } from "@makeup/auth";
import { auth, signIn } from "../../auth";

export const metadata = { title: "Satıcı Girişi · GlamGuide" };

/**
 * Satıcı girişi — <b>kendi formumuz</b>.
 *
 * <p>Kimlik doğrulama yine Keycloak'ta; kullanıcı Keycloak'ın barındırdığı
 * sayfaya <b>gitmiyor</b>. Form burada, marka burada, hata mesajları burada.
 * Keycloak arkada kimlik sağlayıcı olarak kalıyor: kullanıcılar, roller,
 * parola politikası ve kaba kuvvet koruması orada.
 *
 * <p><b>Neden müşteri girişinden ayrı:</b> buraya giren kişi mağaza yönetmeye
 * geliyor, alışverişe değil. Ortak bir kapı iki farklı işi birleştirir ve
 * rolü olmayan biri neden içeri alınmadığını anlamaz — burada bunu açıkça
 * söylüyoruz.
 *
 * <p><b>Hata mesajları bilerek tek tip:</b> "kullanıcı yok" ile "parola
 * yanlış" ayrımı, hangi e-postaların kayıtlı olduğunu sızdırırdı.
 */
export default async function SellerSignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string; country?: string };
}) {
  const session = (await auth()) as { roles?: string[] } | null;
  const roller = session?.roles ?? [];
  const isSeller = roller.includes("STORE_OWNER") || roller.includes("STORE_STAFF")
    || roller.includes("ADMIN");

  // Oturum var ve satıcıysa panele. Oturum var ama rolü yoksa aşağıdaki
  // açıklama gösterilir — sessizce giriş ekranına geri atmak kullanıcıyı
  // "şifremi mi yanlış girdim" döngüsüne sokardı.
  if (session && isSeller) {
    redirect(searchParams.callbackUrl ?? "/seller");
  }

  const countries = enabledCountries();
  const callbackUrl = searchParams.callbackUrl ?? "/seller";

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
      // signIn başarılı olduğunda da yönlendirme için hata fırlatır; onu
      // yutmamak gerekir, yoksa giriş çalışmaz.
      if (e instanceof AuthError) {
        redirect(`/login?error=1&ulke=${country}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }
      throw e;
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "8vh auto", padding: "0 20px" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32,
                    boxShadow: "0 2px 24px rgba(0,0,0,.06)" }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: 2, opacity: 0.55 }}>GLAMGUIDE</p>
        <h1 style={{ margin: "6px 0 4px", fontSize: 26 }}>Satıcı Girişi</h1>
        <p style={{ margin: "0 0 24px", opacity: 0.7, fontSize: 14, lineHeight: 1.6 }}>
          Mağaza sahibi ve mağaza personeli için. Alışveriş hesabınızla değil,
          mağaza hesabınızla girin.
        </p>

        {session && !isSeller ? (
          <div role="alert" style={{ margin: "0 0 18px", padding: "12px 14px", borderRadius: 10,
                                     background: "#FBE6E6", color: "#B42318", fontSize: 14 }}>
            <strong>Bu hesabın mağaza yetkisi yok.</strong>
            <p style={{ margin: "6px 0 0", lineHeight: 1.6 }}>
              Giriş yaptınız ama hesabınız bir mağazaya bağlı değil. Mağaza
              sahibiyseniz mağazanızı açmanız, personelseniz mağaza sahibinin
              sizi eklemesi gerekiyor.
            </p>
          </div>
        ) : null}

        <LoginForm
          action={girisYap}
          countries={countries}
          defaultCountry={searchParams.country}
          error={Boolean(searchParams.error)}
          emailPlaceholder="magaza@ornek.com"
        />

        <p style={{ margin: "20px 0 0", fontSize: 13, textAlign: "center", opacity: 0.7 }}>
          Alışveriş yapmak istiyorsanız{" "}
          <a href={process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:3002"}>mağazaya gidin</a>.
        </p>
      </div>
    </main>
  );
}
