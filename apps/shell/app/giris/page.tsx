import * as React from "react";
import { redirect } from "next/navigation";
import { Card } from "@makeup/ui";
import { enabledCountries, providerId } from "@makeup/auth";
import { auth, signIn } from "../../auth";

export const metadata = { title: "Giriş yap · GlamGuide" };

/**
 * Ülke seçimli giriş. Her ülkenin hesapları ayrı Keycloak realm'inde durduğu
 * için hangi realm'e gidileceği kullanıcıdan öğrenilmeli — Auth.js sağlayıcı
 * issuer'ını çalışma anında değiştiremiyor, o yüzden ülke başına bir sağlayıcı
 * tanımlı ve seçim doğrudan sağlayıcı seçimine karşılık geliyor.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; hata?: string };
}) {
  const session = await auth();
  if (session) redirect(searchParams.callbackUrl ?? "/");

  const countries = enabledCountries();
  const callbackUrl = searchParams.callbackUrl ?? "/";

  return (
    <main style={{ maxWidth: 460, margin: "10vh auto", padding: "0 20px" }}>
      <Card>
        <div style={{ padding: 28 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 26 }}>Giriş yap</h1>
          <p style={{ margin: "0 0 22px", opacity: 0.7, fontSize: 14 }}>
            Hesabının açıldığı ülkeyi seç.
          </p>

          {searchParams.hata ? (
            <p
              role="alert"
              style={{
                margin: "0 0 16px", padding: "10px 12px", borderRadius: 8,
                background: "rgba(200,40,40,.1)", color: "#b02", fontSize: 14,
              }}
            >
              Giriş tamamlanamadı. Lütfen tekrar dene.
            </p>
          ) : null}

          <div style={{ display: "grid", gap: 10 }}>
            {countries.map((country) => (
              <form
                key={country.code}
                action={async () => {
                  "use server";
                  await signIn(providerId(country.code), { redirectTo: callbackUrl });
                }}
              >
                <button
                  type="submit"
                  className="gg-btn"
                  style={{ width: "100%", justifyContent: "space-between", display: "flex" }}
                >
                  <span>{country.label}</span>
                  <span aria-hidden style={{ opacity: 0.5, fontSize: 12 }}>
                    {country.code.toUpperCase()}
                  </span>
                </button>
              </form>
            ))}
          </div>

          <p style={{ margin: "22px 0 0", fontSize: 14, textAlign: "center" }}>
            Hesabın yok mu? <a href="/kayit">Üye ol</a>
          </p>
        </div>
      </Card>
    </main>
  );
}
