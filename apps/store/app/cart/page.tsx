"use client";
import * as React from "react";
import { SectionHeader, Carousel } from "@makeup/ui";

type CartItem = { id: string; name: string; brand: string; priceAmount: number; qty: number };
const tl = (n: number) => "₺" + Number(n).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const KDV_ORANI = 0.20; // Kozmetik KDV %20

// Kupon kodları (demo — prod'da purchase/promotion-service'ten doğrulanır).
const KUPONLAR: Record<string, { tip: "yuzde" | "tutar"; deger: number; ad: string }> = {
  GLAM10: { tip: "yuzde", deger: 10, ad: "%10 indirim" },
  GLAM20: { tip: "yuzde", deger: 20, ad: "%20 indirim" },
  HOSGELDIN50: { tip: "tutar", deger: 50, ad: "₺50 indirim" },
};

const GLAMPUAN_BAKIYE = 75; // Kullanıcı kredisi (demo).

// "Bunu alanlar bunları da aldı" (cross-sell — demo).
const BIRLIKTE_ALINAN: CartItem[] = [
  { id: "x1", name: "Makyaj Temizleme Suyu", brand: "Garnier", priceAmount: 129, qty: 1 },
  { id: "x2", name: "Makyaj Süngeri Seti", brand: "Real Techniques", priceAmount: 189, qty: 1 },
  { id: "x3", name: "Dudak Nemlendirici", brand: "Nivea", priceAmount: 79, qty: 1 },
  { id: "x4", name: "Fırça Temizleyici", brand: "Gratis", priceAmount: 99, qty: 1 },
];

export default function CartPage() {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [adim, setAdim] = React.useState<"sepet" | "odeme">("sepet");

  // Kupon + puan durumu
  const [kuponGirdi, setKuponGirdi] = React.useState("");
  const [kupon, setKupon] = React.useState<string | null>(null);
  const [kuponHata, setKuponHata] = React.useState("");
  const [puanKullan, setPuanKullan] = React.useState(false);

  // Kurumsal fatura
  const [kurumsal, setKurumsal] = React.useState(false);
  const [siparisVerildi, setSiparisVerildi] = React.useState(false);
  const [gonderiliyor, setGonderiliyor] = React.useState(false);
  const [siparisHatasi, setSiparisHatasi] = React.useState<string | null>(null);

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
  const ekle = (p: CartItem) => {
    const varOlan = items.find((i) => i.id === p.id);
    save(varOlan ? items.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i)) : [...items, { ...p, qty: 1 }]);
  };

  const kuponUygula = () => {
    const kod = kuponGirdi.trim().toUpperCase();
    if (!kod) return;
    if (KUPONLAR[kod]) { setKupon(kod); setKuponHata(""); }
    else { setKupon(null); setKuponHata("Geçersiz kupon kodu."); }
  };

  // --- Tutar hesabı ---
  const subtotal = items.reduce((s, i) => s + i.priceAmount * i.qty, 0);
  const k = kupon ? KUPONLAR[kupon] : null;
  const kuponIndirim = !k ? 0 : k.tip === "yuzde" ? (subtotal * k.deger) / 100 : Math.min(k.deger, subtotal);
  const puanIndirim = puanKullan ? Math.min(GLAMPUAN_BAKIYE, Math.max(0, subtotal - kuponIndirim)) : 0;
  const kargo = 0; // Ücretsiz
  const grandTotal = Math.max(0, subtotal - kuponIndirim - puanIndirim + kargo);
  const kdvHaric = grandTotal / (1 + KDV_ORANI);
  const kdv = grandTotal - kdvHaric;
  const indirimOrani = subtotal > 0 ? Math.round(((kuponIndirim + puanIndirim) / subtotal) * 100) : 0;

  const stepBox: React.CSSProperties = {
    width: 28, height: 28, borderRadius: 7, border: "1px solid var(--gg-border)",
    background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", userSelect: "none",
  };
  const satir = (etiket: React.ReactNode, deger: React.ReactNode, vurgu = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: vurgu ? 18 : 14 }}>
      {vurgu ? <strong>{etiket}</strong> : <span style={{ color: "var(--gg-muted)" }}>{etiket}</span>}
      {vurgu ? <strong>{deger}</strong> : <span>{deger}</span>}
    </div>
  );

  /**
   * Siparişi sunucuya yollar. Eskiden yalnızca ekranda "alındı" yazılıyordu;
   * artık gerçekten sipariş oluşuyor ve satıcının kargo listesine düşüyor.
   */
  async function siparisVer(e: React.FormEvent) {
    e.preventDefault();
    setGonderiliyor(true);
    setSiparisHatasi(null);
    try {
      const res = await fetch("/api/siparis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map((i) => ({ productId: i.id, adet: i.qty })) }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setSiparisHatasi(j.error ?? "Sipariş oluşturulamadı");
        return;
      }
      save([]); // sipariş oluştu → sepeti boşalt
      setSiparisVerildi(true);
    } catch {
      setSiparisHatasi("Sunucuya ulaşılamadı");
    } finally {
      setGonderiliyor(false);
    }
  }

  if (siparisVerildi) {
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
        <div style={{ display: "flex", gap: 8 }}>
          <input value={kuponGirdi} onChange={(e) => setKuponGirdi(e.target.value)} className="gg-search" style={{ flex: 1 }} placeholder="GLAM10, HOSGELDIN50..." />
          <button className="gg-btn gg-btn-ghost" onClick={kuponUygula} type="button">Uygula</button>
        </div>
        {kupon ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--gg-primary-soft)", color: "var(--gg-primary-dark)", borderRadius: 8, padding: "6px 10px", fontSize: 12.5 }}>
            <span>🎟️ {kupon} — {KUPONLAR[kupon].ad}</span>
            <button type="button" onClick={() => { setKupon(null); setKuponGirdi(""); }}
                    aria-label="Kuponu kaldır"
                    style={{ cursor: "pointer", background: "none", border: "none", color: "inherit", fontSize: 14 }}>✕</button>
          </div>
        ) : null}
        {kuponHata ? <div style={{ color: "#B42318", fontSize: 12.5 }}>{kuponHata}</div> : null}
      </div>

      {/* GlamPuan kredi */}
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", borderTop: "1px solid var(--gg-border)", paddingTop: 10 }}>
        <input type="checkbox" checked={puanKullan} onChange={(e) => setPuanKullan(e.target.checked)} />
        <span>💎 GlamPuan kullan <strong>({tl(GLAMPUAN_BAKIYE)})</strong></span>
      </label>

      {/* Tutar kırılımı */}
      <div style={{ display: "grid", gap: 6, borderTop: "1px solid var(--gg-border)", paddingTop: 10 }}>
        {satir("Ara Toplam", tl(subtotal))}
        {kuponIndirim > 0 ? satir(`Kupon (%${k?.tip === "yuzde" ? k.deger : Math.round((kuponIndirim / subtotal) * 100)})`, <span style={{ color: "var(--gg-primary)" }}>−{tl(kuponIndirim)}</span>) : null}
        {puanIndirim > 0 ? satir("GlamPuan", <span style={{ color: "var(--gg-primary)" }}>−{tl(puanIndirim)}</span>) : null}
        {satir("Kargo", <span style={{ color: "var(--gg-primary)" }}>Ücretsiz</span>)}
        {satir(<span>KDV (%20 dahil)</span>, tl(kdv))}
        <div style={{ borderTop: "1px dashed var(--gg-border)", paddingTop: 8 }}>
          {satir("Toplam", <span>{indirimOrani > 0 ? <span style={{ fontSize: 12, color: "var(--gg-primary)", marginRight: 8 }}>%{indirimOrani} tasarruf</span> : null}{tl(grandTotal)}</span>, true)}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--gg-muted)" }}>KDV hariç {tl(kdvHaric)} + KDV {tl(kdv)}</div>
      </div>

      {adim === "sepet" ? (
        <button className="gg-btn gg-btn-primary" style={{ justifyContent: "center", marginTop: 4 }} onClick={() => setAdim("odeme")}>
          Ödemeye Geç →
        </button>
      ) : null}
    </div>
  );

  return (
    <div style={{ maxWidth: adim === "odeme" ? 900 : 640 }}>
      <SectionHeader title={adim === "sepet" ? `Sepetim (${items.length})` : "Ödeme Bilgileri"} />

      {/* Adım göstergesi */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, fontSize: 13 }}>
        <span style={{ color: adim === "sepet" ? "var(--gg-primary)" : "var(--gg-muted)", fontWeight: 700 }}>1 · Sepet</span>
        <span style={{ color: "var(--gg-muted)" }}>›</span>
        <span style={{ color: adim === "odeme" ? "var(--gg-primary)" : "var(--gg-muted)", fontWeight: 700 }}>2 · Ödeme & Teslimat</span>
      </div>

      {items.length === 0 ? (
        <p style={{ color: "var(--gg-muted)" }}>Sepetiniz boş. <a href="/" className="gg-see-all">Alışverişe başla ›</a></p>
      ) : adim === "sepet" ? (
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
                <button type="button" style={stepBox} onClick={() => setQty(i.id, -1)} aria-label={`${i.name} adedini azalt`}>−</button>
                <strong style={{ minWidth: 18, textAlign: "center" }} aria-live="polite">{i.qty}</strong>
                <button type="button" style={stepBox} onClick={() => setQty(i.id, 1)} aria-label={`${i.name} adedini artır`}>+</button>
              </div>
              <button type="button" onClick={() => remove(i.id)} aria-label={`${i.name} ürününü sepetten çıkar`}
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
                    <button className="gg-btn gg-btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => ekle(p)} type="button">+ Ekle</button>
                  </div>
                </div>
              ))}
            </Carousel>
          </section>
        </div>
      ) : (
        // ================= ADIM 2: ÖDEME & TESLİMAT =================
        <form
          onSubmit={siparisVer}
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
              <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Açık Adres
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

            <button type="button" className="gg-see-all" onClick={() => setAdim("sepet")} style={{ justifySelf: "start" }}>‹ Sepete dön</button>
          </div>

          {/* Sağ: özet + onay */}
          <div style={{ display: "grid", gap: 12 }}>
            {ozetKarti}
            <button className="gg-btn gg-btn-primary" type="submit" disabled={gonderiliyor}
                    style={{ justifyContent: "center" }}>
              {gonderiliyor ? "Gönderiliyor…" : <>Siparişi Onayla · {tl(grandTotal)}</>}
            </button>
            {siparisHatasi ? (
              <div style={{ background: "#FBE6E6", color: "#B42318", padding: 10, borderRadius: 10, fontSize: 13 }}>
                {siparisHatasi}
              </div>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}
