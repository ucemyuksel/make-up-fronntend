import "@makeup/ui/styles.css";
import * as React from "react";
import { AppShell } from "@makeup/ui";
import { auth } from "../auth";

export const metadata = { title: "Sosyal — GlamGuide" };

export default async function SocialLayout({ children }: { children: React.ReactNode }) {
  // ADMIN rolü varsa menüye "Yönetim Merkezi" eklenir.
  const session = (await auth()) as { roles?: string[] } | null;
  const roles = session?.roles ?? [];
  const isAdmin = roles.includes("ADMIN");

  return (
    <html lang="tr">
      <body>
        <AppShell active="reels" isAdmin={isAdmin} roles={roles}>{children}</AppShell>
      </body>
    </html>
  );
}
