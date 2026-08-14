import { auth } from "../auth";
import { redirect } from "next/navigation";

/**
 * İçerik Yönetimi (CMS) ana sayfası.
 *
 * Yönetim Merkezi'nden ayrı bir mikro-frontend: katalog (kategori/öznitelik)
 * ve editoryal moderasyon burada, platform yaptırımları (komisyon, mağaza,
 * kullanıcı, reklam onayı) admin uygulamasında kalır. Böylece içerik ekibi
 * yaptırım yetkilerine dokunmadan çalışabilir ve iki alan ayrı dağıtılır.
 */
export default async function CmsHome() {
  const session = await auth() as { accessToken?: string; roles?: string[] } | null;
  if (!session?.accessToken) {
    return (
      <main style={{ maxWidth: 480, margin: "12vh auto", padding: 24 }} className="gg-card">
        <h1>İçerik Yönetimi</h1>
        <p>İçerik yöneticisi hesabınızla giriş yapın.</p>
        {/* Kendi giriş sayfamıza gönderilir. Eskiden burada signIn("keycloak")
            çağıran bir form vardı; o sağlayıcı yalnızca KEYCLOAK_LEGACY_ISSUER
            tanımlıysa var olduğu için buton hiç çalışmıyordu. */}
        <a href="/login" className="gg-btn gg-btn-primary">Giriş yap</a>
      </main>
    );
  }
  if (!session.roles?.includes("ADMIN")) redirect("/forbidden");

  const cards = [
    ["İçerik dağıtımı", "Paylaşım ve video görünürlüğü", "/content"],
    ["Kategori & Özellik", "Kategori, alt kategori ve ürün özellikleri", "/categories"],
  ];

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "38px 20px" }}>
      <p style={{ color: "var(--gg-primary)", fontWeight: 700 }}>GLAMGUIDE · İÇERİK</p>
      <h1>İçerik Yönetimi</h1>
      <p style={{ color: "var(--gg-muted)" }}>
        Katalog yapısı ve yayın görünürlüğü buradan yönetilir. Kararlar gerekçe ve denetim kaydıyla yürütülür.
      </p>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 26 }}>
        {cards.map(([title, detail, href]) => (
          <a className="gg-card" style={{ color: "inherit", textDecoration: "none" }} href={href} key={href}>
            <strong>{title}</strong>
            <p style={{ color: "var(--gg-muted)", fontSize: 13 }}>{detail}</p>
            <span className="gg-see-all">Yönet ›</span>
          </a>
        ))}
      </section>
    </main>
  );
}
