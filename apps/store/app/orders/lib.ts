export type Purchase = {
  id: string;
  recipeId: string;
  amountTry: number;
  store: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  failureReason?: string;
  /** Fiziksel urunde kargo durumu; tarif satislarinda null. Iade yalnizca
      kargolanmis/teslim edilmis siparislerde acilabilir. */
  shipmentStatus?: "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | null;
  createdAt: string;
};

export const VAT_RATE = 0.20; // Kozmetik KDV %20 (fiyatlar KDV dahil)

export const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  COMPLETED: { label: "Teslim Edildi", color: "#1E9E5A", bg: "#E5F6EC" },
  PENDING: { label: "Kargoda", color: "#C98A1E", bg: "#FCF2DE" },
  FAILED: { label: "İptal Edildi", color: "#D23B3B", bg: "#FBE6E6" },
};

export async function purchases<T>(path: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(`${process.env.PURCHASE_API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    // purchase-service erişilemez (ör. kapalı) → sayfayı çökertme, boş göster.
    return null;
  }
}

export function shortId(id: string): string {
  return "#" + id.replace(/-/g, "").slice(-6).toUpperCase();
}
export function dateTr(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}
