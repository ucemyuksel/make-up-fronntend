import { auth } from "../../auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminApi, adminPost } from "../lib";

type Store = { id: string; name: string; kind: string; tagline: string; productCount: number; verified: boolean };
export default async function Stores() {
  const s = await auth() as { accessToken?: string; roles?: string[] } | null;
  if (!s?.accessToken) redirect("/"); if (!s.roles?.includes("ADMIN")) redirect("/yetkisiz");
  const items = await adminApi<Store[]>(process.env.STORE_API!, "/api/stores/moderation/queue", s.accessToken) ?? [];
  async function approve(form: FormData) { "use server"; const session = await auth() as { accessToken?: string } | null; if (session?.accessToken) await adminPost(process.env.STORE_API!, `/api/stores/${form.get("id")}/approve`, session.accessToken); revalidatePath("/magazalar"); }
  return <main style={{ maxWidth: 880, margin: "0 auto", padding: 32 }}><a href="/">← Yönetim merkezi</a><h1>Mağaza açma talepleri</h1><p>Onaylanan mağazalar doğrulanmış rozetini alır.</p>{items.length ? items.map(x => <article className="gg-card" style={{ marginTop: 12 }} key={x.id}><strong>{x.name}</strong><p>{x.kind} · {x.productCount} ürün · {x.tagline}</p><form action={approve}><input name="id" type="hidden" value={x.id}/><button className="gg-btn gg-btn-primary">Mağazayı onayla</button></form></article>) : <p>Bekleyen mağaza talebi yok.</p>}</main>;
}
