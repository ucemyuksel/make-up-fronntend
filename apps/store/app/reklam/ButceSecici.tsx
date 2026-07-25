"use client";

import * as React from "react";

/**
 * Günlük bütçe + teklif seçimi. Hazır paketler tek tıkla doldurur, isteyen
 * kendi tutarını yazar. Tahmini erişim CPM tekliflerinden hesaplanır:
 * gösterim ≈ bütçe / CPM × 1000.
 */

const PAKETLER = [
  { ad: "Başlangıç", butce: 50, cpm: 12, cpc: 1.5 },
  { ad: "Standart", butce: 150, cpm: 18, cpc: 2.5 },
  { ad: "Yoğun", butce: 500, cpm: 28, cpc: 4 },
];

const tl = (n: number) => "₺" + n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ButceSecici() {
  const [butce, setButce] = React.useState(150);
  const [cpm, setCpm] = React.useState(18);
  const [cpc, setCpc] = React.useState(2.5);

  const gunlukGosterim = cpm > 0 ? Math.round((butce / cpm) * 1000) : 0;
  const aylik = butce * 30;

  const lbl: React.CSSProperties = { display: "grid", gap: 4, fontSize: 13 };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {PAKETLER.map((p) => {
          const secili = butce === p.butce && cpm === p.cpm;
          return (
            <button
              key={p.ad}
              type="button"
              className={`gg-btn ${secili ? "gg-btn-primary" : "gg-btn-ghost"}`}
              onClick={() => { setButce(p.butce); setCpm(p.cpm); setCpc(p.cpc); }}
            >
              {p.ad} · {tl(p.butce)}/gün
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <label style={lbl}>
          Günlük bütçe (₺)
          <input name="dailyBudget" type="number" step="1" min="1" required className="gg-search"
                 value={butce} onChange={(e) => setButce(Number(e.target.value))} />
        </label>
        <label style={lbl}>
          CPM teklifi (₺/1000 gösterim)
          <input name="cpmBid" type="number" step="0.01" min="0" className="gg-search"
                 value={cpm} onChange={(e) => setCpm(Number(e.target.value))} />
        </label>
        <label style={lbl}>
          CPC teklifi (₺/tık)
          <input name="cpcBid" type="number" step="0.01" min="0" className="gg-search"
                 value={cpc} onChange={(e) => setCpc(Number(e.target.value))} />
        </label>
      </div>

      <div style={{
        background: "var(--gg-primary-soft)", color: "var(--gg-primary-dark)",
        borderRadius: 10, padding: "10px 12px", fontSize: 12.5,
      }}>
        📊 Bu bütçeyle günde yaklaşık <strong>{gunlukGosterim.toLocaleString("tr-TR")} gösterim</strong>,
        aylık üst sınır <strong>{tl(aylik)}</strong>. Gerçek rakam rekabete ve hedef bölgeye göre değişir;
        günlük bütçe dolunca reklam otomatik durur, aşım olmaz.
      </div>
    </div>
  );
}
