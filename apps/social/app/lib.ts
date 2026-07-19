export type Post = {
  id: string;
  authorUserId: string;
  authorName: string | null;          // user-service olaylarından (Kafka read-model)
  authorAvatarColorHex: string | null;
  text: string;
  imageUrls: string[];
  likeCount: number;
  commentCount: number;
  createdAt: string;
};
export type Reel = {
  id: string;
  authorUserId: string;
  authorName: string | null;          // user-service olaylarından (Kafka read-model)
  authorAvatarColorHex: string | null;
  caption: string;
  videoUrl: string;
  likeCount: number;
  viewCount: number;
  shareCount: number;
  durationSeconds: number;
  createdAt: string;
};

export async function api<T>(base: string | undefined, path: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null; // backend erişilemez → sayfayı çökertme
  }
}

// Geçici görsel (placeholder — prod'da MinIO'daki gerçek gönderi/reel görseli).
export const img = (seed: string) => `https://picsum.photos/seed/gg${seed}/600/400`;

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return Math.max(1, Math.floor(s / 60)) + " dk önce";
  if (s < 86400) return Math.floor(s / 3600) + " saat önce";
  return Math.floor(s / 86400) + " gün önce";
}

// Gerçek ad user read-model'den (post.authorName) gelir; henüz olay ulaşmadıysa
// sunumsal ada düşülür.
const NAMES = ["Makyaj.Sanatı", "BeautyGizem", "GlowQueen", "Melisa Güler"];
export const authorName = (i: number) => NAMES[i % NAMES.length];
export const yazarAdi = (p: Post, i: number) => p.authorName ?? authorName(i);
