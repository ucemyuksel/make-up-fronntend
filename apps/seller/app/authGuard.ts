import { redirect } from "next/navigation";
import { auth } from "../auth";

/**
 * Satıcı sayfaları için ortak kapı. Menüyü gizlemek yeterli değil — adresi
 * doğrudan yazan kullanıcı da girememelidir.
 *
 * Dönüş: geçerli erişim jetonu ve roller.
 */
export async function requireSeller(callbackUrl: string) {
  const session = (await auth()) as { accessToken?: string; roles?: string[] } | null;
  const token = session?.accessToken;

  // SATICI giris ekranina gidilir, Auth.js'in genel ekranina degil: buraya
  // gelen kisi magaza yonetmeye geliyor ve rolu yoksa sebebini orada acikca
  // goruyor. Genel ekran "giris yap" deyip duruyor, kullanici da sifresini
  // yanlis girdigini saniyordu.
  if (!token) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  const roles = session?.roles ?? [];
  // Magaza isini sahip de personel de yapar - ikisi ayni panele girer.
  if (!roles.includes("STORE_OWNER") && !roles.includes("STORE_STAFF") && !roles.includes("ADMIN")) {
    // Oturum var ama yetki yok: /login bu durumu ayrica anlatiyor.
    redirect("/login?yetkisiz=1");
  }
  return { token, roles };
}

/**
 * Yalnizca MAGAZA SAHIBI. Personel yonetimi icin.
 *
 * Menuyu gizlemek koruma degildir: adresi elle yazan personel de
 * girememeli. Sunucu tarafinda da ayni kural var - burasi sadece
 * kullaniciya dogru ekrani gostermek icin, guvenligin son sozu API'de.
 */
export async function requireStoreOwner(callbackUrl: string) {
  const { token, roles } = await requireSeller(callbackUrl);
  if (!roles.includes("STORE_OWNER") && !roles.includes("ADMIN")) {
    redirect("/forbidden");
  }
  return { token, roles };
}
