import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import type { JWT } from "next-auth/jwt";

// Access token bitmeden bu kadar sn önce yenile (test için env ile şişirilebilir).
const REFRESH_SKEW = Number(process.env.AUTH_REFRESH_SKEW ?? 60);

/** Keycloak access token'ından realm rollerini çıkarır (ADMIN menüsü için). */
function rolesFrom(accessToken?: string): string[] {
  try {
    const payload = accessToken?.split(".")[1];
    if (!payload) return [];
    return JSON.parse(Buffer.from(payload, "base64url").toString()).realm_access?.roles ?? [];
  } catch {
    return [];
  }
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const res = await fetch(
      `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: process.env.KEYCLOAK_CLIENT_ID!,
          client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
          refresh_token: token.refreshToken as string,
        }),
      }
    );
    const data = (await res.json()) as {
      access_token: string;
      expires_in?: number;
      refresh_token?: string;
    };
    if (!res.ok) throw data;
    console.log("[auth] access token refreshed");
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Keycloak({
      issuer: process.env.KEYCLOAK_ISSUER,
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // İlk giriş: token + refresh_token + bitiş zamanını sakla.
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.roles = rolesFrom(account.access_token);
        return token;
      }
      // Süresi dolmadıysa aynen kullan.
      const expiresAt = token.expiresAt as number | undefined;
      if (expiresAt && Date.now() / 1000 < expiresAt - REFRESH_SKEW) return token;
      // Doldu/dolmak üzere: refresh_token ile yenile.
      if (!token.refreshToken) return token;
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      (session as unknown as { accessToken?: string }).accessToken =
        token.accessToken as string | undefined;
      // Roller (realm_access) — ADMIN'e yönetim linki göstermek için.
      (session as unknown as { roles?: string[] }).roles = token.roles as string[] | undefined;
      return session;
    },
  },
});
