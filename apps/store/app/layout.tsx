import "@makeup/ui/styles.css";
import * as React from "react";
import { AppShell } from "@makeup/ui";
import { auth } from "../auth";

export const metadata = { title: "Mağaza — GlamGuide" };

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  // ADMIN rolü varsa menüye "Yönetim Merkezi" eklenir (sıradan kullanıcıya görünmez).
  const session = (await auth()) as { roles?: string[] } | null;
  const roles = session?.roles ?? [];
  const isAdmin = roles.includes("ADMIN");

  return (
    <html lang="tr">
      <body>
        <AppShell active="store" isAdmin={isAdmin} roles={roles}>{children}</AppShell>
      </body>
    </html>
  );
}
