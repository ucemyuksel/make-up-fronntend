import { NextResponse } from "next/server";
import { auth } from "../../../../auth";

/**
 * Sepetin ödenecek tutarını <b>sunucuya hesaplatır</b>.
 *
 * <p>Sepet tarayıcıda tutulduğu için kupon doğrulaması da orada yapılıyordu:
 * sayfada sabit kodlanmış bir kupon tablosu vardı ve gerçek kuponlarla hiç
 * ilgisi yoktu. Mağazanın tanımladığı kupon çalışmıyor, tanımlamadığı kod
 * çalışıyordu.
 *
 * <p>Bu yol istemcinin jetonunu ekleyip store-service'e sorar. Jeton
 * tarayıcıya verilmez — oturumdan sunucu tarafında okunur.
 */
export async function POST(request: Request) {
  const session = (await auth()) as { accessToken?: string } | null;
  const token = session?.accessToken;
  if (!token) {
    return NextResponse.json({ message: "Giriş gerekli" }, { status: 401 });
  }

  let govde: {
    storeId?: string; orderAmount?: number; productId?: string;
    couponCode?: string; giftCardCode?: string;
  };
  try {
    govde = await request.json();
  } catch {
    return NextResponse.json({ message: "Gecersiz istek" }, { status: 400 });
  }

  if (!govde.storeId || !govde.orderAmount) {
    return NextResponse.json({ message: "Magaza ve tutar gerekli" }, { status: 400 });
  }

  // Kupon ve hediye karti AYRI baglamlar (promotion-service / wallet-service).
  // Tek bir "checkout/quote" ucu yok: o uc kataloglaydi ve baglamlar ayrilinca
  // kalktdi. Sepet hesabi burada birlestiriliyor.
  //
  // SIRA SABIT: once kupon, sonra kart. Ters sirada kart bakiyesi indirim
  // ONCESI tutara uygulanir ve musteri kartindan gereginden fazlasi dusmus
  // gorunur. Sunucu tarafi (purchase-service) da ayni sirayi uyguluyor;
  // ikisi ayrisirsa sepette gosterilen ile odenen tutar tutmaz.
  //
  // YAN ETKISIZ: ikisi de yalniz HESAP ucu; kupon tuketilmez, bakiye dusmez.
  const authHeader = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  let kalan = Number(govde.orderAmount);
  let couponDiscount = 0;
  let giftCardApplied = 0;
  let couponId: string | null = null;
  let giftCardId: string | null = null;
  const uyarilar: string[] = [];

  try {
    if (govde.couponCode) {
      const r = await fetch(
        `${process.env.PROMOTION_API}/api/stores/${govde.storeId}/coupons/preview`,
        {
          method: "POST",
          headers: authHeader,
          body: JSON.stringify({
            code: govde.couponCode,
            orderAmount: kalan,
            productId: govde.productId ?? null,
            orderId: null,
          }),
          cache: "no-store",
        });
      const v = await r.json().catch(() => ({}));
      if (r.ok) {
        couponId = v.couponId ?? null;
        couponDiscount = Number(v.discount ?? 0);
        kalan = Math.max(0, kalan - couponDiscount);
      } else {
        uyarilar.push(v.message ?? "Kupon uygulanmadı");
      }
    }

    if (govde.giftCardCode && kalan > 0) {
      const r = await fetch(
        `${process.env.WALLET_API}/api/stores/${govde.storeId}/gift-cards/balance`,
        {
          method: "POST",
          headers: authHeader,
          body: JSON.stringify({ code: govde.giftCardCode }),
          cache: "no-store",
        });
      const v = await r.json().catch(() => ({}));
      if (r.ok) {
        giftCardId = v.giftCardId ?? null;
        // Bakiyenin TAMAMI degil, kalan tutar kadari dusulur.
        giftCardApplied = Math.min(Number(v.remainingAmount ?? 0), kalan);
        kalan = Math.max(0, kalan - giftCardApplied);
      } else {
        uyarilar.push(v.message ?? "Hediye kartı uygulanmadı");
      }
    }

    return NextResponse.json({
      couponId,
      couponDiscount,
      giftCardId,
      giftCardApplied,
      payable: kalan,
      // Indirim olustuysa uyari gosterilmez: kod bir magazada gecerli,
      // digerlerinde degil - bu beklenen durum.
      warning: couponDiscount + giftCardApplied > 0 ? null : (uyarilar[0] ?? null),
    });
  } catch {
    return NextResponse.json({ message: "Tutar hesabı yapılamadı" }, { status: 502 });
  }
}
