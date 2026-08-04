import { NextResponse } from "next/server";
import { auth } from "../../../../auth";

/**
 * Reklam serving proxy'si: oturum token'ını sunucuda ekleyip ad-service'e
 * iletir (client token'a erişemez). Oturum yoksa boş liste (ad gösterilmez).
 */
export async function GET(req: Request) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  if (!token) return NextResponse.json([]);

  const inUrl = new URL(req.url);
  const qs = inUrl.searchParams.toString();
  try {
    const res = await fetch(`${process.env.AD_API}/api/ads/serve?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = res.ok ? await res.json() : [];
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
