/**
 * Desteklenen pazarlar ve Keycloak realm adlandırması.
 *
 * Backend'deki `CountryRealm` ile aynı kural: `makeup-<ülke kodu>`. İki taraf
 * ayrı ayrı bu kuralı bildiği için burası değişirse orası da değişmeli —
 * gerçek kaynak `infra/keycloak-config/ulkeler.json`.
 */

export type Country = {
  /** ISO-3166 alfa-2, küçük harf */
  code: string;
  /** Giriş ekranında gösterilen ad (kendi dilinde) */
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

/** Auth.js sağlayıcı kimliği — geri dönüş adresi buna göre oluşur. */
export function providerId(code: string): string {
  return `keycloak-${code.trim().toLowerCase()}`;
}

/** `.../realms/makeup-de` → `"de"`; çözülemezse undefined. */
export function countryFromIssuer(issuer?: string): string | undefined {
  const match = issuer?.match(/\/realms\/makeup-([a-z]{2})\b/i);
  return match?.[1]?.toLowerCase();
}

/**
 * Env ile daraltılabilir list. Ortam başına farklı pazar açmak için:
 * `AUTH_COUNTRIES=tr,de`
 */
export function enabledCountries(): Country[] {
  const raw = process.env.AUTH_COUNTRIES;
  if (!raw) return COUNTRIES;
  const wanted = raw.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
  return COUNTRIES.filter((c) => wanted.includes(c.code));
}
