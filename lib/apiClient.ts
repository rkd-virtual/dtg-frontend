// frontend/lib/apiClient.ts
type Json = any;

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").trim(); // e.g. "https://dtg-backend.onrender.com/api"

/* function normalizePath(path: string) {
  if (!path) return API_BASE || "/api";
  path = path.trim();
  // If an explicit API_BASE is configured, use it directly
  if (API_BASE) {
    if (!path.startsWith("/")) path = `/${path}`;
    return `${API_BASE.replace(/\/$/, "")}${path}`;
  }
  // fallback: route to Next's /api proxy
  if (path.startsWith("/api/")) path = path.slice(4);
  if (!path.startsWith("/")) path = `/${path}`;
  return `/api${path}`;
} */

 function normalizePath(path: string) {
  if (!path) return API_BASE || "/api";

  path = path.trim();

  // 🔐 ALL auth routes MUST go through Next
  if (path.startsWith("/auth/")) {
    return `/api${path}`;
  }

  // Non-auth routes can go directly to backend
  if (API_BASE) {
    if (!path.startsWith("/")) path = `/${path}`;
    return `${API_BASE.replace(/\/$/, "")}${path}`;
  }

  // Fallback to Next API
  if (path.startsWith("/api/")) path = path.slice(4);
  if (!path.startsWith("/")) path = `/${path}`;
  return `/api${path}`;
}

/**
 * Get token from storage (sessionStorage or localStorage)
 */
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  
  try {
    // Try localStorage first (for "Remember me")
    const storedToken = localStorage.getItem("access_token");
    if (storedToken) return storedToken;
    
    // Fall back to sessionStorage
    const sessionToken = sessionStorage.getItem("access_token");
    if (sessionToken) return sessionToken;
    
    // Fall back to old cookie-based key for backward compat
    const legacyToken = localStorage.getItem("access_token_cookie");
    if (legacyToken) return legacyToken;
    
    return null;
  } catch {
    return null;
  }
}

async function readResponseBody(res: Response) {
  if (!res || typeof (res as any).text !== "function") {
    throw new Error("fetch did not return a Response object");
  }
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text || "{}");
    } catch {
      return { raw: text };
    }
  }
  return text;
}

/**
 * Core fetch wrapper used by helpers.
 * Defaults credentials to "include" so cookies are sent/received in cross-origin dev.
 * Also injects Bearer token if available.
 */
async function makeRequest(path: string, opts: RequestInit = {}, noAuth: boolean = false) {
  const url = normalizePath(path);
  const defaultHeaders: Record<string, string> = { "Content-Type": "application/json" };

  // Inject token if available and not explicitly disabled
  if (!noAuth) {
    const token = getToken();
    if (token) {
      defaultHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const init: RequestInit = {
    // prefer explicit method from opts, else GET by default for safety in getApi/postApi wrappers
    method: opts.method,
    headers: { ...defaultHeaders, ...(opts.headers as any) },
    body: opts.body,
    // default to include credentials so cookies (JWT cookie or session) are handled automatically;
    // caller can still override by passing init.credentials explicitly.
    credentials: opts.credentials ?? "include",
    // pass through other init props if provided
    mode: opts.mode,
    cache: opts.cache,
    redirect: opts.redirect,
    referrer: opts.referrer,
    referrerPolicy: opts.referrerPolicy,
    integrity: opts.integrity,
    signal: (opts as any).signal,
  };

  const res = await fetch(url, init);
  const data = await readResponseBody(res).catch((err) => {
    const e: any = new Error("Failed to read response body: " + String(err));
    e.status = res.status;
    e.payload = null;
    throw e;
  });

  if (!res.ok) {
    const err: any = new Error(data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

export async function postApi(path: string, body?: Json, init?: RequestInit & { noAuth?: boolean }) {
  const noAuth = init?.noAuth ?? false;
  const opts: RequestInit = {
    method: init?.method || "POST",
    headers: init?.headers,
    body: body !== undefined ? JSON.stringify(body) : init?.body,
    credentials: init?.credentials,
  };
  return makeRequest(path, opts, noAuth);
}

export async function getApi(path: string, init?: RequestInit & { noAuth?: boolean }) {
  const noAuth = init?.noAuth ?? false;
  const opts: RequestInit = {
    method: "GET",
    headers: init?.headers,
    credentials: init?.credentials,
  };
  return makeRequest(path, opts, noAuth);
}

export async function putApi(path: string, body?: Json, init?: RequestInit & { noAuth?: boolean }) {
  const noAuth = init?.noAuth ?? false;
  const opts: RequestInit = {
    method: "PUT",
    headers: init?.headers,
    body: body !== undefined ? JSON.stringify(body) : init?.body,
    credentials: init?.credentials,
  };
  return makeRequest(path, opts, noAuth);
}

export async function patchApi(path: string, body?: Json, init?: RequestInit & { noAuth?: boolean }) {
  const noAuth = init?.noAuth ?? false;
  const opts: RequestInit = {
    method: init?.method || "PATCH",
    headers: init?.headers,
    body: body !== undefined ? JSON.stringify(body) : init?.body,
    credentials: init?.credentials,
  };
  return makeRequest(path, opts, noAuth);
}

export async function deleteApi(path: string, init?: RequestInit & { noAuth?: boolean }) {
  const noAuth = init?.noAuth ?? false;
  const opts: RequestInit = {
    method: "DELETE",
    headers: init?.headers,
    credentials: init?.credentials,
  };
  return makeRequest(path, opts, noAuth);
}