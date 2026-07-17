import * as React from "react";
import { Card, Badge, Button, theme } from "@makeup/ui";
import { auth, signOut } from "../auth";

type RecipeCard = {
  id: string;
  title: string;
  artistName: string;
  priceTry: number;
  category: string;
  likeCount: number;
  free: boolean;
};

async function fetchRecipes(token: string): Promise<RecipeCard[]> {
  const res = await fetch(`${process.env.RECIPE_API}/api/recipes`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function RecipesHome() {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;

  if (!session || !token) {
    return (
      <div style={{ display: "grid", gap: 16, maxWidth: 460 }}>
        <Badge>recipes MFE · Keycloak OIDC</Badge>
        <h1 style={{ margin: 0, color: theme.color.primaryDark }}>Tariflere giriş</h1>
        <p style={{ margin: 0, color: theme.color.textMuted }}>
          Canlı tarifleri görmek için giriş yapın (Keycloak).
        </p>
        <a href="/api/auth/signin?callbackUrl=%2F">
          <Button>Keycloak ile giriş yap</Button>
        </a>
      </div>
    );
  }

  const recipes = await fetchRecipes(token);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Badge>recipes MFE · canlı</Badge>
          <h1 style={{ margin: "10px 0 4px", color: theme.color.primaryDark }}>Tarifler</h1>
          <p style={{ margin: 0, color: theme.color.textMuted }}>
            {session.user?.email} · recipe-service canlı verisi ({recipes.length})
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <Button variant="ghost">Çıkış</Button>
        </form>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {recipes.map((r) => (
          <Card key={r.id}>
            <div
              style={{
                height: 120,
                borderRadius: theme.radius.sm,
                background: `linear-gradient(135deg, ${theme.color.primaryLight}, ${theme.color.coralSoft})`,
                marginBottom: 12,
              }}
            />
            <strong>{r.title}</strong>
            <p style={{ margin: "4px 0", color: theme.color.textMuted, fontSize: 13 }}>
              {r.artistName} · {r.category}
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <Badge>{r.free ? "Ücretsiz" : `${r.priceTry} ₺`}</Badge>
              <span style={{ fontSize: 12, color: theme.color.textMuted }}>♥ {r.likeCount}</span>
            </div>
            {/* Ücretsiz tarifler satın almadan adım adım denenebilir; ücretlilerde önce satın alma gerekir. */}
            <a
              href={`/${r.id}`}
              className="gg-btn gg-btn-primary"
              style={{ marginTop: 12, width: "100%", justifyContent: "center" }}
            >
              {r.free ? "✨ Adım adım dene" : "🔒 Satın al & dene"}
            </a>
          </Card>
        ))}
        {recipes.length === 0 && (
          <p style={{ color: theme.color.textMuted }}>Tarif bulunamadı (recipe-service çalışıyor mu?).</p>
        )}
      </div>
    </div>
  );
}
