import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import type { JWT } from "next-auth/jwt";

function rolesFrom(token?: string) {
  try {
    const payload = token?.split(".")[1];
    if (!payload) return [];
    return JSON.parse(Buffer.from(payload, "base64url").toString()).realm_access?.roles ?? [];
  } catch { return []; }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [Keycloak({ issuer: process.env.KEYCLOAK_ISSUER, clientId: process.env.KEYCLOAK_CLIENT_ID, clientSecret: process.env.KEYCLOAK_CLIENT_SECRET })],
  callbacks: {
    async jwt({ token, account }) {
      if (account) { token.accessToken = account.access_token; token.roles = rolesFrom(account.access_token); }
      return token;
    },
    async session({ session, token }) {
      (session as { accessToken?: string; roles?: string[] }).accessToken = token.accessToken as string | undefined;
      (session as { roles?: string[] }).roles = token.roles as string[] | undefined;
      return session;
    }
  }
});
