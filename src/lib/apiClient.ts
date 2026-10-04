/**
 * Resilient Multi-Device API Client for ADVMEN SalesOS
 * 
 * Features:
 * - Dynamic relative & multi-device URL resolution
 * - Unified Single-Promise Token Refresh (Preflight & 401 retry deduplication)
 * - Multi-Tab Session Persistence (localStorage + sessionStorage dual sync)
 * - Safe UTF-8 JWT Payload Decoding
 * - Request Correlation ID (X-Request-Id)
 * - Tenant Header Injection (X-Target-Organization-Id)
 * - Graceful Subsystem Fallbacks
 */

import { useSessionStore } from '@/stores/sessionStore';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    requestId?: string;
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    [key: string]: unknown;
  };
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

export class ApiError extends Error {
  public code: string;
  public status: number;
  public details?: unknown;
  public requestId?: string;

  constructor(
    message: string,
    status: number = 500,
    code: string = 'UNKNOWN_ERROR',
    details?: unknown,
    requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

// Generate unique correlation ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Dynamic API Base URL Resolution
const getBaseUrl = (): string => {
  const envUrl =
    typeof import.meta !== 'undefined' && (import.meta as any).env
      ? (import.meta as any).env.VITE_API_BASE_URL
      : undefined;

  if (envUrl && envUrl.trim() !== '') {
    return envUrl.replace(/\/$/, '');
  }

  // Fallback production URL if .env is missing or relative route fail
  return 'https://advmen-crm-backend.onrender.com/api/v1';
};

const API_BASE_URL = getBaseUrl();

let accessToken: string | null = null;
let refreshRejected = false;
let activeRefreshPromise: Promise<boolean> | null = null;

const ACCESS_TOKEN_KEY = 'salesos.accessToken';
const REFRESH_TOKEN_KEY = 'salesos.refreshToken';

/**
 * Safely read a token from localStorage first, then sessionStorage.
 */
function readStoredToken(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    if (window.localStorage) {
      const val = window.localStorage.getItem(key);
      if (val) return val;
    }
  } catch {}
  try {
    if (window.sessionStorage) {
      return window.sessionStorage.getItem(key);
    }
  } catch {}
  return null;
}

/**
 * Write tokens to memory, localStorage, and sessionStorage simultaneously.
 */
function writeStoredTokens(tokens: { accessToken: string; refreshToken: string } | null): void {
  accessToken = tokens?.accessToken || null;
  if (typeof window === 'undefined') return;

  try {
    if (window.localStorage) {
      if (!tokens) {
        window.localStorage.removeItem(ACCESS_TOKEN_KEY);
        window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      } else {
        window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
        window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
      }
    }
  } catch {}

  try {
    if (window.sessionStorage) {
      if (!tokens) {
        window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      } else {
        window.sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
        window.sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
      }
    }
  } catch {}
}

/**
 * Safely decode JWT claims handling Base64URL and UTF-8 multibyte characters.
 */
function parseJwtClaims(token: string): { exp?: number; [key: string]: unknown } | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const jsonStr = new TextDecoder().decode(bytes);
    return JSON.parse(jsonStr);
  } catch {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }
}

function sendRefreshRequest(refreshToken?: string | null): Promise<Response> {
  return fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': generateRequestId(),
    },
    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
  });
}

export function hasAuthTokens(): boolean {
  return Boolean(
    accessToken ||
    readStoredToken(ACCESS_TOKEN_KEY) ||
    readStoredToken(REFRESH_TOKEN_KEY)
  );
}

export function getAccessToken(): string | null {
  return accessToken || readStoredToken(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return readStoredToken(REFRESH_TOKEN_KEY);
}

export function saveAuthTokens(tokens: { accessToken: string; refreshToken: string }): void {
  refreshRejected = false;
  writeStoredTokens(tokens);
}

export function clearAuthTokens(): void {
  refreshRejected = true;
  writeStoredTokens(null);
}

/**
 * Unified Single-Promise Token Refresh Coordinator.
 * Prevents concurrent refresh token rotation races and duplicate HTTP requests.
 */
async function executeTokenRefresh(): Promise<boolean> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const refreshToken = readStoredToken(REFRESH_TOKEN_KEY);
      let response = await sendRefreshRequest(refreshToken);
      if (!response.ok && (response.status === 401 || response.status === 403) && refreshToken) {
        // Fallback to cookie-only refresh if explicit token was rejected
        response = await sendRefreshRequest();
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          clearAuthTokens();
          useSessionStore.getState().invalidateSession();
        }
        return false;
      }

      const result = (await response.json()) as {
        data?: { tokens?: { accessToken?: string; refreshToken?: string } };
        tokens?: { accessToken?: string; refreshToken?: string };
      };
      const tokens = result.data?.tokens || result.tokens;
      if (!tokens?.accessToken || !tokens.refreshToken) {
        return false;
      }

      writeStoredTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      refreshRejected = false;
      return true;
    } catch {
      return false;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

export async function refreshAccessTokenIfExpired(): Promise<void> {
  const token = accessToken || readStoredToken(ACCESS_TOKEN_KEY);
  if (!token) return;

  const claims = parseJwtClaims(token);
  // If claims cannot be parsed or token expires within the next 60 seconds
  if (!claims?.exp || claims.exp * 1000 <= Date.now() + 60_000) {
    const refreshed = await executeTokenRefresh();
    if (!refreshed && refreshRejected) {
      throw new ApiError('Session expired. Please log in again.', 401, 'UNAUTHORIZED');
    }
  }
}

export interface EnvelopeResponse<T> {
  data: T;
  meta?: {
    requestId?: string;
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    [key: string]: unknown;
  };
  message?: string;
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  keepEnvelope: boolean = false
): Promise<T> {
  // Strip redundant /api/v1 prefix if passed by caller
  const normalizedEndpoint = endpoint.replace(/^\/?api\/v1\/?/, '/');
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${normalizedEndpoint.startsWith('/') ? '' : '/'}${normalizedEndpoint}`;

  const headers = new Headers(options.headers || {});
  const currentAccessToken = accessToken || readStoredToken(ACCESS_TOKEN_KEY);
  if (currentAccessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${currentAccessToken}`);
  }

  const isFormData = options.body instanceof FormData;
  if (!headers.has('Content-Type') && !isFormData && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('X-Request-Id')) {
    headers.set('X-Request-Id', generateRequestId());
  }

  if (!headers.has('X-Target-Organization-Id')) {
    try {
      const activeOrgId = useSessionStore.getState()?.organizationId;
      if (activeOrgId) {
        headers.set('X-Target-Organization-Id', activeOrgId);
      }
    } catch {
      // Graceful fallback if session store is not ready
    }
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // HTTP-only auth cookies
  };

  try {
    if (!/\/auth\/(login|signup|refresh|forgot-password|reset-password)(\/|$)/.test(endpoint)) {
      await refreshAccessTokenIfExpired();
      const refreshedAccessToken = accessToken || readStoredToken(ACCESS_TOKEN_KEY);
      if (refreshedAccessToken) {
        headers.set('Authorization', `Bearer ${refreshedAccessToken}`);
      }
    }

    let response = await fetch(url, fetchOptions);

    // Handle 401 Unauthorized with Automatic Silent Refresh
    if (
      response.status === 401 &&
      !/\/auth\/(login|signup|refresh|logout)(\/|$)/.test(endpoint)
    ) {
      if (refreshRejected) {
        throw new ApiError('Session expired. Please log in again.', 401, 'UNAUTHORIZED');
      }

      const refreshed = await executeTokenRefresh();
      if (refreshed) {
        return await request<T>(endpoint, options, keepEnvelope);
      }

      throw new ApiError('Session expired. Please log in again.', 401, 'UNAUTHORIZED');
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorData = isJson && typeof data === 'object' && data !== null ? (data as any) : null;
      const message =
        errorData?.error?.message ||
        (typeof errorData?.message === 'string' ? errorData.message : null) ||
        (typeof errorData?.error === 'string' ? errorData.error : null) ||
        response.statusText ||
        'Request failed';
      const code = errorData?.error?.code || errorData?.code || 'HTTP_ERROR';
      const details = errorData?.error?.details || errorData?.details;
      const requestId = errorData?.error?.requestId || errorData?.requestId;

      throw new ApiError(message, response.status, code, details, requestId);
    }

    // Return inner data payload if wrapped in standard ApiResponse envelope
    if (
      isJson &&
      data &&
      typeof data === 'object' &&
      'success' in data &&
      'data' in data
    ) {
      if (keepEnvelope) {
        return {
          data: (data as any).data,
          meta: (data as any).meta,
          message: (data as any).message,
        } as unknown as T;
      }
      return (data as ApiSuccessResponse<T>).data;
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network failure / Offline / Subnet unreachable
    throw new ApiError(
      error instanceof Error ? error.message : 'Network communication error',
      0,
      'NETWORK_DISCONNECTED'
    );
  }
}

/**
 * Resilient wrapper: Catches backend failures and returns fallback data safely
 * so a single subsystem failure never crashes other UI widgets.
 */
export async function withFallback<T>(
  apiCall: Promise<T>,
  fallbackData: T,
  moduleName: string = 'Subsystem'
): Promise<T> {
  try {
    return await apiCall;
  } catch (err) {
    console.warn(
      `⚠️ [${moduleName}] Backend unavailable, activating graceful local fallback:`,
      err
    );
    return fallbackData;
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
  getWithMeta: <T>(endpoint: string, options?: RequestInit) =>
    request<EnvelopeResponse<T>>(endpoint, { ...options, method: 'GET' }, true),
  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) => {
    const finalBody =
      body !== undefined
        ? body instanceof FormData
          ? body
          : JSON.stringify(body)
        : options?.body;
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: finalBody,
    });
  },
  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) => {
    const finalBody =
      body !== undefined
        ? body instanceof FormData
          ? body
          : JSON.stringify(body)
        : options?.body;
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: finalBody,
    });
  },
  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) => {
    const finalBody =
      body !== undefined
        ? body instanceof FormData
          ? body
          : JSON.stringify(body)
        : options?.body;
    return request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: finalBody,
    });
  },
  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};