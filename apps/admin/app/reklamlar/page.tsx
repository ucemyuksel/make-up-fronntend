import { auth } from "../../auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminApi, adminPost } from "../lib";

type Campaign = { id: string; name: string; placement: string; dailyBudget: number; geoTargets: { countryCode: string; regionCode?: string; cityName?: string }[] };
export default async function Ads() {
  const s = await auth() as { accessToken?: string; roles?: string[] } | null;
  if (!s?.accessToken) redirect("/"); if (!s.roles?.includes("ADMIN")) redirect("/yetkisiz");
  const items = await adminApi<Campaign[]>(process.env.AD_API!, "/api/campaigns/moderation/queue", s.accessToken) ?? [];
  async function moderate(form: FormData) { "use server"; const session = await auth() as { accessToken?: string } | null; if (session?.accessToken) await adminPost(process.env.AD_API!, `/api/campaigns/${form.get("id")}/${form.get("action")}`, session.accessToken); revalidatePath("/reklamlar"); }
  return <main style={{ maxWidth: 880, margin: "0 auto", padding: 32 }}><a href="/">← Yönetim merkezi</a><h1>Bölgesel reklam onayları</h1>{items.length ? items.map(x => <article className="gg-card" style={{ marginTop: 12 }} key={x.id}><strong>{x.name}</strong><p>{x.placement} · Günlük bütçe: ₺{x.dailyBudget} · Hedef: {x.geoTargets.map(g => [g.countryCode, g.regionCode, g.cityName].filter(Boolean).join(" / ")).join(", ")}</p><div style={{ display: "flex", gap: 8 }}><form action={moderate}><input type="hidden" name="id" value={x.id}/><input type="hidden" name="action" value="approve"/><button className="gg-btn gg-btn-primary">Onayla</button></form><form action={moderate}><input type="hidden" name="id" value={x.id}/><input type="hidden" name="action" value="reject"/><button className="gg-btn gg-btn-ghost">Reddet</button></form></div></article>) : <p>Bekleyen kampanya yok.</p>}</main>;
}
