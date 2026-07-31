// Ortak kurulum @makeup/auth'ta — çok kiracılı (ülke başına realm) Keycloak.
// Daha önce her uygulama kendi kopyasını taşıyordu ve kopyalar ayrışmıştı:
// admin'de jeton yenileme hiç yoktu, oturum 15 dakikada düşüyordu.
import { createAuth } from "@makeup/auth";

export const { handlers, auth, signIn, signOut } = createAuth();
