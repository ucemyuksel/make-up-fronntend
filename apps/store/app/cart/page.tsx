"use client";
import * as React from "react";
import { SectionHeader, Carousel } from "@makeup/ui";
// Hesap tabani ile siparis rotasinin gonderdigi tutar TEK yerden gelmeli;
// ayri hesaplandiklarinda gosterilen indirim gerceklesenden buyuk cikiyordu.
import { kuponTabanlari, kodTasiyanSatirlar } from "../api/orders/siparis-plani.mjs";

type CartItem = { id: string; name: string; brand: string; priceAmount: number;
                  qty: number; storeId?: string };
const tl = (n: number) => "₺" + Number(n).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const VAT_RATE = 0.20; // Kozmetik KDV %20

/**
 * Sunucudan gelen tutar hesabi.
 *
 * Burada SABIT KODLANMIS bir kupon tablosu vardi ve gercek kuponlarla hic
 * ilgisi yoktu: magazanin tanimladigi kupon calismiyor, tanimlamadigi kod
 * calisiyordu. Artik hesabi store-service yapiyor.
 */
type Hesap = {
  couponDiscount: number;
  giftCardApplied: number;
  payable: number;
  warning: string | null;
};

const GLAMPOINT_BALANCE = 75; // Kullanıcı kredisi (demo).

// "Bunu alanlar bunları da aldı" (cross-sell — demo).
const BIRLIKTE_ALINAN: CartItem[] = [
  { id: "x1", name: "Makyaj Temizleme Suyu", brand: "Garnier", priceAmount: 129, qty: 1 },
  { id: "x2", name: "Makyaj Süngeri Seti", brand: "Real Techniques", priceAmount: 189, qty: 1 },
  { id: "x3", name: "Dudak Nemlendirici", brand: "Nivea", priceAmount: 79, qty: 1 },
  { id: "x4", name: "Fırça Temizleyici", brand: "Gratis", priceAmount: 99, qty: 1 },
];

export default function CartPage() {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [step, setStep] = React.useState<"sepet" | "odeme">("sepet");

  // Kupon + puan durumu
  const [couponInput, setCouponInput] = React.useState("");
  const [giftCardInput, setGiftCardInput] = React.useState("");
  const [hesap, setHesap] = React.useState<Hesap | null>(null);
  const [couponError, setCouponError] = React.useState("");
  const [hesaplaniyor, setHesaplaniyor] = React.useState(false);
  const [usePoints, setUsePoints] = React.useState(false);

  // Kurumsal fatura
  const [kurumsal, setKurumsal] = React.useState(false);
  const [orderPlaced, setOrderPlaced] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [orderError, setOrderError] = React.useState<string | null>(null);

  // TEKRAR anahtari. Bir kez uretilir ve basarili siparise kadar AYNI kalir:
  // cift tiklama ya da ag hatasindan sonraki yeniden deneme sunucuda ayni
  // siparise dener. useRef sart - useState yeniden render'da yeni deger
  // uretmez ama her denemede yenisini uretmek de korumayi yok ederdi.
  const gonderimId = React.useRef<string>("");
  if (!gonderimId.current) {
    gonderimId.current = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
  }

  React.useEffect(() => {
    setItems(JSON.parse(localStorage.getItem("gg_cart") || "[]"));
  }, []);

  const save = (next: CartItem[]) => {
    setItems(next);
    localStorage.setItem("gg_cart", JSON.stringify(next));
  };
  const setQty = (id: string, d: number) =>
    save(items.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + d) } : i)));
  const remove = (id: string) => save(items.filter((i) => i.id !== id));
  const add = (p: CartItem) => {
    const existing = items.find((i) => i.id === p.id);
    save(existing ? items.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i)) : [...items, { ...p, qty: 1 }]);
  };

  /**
   * Kodlari SUNUCUYA dogrulatir. Istemci hesaplasaydi odenecek tutari da
   * istemci belirlerdi; kupon ve hediye karti paraya dokunuyor.
   */
  const kodlariUygula = async () => {
    // Sepet BIRDEN FAZLA magazanin urununu tasiyabilir. Tek hesap yapip
    // tum sepet tutarini gonderseydik A magazasinin kuponu B magazasinin
    // urunlerini de indirirdi. Bu yuzden magaza basina ayri hesap yapilir;
    // kod hangi magazaya aitse indirim orada olusur, digerleri uyari alir.
    //
    // TABAN, siparis rotasiyla AYNI fonksiyondan gelir. Burada magazanin tum
    // alt toplami, sipariste ise yalniz tek satirin tutari kullaniliyordu:
    // sepette gosterilen indirim gerceklesenden BUYUK cikiyor, musteri
    // gosterilenden fazla oduyordu.
    const satirlar = items.map((i) => ({
      productId: i.id, storeId: i.storeId, sellerUserId: "",
      birimFiyat: i.priceAmount, adet: i.qty,
    }));
    const magazalar = kuponTabanlari(satirlar);
    const tasiyan = kodTasiyanSatirlar(satirlar);
    if (magazalar.size === 0) {
      setCouponError("Sepetteki ürünün mağazası bilinmiyor; ürünü yeniden ekleyin.");
      return;
    }

    setHesaplaniyor(true);
    setCouponError("");
    try {
      let kupon = 0;
      let kart = 0;
      const uyarilar: string[] = [];

      for (const [magaza, magazaTutari] of magazalar) {
        const res = await fetch("/api/checkout/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeId: magaza,
            orderAmount: magazaTutari,
            // Kupon urune bagliysa scope kontrolu KODU TASIYAN urunle
            // yapilmali; rastgele bir satir secilirse hesap, siparisin
            // gercekten gonderecegi urunle uyusmaz.
            productId: tasiyan.get(magaza),
            couponCode: couponInput.trim() || null,
            giftCardCode: giftCardInput.trim() || null,
          }),
        });
        const veri = await res.json();
        if (!res.ok) {
          setHesap(null);
          setCouponError(veri.message ?? "Kod doğrulanamadı.");
          return;
        }
        kupon += Number(veri.couponDiscount ?? 0);
        kart += Number(veri.giftCardApplied ?? 0);
        if (veri.warning) uyarilar.push(veri.warning);
      }

      const veri = {
        couponDiscount: kupon,
        giftCardApplied: kart,
        payable: Math.max(0, subtotal - kupon - kart),
        // Indirim olustuysa uyarilari gostermeyiz: kod bir magazada
        // gecerli, digerlerinde degil - bu beklenen durum.
        warning: kupon + kart > 0 ? null : uyarilar[0] ?? null,
      };
      setHesap(veri);
      // Uyari kodun kabul edilmedigini soyler ama hesap yine doner:
      // yanlis kod yuzunden tum odemeyi dusurmek musteriyi cikmaza sokardi.
      if (veri.warning) setCouponError(veri.warning);
    } catch {
      setHesap(null);
      setCouponError("Sunucuya ulaşılamadı.");
    } finally {
      setHesaplaniyor(false);
    }
  };

  // --- Tutar hesabı ---
  const subtotal = items.reduce((s, i) => s + i.priceAmount * i.qty, 0);
  // Indirimler SUNUCU hesabindan gelir; istemci yalnizca gosterir.
  const couponDiscount = hesap?.couponDiscount ?? 0;
  const giftCardApplied = hesap?.giftCardApplied ?? 0;
  const pointsDiscount = usePoints
    ? Math.min(GLAMPOINT_BALANCE, Math.max(0, subtotal - couponDiscount - giftCardApplied))
    : 0;
  const kargo = 0; // Ücretsiz
  const grandTotal = Math.max(0, subtotal - couponDiscount - giftCardApplied - pointsDiscount + kargo);
  const kdvHaric = grandTotal / (1 + VAT_RATE);
  const kdv = grandTotal - kdvHaric;
  const discountRate = subtotal > 0
    ? Math.round(((couponDiscount + giftCardApplied + pointsDiscount) / subtotal) * 100) : 0;

  const stepBox: React.CSSProperties = {
    width: 28, height: 28, borderRadius: 7, border: "1px solid var(--gg-border)",
    background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", userSelect: "none",
  };
  const line = (etiket: React.ReactNode, value: React.ReactNode, vurgu = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: vurgu ? 18 : 14 }}>
      {vurgu ? <strong>{etiket}</strong> : <span style={{ color: "var(--gg-muted)" }}>{etiket}</span>}
      {vurgu ? <strong>{value}</strong> : <span>{value}</span>}
    </div>
  );

  /**
   * Siparişi sunucuya yollar. Eskiden yalnızca ekranda "alındı" yazılıyordu;
   * artık gerçekten sipariş oluşuyor ve satıcının kargo listesine düşüyor.
   */
  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setOrderError(null);
    try {
      // Address formdan okunur. Once gonderilmiyordu: siparis olusuyor ama
      // satici kargoya veremiyordu - zincirin son halkasi kopuktu.
      const f = new FormData(e.target as HTMLFormElement);
      const metin = (k: string) => String(f.get(k) ?? "").trim();

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.id, quantity: i.qty })),
          shippingAddress: {
            fullName: metin("ad"),
            phone: metin("tel"),
            line1: metin("adres"),
            line2: null,
            district: metin("ilce") || null,
            city: metin("il"),
            postalCode: metin("postaKodu") || null,
            countryCode: "TR",
            note: null,
          },
          couponCode: couponInput.trim() || null,
          giftCardCode: giftCardInput.trim() || null,
          submissionId: gonderimId.current,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setOrderError(j.error ?? "Sipariş oluşturulamadı");
        return;
      }
      // Gosterilen hesap ile gerceklesen ayristi mi?
      //
      // Ayni hediye kartini arada baska bir siparis harcamis olabilir;
      // o durumda indirim beklenenden az olur. Sessizce gecmek yerine
      // musteriye soyluyoruz - parayla ilgili bir fark gizlenmemeli.
      const sonuc = await res.json().catch(() => ({}));
      const beklenen = (hesap?.couponDiscount ?? 0) + (hesap?.giftCardApplied ?? 0);
      const gerceklesen = Number(sonuc.couponDiscount ?? 0) + Number(sonuc.giftCardApplied ?? 0);
      if (hesap && Math.abs(beklenen - gerceklesen) > 0.009) {
        setOrderError(
          `Siparişiniz oluştu ancak indirim beklenenden farklı gerçekleşti: ` +
          `${tl(beklenen)} yerine ${tl(gerceklesen)} uygulandı. ` +
          `Kupon süresi dolmuş ya da hediye kartı bakiyesi bu arada kullanılmış olabilir.`);
      }

      save([]); // sipariş oluştu → sepeti boşalt
      setOrderPlaced(true);
    } catch {
      setOrderError("Sunucuya ulaşılamadı");
    } finally {
      setSubmitting(false);
    }
  }

  if (orderPlaced) {
    return (
      <div style={{ maxWidth: 520, textAlign: "center", padding: "40px 0" }}>
        <div style={{ fontSize: 54 }}>✅</div>
        <h2 style={{ margin: "8px 0" }}>Siparişiniz alındı!</h2>
        <p style={{ color: "var(--gg-muted)" }}>Toplam {tl(grandTotal)} · Ödeme ve kargo süreci başlatıldı.</p>
        <a href="/orders" className="gg-btn gg-btn-primary" style={{ marginTop: 12 }}>Siparişlerime Git</a>
      </div>
    );
  }

  // ------- ÖZET KARTI (iki adımda da görünür) -------
  const ozetKarti = (
    <div className="gg-card" style={{ display: "grid", gap: 10 }}>
      {/* Kupon */}
      <div style={{ display: "grid", gap: 6 }}>
        <label style={{ fontSize: 12.5, color: "var(--gg-muted)" }}>İndirim kuponu</label>
        <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)}
               className="gg-search" placeholder="Mağazanın verdiği kod" />

        <label style={{ fontSize: 12.5, color: "var(--gg-muted)", marginTop: 4 }}>Hediye kartı</label>
        <input value={giftCardInput} onChange={(e) => setGiftCardInput(e.target.value)}
               className="gg-search" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" />

        <button className="gg-btn gg-btn-ghost" onClick={kodlariUygula} type="button"
                disabled={hesaplaniyor} style={{ justifySelf: "start", marginTop: 4 }}>
          {hesaplaniyor ? "Hesaplanıyor…" : "Kodları uygula"}
        </button>

        {hesap && (hesap.couponDiscount > 0 || hesap.giftCardApplied > 0) ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                        background: "var(--gg-primary-soft)", color: "var(--gg-primary-dark)",
                        borderRadius: 8, padding: "6px 10px", fontSize: 12.5 }}>
            <span>
              {hesap.couponDiscount > 0 ? `🎟️ Kupon −${tl(hesap.couponDiscount)}` : null}
              {hesap.couponDiscount > 0 && hesap.giftCardApplied > 0 ? "  ·  " : null}
              {hesap.giftCardApplied > 0 ? `🎁 Hediye kartı −${tl(hesap.giftCardApplied)}` : null}
            </span>
            <button type="button"
                    onClick={() => { setHesap(null); setCouponInput(""); setGiftCardInput(""); setCouponError(""); }}
                    aria-label="Kodları kaldır"
                    style={{ cursor: "pointer", background: "none", border: "none", color: "inherit", fontSize: 14 }}>✕</button>
          </div>
        ) : null}

        {/* Uyari kodun kabul edilmedigini soyler ama hesap yine gecerlidir:
            yanlis kod yuzunden tum odemeyi dusurmek musteriyi cikmaza sokardi. */}
        {couponError ? <div style={{ color: "#B42318", fontSize: 12.5 }}>{couponError}</div> : null}
      </div>

      {/* GlamPuan kredi */}
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", borderTop: "1px solid var(--gg-border)", paddingTop: 10 }}>
        <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} />
        <span>💎 GlamPuan kullan <strong>({tl(GLAMPOINT_BALANCE)})</strong></span>
      </label>

      {/* Tutar kırılımı */}
      <div style={{ display: "grid", gap: 6, borderTop: "1px solid var(--gg-border)", paddingTop: 10 }}>
        {line("Ara Toplam", tl(subtotal))}
        {couponDiscount > 0
          ? line("Kupon indirimi", <span style={{ color: "var(--gg-primary)" }}>−{tl(couponDiscount)}</span>)
          : null}
        {giftCardApplied > 0
          ? line("Hediye kartı", <span style={{ color: "var(--gg-primary)" }}>−{tl(giftCardApplied)}</span>)
          : null}
        {pointsDiscount > 0 ? line("GlamPuan", <span style={{ color: "var(--gg-primary)" }}>−{tl(pointsDiscount)}</span>) : null}
        {line("Kargo", <span style={{ color: "var(--gg-primary)" }}>Ücretsiz</span>)}
        {line(<span>KDV (%20 dahil)</span>, tl(kdv))}
        <div style={{ borderTop: "1px dashed var(--gg-border)", paddingTop: 8 }}>
          {line("Toplam", <span>{discountRate > 0 ? <span style={{ fontSize: 12, color: "var(--gg-primary)", marginRight: 8 }}>%{discountRate} tasarruf</span> : null}{tl(grandTotal)}</span>, true)}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--gg-muted)" }}>KDV hariç {tl(kdvHaric)} + KDV {tl(kdv)}</div>
      </div>

      {step === "sepet" ? (
        <button className="gg-btn gg-btn-primary" style={{ justifyContent: "center", marginTop: 4 }} onClick={() => setStep("odeme")}>
          Ödemeye Geç →
        </button>
      ) : null}
    </div>
  );

  return (
    <div style={{ maxWidth: step === "odeme" ? 900 : 640 }}>
      <SectionHeader title={step === "sepet" ? `MyCart (${items.length})` : "Ödeme Bilgileri"} />

      {/* Adım göstergesi */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, fontSize: 13 }}>
        <span style={{ color: step === "sepet" ? "var(--gg-primary)" : "var(--gg-muted)", fontWeight: 700 }}>1 · Sepet</span>
        <span style={{ color: "var(--gg-muted)" }}>›</span>
        <span style={{ color: step === "odeme" ? "var(--gg-primary)" : "var(--gg-muted)", fontWeight: 700 }}>2 · Ödeme & Teslimat</span>
      </div>

      {items.length === 0 ? (
        <p style={{ color: "var(--gg-muted)" }}>Sepetiniz boş. <a href="/" className="gg-see-all">Alışverişe başla ›</a></p>
      ) : step === "sepet" ? (
        // ================= ADIM 1: SEPET =================
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((i) => (
            <div key={i.id} className="gg-card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ width: 54, height: 54, borderRadius: 10, background: "linear-gradient(135deg, var(--gg-primary-soft), var(--gg-coral-soft))", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{i.name}</strong>
                <div style={{ fontSize: 12, color: "var(--gg-muted)" }}>{i.brand}</div>
                <div style={{ fontWeight: 700, marginTop: 2 }}>{tl(i.priceAmount)}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button type="button" style={stepBox} onClick={() => setQty(i.id, -1)} aria-label={`${i.name} adedini decrease`}>−</button>
                <strong style={{ minWidth: 18, textAlign: "center" }} aria-live="polite">{i.qty}</strong>
                <button type="button" style={stepBox} onClick={() => setQty(i.id, 1)} aria-label={`${i.name} adedini artır`}>+</button>
              </div>
              <button type="button" onClick={() => remove(i.id)} aria-label={`${i.name} ürününü fromCart çıkar`}
                      style={{ cursor: "pointer", color: "var(--gg-muted)", background: "none", border: "none", fontSize: 16 }}>🗑️</button>
            </div>
          ))}

          {ozetKarti}

          {/* Bunu alanlar bunları da aldı */}
          <section style={{ marginTop: 8 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>Bunu alanlar bunları da aldı</h3>
            <Carousel itemWidth={180}>
              {BIRLIKTE_ALINAN.map((p) => (
                <div key={p.id} className="gg-card" style={{ padding: 12, display: "grid", gap: 6 }}>
                  <span style={{ height: 90, borderRadius: 10, background: "linear-gradient(135deg, var(--gg-primary-soft), var(--gg-coral-soft))" }} />
                  <strong style={{ fontSize: 13 }}>{p.name}</strong>
                  <div style={{ fontSize: 11.5, color: "var(--gg-muted)" }}>{p.brand}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: 13 }}>{tl(p.priceAmount)}</strong>
                    <button className="gg-btn gg-btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => add(p)} type="button">+ Ekle</button>
                  </div>
                </div>
              ))}
            </Carousel>
          </section>
        </div>
      ) : (
        // ================= ADIM 2: ÖDEME & TESLİMAT =================
        <form
          onSubmit={placeOrder}
          style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 20, alignItems: "start" }}
          className="gg-checkout-grid"
        >
          <div style={{ display: "grid", gap: 16 }}>
            {/* Teslimat adresi */}
            <div className="gg-card" style={{ display: "grid", gap: 12 }}>
              <strong style={{ fontSize: 15 }}>📦 Teslimat Adresi</strong>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Ad Soyad
                  <input name="ad" required className="gg-search" placeholder="Ayşe Yılmaz" />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Telefon
                  <input name="tel" required className="gg-search" placeholder="0(5__) ___ __ __" />
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 12 }}>
                <label style={{ display: "grid", gap: 4, fontSize: 13 }}>İl
                  <input name="il" required className="gg-search" placeholder="İstanbul" />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 13 }}>İlçe
                  <input name="ilce" required className="gg-search" placeholder="Kadıköy" />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Posta Kodu
                  <input name="postaKodu" className="gg-search" placeholder="34710" />
                </label>
              </div>
              <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Açık Address
                <textarea name="adres" required className="gg-search" rows={2} placeholder="Mahalle, cadde, sokak, bina/daire no" style={{ resize: "vertical" }} />
              </label>
            </div>

            {/* Kurumsal fatura */}
            <div className="gg-card" style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={kurumsal} onChange={(e) => setKurumsal(e.target.checked)} />
                <strong style={{ fontSize: 15 }}>🧾 Kurumsal fatura istiyorum</strong>
              </label>
              {kurumsal ? (
                <>
                  <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Firma Ünvanı
                    <input name="firma" required={kurumsal} className="gg-search" placeholder="Örnek Kozmetik A.Ş." />
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Vergi Dairesi
                      <input name="vergiDairesi" required={kurumsal} className="gg-search" placeholder="Kadıköy" />
                    </label>
                    <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Vergi / TCKN No
                      <input name="vergiNo" required={kurumsal} className="gg-search" placeholder="1234567890" />
                    </label>
                  </div>
                  <label style={{ display: "grid", gap: 4, fontSize: 13 }}>E-Fatura E-posta
                    <input name="eFaturaMail" type="email" className="gg-search" placeholder="fatura@firma.com" />
                  </label>
                  <div style={{ fontSize: 11.5, color: "var(--gg-muted)" }}>KDV tutarı ({tl(kdv)}) faturada ayrıca gösterilir.</div>
                </>
              ) : null}
            </div>

            {/* Ödeme yöntemi (bilgi — kart alanları güvenlik gereği burada toplanmaz) */}
            <div className="gg-card" style={{ display: "grid", gap: 8 }}>
              <strong style={{ fontSize: 15 }}>💳 Ödeme Yöntemi</strong>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input type="radio" name="odeme" defaultChecked /> Kredi / Banka Kartı (ödeme sağlayıcı ekranında)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input type="radio" name="odeme" /> Kapıda Ödeme
              </label>
            </div>

            <button type="button" className="gg-see-all" onClick={() => setStep("sepet")} style={{ justifySelf: "start" }}>‹ Sepete dön</button>
          </div>

          {/* Sağ: özet + onay */}
          <div style={{ display: "grid", gap: 12 }}>
            {ozetKarti}
            <button className="gg-btn gg-btn-primary" type="submit" disabled={submitting}
                    style={{ justifyContent: "center" }}>
              {submitting ? "Gönderiliyor…" : <>Siparişi Onayla · {tl(grandTotal)}</>}
            </button>
            {orderError ? (
              <div style={{ background: "#FBE6E6", color: "#B42318", padding: 10, borderRadius: 10, fontSize: 13 }}>
                {orderError}
              </div>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}
