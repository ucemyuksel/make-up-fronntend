// Satıcı panelinin Auth.js kurulumu.
//
// Müşteri uygulamasından iki noktada AYRILIR:
//   1) Kendi Keycloak istemcisi (makeup-seller) — ayrı sır, ayrı yönlendirme
//      adresleri, Keycloak oturum kayıtlarında ayrı görünür.
//   2) ROL KAPISI: mağaza rolü olmayan kullanıcı burada oturum bile açamaz.
//      Kontrolü sayfaya bıraksaydık geçerli bir panel oturumu oluşur ve tek
//      bir sayfada kontrol unutulduğunda açık kapı kalırdı.
import { createAuth } from "@makeup/auth";

export const { handlers, auth, signIn, signOut } = createAuth({
  requireRoles: ["STORE_OWNER", "STORE_STAFF", "ADMIN"],
});
