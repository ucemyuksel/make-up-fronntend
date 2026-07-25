import "@makeup/ui/styles.css";
import * as React from "react";
import { AppShell } from "@makeup/ui";
import { auth } from "../auth";

export const metadata = {
  title: "GlamGuide — AI Makyaj Rehberi",
  description: "Adım adım makyaj, pazaryeri ve topluluk (micro-frontend)",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // ADMIN rolü varsa menüye "Yönetim Merkezi" eklenir.
  const session = (await auth()) as { roles?: string[] } | null;
  const roles = session?.roles ?? [];
  const isAdmin = roles.includes("ADMIN");

  return (
    <html lang="tr">
      <body>
        <AppShell active="home" isAdmin={isAdmin} roles={roles}>{children}</AppShell>
      </body>
    </html>
  );
}
