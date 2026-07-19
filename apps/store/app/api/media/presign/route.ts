import { NextResponse } from "next/server";
import { auth } from "../../../../auth";

/**
 * Medya presign proxy'si: oturum token'ını sunucuda ekleyip store-service'e
 * iletir (client token'a erişemez). İstemci dönen uploadUrl'e doğrudan PUT eder.
 */
export async function POST(req: Request) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  if (!token) return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });

  const ext = new URL(req.url).searchParams.get("ext") ?? "";
  try {
    const res = await fetch(`${process.env.STORE_API}/api/media/presign?ext=${encodeURIComponent(ext)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Sunucuya ulaşılamadı" }, { status: 502 });
  }
}
