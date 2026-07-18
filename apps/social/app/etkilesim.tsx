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
      <button onClick={paylas} title="Paylaş" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--gg-muted)" }}>
        ↗ Paylaş
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
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, color: kayitli ? "var(--gg-primary)" : "var(--gg-muted)" }}>
      {kayitli ? "🔖 Kaydedildi" : "🔖"}
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
export type Hikaye = { ad: string; metin: string; renk: string };

export function StoryBar({ hikayeler }: { hikayeler: Hikaye[] }) {
  const [aktif, setAktif] = React.useState<number | null>(null);
  return (
    <>
      <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 4 }}>
        {hikayeler.map((s, i) => (
          <button key={s.ad + i} onClick={() => setAktif(i)} style={{ display: "grid", justifyItems: "center", gap: 6, minWidth: 62, background: "none", border: "none", cursor: "pointer" }}>
            <span style={{ width: 58, height: 58, borderRadius: "50%", padding: 2, background: i === 0 ? "var(--gg-border)" : "linear-gradient(135deg, var(--gg-primary), var(--gg-coral))" }}>
              <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", background: s.renk, border: "2px solid #fff" }} />
            </span>
            <span style={{ fontSize: 11.5, whiteSpace: "nowrap", color: "var(--gg-text)" }}>{s.ad}</span>
          </button>
        ))}
      </div>
      {aktif !== null && <StoryViewer hikayeler={hikayeler} baslangic={aktif} kapat={() => setAktif(null)} />}
    </>
  );
}

function StoryViewer({ hikayeler, baslangic, kapat }: { hikayeler: Hikaye[]; baslangic: number; kapat: () => void }) {
  const [i, setI] = React.useState(baslangic);
  const [t, setT] = React.useState(0); // 0..1 ilerleme
  const SURE = 4000;

  React.useEffect(() => {
    setT(0);
    const bas = performance.now();
    let raf = 0;
    const dongu = (now: number) => {
      const oran = (now - bas) / SURE;
      if (oran >= 1) {
        if (i + 1 < hikayeler.length) setI(i + 1);
        else kapat();
        return;
      }
      setT(oran);
      raf = requestAnimationFrame(dongu);
    };
    raf = requestAnimationFrame(dongu);
    return () => cancelAnimationFrame(raf);
  }, [i, hikayeler.length, kapat]);

  const h = hikayeler[i];
  return (
    <div onClick={() => (i + 1 < hikayeler.length ? setI(i + 1) : kapat())}
         style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.92)", display: "grid", placeItems: "center" }}>
      <div style={{ width: "min(420px, 94vw)", aspectRatio: "9/16", borderRadius: 18, overflow: "hidden", position: "relative", background: `linear-gradient(160deg, ${h.renk}, var(--gg-primary))`, display: "grid", placeItems: "center" }}>
        {/* İlerleme çubukları */}
        <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", gap: 4 }}>
          {hikayeler.map((_, k) => (
            <span key={k} style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,.35)", overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", background: "#fff", width: k < i ? "100%" : k === i ? `${t * 100}%` : "0%" }} />
            </span>
          ))}
        </div>
        <div style={{ position: "absolute", top: 24, left: 14, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.85)" }} />
          <strong style={{ color: "#fff", fontSize: 13 }}>{h.ad}</strong>
        </div>
        <button onClick={(e) => { e.stopPropagation(); kapat(); }}
                style={{ position: "absolute", top: 20, right: 12, background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer" }}>✕</button>
        {i > 0 && (
          <button onClick={(e) => { e.stopPropagation(); setI(i - 1); }}
                  style={{ position: "absolute", left: 6, top: "50%", background: "none", border: "none", color: "rgba(255,255,255,.7)", fontSize: 26, cursor: "pointer" }}>‹</button>
        )}
        <p style={{ color: "#fff", fontSize: 17, fontWeight: 600, padding: "0 26px", textAlign: "center", textShadow: "0 1px 6px rgba(0,0,0,.35)" }}>{h.metin}</p>
      </div>
    </div>
  );
}
