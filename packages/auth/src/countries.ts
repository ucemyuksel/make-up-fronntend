/**
 * Supported markets and the Keycloak realm naming.
 *
 * Same rule as `CountryRealm` in the backend: `makeup-<country code>`. Both
 * sides know this rule independently, so if it changes here it must change
 * there too — the source of truth is `infra/keycloak-config/ulkeler.json`.
 */

export type Country = {
  /** ISO-3166 alpha-2, lowercase */
  code: string;
  /** Name shown on the login screen (in its own language) */
  label: string;
};

export const COUNTRIES: Country[] = [
  { code: "tr", label: "Türkiye" },
  { code: "de", label: "Deutschland" },
  { code: "us", label: "United States" },
  { code: "gb", label: "United Kingdom" },
  { code: "ae", label: "الإمارات" },
  { code: "az", label: "Azərbaycan" },
];

/** `"tr"` → `"makeup-tr"` */
export function realmName(code: string): string {
  return `makeup-${code.trim().toLowerCase()}`;
}

/** Auth.js provider id — the callback URL is derived from it. */
export function providerId(code: string): string {
  return `keycloak-${code.trim().toLowerCase()}`;
}

/** `.../realms/makeup-de` → `"de"`; undefined when it cannot be resolved. */
export function countryFromIssuer(issuer?: string): string | undefined {
  const match = issuer?.match(/\/realms\/makeup-([a-z]{2})\b/i);
  return match?.[1]?.toLowerCase();
}

/**
 * List that can be narrowed by env, to enable different markets per
 * environment: `AUTH_COUNTRIES=tr,de`
 */
export function enabledCountries(): Country[] {
  const raw = process.env.AUTH_COUNTRIES;
  if (!raw) return COUNTRIES;
  const wanted = raw.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
  return COUNTRIES.filter((c) => wanted.includes(c.code));
}
