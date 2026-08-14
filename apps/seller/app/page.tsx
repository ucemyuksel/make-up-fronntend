import { redirect } from "next/navigation";

/**
 * Satıcı uygulamasının kökü.
 *
 * <p>Bu uygulamanın kendi ana sayfası yok; içeriği {@code /seller} altında.
 * Kök sayfa olmadan {@code http://localhost:3006} adresi 404 dönüyordu —
 * uygulamayı adresinden açan kişi çalışmıyor sanıyordu.
 */
export default function SellerRoot() {
  redirect("/seller");
}
