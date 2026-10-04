import { afterEach, describe, it, expect, vi } from 'vitest';
import { apiClient, clearAuthTokens, saveAuthTokens, withFallback, ApiError } from '../apiClient';

describe('Frontend API Client Resilience Tests', () => {
  it('returns data when promise resolves successfully', async () => {
    const successPromise = Promise.resolve([{ id: '1', name: 'Test Lead' }]);
    const fallback = [{ id: 'mock', name: 'Mock Lead' }];

    const result = await withFallback(successPromise, fallback, 'Test Subsystem');
    expect(result).toEqual([{ id: '1', name: 'Test Lead' }]);
  });

  it('gracefully catches network errors and returns fallback data without throwing', async () => {
    const failingPromise = Promise.reject(new ApiError('Backend Server Down', 500, 'SERVER_ERROR'));
    const fallback = [{ id: 'mock', name: 'Mock Lead' }];

    const result = await withFallback(failingPromise, fallback, 'Failing Subsystem');
    expect(result).toEqual(fallback);
  });

  it('refreshes an access token before sending an API request when it is close to expiry', async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    });

    const expiringToken = `header.${btoa(JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 20,
    })).replace(/=/g, '')}.signature`;
    const refreshedAccessToken = 'refreshed-access-token';
    saveAuthTokens({ accessToken: expiringToken, refreshToken: 'refresh-token' });

    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: {
          tokens: {
            accessToken: refreshedAccessToken,
            refreshToken: 'rotated-refresh-token',
          },
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: { ok: true },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiClient.get('/leads')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const apiRequestOptions = fetchMock.mock.calls[1][1];
    expect(new Headers(apiRequestOptions?.headers).get('Authorization'))
      .toBe(`Bearer ${refreshedAccessToken}`);
  });

  it('automatically retries request after encountering 401 Unauthorized by rotating token', async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    });

    const activeToken = `header.${btoa(JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 3600,
    })).replace(/=/g, '')}.signature`;
    const newAccessToken = 'freshly-rotated-access-token';
    saveAuthTokens({ accessToken: activeToken, refreshToken: 'valid-refresh-token' });

    const fetchMock = vi.fn<typeof fetch>()
      // First attempt fails with 401
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: false,
        error: { message: 'Token expired', code: 'TOKEN_EXPIRED' },
      }), { status: 401, headers: { 'Content-Type': 'application/json' } }))
      // Silent refresh succeeds
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: {
          tokens: {
            accessToken: newAccessToken,
            refreshToken: 'new-refresh-token',
          },
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      // Retried request succeeds
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: { leads: [{ id: 'lead-123' }] },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiClient.get<{ leads: any[] }>('/leads');
    expect(result).toEqual({ leads: [{ id: 'lead-123' }] });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearAuthTokens();
});
