import "@makeup/ui/styles.css";
import * as React from "react";
import { AppShell } from "@makeup/ui";

export const metadata = { title: "Tarifler — GlamGuide" };

// Diğer zone'larla tutarlı: tam uygulama kabuğu (sol menü + üst bar). Aksi halde
// sayfa çıplak görünüyordu ("giriş yaptım ama hiçbir şey yok").
export default function RecipesLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <AppShell active="guide">{children}</AppShell>
      </body>
    </html>
  );
}
