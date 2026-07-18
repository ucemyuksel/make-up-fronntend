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
}: {
  name: string;
  brand: string;
  price: string;
  rating?: number;
  count?: number;
  href?: string;
  image?: string;
}) {
  const inner = (
    <div className="gg-product">
      <div
        className="thumb"
        style={image ? { backgroundImage: `url(${image})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        <span className="fav">🤍</span>
      </div>
      <div className="name">{name}</div>
      <div className="brand">{brand}</div>
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

export function ReelCard({ caption, meta, image }: { caption?: string; meta?: string; image?: string }) {
  return (
    <div>
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
    </div>
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
