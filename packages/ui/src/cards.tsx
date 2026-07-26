import * as React from "react";

export function SectionHeader({
  title,
  href,
  small,
}: {
  title: string;
  href?: string;
  small?: boolean;
}) {
  return (
    <div className={"gg-section-head" + (small ? " small" : "")}>
      <h3>{title}</h3>
      {href ? (
        <a href={href} className="gg-see-all">
          Tümünü Gör ›
        </a>
      ) : null}
    </div>
  );
}

export function ProductCard({
  name,
  brand,
  rating,
  count,
  price,
  href,
  image,
  skinTag,
  skinMatch,
}: {
  name: string;
  brand: string;
  price: string;
  rating?: number;
  count?: number;
  href?: string;
  image?: string;
  skinTag?: string;   // uyumlu cilt tipi (ör. "Kuru & Karma")
  skinMatch?: boolean; // kullanıcının cildine uygun (AI analizinden)
}) {
  const inner = (
    <div className="gg-product">
      <div
        className="thumb"
        style={image ? { backgroundImage: `url(${image})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        <span className="fav">🤍</span>
        {skinMatch ? (
          <span style={{ position: "absolute", top: 8, left: 8, background: "var(--gg-primary)", color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: "2px 8px" }}>
            ✓ Cildine uygun
          </span>
        ) : null}
      </div>
      <div className="name">{name}</div>
      <div className="brand">{brand}</div>
      {skinTag ? (
        <div style={{ fontSize: 11, color: "var(--gg-primary-dark)", background: "var(--gg-primary-soft)", borderRadius: 999, padding: "2px 8px", justifySelf: "start", margin: "2px 0" }}>
          🧴 {skinTag}
        </div>
      ) : null}
      {rating != null ? (
        <div className="rate">
          <span className="star">★</span> {rating} <span>({count})</span>
        </div>
      ) : (
        <div className="rate">&nbsp;</div>
      )}
      <div className="buy">
        <strong style={{ fontSize: 13.5 }}>{price}</strong>
        <span className="cart">🛒</span>
      </div>
    </div>
  );
  return href ? <a href={href}>{inner}</a> : inner;
}

export function ReelCard({
  caption,
  meta,
  image,
  href,
}: {
  caption?: string;
  meta?: string;
  image?: string;
  /** Verilirse kart tıklanabilir olur (ana sayfadaki kartlar ölü görünüyordu). */
  href?: string;
}) {
  const Sarmal: React.ElementType = href ? "a" : "div";
  return (
    <Sarmal {...(href ? { href, style: { color: "inherit", textDecoration: "none", display: "block" } } : {})}>
      <div
        className="gg-reel"
        style={image ? { backgroundImage: `url(${image})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        <span className="play">▶️</span>
      </div>
      {caption ? (
        <div style={{ marginTop: 6, fontSize: 12.5 }}>
          <div style={{ fontWeight: 600 }}>{caption}</div>
          {meta ? <div style={{ color: "var(--gg-muted)" }}>{meta}</div> : null}
        </div>
      ) : null}
    </Sarmal>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--gg-muted)" }}>{label}</div>
    </div>
  );
}
