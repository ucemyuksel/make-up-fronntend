import "@makeup/ui/styles.css";
import * as React from "react";
import { AppShell } from "@makeup/ui";

export const metadata = { title: "Sosyal — GlamGuide" };

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <AppShell active="reels">{children}</AppShell>
      </body>
    </html>
  );
}
