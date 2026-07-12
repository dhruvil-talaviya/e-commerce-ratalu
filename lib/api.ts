/**
 * Enterprise API client wrapper supporting JWT authorization headers
 * injection, token refreshes, and automatic retries.
 */

const TOKENS_KEY = "ratalu.tokens.v1";

export interface ApiTokens {
  accessToken: string;
  refreshToken: string;
}

export function saveTokens(tokens: ApiTokens) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  }
}

export function clearTokens() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKENS_KEY);
  }
}

export function getTokens(): ApiTokens | null {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(TOKENS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  return null;
}

interface RequestOptions extends RequestInit {
  body?: any;
}

export async function apiFetch<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `/api/v1${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers = new Headers(options.headers || {});
  
  // Content type setup
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Token injection
  const tokens = getTokens();
  if (tokens?.accessToken) {
    headers.set("Authorization", `Bearer ${tokens.accessToken}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
    body: options.body instanceof FormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined)
  };

  let response = await fetch(url, config);

  // Token refresh flow on 401
  if (response.status === 401 && tokens?.refreshToken) {
    try {
      // Prevent infinite loops by checking if we already tried refreshing
      const refreshUrl = "/api/v1/auth/refresh";
      const isRefreshRequest = url.includes("/auth/refresh");

      if (!isRefreshRequest) {
        const refreshResponse = await fetch(refreshUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: tokens.refreshToken })
        });

        if (refreshResponse.ok) {
          const result = await refreshResponse.json();
          if (result.success && result.data?.accessToken) {
            const newTokens = {
              ...tokens,
              accessToken: result.data.accessToken
            };
            saveTokens(newTokens);
            
            // Retry request with new token
            headers.set("Authorization", `Bearer ${newTokens.accessToken}`);
            response = await fetch(url, config);
          }
        } else {
          // Refresh token expired or invalidated: force clear session
          clearTokens();
          if (typeof window !== "undefined") {
            localStorage.removeItem("ratalu.account.v2"); // clear AccountProvider profile
            window.location.href = "/";
          }
        }
      }
    } catch (err) {
      console.error("Token refresh error:", err);
    }
  }

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json.message || `Request failed with status ${response.status}`);
  }

  return json.data as T;
}
