import { NextResponse } from "next/server";
import { auth } from "../../../auth";
// Plan uretimi ayri ve SAF: hangi satir kuponu tasir, tekrar anahtari nasil
// uretilir - ikisi de paraya dokunuyor ve rota icinde gomuluyken sinanamiyordu.
import { siparisPlani } from "./siparis-plani.mjs";

/**
 * Sepet ödemesi. Sipariş yalnızca <b>sunucuda</b> oluşturulur; tarayıcı
 * purchase-service'i doğrudan çağırmaz.
 *
 * <p>Önemli: satıcı kimliği istemciden alınmaz — her ürünün mağazası
 * store-service'ten okunup mağaza sahibi oradan çözülür. Aksi halde istemci
 * cirosu başka bir satıcıya yazdırabilirdi.
 */

type CartLine = { productId: string; quantity: number };

/** Teslimat adresi. Satici kargoya veremeyecegi icin ZORUNLU. */
type Adres = {
  fullName: string; phone: string; line1: string; line2?: string | null;
  district?: string | null; city: string; postalCode?: string | null;
  countryCode?: string | null; note?: string | null;
};
type Product = { id: string; name: string; priceAmount: number; storeId?: string };
type Store = { id: string; ownerUserId: string };

export async function POST(request: Request) {
  const session = (await auth()) as { accessToken?: string } | null;
  const token = session?.accessToken;
  if (!token) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  let lines: CartLine[];
  let adres: Adres | undefined;
  let couponCode: string | null = null;
  let giftCardCode: string | null = null;
  // Istemcinin urettigi TEKRAR anahtari: ayni gonderim tekrar denenirse
  // (cift tiklama, ag hatasi sonrasi yeniden deneme) sunucu ayni siparisi
  // dondurur. Gelmezse sepet icerigi imzalanir - yine zamana bagli DEGIL.
  let gonderimId: string | undefined;
  try {
    const body = (await request.json()) as {
      items?: CartLine[]; shippingAddress?: Adres;
      couponCode?: string | null; giftCardCode?: string | null;
      submissionId?: string | null;
    };
    lines = (body.items ?? []).filter((s) => s.productId && s.quantity > 0);
    adres = body.shippingAddress;
    couponCode = body.couponCode?.trim() || null;
    giftCardCode = body.giftCardCode?.trim() || null;
    gonderimId = body.submissionId?.trim() || undefined;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  // Adres ZORUNLU: satici olmadan kargoya veremez. Backend de reddediyor;
  // buradaki kontrol kullaniciya anlasilir hata gostermek icin.
  if (!adres?.fullName || !adres.phone || !adres.line1 || !adres.city) {
    return NextResponse.json({ error: "Teslimat adresi eksik" }, { status: 400 });
  }
  if (lines.length === 0) {
    return NextResponse.json({ error: "Sepet boş" }, { status: 400 });
  }

  const storeApi = process.env.STORE_API;
  const purchaseApi = process.env.PURCHASE_API;
  const yetki = { Authorization: `Bearer ${token}` };

  // Mağaza sahiplerini tek seferde çöz (ürün başına tekrar tekrar çekmemek için).
  const stores = (await fetch(`${storeApi}/api/stores`, { headers: yetki, cache: "no-store" })
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => [])) as Store[];
  const sahip = new Map(stores.map((m) => [m.id, m.ownerUserId]));

  const olusan: string[] = [];
  // Gerceklesen indirimler. Sepette gosterilen hesapla ayrisabilir:
  // ayni hediye karti arada baska bir siparise harcanmis olabilir.
  // Musteri farki gorebilsin diye geri donuyoruz.
  let uygulananKupon = 0;
  let uygulananKart = 0;
  const errors: string[] = [];

  // Once TUM satirlarin urun bilgisi cozulur; plan ancak sepetin tamami
  // bilindikten sonra kurulabilir (kodu magazanin en pahali satiri tasiyor).
  const satirlar: {
    productId: string; storeId?: string; sellerUserId: string;
    birimFiyat: number; adet: number;
  }[] = [];
  const adlar = new Map<string, string>();

  for (const line of lines) {
    const product = (await fetch(`${storeApi}/api/products/${line.productId}`, { headers: yetki, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)) as Product | null;

    if (!product) {
      errors.push(`Ürün bulunamadı: ${line.productId}`);
      continue;
    }
    const sellerId = product.storeId ? sahip.get(product.storeId) : undefined;
    if (!sellerId) {
      errors.push(`${product.name}: satıcı çözülemedi`);
      continue;
    }
    adlar.set(product.id, product.name);
    satirlar.push({
      productId: product.id,
      // Satici artik MAGAZA: siparis kisiye degil magazaya baglanir,
      // boylece magaza personeli de siparisi gorebilir.
      storeId: product.storeId,
      sellerUserId: sellerId,
      birimFiyat: Number(product.priceAmount),
      adet: line.quantity,
    });
  }

  // Kodlar SUNUCUDA dogrulanir; indirimi purchase-service store-service'e
  // hesaplatir. Buradan giden tutar indirim ONCESI satir tutaridir.
  const plan = siparisPlani({ satirlar, adres, couponCode, giftCardCode, gonderimId });

  for (const istek of plan) {
    // Her satır ayrı sipariş kaydı olur — kargolama ürün bazında yapılır.
    const res = await fetch(`${purchaseApi}/api/purchases/product`, {
      method: "POST",
      headers: { ...yetki, "Content-Type": "application/json" },
      body: JSON.stringify(istek),
      cache: "no-store",
    }).catch(() => null);

    if (res && res.ok) {
      olusan.push(istek.productId);
      const kayit = await res.json().catch(() => ({}));
      uygulananKupon += Number(kayit.couponDiscount ?? 0);
      uygulananKart += Number(kayit.giftCardAmount ?? 0);
    } else {
      errors.push(`${adlar.get(istek.productId) ?? istek.productId}: sipariş oluşturulamadı`);
    }
  }

  if (olusan.length === 0) {
    return NextResponse.json({ error: errors.join(" · ") || "Sipariş oluşturulamadı" }, { status: 502 });
  }
  return NextResponse.json({
    created: olusan.length,
    errors,
    couponDiscount: uygulananKupon,
    giftCardApplied: uygulananKart,
  });
}
