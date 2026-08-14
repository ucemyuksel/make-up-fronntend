import * as React from "react";
import { theme } from "@makeup/ui";

export type StepProductCard = {
  productId: string;
  storeId: string;
  name: string;
  priceAmount: number;
  currency: string;
  imageUrl: string | null;
};

const STORE_URL = process.env.NEXT_PUBLIC_STORE_URL || "http://localhost:3002";

function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(amount);
  } catch {
    // Bilinmeyen para birimi kodunda Intl atar; tutari kaybetmektense duz yaz.
    return `${amount} ${currency}`;
  }
}

/**
 * The products this step is applied with.
 *
 * <p>The step used to render only a colour swatch, so the guide named no
 * product and sold nothing. The cards link straight into the storefront: the
 * user is in front of a mirror asking "what do I do this with", which is the
 * easiest moment there is to sell.
 *
 * <p>Renders nothing when the list is empty - the backend already drops
 * products that are unapproved or off sale, and an empty "Recommended
 * products" heading would just look broken.
 *
 * <p>Links carry the origin explicitly because the storefront is a separate
 * app on another origin; a relative href would stay inside the recipes app.
 */
export function StepProducts({ products }: { products: StepProductCard[] }) {
  if (!products || products.length === 0) return null;

  return (
    <section style={{ marginTop: 18 }} aria-labelledby="step-products-heading">
      <h3
        id="step-products-heading"
        style={{ fontSize: 14, margin: "0 0 10px", color: theme.color.textMuted, fontWeight: 600 }}
      >
        Bu adımda kullanılanlar
      </h3>

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 10,
        }}
      >
        {products.map((p) => (
          <li key={p.productId}>
            <a
              href={`${STORE_URL}/product/${p.productId}`}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: 10,
                borderRadius: 12,
                border: `1px solid ${theme.color.border}`,
                textDecoration: "none",
                color: "inherit",
                height: "100%",
              }}
            >
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt=""
                  loading="lazy"
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    objectFit: "cover",
                    borderRadius: 8,
                    background: theme.color.bg,
                  }}
                />
              ) : (
                // Gorseli olmayan urun de gosterilir; kart yuksekligi sabit
                // kalsin diye yer tutucu birakiliyor.
                <span
                  aria-hidden="true"
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    borderRadius: 8,
                    background: theme.color.bg,
                  }}
                />
              )}

              <span style={{ fontSize: 13, lineHeight: 1.35 }}>{p.name}</span>
              <strong style={{ fontSize: 14, color: theme.color.primaryDark }}>
                {formatPrice(p.priceAmount, p.currency)}
              </strong>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
