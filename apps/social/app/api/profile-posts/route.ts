import { NextResponse } from "next/server";
import { auth } from "../../../auth";

/**
 * Profil ızgarası için sayfa vekili.
 *
 * <p>Kaydırma istemcide oluyor ama jeton <b>tarayıcıya inmiyor</b>: istemci
 * buraya çağırıyor, jetonu sunucu ekliyor. Doğrudan post-service'e
 * çağırsaydık erişim jetonunu JavaScript'e vermek zorunda kalırdık.
 *
 * <p>Yazar kimliği jetonun {@code sub} alanından çözülür — istemciden
 * alınmıyor. Alınsaydı istemci başka birinin kimliğini yazıp o profili
 * kendi profiliymiş gibi getirebilirdi (görünürlük açısından zararsız ama
 * "benim profilim" ekranı için yanlış).
 */
export async function GET(request: Request) {
  const session = (await auth()) as { accessToken?: string } | null;
  const token = session?.accessToken;
  if (!token) {
    return NextResponse.json({ message: "Giriş gerekli" }, { status: 401 });
  }

  const author = userFromToken(token);
  if (!author) {
    return NextResponse.json({ message: "Jeton çözülemedi" }, { status: 401 });
  }

  const gelen = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  const cursor = gelen.get("cursor");
  if (cursor) query.set("cursor", cursor);
  // Tavan sunucuda: istemci "limit=100000" yazıp tek istekte tüm profili
  // çekemesin. Backend de ayrıca sınırlıyor; iki katman da ucuz.
  query.set("limit", String(Math.min(Number(gelen.get("limit") ?? 24) || 24, 48)));

  try {
    const r = await fetch(
      `${process.env.POST_API}/api/posts/author/${author}?${query}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const veri = await r.json().catch(() => ({}));
    return NextResponse.json(veri, { status: r.status });
  } catch {
    return NextResponse.json({ message: "Gönderiler alınamadı" }, { status: 502 });
  }
}

/**
 * JWT'nin {@code sub} alanını okur — <b>imza doğrulamadan</b>.
 *
 * <p>Burada doğrulama gerekmiyor çünkü jeton bizim oturumumuzdan geliyor
 * (kullanıcının yazdığı bir değer değil) ve asıl doğrulamayı zaten
 * post-service yapıyor. Bu satır yalnızca "hangi profili isteyeceğiz"
 * sorusunu cevaplıyor.
 */
function userFromToken(token: string): string | null {
  try {
    const govde = token.split(".")[1];
    if (!govde) return null;
    const json = Buffer.from(govde.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return (JSON.parse(json) as { sub?: string }).sub ?? null;
  } catch {
    return null;
  }
}
