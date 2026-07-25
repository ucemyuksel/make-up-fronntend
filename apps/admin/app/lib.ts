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
