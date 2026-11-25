export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000/api/v1";

export const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return "http://localhost:8000";
  }
})();

const TOKEN_KEY = "talentos_access_token";
const REFRESH_KEY = "talentos_refresh_token";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(TOKEN_KEY) || window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeSessionTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, accessToken);
    window.localStorage.setItem(REFRESH_KEY, refreshToken);
  } catch {
    // Ignore storage errors; HttpOnly cookies still cover same-origin flows.
  }
}

export function clearSessionTokens(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // No-op
  }
}

async function tryRefreshSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const storedRefresh = window.localStorage.getItem(REFRESH_KEY);
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(storedRefresh ? { refresh_token: storedRefresh } : {}),
  });
  if (!res.ok) {
    clearSessionTokens();
    return false;
  }
  const data = (await res.json()) as { access_token: string; refresh_token: string };
  storeSessionTokens(data.access_token, data.refresh_token);
  return true;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { skipAuthRetry?: boolean } = {}
): Promise<T> {
  const { skipAuthRetry = false, headers: customHeaders, body, ...rest } = options;
  const headers = new Headers(customHeaders);

  const token = getStoredAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!(body instanceof FormData) && body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...rest,
    headers,
    body,
    credentials: "include",
  });

  if (response.status === 401 && !skipAuthRetry && !path.startsWith("/auth/")) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, skipAuthRetry: true });
    }
  }

  if (!response.ok) {
    let code = "REQUEST_FAILED";
    let message = `Request failed (${response.status})`;
    let details: unknown;
    try {
      const parsed = (await response.json()) as {
        error?: { code?: string; message?: string; details?: unknown };
        detail?: string;
      };
      if (parsed.error) {
        code = parsed.error.code || code;
        message = parsed.error.message || message;
        details = parsed.error.details;
      } else if (typeof parsed.detail === "string") {
        message = parsed.detail;
      }
    } catch {
      // Non-JSON error body
    }
    throw new ApiError(response.status, code, message, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function buildApiDownloadUrl(relativePath: string): string {
  if (relativePath.startsWith("http")) return relativePath;
  return `${API_ORIGIN}${relativePath.startsWith("/") ? relativePath : `/${relativePath}`}`;
}

export async function downloadAuthenticatedBlob(relativeOrApiPath: string, filename: string): Promise<void> {
  const token = getStoredAccessToken();
  const url = relativeOrApiPath.startsWith("/api/")
    ? `${API_ORIGIN}${relativeOrApiPath}`
    : `${API_BASE_URL}${relativeOrApiPath}`;

  const res = await fetch(url, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    throw new ApiError(res.status, "DOWNLOAD_FAILED", "Unable to download file.");
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
