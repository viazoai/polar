const BASE = "/api";

function handle401() {
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (res.status === 401) { handle401(); throw new Error("401"); }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPostFormData<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: "POST", body: formData, credentials: "include" });
  if (res.status === 401) { handle401(); throw new Error("401"); }
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    const error = new Error(detail?.detail || `API error: ${res.status}`) as Error & { status: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (res.status === 401) { handle401(); throw new Error("401"); }
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    const error = new Error(detail?.detail || `API error: ${res.status}`) as Error & { status: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (res.status === 401) { handle401(); throw new Error("401"); }
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    const error = new Error(detail?.detail || `API error: ${res.status}`) as Error & { status: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: "DELETE", credentials: "include" });
  if (res.status === 401) { handle401(); throw new Error("401"); }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}
