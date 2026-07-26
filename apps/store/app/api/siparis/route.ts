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

type SepetSatiri = { productId: string; adet: number };
type Urun = { id: string; name: string; priceAmount: number; storeId?: string };
type Magaza = { id: string; ownerUserId: string };

export async function POST(request: Request) {
  const session = (await auth()) as { accessToken?: string } | null;
  const token = session?.accessToken;
  if (!token) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  let satirlar: SepetSatiri[];
  try {
    const govde = (await request.json()) as { items?: SepetSatiri[] };
    satirlar = (govde.items ?? []).filter((s) => s.productId && s.adet > 0);
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  if (satirlar.length === 0) {
    return NextResponse.json({ error: "Sepet boş" }, { status: 400 });
  }

  const storeApi = process.env.STORE_API;
  const purchaseApi = process.env.PURCHASE_API;
  const yetki = { Authorization: `Bearer ${token}` };

  // Mağaza sahiplerini tek seferde çöz (ürün başına tekrar tekrar çekmemek için).
  const magazalar = (await fetch(`${storeApi}/api/stores`, { headers: yetki, cache: "no-store" })
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => [])) as Magaza[];
  const sahip = new Map(magazalar.map((m) => [m.id, m.ownerUserId]));

  const olusan: string[] = [];
  const hatalar: string[] = [];

  for (const satir of satirlar) {
    const urun = (await fetch(`${storeApi}/api/products/${satir.productId}`, { headers: yetki, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)) as Urun | null;

    if (!urun) {
      hatalar.push(`Ürün bulunamadı: ${satir.productId}`);
      continue;
    }
    const saticiId = urun.storeId ? sahip.get(urun.storeId) : undefined;
    if (!saticiId) {
      hatalar.push(`${urun.name}: satıcı çözülemedi`);
      continue;
    }

    // Her satır ayrı sipariş kaydı olur — kargolama ürün bazında yapılır.
    const res = await fetch(`${purchaseApi}/api/purchases/product`, {
      method: "POST",
      headers: { ...yetki, "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: urun.id,
        sellerUserId: saticiId,
        amountTry: Number(urun.priceAmount) * satir.adet,
        store: "MOCK",
        // Idempotency anahtarı: aynı sepet iki kez gönderilirse tekrar sipariş açılmaz.
        storeTransactionId: `web-${satir.productId}-${Date.now()}`,
        receipt: "valid-web-checkout",
        countryCode: "TR",
      }),
      cache: "no-store",
    }).catch(() => null);

    if (res && res.ok) {
      olusan.push(urun.id);
    } else {
      hatalar.push(`${urun.name}: sipariş oluşturulamadı`);
    }
  }

  if (olusan.length === 0) {
    return NextResponse.json({ error: hatalar.join(" · ") || "Sipariş oluşturulamadı" }, { status: 502 });
  }
  return NextResponse.json({ created: olusan.length, errors: hatalar });
}
