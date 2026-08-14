import "@makeup/ui/styles.css";
import * as React from "react";
import { AppShell } from "@makeup/ui";
import { auth } from "../auth";

export const metadata = { title: "Satıcı Paneli — GlamGuide" };

/**
 * Satıcı panelinin kabuğu.
 *
 * <p>{@code panel} verildiği için tüketici menüsü (Reels, Sepet, Premium…)
 * <b>hiç gösterilmez</b>. Satıcı paneli ayrı bir uygulama ve ayrı bir origin;
 * buraya alışveriş menüsü koymak kullanıcıyı başka origine atardı. Giriş
 * yapmamış birine de menü çıkmaz — göreceği tek şey giriş ekranı olmalı.
 */
export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const session = (await auth()) as { roles?: string[] } | null;
  const roles = session?.roles ?? [];
  const isAdmin = roles.includes("ADMIN");

  return (
    <html lang="tr">
      <body>
        <AppShell active="seller" isAdmin={isAdmin} roles={roles} panel>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
