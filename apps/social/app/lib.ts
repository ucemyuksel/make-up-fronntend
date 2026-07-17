export type Post = {
  id: string;
  authorUserId: string;
  text: string;
  imageUrls: string[];
  likeCount: number;
  commentCount: number;
  createdAt: string;
};
export type Reel = {
  id: string;
  authorUserId: string;
  caption: string;
  videoUrl: string;
  likeCount: number;
  viewCount: number;
  shareCount: number;
  durationSeconds: number;
  createdAt: string;
};

export async function api<T>(base: string | undefined, path: string, token: string): Promise<T | null> {
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return res.ok ? ((await res.json()) as T) : null;
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return Math.max(1, Math.floor(s / 60)) + " dk önce";
  if (s < 86400) return Math.floor(s / 3600) + " saat önce";
  return Math.floor(s / 86400) + " gün önce";
}

// Gönderileri sunumsal olarak isimlendir (backend yalnızca authorUserId tutar).
const NAMES = ["Makyaj.Sanatı", "BeautyGizem", "GlowQueen", "Melisa Güler"];
export const authorName = (i: number) => NAMES[i % NAMES.length];
