import { PUBLIC_API_URL } from '$env/static/public';
const BASE = PUBLIC_API_URL;

class ApiError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
		this.name = 'ApiError';
	}
}

async function request<T>(
	method: string,
	path: string,
	body?: unknown,
	extraHeaders?: Record<string, string>
): Promise<T> {
	const resp = await fetch(`${BASE}${path}`, {
		method,
		credentials: 'include',
		headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...extraHeaders },
		body: body ? JSON.stringify(body) : undefined
	});

	if (!resp.ok) {
		const text = await resp.text().catch(() => resp.statusText);
		throw new ApiError(resp.status, text);
	}

	if (resp.status === 204) return undefined as T;
	return resp.json() as Promise<T>;
}

export const api = {
	get:    <T>(path: string)                                                  => request<T>('GET',    path),
	post:   <T>(path: string, body: unknown, headers?: Record<string, string>) => request<T>('POST',   path, body, headers),
	put:    <T>(path: string, body: unknown)                                   => request<T>('PUT',    path, body),
	delete: <T>(path: string)                                                  => request<T>('DELETE', path)
};

export { ApiError };
