import { redirect } from "next/navigation";

export type Product = {
  id: string;
  name: string;
  brand: string;
  priceAmount: number;
  currency: string;
  description: string;
  stock: number;
  categoryId?: string;
};
export type Category = {
  id: string; name: string; slug: string;
  subCategories?: { id: string; name: string; slug: string }[];
};
export type Store = {
  id: string; ownerUserId: string; name: string; slug: string; kind: string;
  colorHex: string; tagline: string; verified: boolean; productCount: number;
};
export type Campaign = {
  id: string; storeId: string; title: string; discountType: string;
  discountValue: number; startsAt: string | null; endsAt: string | null; active: boolean;
  /** Boş liste = kampanya her bölgede geçerli. */
  geoTargets?: { countryCode: string; regionCode: string | null; cityName: string | null }[];
};

export function tl(amount: number): string {
  return "₺" + Number(amount).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function api<T>(path: string, token: string): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(`${process.env.STORE_API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return null; // backend erişilemez → sayfayı çökertme
  }
  // Oturum düştüyse girişe yolla ("servis çalışmıyor" demek yanıltıcı olurdu).
  // redirect() try/catch DIŞINDA çağrılmalı — aksi halde NEXT_REDIRECT yutulur.
  if (token && (res.status === 401 || res.status === 403)) {
    redirect("/api/auth/signin");
  }
  return res.ok ? ((await res.json()) as T) : null;
}

/** Yazma isteği (satıcı ekranları). Durum + hata mesajı döner. */
export async function send(
  path: string,
  method: "POST" | "PUT",
  token: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; error?: string }> {
  let res: Response;
  try {
    res = await fetch(`${process.env.STORE_API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, error: "Sunucuya ulaşılamadı" };
  }
  if (res.ok) return { ok: true, status: res.status };
  let error = `HTTP ${res.status}`;
  try {
    const j = await res.json();
    error = j.message ?? error;
  } catch { /* gövde yok */ }
  return { ok: false, status: res.status, error };
}

// ---------------------------------------------------------------------------
// Değerlendirme (review-service) istemcisi + tipleri
// ---------------------------------------------------------------------------
export type Review = {
  id: string;
  subjectType: "PRODUCT" | "RECIPE";
  subjectId: string;
  userId: string;
  rating: number;
  text: string;
  verifiedPurchase: boolean;
  sellerReply: string | null;
  sellerRepliedAt: string | null;
  createdAt: string;
};
export type ReviewSummary = {
  count: number; average: number;
  five: number; four: number; three: number; two: number; one: number;
};

/** Okuma uçları girişsiz de çalışır; token varsa gönderilir. */
export async function reviewApi<T>(path: string, token?: string): Promise<T | null> {
  try {
    const res = await fetch(`${process.env.REVIEW_API}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null; // review-service erişilemez → sayfa yorumsuz gösterilir
  }
}

export async function reviewSend(
  path: string,
  token: string,
  body: unknown,
): Promise<{ ok: boolean; error?: string }> {
  let res: Response;
  try {
    res = await fetch(`${process.env.REVIEW_API}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Sunucuya ulaşılamadı" };
  }
  if (res.ok) return { ok: true };
  let error = `HTTP ${res.status}`;
  try {
    const j = await res.json();
    error = j.message ?? error;
  } catch { /* gövde yok */ }
  return { ok: false, error };
}

/** Yıldız gösterimi: dolu/boş yıldız dizisi. */
export const star = (score: number) => "★".repeat(Math.round(score)) + "☆".repeat(5 - Math.round(score));

// ---------------------------------------------------------------------------
// Reklam (ad-service) istemcisi + tipleri
// ---------------------------------------------------------------------------
export type Advertiser = { id: string; name: string; taxId?: string; storeId?: string; status: string; balance: number };
export type AdGeoTarget = { countryCode: string; regionCode?: string; cityName?: string };
export type AdCampaign = {
  id: string; advertiserId: string; name: string; placement: string; status: string;
  pricingModel: string; cpmBid: number; cpcBid: number; dailyBudget: number;
  spentToday: number; spentTotal: number; remainingToday: number;
  impressions: number; clicks: number; ctr: number;
  startsAt?: string; endsAt?: string;
  geoTargets: AdGeoTarget[];
  creative?: { mediaUrl: string; mediaType: string; headline: string; ctaText: string; ctaUrl: string };
};
export type GeoStat = { countryCode: string; regionCode?: string; cityName?: string; impressions: number; clicks: number; spend: number };
export type LedgerDay = { day: string; impressions: number; clicks: number; spend: number };

export async function adApi<T>(path: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(`${process.env.AD_API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null; // ad-service erişilemez → sayfayı çökertme
  }
}

/** ad-service yazma isteği; başarıda gövdeyi de döner. */
export async function adSend<T = unknown>(
  path: string,
  method: "POST" | "PUT",
  token: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; error?: string; data?: T }> {
  let res: Response;
  try {
    res = await fetch(`${process.env.AD_API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, error: "Sunucuya ulaşılamadı" };
  }
  if (res.ok) {
    let data: T | undefined;
    try { data = (await res.json()) as T; } catch { /* gövde yok */ }
    return { ok: true, status: res.status, data };
  }
  let error = `HTTP ${res.status}`;
  try {
    const j = await res.json();
    error = j.message ?? error;
  } catch { /* gövde yok */ }
  return { ok: false, status: res.status, error };
}
