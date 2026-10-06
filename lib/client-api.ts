const normalizeBaseUrl = (value: string | undefined) => (value ?? "").trim().replace(/\/+$/, "");

export const CLIENT_API_BASE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

export function createClientApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return CLIENT_API_BASE_URL ? `${CLIENT_API_BASE_URL}${normalizedPath}` : normalizedPath;
}

export async function clientApiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(createClientApiUrl(path), {
    credentials: init?.credentials ?? "include",
    ...init,
  });
}