import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";

/**
 * Gösterim/tık takip proxy'si: /api/ads/{campaignId}/{impression|click}.
 * Oturum token'ını sunucuda ekleyip ad-service'e iletir. Gövde (eventId + geo)
 * aynen geçirilir → idempotent takip.
 */
export async function POST(req: Request, { params }: { params: { campaignId: string; type: string } }) {
  const type = params.type === "click" ? "click" : "impression";
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.text();
  try {
    const res = await fetch(`${process.env.AD_API}/api/ads/${params.campaignId}/${type}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
    return NextResponse.json({ ok: res.ok }, { status: res.ok ? 202 : res.status });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
