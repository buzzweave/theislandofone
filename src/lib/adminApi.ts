const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getAdminToken(): string {
  return localStorage.getItem("adminToken") || "";
}

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-admin-token": getAdminToken(),
  };
}

export async function adminFetch<T = any>(
  functionName: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: Record<string, any>
): Promise<T> {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  const res = await fetch(url, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}
