import "@makeup/ui/styles.css";
import * as React from "react";
import { AppShell } from "@makeup/ui";

export const metadata = {
  title: "GlamGuide — AI Makyaj Rehberi",
  description: "Adım adım makyaj, pazaryeri ve topluluk (micro-frontend)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <AppShell active="home">{children}</AppShell>
      </body>
    </html>
  );
}
