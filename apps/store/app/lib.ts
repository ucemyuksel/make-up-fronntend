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
export type Category = { id: string; name: string; slug: string };
export type Store = {
  id: string; ownerUserId: string; name: string; slug: string; kind: string;
  colorHex: string; tagline: string; verified: boolean; productCount: number;
};
export type Campaign = {
  id: string; storeId: string; title: string; discountType: string;
  discountValue: number; startsAt: string | null; endsAt: string | null; active: boolean;
};

export function tl(amount: number): string {
  return "₺" + Number(amount).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function api<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${process.env.STORE_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return res.ok ? ((await res.json()) as T) : null;
}

/** Yazma isteği (satıcı ekranları). Durum + hata mesajı döner. */
export async function send(
  path: string,
  method: "POST" | "PUT",
  token: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const res = await fetch(`${process.env.STORE_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (res.ok) return { ok: true, status: res.status };
  let error = `HTTP ${res.status}`;
  try {
    const j = await res.json();
    error = j.message ?? error;
  } catch { /* gövde yok */ }
  return { ok: false, status: res.status, error };
}
