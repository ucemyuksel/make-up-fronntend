import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import { countryFromIssuer, enabledCountries, providerId, realmName } from "./countries";

export { COUNTRIES, enabledCountries, providerId, realmName, countryFromIssuer } from "./countries";
export type { Country } from "./countries";

/** Refresh this many seconds before the access token expires (inflatable via env for tests). */
const REFRESH_SKEW = Number(process.env.AUTH_REFRESH_SKEW ?? 60);

const keycloakUrl = () => process.env.KEYCLOAK_URL ?? "http://localhost:8080";

/**
 * The client secret - <b>per realm</b>.
 *
 * <p>Every realm issues a SEPARATE secret for the same {@code clientId}. Using
 * a single {@code KEYCLOAK_CLIENT_SECRET} only works in the realm that secret
 * belongs to; sign-in from other countries is rejected with
 * {@code unauthorized_client}.
 *
 * <p>Measured: registration puts a TR user into the {@code makeup-tr} realm,
 * but the secret belonged to the {@code makeup} realm - <b>TR users could not
 * sign in at all</b>. It was misleading too, because the error surfaced as
 * "wrong password".
 *
 * <p>Lookup order: {@code KEYCLOAK_CLIENT_SECRET_TR} then the generic
 * {@code KEYCLOAK_CLIENT_SECRET}. The generic value remains for backward
 * compatibility with single-realm setups.
 */
function clientSecret(country?: string): string {
  const code = (country ?? "").toUpperCase();
  return (code && process.env[`KEYCLOAK_CLIENT_SECRET_${code}`])
    || process.env.KEYCLOAK_CLIENT_SECRET
    || "";
}

/** Decodes the access token body (signature verification happens in the backend). */
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
 * The realm that issued the token. Refresh must go to this address: with a
 * fixed issuer, a user who signed in from DE would have their token refreshed
 * against the TR realm and the session would drop silently.
 */
function issuerFrom(accessToken?: string): string | undefined {
  const claims = decode(accessToken) as { iss?: string } | undefined;
  return claims?.iss;
}

/**
 * A separate provider per market. Auth.js cannot change the issuer at
 * runtime, so one provider is declared per country; the user picks a country
 * and `signIn("keycloak-de")` goes to that realm.
 */
function keycloakProviders() {
  const providers = enabledCountries().map((country) =>
    Keycloak({
      id: providerId(country.code),
      name: country.label,
      issuer: `${keycloakUrl()}/realms/${realmName(country.code)}`,
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: clientSecret(country.code),
    })
  );

  // Accounts created before the move to multi-tenancy. Added only when the env
  // var is present, on purpose, so it cannot be forgotten and reach production.
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

/**
 * Provider for OUR OWN sign-in form - the user never visits the page hosted
 * by Keycloak; authentication happens against Keycloak in the background.
 *
 * <p><b>The cost, stated plainly:</b> in this flow the password passes through
 * our server. In the authorization code flow it would not - the user would type
 * it straight into Keycloak. In exchange the sign-in UI is entirely ours: our
 * brand, our language, our error messages.
 *
 * <p><b>How the risk is bounded:</b>
 * <ul>
 *   <li>The password is handled server-side only ({@code authorize}), never
 *       returned to the browser and <b>never logged anywhere</b>.</li>
 *   <li>Brute-force protection is enabled in Keycloak: past the attempt limit
 *       the account is temporarily locked. Because the form is ours, the rate
 *       limit has to live in Keycloak - on our side it would count per
 *       instance.</li>
 *   <li>All production traffic is TLS; the password never crosses the network
 *       in clear text.</li>
 * </ul>
 *
 * <p>The client's <b>direct access grants</b> setting must be enabled in
 * Keycloak; otherwise it returns {@code unauthorized_client}.
 */
function credentialsProvider(requireRoles?: string[]) {
  return Credentials({
    id: "kendi-form",
    name: "GlamGuide",
    credentials: {
      email: { label: "E-posta", type: "email" },
      password: { label: "Parola", type: "password" },
      country: { label: "Ülke", type: "text" },
    },
    async authorize(raw) {
      const email = String(raw?.email ?? "").trim();
      const password = String(raw?.password ?? "");
      const country = String(raw?.country ?? "tr").toLowerCase();
      if (!email || !password) return null;

      const issuer = `${keycloakUrl()}/realms/${realmName(country)}`;
      let res: Response;
      try {
        res = await fetch(`${issuer}/protocol/openid-connect/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "password",
            client_id: process.env.KEYCLOAK_CLIENT_ID!,
            client_secret: clientSecret(country),
            username: email,
            password,
            scope: "openid profile email",
          }),
        });
      } catch {
        // A network error and "wrong password" are NOT the same thing, but we do
        // not let the user tell them apart: sign-in errors are uniform so we never
        // leak which e-mail addresses exist. The reason goes to the server log.
        console.error("[auth] Keycloak'a ulasilamadi");
        return null;
      }

      if (!res.ok) {
        // The password is NOT logged. Only the status code and Keycloak's error code.
        const detail = (await res.json().catch(() => ({}))) as { error?: string };
        console.warn(`[auth] giris reddedildi (http=${res.status}, kod=${detail.error ?? "-"})`);
        return null;
      }

      const data = (await res.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };
      // ROLE GATE - at sign-in time.
      //
      // The seller panel configures this with ["STORE_OWNER","STORE_STAFF","ADMIN"]:
      // someone without the role CANNOT EVEN OPEN A SESSION there. Left at page
      // level, the user would hold a valid panel session and be rejected page by
      // page; forget the check on one page and the door stands open.
      if (requireRoles?.length) {
        const roller = rolesFrom(data.access_token);
        if (!requireRoles.some((r) => roller.includes(r))) {
          console.warn("[auth] giris reddedildi: gerekli rol yok");
          return null;
        }
      }

      const claims = decode(data.access_token) as
        { sub?: string; email?: string; name?: string; preferred_username?: string } | undefined;

      // Tokens travel from here to the jwt callback: in the Credentials flow the
      // `account` object carries no tokens, the return value is the only carrier.
      return {
        id: claims?.sub ?? email,
        email: claims?.email ?? email,
        name: claims?.name ?? claims?.preferred_username ?? email,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Math.floor(Date.now() / 1000) + Number(data.expires_in ?? 900),
      } as unknown as { id: string };
    },
  });
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
        // Yenileme, jetonu VEREN realm'e yapilir; sir da o realm'in sirri
        // olmali. Genel sirla yenileme baska ulkelerde sessizce basarisiz
        // olur ve oturum dusederdi.
        client_secret: clientSecret(token.country as string | undefined),
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
 * The shared Auth.js setup for every app.
 *
 * Each app used to carry its own copy and the copies had diverged - the admin
 * app had no token refresh at all and its session dropped after 15 minutes.
 */
export function createAuth(options?: {
  /**
   * <b>At least one</b> of the roles required to sign in. Empty means no role
   * is required.
   *
   * <p>The seller panel uses this: a user without a store role cannot even open
   * a session there. The customer app leaves it empty - anyone may shop.
   */
  requireRoles?: string[];
}) {
  return NextAuth({
    trustHost: true,
    // The Credentials provider requires a JWT session (it does not support
    // database sessions). We carry the tokens in the JWT anyway.
    session: { strategy: "jwt" },
    // Our own sign-in page, so the Auth.js default screen never appears: users
    // hitting an unauthorized page were shown an unbranded interstitial.
    pages: { signIn: "/login", error: "/login" },
    providers: [credentialsProvider(options?.requireRoles), ...keycloakProviders()],
    callbacks: {
      async jwt({ token, account, user }) {
        // OUR OWN FORM: tokens arrive in the authorize() return value; in the
        // Credentials flow `account` carries none.
        const formdan = user as unknown as {
          accessToken?: string; refreshToken?: string; expiresAt?: number;
        } | undefined;
        if (formdan?.accessToken) {
          token.accessToken = formdan.accessToken;
          token.refreshToken = formdan.refreshToken;
          token.expiresAt = formdan.expiresAt;
          token.roles = rolesFrom(formdan.accessToken);
          token.issuer = issuerFrom(formdan.accessToken);
          token.country = countryFromIssuer(token.issuer as string | undefined);
          return token;
        }
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
