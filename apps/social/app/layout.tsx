import "@makeup/ui/styles.css";
import * as React from "react";
import { AppShell } from "@makeup/ui";
import { auth } from "../auth";

export const metadata = { title: "Sosyal — GlamGuide" };

export default async function SocialLayout({ children }: { children: React.ReactNode }) {
  // ADMIN rolü varsa menüye "Yönetim Merkezi" eklenir.
  const session = (await auth()) as { roles?: string[] } | null;
  const isAdmin = session?.roles?.includes("ADMIN") ?? false;

  return (
    <html lang="tr">
      <body>
        <AppShell active="reels" isAdmin={isAdmin}>{children}</AppShell>
      </body>
    </html>
  );
}
