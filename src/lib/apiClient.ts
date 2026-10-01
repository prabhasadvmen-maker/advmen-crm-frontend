/**
 * Resilient Multi-Device API Client for ADVMEN SalesOS
 * 
 * Features:
 * - Dynamic relative & multi-device URL resolution
 * - HTTP-Only Cookie Session Credentials
 * - Request Correlation ID (X-Request-Id)
 * - Automatic 401 Silent Token Rotation
 * - Fault-Tolerant Fallback Helpers for Subsystem Isolation
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

  constructor(message: string, status: number = 500, code: string = 'UNKNOWN_ERROR', details?: unknown, requestId?: string) {
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

// Dynamic API Base URL (Relative /api/v1 allows Vite proxy to seamlessly work across mobile, LAN, and desktop)
const envApiUrl = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_API_BASE_URL : undefined;
const API_BASE_URL = (envApiUrl || '/api/v1').replace(/\/$/, '');

let isRefreshing = false;
let refreshSubscribers: Array<(tokenRefreshed: boolean) => void> = [];

function onTokenRefreshed(success: boolean) {
  refreshSubscribers.forEach((callback) => callback(success));
  refreshSubscribers = [];
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
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
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
    credentials: 'include', // Ensures HTTP-only auth cookies are sent across all devices
  };

  try {
    const response = await fetch(url, fetchOptions);

    // Handle 401 Unauthorized with Automatic Silent Refresh
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          });

          if (refreshRes.ok) {
            isRefreshing = false;
            onTokenRefreshed(true);
            return request<T>(endpoint, options, keepEnvelope);
          } else {
            isRefreshing = false;
            onTokenRefreshed(false);
          }
        } catch {
          isRefreshing = false;
          onTokenRefreshed(false);
        }
      } else {
        // Wait for active refresh to complete before retrying
        return new Promise<T>((resolve, reject) => {
          refreshSubscribers.push((success) => {
            if (success) {
              resolve(request<T>(endpoint, options, keepEnvelope));
            } else {
              reject(new ApiError('Session expired. Please log in again.', 401, 'UNAUTHORIZED'));
            }
          });
        });
      }
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorData = isJson ? (data as ApiErrorResponse) : null;
      throw new ApiError(
        errorData?.error?.message || response.statusText || 'Request failed',
        response.status,
        errorData?.error?.code || 'HTTP_ERROR',
        errorData?.error?.details,
        errorData?.error?.requestId
      );
    }

    // Return the inner data payload if wrapped in standard ApiResponse envelope
    if (isJson && data && typeof data === 'object' && 'success' in data && 'data' in data) {
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
    console.warn(`⚠️ [${moduleName}] Backend unavailable, activating graceful local fallback:`, err);
    return fallbackData;
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'GET' }),
  getWithMeta: <T>(endpoint: string, options?: RequestInit) =>
    request<EnvelopeResponse<T>>(endpoint, { ...options, method: 'GET' }, true),
  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
