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

export interface ApiPagination {
  page: number;
  limit: number;
  totalPages?: number;
  totalRecords?: number;
  total?: number;
  pages?: number;
}

export interface ApiEnvelope<T = any> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: ApiPagination | null;
  meta?: unknown;
  errors?: unknown;
}

export interface MaintenanceInfo {
  active: boolean;
  title: string;
  message: string;
  endsAt: string | null;
}

/** The request reached the server and it answered with an error status. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** The request never reached the server — offline, DNS, or the API is down. */
export class NetworkError extends Error {
  constructor(message = "Could not reach the server.") {
    super(message);
    this.name = "NetworkError";
  }
}

/** The store is intentionally closed (503 from the maintenance gate). */
export class MaintenanceError extends Error {
  info: MaintenanceInfo;
  constructor(info: MaintenanceInfo) {
    super(info.message || "The store is temporarily unavailable.");
    this.name = "MaintenanceError";
    this.info = info;
  }
}

/**
 * Broadcast connectivity problems so a single global gate can render the
 * maintenance / offline screen, instead of every caller handling it.
 */
const emit = (name: string, detail?: unknown) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
};

export const API_EVENTS = {
  maintenance: "api:maintenance",
  offline: "api:offline",
  online: "api:online",
} as const;

async function apiRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
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
    credentials: options.credentials ?? "include",
    cache: options.cache ?? "no-store",
    body: options.body instanceof FormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined)
  };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch {
    // fetch() only rejects when the request never made it (offline, API down).
    emit(API_EVENTS.offline);
    throw new NetworkError();
  }
  emit(API_EVENTS.online);

  // Token refresh flow on 401 (works via HTTP-only cookie or stored token)
  if (response.status === 401) {
    try {
      // Prevent infinite loops by checking if we already tried refreshing
      const refreshUrl = "/api/v1/auth/refresh";
      const isRefreshRequest = url.includes("/auth/refresh");

      if (!isRefreshRequest) {
        const refreshResponse = await fetch(refreshUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ refreshToken: tokens?.refreshToken })
        });

        if (refreshResponse.ok) {
          const result = await refreshResponse.json();
          if (result.success && result.data?.accessToken) {
            const newTokens = {
              accessToken: result.data.accessToken,
              refreshToken: result.data.refreshToken || tokens?.refreshToken || ""
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

  // The store is intentionally closed — distinct from a failure.
  if (response.status === 503 && json.maintenance?.active) {
    emit(API_EVENTS.maintenance, json.maintenance);
    if (typeof window !== "undefined") {
      return {
        success: false,
        message: json.maintenance.message || "Store under maintenance",
        data: [] as any,
      };
    }
    throw new MaintenanceError(json.maintenance);
  }

  if (!response.ok) {
    if (typeof window !== "undefined" && (response.status === 401 || response.status === 403)) {
      try {
        const cached = localStorage.getItem("ratalu.account.v2");
        const isCustomer = cached ? JSON.parse(cached).role === "Customer" : false;
        const isCustomerMsg = json.message?.includes("Customer");
        if (isCustomer || isCustomerMsg) {
          localStorage.removeItem("ratalu.account.v2");
          window.location.href = "/account";
        } else {
          clearTokens();
          localStorage.removeItem("ratalu.account.v2");
          window.location.href = "/admin";
        }
      } catch (e) {
        console.error("Session sync error in API handler:", e);
      }
    }

    throw new ApiError(
      json.message || `Request failed with status ${response.status}`,
      response.status
    );
  }

  return json as ApiEnvelope<T>;
}

export async function apiFetchEnvelope<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  return apiRequest<T>(endpoint, options);
}

export async function apiFetch<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const json = await apiRequest<T>(endpoint, options);
  return (json.data ?? []) as T;
}
