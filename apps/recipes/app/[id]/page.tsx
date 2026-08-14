import * as React from "react";
import { Badge, Card, theme } from "@makeup/ui";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { GuidedCamera } from "./GuidedCamera";

type StepOutline = { index: number; title: string; region: string; state: string };
type CurrentStep = {
  order: number;
  title: string;
  region: string;
  productColorHex: string;
  locked: boolean;
  instruction: string | null;
};
type Session = {
  id: string;
  recipeId: string;
  totalSteps: number;
  currentStepIndex: number;
  completedSteps: number;
  completed: boolean;
  status: string;
  currentStep: CurrentStep | null;
  steps: StepOutline[];
};

async function call(path: string, method: "GET" | "POST", token: string) {
  const res = await fetch(`${process.env.RECIPE_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return { status: res.status, data: res.ok ? ((await res.json()) as Session) : null };
}

export default async function GuidedPage({ params }: { params: { id: string } }) {
  const recipeId = params.id;
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;

  if (!token) redirect(`/login?callbackUrl=%2F${recipeId}`);

  // Önce mevcut oturumu al; yoksa (404) başlat. 403 → erişim yok (ücretli, satın alınmamış).
  let s = await call(`/api/recipes/${recipeId}/session`, "GET", token);
  if (s.status === 404) {
    s = await call(`/api/recipes/${recipeId}/session/start`, "POST", token);
  }
  if (s.status === 403) {
    return (
      <div style={{ display: "grid", gap: 12, maxWidth: 480 }}>
        <a href="/" className="gg-see-all">← Tariflere dön</a>
        <Card>
          <strong>Bu tarif ücretli 🔒</strong>
          <p style={{ color: theme.color.textMuted, margin: "8px 0 0" }}>
            Adım adım modu için önce tarifi satın alman gerekiyor. Ücretsiz tarifleri hemen deneyebilirsin.
          </p>
          <a href="/" className="gg-btn gg-btn-primary" style={{ marginTop: 12 }}>Ücretsiz tarifleri gör</a>
        </Card>
      </div>
    );
  }
  const data = s.data;
  if (!data) {
    return (
      <div style={{ display: "grid", gap: 12, maxWidth: 480 }}>
        <a href="/" className="gg-see-all">← Tariflere dön</a>
        <p style={{ color: theme.color.textMuted }}>Oturum yüklenemedi (recipe-service çalışıyor mu?).</p>
      </div>
    );
  }

  // --- Server action'lar: adım ilerlet/geri/baştan (token sunucuda kalır) ---
  async function advance() {
    "use server";
    const ses = await auth();
    const t = (ses as unknown as { accessToken?: string } | null)?.accessToken;
    if (t) await call(`/api/recipes/${recipeId}/session/advance`, "POST", t);
    revalidatePath(`/${recipeId}`);
  }
  async function back() {
    "use server";
    const ses = await auth();
    const t = (ses as unknown as { accessToken?: string } | null)?.accessToken;
    if (t) await call(`/api/recipes/${recipeId}/session/back`, "POST", t);
    revalidatePath(`/${recipeId}`);
  }
  async function restart() {
    "use server";
    const ses = await auth();
    const t = (ses as unknown as { accessToken?: string } | null)?.accessToken;
    if (t) await call(`/api/recipes/${recipeId}/session/start`, "POST", t);
    revalidatePath(`/${recipeId}`);
  }

  const pct = data.totalSteps ? Math.round((data.completedSteps / data.totalSteps) * 100) : 0;
  const cs = data.currentStep;

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 760 }}>
      <a href="/" className="gg-see-all">← Tariflere dön</a>

      {/* İlerleme çubuğu */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: theme.color.textMuted }}>
          <span>Adım {Math.min(data.currentStepIndex + 1, data.totalSteps)} / {data.totalSteps}</span>
          <span>%{pct} tamamlandı</span>
        </div>
        <div style={{ height: 8, background: theme.color.primaryLight, borderRadius: 999, marginTop: 6, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: theme.color.primary, transition: "width .3s" }} />
        </div>
      </div>

      {/* Adım şeridi */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {data.steps.map((st) => {
          const active = st.state === "ACTIVE";
          const done = st.state === "COMPLETED";
          return (
            <span key={st.index} style={{
              fontSize: 12, padding: "4px 10px", borderRadius: 999,
              background: active ? theme.color.primary : done ? theme.color.primaryLight : "transparent",
              color: active ? "#fff" : theme.color.textMuted,
              border: `1px solid ${active || done ? theme.color.primary : theme.color.border}`,
            }}>{done ? "✓ " : ""}{st.index + 1}. {st.title}</span>
          );
        })}
      </div>

      {/* Aktif adım kartı ya da tamamlandı */}
      {data.completed || !cs ? (
        <Card>
          <div style={{ fontSize: 40 }}>🎉</div>
          <strong style={{ fontSize: 18 }}>Tebrikler, tarifi tamamladın!</strong>
          <p style={{ color: theme.color.textMuted, margin: "8px 0 14px" }}>Tüm adımları uyguladın. Dilersen baştan tekrar dene.</p>
          <form action={restart}><button className="gg-btn gg-btn-primary" type="submit">↺ Baştan başla</button></form>
        </Card>
      ) : (
        <Card>
          {/* Canlı ayna: bu adımın bölgesini yüzde nereye süreceğini gösterir. */}
          <GuidedCamera region={cs.region} colorHex={cs.productColorHex} stepTitle={cs.title} />
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginTop: 16 }}>
            <span style={{ width: 48, height: 48, borderRadius: 12, background: cs.productColorHex, flexShrink: 0, border: `1px solid ${theme.color.border}` }} />
            <div>
              <Badge>{cs.region}</Badge>
              <h2 style={{ margin: "8px 0 6px", color: theme.color.primaryDark }}>{cs.order}. {cs.title}</h2>
              <p style={{ margin: 0, lineHeight: 1.6 }}>{cs.instruction ?? "Bu adımın içeriği kilitli."}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <form action={back}>
              <button className="gg-btn gg-btn-ghost" type="submit" disabled={data.currentStepIndex === 0}>← Geri</button>
            </form>
            <form action={advance} style={{ marginLeft: "auto" }}>
              <button className="gg-btn gg-btn-primary" type="submit">
                {data.currentStepIndex + 1 >= data.totalSteps ? "Bitir ✓" : "İleri →"}
              </button>
            </form>
          </div>
        </Card>
      )}
    </div>
  );
}
