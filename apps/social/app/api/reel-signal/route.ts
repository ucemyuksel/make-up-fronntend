import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../auth";

/**
 * Proxies a viewer signal to reels-service.
 *
 * <p>The player is a client component and must never hold the access token, so
 * it posts here and the token is attached server-side - the same shape as the
 * profile feed proxy.
 *
 * <p>Failures are swallowed with 204. A signal is telemetry: if it does not
 * arrive, the ranking is slightly less informed, which is not worth showing an
 * error over a video the user is currently watching. The service counts each
 * signal once per viewer anyway, so a retry that never happens costs nothing.
 */
const ALLOWED = new Set(["VIEWED", "COMPLETED", "SHARED", "SKIPPED", "REPORTED", "HIDDEN"]);

export async function POST(req: NextRequest) {
  const session = await auth();
  const token = (session as unknown as { accessToken?: string } | null)?.accessToken;
  if (!token) {
    return new NextResponse(null, { status: 401 });
  }

  const reelId = req.nextUrl.searchParams.get("reelId");
  const type = (req.nextUrl.searchParams.get("type") ?? "").toUpperCase();

  // Validated here as well as in the service: this route would otherwise
  // forward anything the page happened to send.
  if (!reelId || !ALLOWED.has(type)) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    await fetch(
      `${process.env.REELS_API}/api/reels/${encodeURIComponent(reelId)}/signal?type=${type}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
  } catch {
    // Deliberately ignored - see the note above.
  }

  return new NextResponse(null, { status: 204 });
}
