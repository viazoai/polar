const BASE = "/api";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export async function apiPostFormData<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    const error = new Error(
      detail?.detail || `API error: ${res.status}`
    ) as Error & { status: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
}
