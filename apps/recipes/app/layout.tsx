import "@makeup/ui/styles.css";
import * as React from "react";

// MFE bağımsız çalışırken de (3001) düzgün görünsün diye minimal kök layout.
export const metadata = { title: "Tarifler — Makyaj" };

export default function RecipesLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          background: "#faf7f5",
          color: "#2a2024",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: 28 }}>{children}</div>
      </body>
    </html>
  );
}
