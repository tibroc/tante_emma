// api.ts — thin fetch wrapper, mirrors the Svelte frontend's lib/api.ts.
// Same-origin by default (Vite proxies /api + /auth to :8080 in dev; prod serves
// the SPA behind the same reverse proxy). Set VITE_API_URL for cross-origin
// deploys — equivalent to the old PUBLIC_API_URL. credentials:'include' carries
// the HttpOnly `session` cookie.

const BASE = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => resp.statusText);
    throw new ApiError(resp.status, text);
  }
  if (resp.status === 204) return undefined as T;
  return (await resp.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown, headers?: Record<string, string>) =>
    request<T>('POST', path, body, headers),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
