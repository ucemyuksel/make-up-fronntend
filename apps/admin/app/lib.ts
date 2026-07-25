export async function adminApi<T>(base: string, path: string, token: string): Promise<T | null> {
  try {
    const response = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    return response.ok ? await response.json() as T : null;
  } catch { return null; }
}

export async function adminPost(base: string, path: string, token: string) {
  try { return (await fetch(`${base}${path}`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })).ok; }
  catch { return false; }
}

/** Gövdeli yazma (komisyon kuralı vb.). Hata mesajını da döner. */
export async function adminSend(
  base: string,
  path: string,
  token: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    if (response.ok) return { ok: true };
    let error = `HTTP ${response.status}`;
    try { error = (await response.json()).message ?? error; } catch { /* gövde yok */ }
    return { ok: false, error };
  } catch {
    return { ok: false, error: "Sunucuya ulaşılamadı" };
  }
}
