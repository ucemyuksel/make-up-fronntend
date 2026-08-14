import { NextResponse } from "next/server";
import { auth } from "../../../auth";

/**
 * Sepet ödemesi. Sipariş yalnızca <b>sunucuda</b> oluşturulur; tarayıcı
 * purchase-service'i doğrudan çağırmaz.
 *
 * <p>Önemli: satıcı kimliği istemciden alınmaz — her ürünün mağazası
 * store-service'ten okunup mağaza sahibi oradan çözülür. Aksi halde istemci
 * cirosu başka bir satıcıya yazdırabilirdi.
 */

type CartLine = { productId: string; quantity: number };
type Product = { id: string; name: string; priceAmount: number; storeId?: string };
type Store = { id: string; ownerUserId: string };

export async function POST(request: Request) {
  const session = (await auth()) as { accessToken?: string } | null;
  const token = session?.accessToken;
  if (!token) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  let lines: CartLine[];
  try {
    const body = (await request.json()) as { items?: CartLine[] };
    lines = (body.items ?? []).filter((s) => s.productId && s.quantity > 0);
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  if (lines.length === 0) {
    return NextResponse.json({ error: "Sepet boş" }, { status: 400 });
  }

  const storeApi = process.env.STORE_API;
  const purchaseApi = process.env.PURCHASE_API;
  const authHeader = { Authorization: `Bearer ${token}` };

  // Mağaza sahiplerini tek seferde çöz (ürün başına tekrar tekrar çekmemek için).
  const stores = (await fetch(`${storeApi}/api/stores`, { headers: authHeader, cache: "no-store" })
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => [])) as Store[];
  const owner = new Map(stores.map((m) => [m.id, m.ownerUserId]));

  const olusan: string[] = [];
  const errors: string[] = [];

  for (const line of lines) {
    const product = (await fetch(`${storeApi}/api/products/${line.productId}`, { headers: authHeader, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)) as Product | null;

    if (!product) {
      errors.push(`Ürün bulunamadı: ${line.productId}`);
      continue;
    }
    const sellerId = product.storeId ? owner.get(product.storeId) : undefined;
    if (!sellerId) {
      errors.push(`${product.name}: satıcı çözülemedi`);
      continue;
    }

    // Her satır ayrı sipariş kaydı olur — kargolama ürün bazında yapılır.
    const res = await fetch(`${purchaseApi}/api/purchases/product`, {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        sellerUserId: sellerId,
        amountTry: Number(product.priceAmount) * line.quantity,
        store: "MOCK",
        // Idempotency anahtarı: aynı sepet iki kez gönderilirse tekrar sipariş açılmaz.
        storeTransactionId: `web-${line.productId}-${Date.now()}`,
        receipt: "valid-web-checkout",
        countryCode: "TR",
      }),
      cache: "no-store",
    }).catch(() => null);

    if (res && res.ok) {
      olusan.push(product.id);
    } else {
      errors.push(`${product.name}: sipariş oluşturulamadı`);
    }
  }

  if (olusan.length === 0) {
    return NextResponse.json({ error: errors.join(" · ") || "Sipariş oluşturulamadı" }, { status: 502 });
  }
  return NextResponse.json({ created: olusan.length, errors: errors });
}
