import * as React from "react";

export type LoginCountry = { code: string; label: string };

/**
 * The shared sign-in form - <b>authentication in Keycloak, UI ours</b>.
 *
 * <p>The user never visits the page hosted by Keycloak; the form, the brand
 * and the error text are all here. Keycloak stays behind it as the identity
 * provider: users, roles, password policy and brute-force protection
 * orada.
 *
 * <p><b>Why it is a shared component:</b> four apps (shell, seller, admin,
 * cms) each had their own form and the copies had diverged - admin and cms were
 * still calling a provider that no longer existed
 * ({@code signIn("keycloak")}), so their sign-in buttons did nothing at all.
 *
 * <p>The server action ({@code action}) is supplied from outside: every app
 * has its own Auth.js instance, so {@code signIn} cannot move into the shared
 * package.
 */
export function LoginForm({
  action,
  countries,
  defaultCountry,
  error,
  emailPlaceholder = "ornek@eposta.com",
}: {
  /** Server action: reads the email, password and country fields. */
  action: (formData: FormData) => void | Promise<void>;
  countries: LoginCountry[];
  defaultCountry?: string;
  /** When set, the error box is shown. */
  error?: boolean;
  emailPlaceholder?: string;
}) {
  const secili = defaultCountry ?? countries[0]?.code ?? "tr";

  return (
    <>
      {error ? (
        <p
          role="alert"
          style={{
            margin: "0 0 16px", padding: "10px 12px", borderRadius: 8,
            background: "rgba(200,40,40,.1)", color: "#b02", fontSize: 14, lineHeight: 1.6,
          }}
        >
          {/* Bilerek TEK TIP mesaj: "kullanıcı yok" ile "parola yanlış" ayrımı,
              hangi e-postaların kayıtlı olduğunu sızdırırdı. */}
          E-posta veya parola hatalı. Çok sayıda başarısız denemeden sonra hesap
          bir süre kilitlenir.
        </p>
      ) : null}

      <form action={action} style={{ display: "grid", gap: 14 }}>
        {countries.length > 1 ? (
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            Ülke
            <select name="country" defaultValue={secili} className="gg-search">
              {countries.map((u) => (
                <option key={u.code} value={u.code}>{u.label}</option>
              ))}
            </select>
            <span style={{ opacity: 0.6, fontSize: 12 }}>
              Hesabınızın açıldığı ülke. Her ülkenin hesapları ayrı tutulur.
            </span>
          </label>
        ) : (
          <input type="hidden" name="country" value={secili} />
        )}

        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          E-posta
          <input name="email" type="email" required autoComplete="username"
                 className="gg-search" placeholder={emailPlaceholder} />
        </label>

        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          Parola
          <input name="password" type="password" required autoComplete="current-password"
                 className="gg-search" placeholder="••••••••" />
        </label>

        <button type="submit" className="gg-btn gg-btn-primary"
                style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
          Giriş yap
        </button>
      </form>
    </>
  );
}
