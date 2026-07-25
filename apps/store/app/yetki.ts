import { redirect } from "next/navigation";
import { auth } from "../auth";

/**
 * Satıcı sayfaları için ortak kapı. Menüyü gizlemek yeterli değil — adresi
 * doğrudan yazan kullanıcı da girememelidir.
 *
 * Dönüş: geçerli erişim jetonu ve roller.
 */
export async function saticiKapisi(callbackUrl: string) {
  const session = (await auth()) as { accessToken?: string; roles?: string[] } | null;
  const token = session?.accessToken;

  if (!token) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  const roles = session?.roles ?? [];
  if (!roles.includes("STORE_OWNER") && !roles.includes("ADMIN")) {
    redirect("/yetkisiz");
  }
  return { token, roles };
}
