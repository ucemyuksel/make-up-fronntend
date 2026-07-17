import "@makeup/ui/styles.css";
import * as React from "react";
import { AppShell } from "@makeup/ui";

export const metadata = { title: "Mağaza — GlamGuide" };

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <AppShell active="store">{children}</AppShell>
      </body>
    </html>
  );
}
