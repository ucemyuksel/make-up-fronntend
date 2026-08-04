import { NextResponse } from "next/server";
import { auth } from "../../../auth";

/**
 * Kategori özniteliklerini istemciye taşır (ürün formu kategori değişince
 * alanları yeniden çizer). Jeton sunucuda kalır — tarayıcı store-service'i
 * doğrudan çağırmaz.
 */
export async function GET(request: Request) {
  const session = (await auth()) as { accessToken?: string } | null;
  const token = session?.accessToken;
  if (!token) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const subCategoryId = searchParams.get("subCategoryId");
  if (!categoryId) {
    return NextResponse.json([], { status: 200 });
  }

  const qs = subCategoryId ? `?subCategoryId=${encodeURIComponent(subCategoryId)}` : "";
  try {
    const res = await fetch(
      `${process.env.STORE_API}/api/categories/${categoryId}/attributes${qs}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    return NextResponse.json(res.ok ? await res.json() : [], { status: 200 });
  } catch {
    // Servis kapalıysa form özniteliksiz çalışsın, ürün ekleme engellenmesin.
    return NextResponse.json([], { status: 200 });
  }
}
