import { test } from "node:test";
import assert from "node:assert/strict";

import { kodTasiyanSatirlar, kuponTabanlari, siparisPlani } from "./siparis-plani.mjs";

const adres = { fullName: "Ayse Yilmaz", phone: "+90 555 000 00 00", line1: "Test Sokak 1", city: "Istanbul" };

/** @returns {import("./siparis-plani.mjs").Satir} */
const satir = (productId, storeId, birimFiyat, adet = 1) => ({
  productId, storeId, sellerUserId: "sahip-" + storeId, birimFiyat, adet,
});

test("kod magaza basina TEK satirda gider", () => {
  const satirlar = [satir("u1", "A", 100), satir("u2", "A", 50), satir("u3", "B", 70)];
  const plan = siparisPlani({ satirlar, adres, couponCode: "YAZ25", giftCardCode: "HED1" });

  const kuponlu = plan.filter((p) => p.couponCode !== null);
  const kartli = plan.filter((p) => p.giftCardCode !== null);

  assert.equal(kuponlu.length, 2, "Kupon magaza basina bir kez gitmeli (A ve B)");
  assert.equal(kartli.length, 2, "Hediye karti magaza basina bir kez gitmeli");
  assert.equal(new Set(kuponlu.map((p) => p.sellerStoreId)).size, 2, "Ayni magazaya iki kez gitti");
});

test("kodu magazanin EN PAHALI satiri tasir", () => {
  // Ucuz satir once geliyor: secim siraya degil TUTARA bakmali.
  const satirlar = [satir("ucuz", "A", 10), satir("pahali", "A", 900)];
  assert.equal(kodTasiyanSatirlar(satirlar).get("A"), "pahali");

  // Adet de hesaba katilmali: 3x40 = 120 > 100.
  const adetli = [satir("tek", "A", 100), satir("uclu", "A", 40, 3)];
  assert.equal(kodTasiyanSatirlar(adetli).get("A"), "uclu");
});

test("kupon tabani, kodu tasiyan satirin tutaridir", () => {
  const satirlar = [satir("u1", "A", 100, 2), satir("u2", "A", 50), satir("u3", "B", 70)];
  const tabanlar = kuponTabanlari(satirlar);

  // Sepet ekrani ile siparis rotasi AYNI fonksiyonu kullaniyor; bu esitlik
  // bozulursa gosterilen indirim ile gerceklesenin ayrismasi geri gelir.
  assert.equal(tabanlar.get("A"), 200);
  assert.equal(tabanlar.get("B"), 70);

  const plan = siparisPlani({ satirlar, adres, couponCode: "YAZ25" });
  for (const [magaza, taban] of tabanlar) {
    const kuponlu = plan.find((p) => p.sellerStoreId === magaza && p.couponCode);
    assert.equal(kuponlu.amountTry, taban, `${magaza}: gonderilen tutar taban ile ayristi`);
  }
});

test("ayni sepet iki kez planlanirsa tekrar anahtari AYNI kalir", () => {
  const satirlar = [satir("u1", "A", 100), satir("u2", "B", 70)];

  const birinci = siparisPlani({ satirlar, adres });
  const ikinci = siparisPlani({ satirlar, adres });

  assert.deepEqual(
    birinci.map((p) => p.storeTransactionId),
    ikinci.map((p) => p.storeTransactionId),
    "Tekrar anahtari degisti - cift tiklama IKI siparis olusturur",
  );
});

test("gonderim kimligi verilirse anahtar ondan turer", () => {
  const satirlar = [satir("u1", "A", 100)];
  const a = siparisPlani({ satirlar, adres, gonderimId: "gonderim-1" });
  const b = siparisPlani({ satirlar, adres, gonderimId: "gonderim-1" });
  const c = siparisPlani({ satirlar, adres, gonderimId: "gonderim-2" });

  assert.equal(a[0].storeTransactionId, b[0].storeTransactionId);
  assert.notEqual(a[0].storeTransactionId, c[0].storeTransactionId,
    "Farkli gonderim ayni anahtari aldi - ikinci siparis hic olusmaz");
});

test("farkli sepet farkli anahtar uretir", () => {
  const a = siparisPlani({ satirlar: [satir("u1", "A", 100)], adres });
  const b = siparisPlani({ satirlar: [satir("u1", "A", 100, 2)], adres });
  assert.notEqual(a[0].storeTransactionId, b[0].storeTransactionId,
    "Adet degistigi halde anahtar ayni - ikinci siparis engellenir");
});

test("magazasi bilinmeyen satir kod tasimaz", () => {
  const satirlar = [{ productId: "u1", storeId: null, sellerUserId: "s", birimFiyat: 100, adet: 1 }];
  const plan = siparisPlani({ satirlar, adres, couponCode: "YAZ25" });
  assert.equal(plan[0].couponCode, null, "Magazasiz satira kupon gonderildi");
});

test("satir tutari adetle carpilir", () => {
  const plan = siparisPlani({ satirlar: [satir("u1", "A", 49.9, 3)], adres });
  assert.equal(plan[0].amountTry, 149.7);
});
