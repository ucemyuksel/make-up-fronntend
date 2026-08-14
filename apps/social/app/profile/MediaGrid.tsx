"use client";
import * as React from "react";

type Gonderi = { id: string; text: string; imageUrls: string[]; createdAt: string };
type Sayfa = { items: Gonderi[]; nextCursor: string | null };

/**
 * Profil ızgarası — <b>aşağı kaydırdıkça yükler</b>.
 *
 * <p>Önceki hâlde profil, tüm akışı tek istekte çekiyordu: hem başkalarının
 * gönderileri geliyordu hem de gönderi sayısı büyüdükçe ilk açılış doğrusal
 * olarak yavaşlıyordu.
 *
 * <p><b>Hız için üç şey:</b>
 * <ol>
 *   <li>İmleçli sayfalama — sayfa numarası yerine "kaldığın yer". Derine
 *       inildikçe yavaşlamaz.</li>
 *   <li>Görseller <b>tembel</b> yüklenir ve kutu oranı sabittir; kaydırırken
 *       yerleşim kaymaz (CLS).</li>
 *   <li>Bir sonraki sayfa, kullanıcı dibe <b>varmadan önce</b> istenir
 *       (200px önden) — bekleme hissi olmaz.</li>
 * </ol>
 */
export function MediaGrid({ ilkSayfa }: { ilkSayfa: Sayfa }) {
  const [gonderiler, setGonderiler] = React.useState<Gonderi[]>(ilkSayfa.items);
  const [cursor, setCursor] = React.useState<string | null>(ilkSayfa.nextCursor);
  const [yukleniyor, setYukleniyor] = React.useState(false);
  const [hata, setHata] = React.useState<string | null>(null);
  const nobetci = React.useRef<HTMLDivElement | null>(null);

  // useRef: yukleniyor/cursor degerleri gozlemci geri cagrisinda TAZE olmali.
  // Sadece state kullansaydik, gozlemci ilk render'daki degerleri kapatir ve
  // ayni sayfayi tekrar tekrar isterdi.
  const durum = React.useRef({ cursor: ilkSayfa.nextCursor, yukleniyor: false });
  durum.current.cursor = cursor;
  durum.current.yukleniyor = yukleniyor;

  const dahaGetir = React.useCallback(async () => {
    if (durum.current.yukleniyor || !durum.current.cursor) return;
    setYukleniyor(true);
    setHata(null);
    try {
      const r = await fetch(
        `/api/profile-posts?cursor=${encodeURIComponent(durum.current.cursor)}&limit=24`);
      if (!r.ok) throw new Error(String(r.status));
      const s: Sayfa = await r.json();
      // Ayni kimlik iki kez gelirse (imlec hatasi) ekranda tekrar gorunmesin:
      // React key catisir ve liste bozulur.
      setGonderiler((onceki) => {
        const varOlan = new Set(onceki.map((g) => g.id));
        return [...onceki, ...s.items.filter((g) => !varOlan.has(g.id))];
      });
      setCursor(s.nextCursor);
    } catch {
      setHata("Devamı yüklenemedi");
    } finally {
      setYukleniyor(false);
    }
  }, []);

  React.useEffect(() => {
    const el = nobetci.current;
    if (!el) return;
    const gozlemci = new IntersectionObserver(
      (girisler) => { if (girisler[0]?.isIntersecting) void dahaGetir(); },
      // rootMargin: kullanici dibe VARMADAN once istek baslar.
      { rootMargin: "200px" });
    gozlemci.observe(el);
    return () => gozlemci.disconnect();
  }, [dahaGetir]);

  const kareler = gonderiler.flatMap((g) =>
    (g.imageUrls ?? []).map((url, i) => ({ id: `${g.id}-${i}`, url, text: g.text })));

  return (
    <div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
        gap: 2,
      }}>
        {kareler.map((k) => (
          <div key={k.id} style={{
            // Sabit oran: gorsel inmeden once de yerini kaplar, kaydirirken
            // icerik zıplamaz.
            aspectRatio: "1 / 1",
            overflow: "hidden",
            background: "var(--yuzey-2, #f2f2f2)",
          }}>
            <img
              src={k.url}
              alt={k.text ? k.text.slice(0, 80) : "Gönderi görseli"}
              loading="lazy"
              decoding="async"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        ))}
      </div>

      {/* Nobetci: goruse girince bir sonraki sayfa istenir. */}
      <div ref={nobetci} style={{ height: 1 }} aria-hidden="true" />

      <div role="status" aria-live="polite" style={{ padding: "16px 0", textAlign: "center" }}>
        {yukleniyor && "Yükleniyor…"}
        {hata && (
          <span>
            {hata}{" "}
            <button type="button" onClick={() => void dahaGetir()}>Tekrar dene</button>
          </span>
        )}
        {!yukleniyor && !hata && !cursor && kareler.length > 0 && "Hepsi bu kadar"}
        {!yukleniyor && !hata && kareler.length === 0 && "Henüz gönderi yok"}
      </div>
    </div>
  );
}
