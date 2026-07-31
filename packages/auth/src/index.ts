import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import type { JWT } from "next-auth/jwt";
import { countryFromIssuer, enabledCountries, providerId, realmName } from "./countries";

export { COUNTRIES, enabledCountries, providerId, realmName, countryFromIssuer } from "./countries";
export type { Country } from "./countries";

/** Access token bitmeden bu kadar sn önce yenile (test için env ile şişirilebilir). */
const REFRESH_SKEW = Number(process.env.AUTH_REFRESH_SKEW ?? 60);

const keycloakUrl = () => process.env.KEYCLOAK_URL ?? "http://localhost:8080";

/** Access token'ın gövdesini çözer (imza doğrulaması backend'de yapılır). */
function decode(accessToken?: string): Record<string, unknown> | undefined {
  try {
    const payload = accessToken?.split(".")[1];
    if (!payload) return undefined;
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return undefined;
  }
}

function rolesFrom(accessToken?: string): string[] {
  const claims = decode(accessToken) as { realm_access?: { roles?: string[] } } | undefined;
  return claims?.realm_access?.roles ?? [];
}

/**
 * Jetonu veren realm. Yenileme bu adrese yapılmalı — sabit bir issuer
 * kullanılırsa DE'den giren kullanıcının jetonu TR realm'inde yenilenmeye
 * çalışılır ve oturum sessizce düşer.
 */
function issuerFrom(accessToken?: string): string | undefined {
  const claims = decode(accessToken) as { iss?: string } | undefined;
  return claims?.iss;
}

/**
 * Her pazar için ayrı sağlayıcı. Auth.js issuer'ı çalışma anında
 * değiştiremediği için ülke başına bir sağlayıcı tanımlanır; kullanıcı
 * ülkesini seçer, `signIn("keycloak-de")` o realm'e gider.
 */
function keycloakProviders() {
  const providers = enabledCountries().map((country) =>
    Keycloak({
      id: providerId(country.code),
      name: country.label,
      issuer: `${keycloakUrl()}/realms/${realmName(country.code)}`,
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    })
  );

  // Çok kiracılığa geçmeden önce açılmış hesaplar. Kasıtlı olarak yalnızca
  // env verilirse eklenir — unutulup üretime taşınmasın.
  if (process.env.KEYCLOAK_LEGACY_ISSUER) {
    providers.push(
      Keycloak({
        id: "keycloak",
        name: "Eski hesap",
        issuer: process.env.KEYCLOAK_LEGACY_ISSUER,
        clientId: process.env.KEYCLOAK_CLIENT_ID,
        clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      })
    );
  }
  return providers;
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  const issuer = token.issuer as string | undefined;
  if (!issuer) {
    console.error("[auth] jeton issuer'i yok, yenilenemez");
    return { ...token, error: "RefreshTokenError" };
  }
  try {
    const res = await fetch(`${issuer}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.KEYCLOAK_CLIENT_ID!,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
        refresh_token: token.refreshToken as string,
      }),
    });
    const data = (await res.json()) as {
      access_token: string;
      expires_in?: number;
      refresh_token?: string;
    };
    if (!res.ok) throw data;
    return {
      ...token,
      accessToken: data.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + Number(data.expires_in ?? 900),
      refreshToken: data.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (e) {
    console.error("[auth] token refresh failed", e);
    return { ...token, error: "RefreshTokenError" };
  }
}

/**
 * Tüm mikro-frontend'lerin ortak Auth.js kurulumu.
 *
 * Daha önce her uygulama kendi kopyasını taşıyordu ve kopyalar ayrışmıştı —
 * admin uygulamasında jeton yenileme hiç yoktu, oturum 15 dakikada düşüyordu.
 */
export function createAuth() {
  return NextAuth({
    trustHost: true,
    providers: keycloakProviders(),
    callbacks: {
      async jwt({ token, account }) {
        if (account) {
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.expiresAt = account.expires_at;
          token.roles = rolesFrom(account.access_token);
          token.issuer = issuerFrom(account.access_token);
          token.country = countryFromIssuer(token.issuer as string | undefined);
          return token;
        }
        const expiresAt = token.expiresAt as number | undefined;
        if (expiresAt && Date.now() / 1000 < expiresAt - REFRESH_SKEW) return token;
        if (!token.refreshToken) return token;
        return refreshAccessToken(token);
      },
      async session({ session, token }) {
        const s = session as unknown as {
          accessToken?: string;
          roles?: string[];
          country?: string;
          error?: string;
        };
        s.accessToken = token.accessToken as string | undefined;
        s.roles = token.roles as string[] | undefined;
        s.country = token.country as string | undefined;
        s.error = token.error as string | undefined;
        return session;
      },
    },
  });
}
