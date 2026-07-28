/**
 * Enterprise API client wrapper supporting in-memory Access Tokens,
 * HttpOnly cookie silent token refresh, 401 retry queue, multi-tab sync,
 * and request deduplication.
 */

let memoryAccessToken: string | null = null;
let isRefreshing = false;
let failedRefresh = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

/** Multi-tab auth synchronization channel */
const authChannel = typeof window !== "undefined" && "BroadcastChannel" in window
  ? new BroadcastChannel("yamora_auth_sync")
  : null;

if (authChannel) {
  authChannel.onmessage = (event) => {
    if (event.data?.type === "LOGOUT") {
      memoryAccessToken = null;
      failedRefresh = false;
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/account")) {
        window.location.href = "/account";
      }
    } else if (event.data?.type === "LOGIN" && event.data?.accessToken) {
      memoryAccessToken = event.data.accessToken;
      failedRefresh = false;
    }
  };
}

export function setMemoryToken(token: string | null) {
  memoryAccessToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      try { localStorage.setItem("yamora_access_token", token); } catch {}
    } else {
      try { localStorage.removeItem("yamora_access_token"); } catch {}
    }
  }
  if (token) {
    failedRefresh = false;
  }
  if (authChannel) {
    if (token) {
      authChannel.postMessage({ type: "LOGIN", accessToken: token });
    } else {
      authChannel.postMessage({ type: "LOGOUT" });
    }
  }
}

export function getMemoryToken(): string | null {
  if (memoryAccessToken) return memoryAccessToken;
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("yamora_access_token");
      if (saved) {
        memoryAccessToken = saved;
        return saved;
      }
    } catch {}
  }
  return null;
}

export function clearMemoryToken() {
  setMemoryToken(null);
}

/** Sanitize legacy/insecure localStorage keys on app startup */
export function sanitizeLegacyStorage() {
  if (typeof window === "undefined") return;
  const legacyKeys = [
    "ratalu.tokens.v1",
    "ratalu.account.v2",
    "ratalu.accounts",
    "ratalu.orders.v2"
  ];
  legacyKeys.forEach(key => localStorage.removeItem(key));
}

// Auto-run sanitization on load
if (typeof window !== "undefined") {
  sanitizeLegacyStorage();
}

/** Backward compatibility token helpers — redirecting strictly to in-memory state */
export function saveTokens(tokens: { accessToken: string }) {
  if (tokens?.accessToken) {
    setMemoryToken(tokens.accessToken);
  }
}

export function clearTokens() {
  clearMemoryToken();
}

export function getTokens(): { accessToken: string } | null {
  return memoryAccessToken ? { accessToken: memoryAccessToken } : null;
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

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor(message = "Could not reach the server.") {
    super(message);
    this.name = "NetworkError";
  }
}

export class MaintenanceError extends Error {
  info: MaintenanceInfo;
  constructor(info: MaintenanceInfo) {
    super(info.message || "The store is temporarily unavailable.");
    this.name = "MaintenanceError";
    this.info = info;
  }
}

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

function onTokenRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

/** Execute silent refresh via HttpOnly cookie */
export async function silentRefresh(): Promise<string | null> {
  if (failedRefresh && !memoryAccessToken) {
    return null;
  }
  if (isRefreshing) {
    return new Promise((resolve) => {
      addRefreshSubscriber((token) => resolve(token));
    });
  }

  isRefreshing = true;
  try {
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });

    if (!res.ok) {
      failedRefresh = true;
      clearMemoryToken();
      onTokenRefreshed(null);
      return null;
    }

    const json = await res.json();
    if (json.success && json.data?.accessToken) {
      const newToken = json.data.accessToken;
      failedRefresh = false;
      setMemoryToken(newToken);
      onTokenRefreshed(newToken);
      return newToken;
    } else {
      failedRefresh = true;
      clearMemoryToken();
      onTokenRefreshed(null);
      return null;
    }
  } catch (err) {
    failedRefresh = true;
    clearMemoryToken();
    onTokenRefreshed(null);
    return null;
  } finally {
    isRefreshing = false;
  }
}

async function apiRequest<T = any>(endpoint: string, options: RequestOptions = {}, isRetry = false): Promise<ApiEnvelope<T>> {
  const url = endpoint.startsWith("http") ? endpoint : `/api/v1${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers = new Headers(options.headers || {});
  
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getMemoryToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: options.credentials ?? "include",
    cache: options.cache ?? "no-store",
    body: options.body instanceof FormData || typeof options.body === "string" ? options.body : (options.body ? JSON.stringify(options.body) : undefined)
  };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch {
    emit(API_EVENTS.offline);
    throw new NetworkError();
  }
  emit(API_EVENTS.online);

  // 401 Silent Refresh and Retry Queue
  if (response.status === 401 && !isRetry && !url.includes("/auth/refresh")) {
    const newToken = await silentRefresh();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      return apiRequest<T>(endpoint, { ...options, headers }, true);
    }
  }

  const json = await response.json().catch(() => ({}));

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

const inFlightRequests = new Map<string, Promise<any>>();

export async function apiFetch<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const isGet = method === "GET";
  const token = getMemoryToken();
  const cacheKey = isGet ? `${method}:${endpoint}:${token || ""}` : null;

  if (isGet && cacheKey && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
      const json = await apiRequest<T>(endpoint, options);
      return (json.data ?? []) as T;
    } finally {
      if (isGet && cacheKey) {
        inFlightRequests.delete(cacheKey);
      }
    }
  })();

  if (isGet && cacheKey) {
    inFlightRequests.set(cacheKey, promise);
  }

  return promise;
}
