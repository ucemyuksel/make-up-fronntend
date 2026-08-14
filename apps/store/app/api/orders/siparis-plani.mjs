/**
 * Sepetten sipariş planı üretir — <b>saf fonksiyon, ağ yok</b>.
 *
 * <p>Neden ayrı dosya: buradaki iki karar paraya dokunuyor (hangi satır kuponu
 * taşır, tekrar gönderim nasıl ayırt edilir) ve rota içinde gömülüyken
 * sınanamıyordu. `.mjs` çünkü Node'un yerleşik test koşucusu ek bir derleyici
 * olmadan doğrudan çalıştırabiliyor.
 */

/**
 * @typedef {Object} Satir
 * @property {string} productId
 * @property {string} [storeId] mağazası çözülemeyen ürün olabilir
 * @property {string} sellerUserId
 * @property {number} birimFiyat
 * @property {number} adet
 */

/**
 * @typedef {Object} SiparisIstegi
 * @property {string} productId
 * @property {string} sellerUserId
 * @property {string|undefined} sellerStoreId
 * @property {Object} shippingAddress
 * @property {string|null} couponCode
 * @property {string|null} giftCardCode
 * @property {number} amountTry
 * @property {string} store
 * @property {string} storeTransactionId
 * @property {string} receipt
 * @property {string} countryCode
 */

/**
 * Mağaza başına kodu <b>tek</b> satır taşır ve bu, o mağazanın <b>en yüksek
 * tutarlı</b> satırıdır.
 *
 * <p>Neden tek satır: her sepet satırı ayrı bir sipariş kaydı oluyor. Kod her
 * satıra gönderilseydi kupon birden çok kez tüketilir, hediye kartından birden
 * çok kez düşülürdü — tekrar koruması sipariş bazlı, satır bazlı değil.
 *
 * <p>Neden en yüksek tutarlı: indirim tabanı o satırın tutarı. En pahalı satırı
 * seçmek, mevcut tasarımda müşteriye en çok indirimi veren seçim.
 *
 * @param {Satir[]} satirlar
 * @returns {Map<string, string>} mağaza → kodu taşıyacak productId
 */
export function kodTasiyanSatirlar(satirlar) {
  /** @type {Map<string, {productId: string, tutar: number}>} */
  const enIyi = new Map();
  for (const s of satirlar) {
    if (!s.storeId) continue;
    const tutar = satirTutari(s);
    const mevcut = enIyi.get(s.storeId);
    // Eşitlikte ilk satır kalır: sıra girdiye bağlı ve kararlı olmalı, aksi
    // halde aynı sepet iki kez farklı plan üretir.
    if (!mevcut || tutar > mevcut.tutar) {
      enIyi.set(s.storeId, { productId: s.productId, tutar });
    }
  }
  return new Map([...enIyi].map(([magaza, v]) => [magaza, v.productId]));
}

/**
 * Mağaza başına <b>kupon tabanı</b>: kodu taşıyan satırın tutarı.
 *
 * <p>Sepet ekranı ile sipariş rotası bu <b>aynı</b> fonksiyonu kullanır.
 * Ayrı hesaplandıklarında sepette gösterilen indirim ile gerçekleşen indirim
 * ayrışıyordu: sepet mağazanın tüm alt toplamı üzerinden hesaplıyor, sipariş
 * ise yalnız tek satırın tutarını gönderiyordu. Müşteri gösterilenden fazla
 * ödüyordu.
 *
 * @param {Satir[]} satirlar
 * @returns {Map<string, number>} mağaza → indirimin uygulanacağı tutar
 */
export function kuponTabanlari(satirlar) {
  const tasiyan = kodTasiyanSatirlar(satirlar);
  /** @type {Map<string, number>} */
  const tabanlar = new Map();
  for (const s of satirlar) {
    if (s.storeId && tasiyan.get(s.storeId) === s.productId) {
      tabanlar.set(s.storeId, satirTutari(s));
    }
  }
  return tabanlar;
}

/**
 * Her satır için purchase-service isteği üretir.
 *
 * @param {Object} girdi
 * @param {Satir[]} girdi.satirlar
 * @param {Object} girdi.address
 * @param {string|null} [girdi.couponCode]
 * @param {string|null} [girdi.giftCardCode]
 * @param {string} [girdi.gonderimId] istemcinin ürettiği tekrar anahtarı
 * @returns {SiparisIstegi[]}
 */
export function siparisPlani({ satirlar, address, couponCode = null, giftCardCode = null, gonderimId }) {
  const tasiyan = kodTasiyanSatirlar(satirlar);
  const anahtar = gonderimId && String(gonderimId).trim()
    ? String(gonderimId).trim()
    : sepetImzasi(satirlar);

  return satirlar.map((s) => {
    const kodBuSatirda = Boolean(s.storeId) && tasiyan.get(s.storeId) === s.productId;
    return {
      productId: s.productId,
      sellerUserId: s.sellerUserId,
      sellerStoreId: s.storeId,
      shippingAddress: address,
      couponCode: kodBuSatirda ? couponCode : null,
      giftCardCode: kodBuSatirda ? giftCardCode : null,
      amountTry: satirTutari(s),
      store: "MOCK",
      // TEKRAR ANAHTARI. Eskiden sonuna Date.now() ekleniyordu; o hâliyle her
      // istekte değiştiği için sunucudaki tekrar kontrolü HİÇ devreye girmiyordu
      // — "aynı sepet iki kez gönderilirse tekrar sipariş açılmaz" yorumu
      // doğru değildi. Çift tıklama iki sipariş üretiyordu.
      storeTransactionId: `web-${anahtar}-${s.productId}`,
      receipt: "valid-web-checkout",
      countryCode: "TR",
    };
  });
}

/** @param {Satir} s */
function satirTutari(s) {
  return Number(s.birimFiyat) * Number(s.adet);
}

/**
 * Gönderim kimliği yoksa sepet içeriğinden kararlı bir imza üretir.
 *
 * <p>Zamana bağlı olmadığı için aynı sepetin ikinci gönderimi aynı anahtarı
 * üretir ve sunucu tekrarı yakalar. FNV-1a: kriptografik değil, yalnız
 * ayırt edici olması yeterli.
 *
 * @param {Satir[]} satirlar
 */
function sepetImzasi(satirlar) {
  const metin = satirlar
    .map((s) => `${s.productId}:${s.adet}:${s.birimFiyat}`)
    .sort()
    .join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < metin.length; i++) {
    h ^= metin.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}
