import "@makeup/ui/styles.css";
import * as React from "react";
import { AppShell } from "@makeup/ui";
import { auth } from "../auth";

export const metadata = { title: "Tarifler — GlamGuide" };

// Diğer zone'larla tutarlı: tam uygulama kabuğu (sol menü + üst bar). Aksi halde
// sayfa çıplak görünüyordu ("giriş yaptım ama hiçbir şey yok").
export default async function RecipesLayout({ children }: { children: React.ReactNode }) {
  const session = (await auth()) as { roles?: string[] } | null;
  const isAdmin = session?.roles?.includes("ADMIN") ?? false;

  return (
    <html lang="tr">
      <body>
        <AppShell active="guide" isAdmin={isAdmin}>{children}</AppShell>
      </body>
    </html>
  );
}
