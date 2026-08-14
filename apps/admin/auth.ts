// admin panelinin Auth.js kurulumu.
//
// Normal kullanici girisinden AYRI:
//   1) Kendi Keycloak istemcisi (makeup-admin) — ayri sir, ayri yonlendirme
//      adresleri; musteri uygulamasinin sirri sizarsa burasi etkilenmez.
//   2) ROL KAPISI: ADMIN rolu olmayan burada oturum bile acamaz. Kontrolu
//      sayfaya biraksaydik gecerli bir yonetim oturumu olusur ve tek bir
//      sayfada kontrol unutuldugunda acik kapi kalirdi.
import { createAuth } from "@makeup/auth";

export const { handlers, auth, signIn, signOut } = createAuth({
  requireRoles: ["ADMIN"],
});
