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
