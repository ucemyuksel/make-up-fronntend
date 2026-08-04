import { auth, signIn } from "../auth";
import { redirect } from "next/navigation";

export default async function AdminHome() {
  const session = await auth() as { accessToken?: string; roles?: string[] } | null;
  if (!session?.accessToken) {
    return <main style={{ maxWidth: 480, margin: "12vh auto", padding: 24 }} className="gg-card"><h1>Yönetim Merkezi</h1><p>Platform yöneticisi hesabınla giriş yap.</p><form action={async () => { "use server"; await signIn("keycloak", { redirectTo: "/" }); }}><button className="gg-btn gg-btn-primary">Yönetici girişi</button></form></main>;
  }
  if (!session.roles?.includes("ADMIN")) redirect("/forbidden");
  // İçerik yönetimi ayrı bir mikro-frontend (cms). Burada yalnızca köprü
  // verilir; katalog ve moderasyon ekranları o uygulamada yaşar.
  const cmsUrl = process.env.NEXT_PUBLIC_CMS_URL || "http://localhost:3005";
  const cards = [
    ["Komisyon", "%15 varsayılan platform komisyonu", "/commission"],
    ["Reklam onayları", "Bölgesel kampanyaları incele", "/ads"],
    ["Mağaza talepleri", "Yeni mağazaları doğrula", "/stores"],
    ["Kullanıcı kısıtları", "Hesap yaptırımları ve itirazlar", "/users"],
    ["İçerik dağıtımı", "Paylaşım ve video görünürlüğü", `${cmsUrl}/content`],
    ["Kategori & Özellik", "Kategori, alt kategori ve ürün özellikleri", `${cmsUrl}/categories`],
  ];
  return <main style={{ maxWidth: 1000, margin: "0 auto", padding: "38px 20px" }}><p style={{ color: "var(--gg-primary)", fontWeight: 700 }}>GLAMGUIDE · YÖNETİM</p><h1>Platform Yönetim Merkezi</h1><p style={{ color: "var(--gg-muted)" }}>Tüm kararlar gerekçe ve denetim kaydıyla yürütülmelidir.</p><section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 26 }}>{cards.map(([title, detail, href]) => <a className="gg-card" style={{ color: "inherit", textDecoration: "none" }} href={href} key={href}><strong>{title}</strong><p style={{ color: "var(--gg-muted)", fontSize: 13 }}>{detail}</p><span className="gg-see-all">Yönet ›</span></a>)}</section></main>;
}
