"use client";

import * as React from "react";

/** Sosyal etkileşim bileşenleri: paylaş, kaydet, beğenmeme, hikâye görüntüleyici.
 *  Paylaşım Web Share API ile (destek yoksa bağlantı kopyalanır + hızlı linkler). */

export function ShareButton({ baslik, metin, url }: { baslik: string; metin?: string; url?: string }) {
  const [acik, setAcik] = React.useState(false);
  const [kopyalandi, setKopyalandi] = React.useState(false);
  const link = url ?? (typeof window !== "undefined" ? window.location.href : "");

  const paylas = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: baslik, text: metin ?? baslik, url: link });
        return;
      } catch { /* kullanıcı iptal etti → menüye düş */ }
    }
    setAcik((a) => !a);
  };

  const kopyala = async () => {
    await navigator.clipboard.writeText(link).catch(() => null);
    setKopyalandi(true);
    setTimeout(() => setKopyalandi(false), 1500);
  };

  const enc = encodeURIComponent;
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button onClick={paylas} title="Paylaş" aria-label="Paylaş" className="gg-icon-btn">
        <span aria-hidden="true">↗</span>
        <span className="gg-icon-btn-label">Paylaş</span>
      </button>
      {acik && (
        <span style={{ position: "absolute", bottom: "120%", right: 0, background: "#fff", border: "1px solid var(--gg-border)", borderRadius: 10, boxShadow: "0 4px 14px rgba(0,0,0,.12)", padding: 8, display: "grid", gap: 4, zIndex: 20, minWidth: 170 }}>
          <a href={`https://wa.me/?text=${enc(baslik + " " + link)}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, padding: "6px 8px" }}>🟢 WhatsApp</a>
          <a href={`https://x.com/intent/tweet?text=${enc(baslik)}&url=${enc(link)}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, padding: "6px 8px" }}>𝕏 X (Twitter)</a>
          <a href={`https://t.me/share/url?url=${enc(link)}&text=${enc(baslik)}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, padding: "6px 8px" }}>✈️ Telegram</a>
          <button onClick={kopyala} style={{ fontSize: 13, padding: "6px 8px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
            {kopyalandi ? "✓ Kopyalandı" : "🔗 Bağlantıyı kopyala"}
          </button>
        </span>
      )}
    </span>
  );
}

type Kayit = { id: string; tip: "post" | "reel"; baslik: string };

function kayitlar(): Kayit[] {
  try { return JSON.parse(localStorage.getItem("gg-kaydedilenler") ?? "[]"); } catch { return []; }
}

export function SaveButton({ id, tip, baslik }: Kayit) {
  const [kayitli, setKayitli] = React.useState(false);
  React.useEffect(() => setKayitli(kayitlar().some((k) => k.id === id)), [id]);

  const degistir = () => {
    const mevcut = kayitlar();
    const yeni = kayitli ? mevcut.filter((k) => k.id !== id) : [...mevcut, { id, tip, baslik }];
    localStorage.setItem("gg-kaydedilenler", JSON.stringify(yeni));
    setKayitli(!kayitli);
  };

  return (
    <button onClick={degistir} title={kayitli ? "Kaydedilenlerden çıkar" : "Kaydet"}
            aria-label={kayitli ? "Kaydedilenlerden çıkar" : "Kaydet"}
            aria-pressed={kayitli}
            className="gg-icon-btn"
            style={{ color: kayitli ? "var(--gg-primary)" : undefined }}>
      <span aria-hidden="true">🔖</span>
      {kayitli ? <span className="gg-icon-btn-label">Kaydedildi</span> : null}
    </button>
  );
}

/** Profildeki "Kaydedilenler" sekmesi — localStorage'daki kayıtları listeler. */
export function KaydedilenlerListesi() {
  const [liste, setListe] = React.useState<Kayit[]>([]);
  React.useEffect(() => setListe(kayitlar()), []);
  if (liste.length === 0) {
    return <p style={{ color: "var(--gg-muted)" }}>Henüz kayıtlı içerik yok — gönderi/reel kartlarındaki 🔖 ile kaydet.</p>;
  }
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {liste.map((k) => (
        <div key={k.id} className="gg-card" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 18 }}>{k.tip === "reel" ? "🎬" : "📷"}</span>
          <span style={{ flex: 1, fontSize: 13.5 }}>{k.baslik}</span>
          <SaveButton id={k.id} tip={k.tip} baslik={k.baslik} />
        </div>
      ))}
    </div>
  );
}

/** Beğenmeme (dislike) — sunucuda karşılığı yok, cihazda tutulur (dürüst MVP). */
export function DislikeButton({ id }: { id: string }) {
  const [begenmedim, setBegenmedim] = React.useState(false);
  React.useEffect(() => {
    try { setBegenmedim(JSON.parse(localStorage.getItem("gg-dislike") ?? "[]").includes(id)); } catch { /* yok */ }
  }, [id]);
  const degistir = () => {
    let liste: string[] = [];
    try { liste = JSON.parse(localStorage.getItem("gg-dislike") ?? "[]"); } catch { /* yok */ }
    const yeni = begenmedim ? liste.filter((x) => x !== id) : [...liste, id];
    localStorage.setItem("gg-dislike", JSON.stringify(yeni));
    setBegenmedim(!begenmedim);
  };
  return (
    <button onClick={degistir} title="Beğenme"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: begenmedim ? "var(--gg-primary)" : "var(--gg-muted)" }}>
      👎{begenmedim ? " Beğenilmedi" : ""}
    </button>
  );
}

/** Hikâye şeridi + tam ekran görüntüleyici (ilerleme çubuklu, otomatik geçiş). */
export type Hikaye = {
  ad: string;
  metin: string;
  renk: string;
  /** Gerçek hikaye medyası (post-service). Yoksa düz renk zemin gösterilir. */
  medyaUrl?: string;
  medyaTuru?: string;
  /** Doluysa halka tıklanınca görüntüleyici yerine bu adrese gidilir (hikaye paylaş). */
  href?: string;
};

type ServedAd = {
  campaignId: string; advertiserName: string; placement: string;
  mediaUrl: string; mediaType: string; headline: string; ctaText: string; ctaUrl: string; sponsored: boolean;
};

type Slayt = { tip: "story"; h: Hikaye } | { tip: "ad"; ad: ServedAd; eventId: string };

function tarayiciUlke(): string {
  return (typeof navigator !== "undefined" ? navigator.language : "").split("-")[1] || "";
}

/** Reklam takibi — idempotent eventId ile gösterim/tık bildir (proxy route üzerinden). */
async function reklamOlayBildir(campaignId: string, type: "impression" | "click", eventId: string) {
  try {
    await fetch(`/api/ads/${campaignId}/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, countryCode: tarayiciUlke() || null }),
      keepalive: true,
    });
  } catch { /* sessiz */ }
}

export function StoryBar({ hikayeler }: { hikayeler: Hikaye[] }) {
  const [aktif, setAktif] = React.useState<number | null>(null);
  const [reklamlar, setReklamlar] = React.useState<ServedAd[]>([]);

  React.useEffect(() => {
    const ulke = tarayiciUlke();
    fetch(`/api/ads/serve?placement=STORY&limit=3${ulke ? `&country=${ulke}` : ""}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setReklamlar(Array.isArray(d) ? d : []))
      .catch(() => setReklamlar([]));
  }, []);

  return (
    <>
      <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 4 }}>
        {hikayeler.map((s, i) => {
          // Halka içi: gerçek medya varsa küçük önizleme, yoksa düz renk.
          const ic = (
            <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: s.renk, border: "2px solid #fff" }}>
              {s.medyaUrl && s.medyaTuru !== "VIDEO" ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={s.medyaUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : s.medyaUrl ? (
                <video src={s.medyaUrl} muted playsInline preload="metadata"
                       style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : null}
            </span>
          );
          const halka = (
            <span style={{ width: 58, height: 58, borderRadius: "50%", padding: 2, display: "block", background: s.href ? "var(--gg-border)" : "linear-gradient(135deg, var(--gg-primary), var(--gg-coral))" }}>
              {ic}
            </span>
          );
          const etiket = <span style={{ fontSize: 11.5, whiteSpace: "nowrap", color: "var(--gg-text)" }}>{s.ad}</span>;
          const kutu: React.CSSProperties = {
            display: "grid", justifyItems: "center", gap: 6, minWidth: 62,
            background: "none", border: "none", cursor: "pointer", textDecoration: "none",
          };

          // "Hikaye paylaş" halkası görüntüleyici açmaz, paylaşma sayfasına gider.
          return s.href ? (
            <a key={s.ad + i} href={s.href} style={kutu} aria-label="Hikaye paylaş">
              <span style={{ position: "relative", display: "block" }}>
                {halka}
                <span style={{ position: "absolute", right: -2, bottom: -2, width: 20, height: 20, borderRadius: "50%", background: "var(--gg-primary)", color: "#fff", fontSize: 14, lineHeight: "20px", textAlign: "center", border: "2px solid #fff" }}>+</span>
              </span>
              {etiket}
            </a>
          ) : (
            <button key={s.ad + i} onClick={() => setAktif(i)} style={kutu}>
              {halka}
              {etiket}
            </button>
          );
        })}
      </div>
      {aktif !== null && <StoryViewer hikayeler={hikayeler} reklamlar={reklamlar} baslangic={aktif} kapat={() => setAktif(null)} />}
    </>
  );
}

function StoryViewer({ hikayeler, reklamlar, baslangic, kapat }: { hikayeler: Hikaye[]; reklamlar: ServedAd[]; baslangic: number; kapat: () => void }) {
  // Slaytlar: her 3 hikayede bir reklam araya girer (mevcut reklam sayısınca).
  const slaytlar = React.useMemo<Slayt[]>(() => {
    const out: Slayt[] = [];
    let adIdx = 0;
    const yeniId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${adIdx}`);
    hikayeler.forEach((h, k) => {
      out.push({ tip: "story", h });
      if ((k + 1) % 3 === 0 && adIdx < reklamlar.length) {
        out.push({ tip: "ad", ad: reklamlar[adIdx++], eventId: yeniId() });
      }
    });
    // Az hikaye varsa (araya reklam girmediyse) sona bir reklam ekle — sponsorlu slayt hep görünsün.
    if (adIdx === 0 && reklamlar.length > 0) {
      out.push({ tip: "ad", ad: reklamlar[0], eventId: yeniId() });
    }
    return out;
  }, [hikayeler, reklamlar]);

  // Tıklanan hikayenin slayt indeksini bul.
  const baslaSlayt = React.useMemo(() => {
    let sayac = -1;
    for (let idx = 0; idx < slaytlar.length; idx++) {
      const s = slaytlar[idx];
      if (s.tip === "story") { sayac++; if (sayac === baslangic) return idx; }
    }
    return 0;
  }, [slaytlar, baslangic]);

  const [i, setI] = React.useState(baslaSlayt);
  const [t, setT] = React.useState(0); // 0..1 ilerleme
  const firedRef = React.useRef<Set<string>>(new Set());
  const SURE = 4000;

  React.useEffect(() => {
    setT(0);
    const bas = performance.now();
    let raf = 0;
    const dongu = (now: number) => {
      const oran = (now - bas) / SURE;
      if (oran >= 1) {
        if (i + 1 < slaytlar.length) setI(i + 1);
        else kapat();
        return;
      }
      setT(oran);
      raf = requestAnimationFrame(dongu);
    };
    raf = requestAnimationFrame(dongu);
    return () => cancelAnimationFrame(raf);
  }, [i, slaytlar.length, kapat]);

  // Reklam slaytı görününce bir kez gösterim (impression) bildir.
  React.useEffect(() => {
    const cur = slaytlar[i];
    if (cur && cur.tip === "ad" && !firedRef.current.has(cur.eventId)) {
      firedRef.current.add(cur.eventId);
      reklamOlayBildir(cur.ad.campaignId, "impression", cur.eventId);
    }
  }, [i, slaytlar]);

  const cur = slaytlar[i];
  if (!cur) return null;
  const reklamMi = cur.tip === "ad";

  const ctaTikla = (ad: ServedAd, e: React.MouseEvent) => {
    e.stopPropagation();
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-clk`;
    reklamOlayBildir(ad.campaignId, "click", id);
    if (typeof window !== "undefined") window.open(ad.ctaUrl, "_blank", "noopener");
  };

  const arka = reklamMi
    ? "#000"
    : `linear-gradient(160deg, ${(cur as { h: Hikaye }).h.renk}, var(--gg-primary))`;
  const baslik = reklamMi ? (cur as { ad: ServedAd }).ad.advertiserName : (cur as { h: Hikaye }).h.ad;

  return (
    <div onClick={() => (i + 1 < slaytlar.length ? setI(i + 1) : kapat())}
         style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.92)", display: "grid", placeItems: "center" }}>
      <div style={{ width: "min(420px, 94vw)", aspectRatio: "9/16", borderRadius: 18, overflow: "hidden", position: "relative", background: arka, display: "grid", placeItems: "center" }}>
        {/* Reklam görseli */}
        {reklamMi ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(cur as { ad: ServedAd }).ad.mediaUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }} />
        ) : null}

        {/* İlerleme çubukları */}
        <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", gap: 4, zIndex: 2 }}>
          {slaytlar.map((_, k) => (
            <span key={k} style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,.35)", overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", background: "#fff", width: k < i ? "100%" : k === i ? `${t * 100}%` : "0%" }} />
            </span>
          ))}
        </div>

        <div style={{ position: "absolute", top: 24, left: 14, display: "flex", gap: 8, alignItems: "center", zIndex: 2 }}>
          <span style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.85)" }} />
          <strong style={{ color: "#fff", fontSize: 13, textShadow: "0 1px 4px rgba(0,0,0,.5)" }}>{baslik}</strong>
          {reklamMi ? <span style={{ background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 6px" }}>Sponsorlu</span> : null}
        </div>

        <button onClick={(e) => { e.stopPropagation(); kapat(); }}
                style={{ position: "absolute", top: 20, right: 12, background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", zIndex: 2 }}>✕</button>
        {i > 0 && (
          <button onClick={(e) => { e.stopPropagation(); setI(i - 1); }}
                  style={{ position: "absolute", left: 6, top: "50%", background: "none", border: "none", color: "rgba(255,255,255,.7)", fontSize: 26, cursor: "pointer", zIndex: 2 }}>‹</button>
        )}

        {reklamMi ? (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "20px 22px", background: "linear-gradient(0deg, rgba(0,0,0,.75), transparent)", zIndex: 2 }}>
            <div style={{ color: "#fff", fontSize: 19, fontWeight: 700, marginBottom: 12, textShadow: "0 1px 6px rgba(0,0,0,.5)" }}>{(cur as { ad: ServedAd }).ad.headline}</div>
            <button onClick={(e) => ctaTikla((cur as { ad: ServedAd }).ad, e)}
                    style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: "#fff", color: "var(--gg-primary-dark)", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              {(cur as { ad: ServedAd }).ad.ctaText} →
            </button>
          </div>
        ) : (
          <p style={{ color: "#fff", fontSize: 17, fontWeight: 600, padding: "0 26px", textAlign: "center", textShadow: "0 1px 6px rgba(0,0,0,.35)", zIndex: 2 }}>{(cur as { h: Hikaye }).h.metin}</p>
        )}
      </div>
    </div>
  );
}
