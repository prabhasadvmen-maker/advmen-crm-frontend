import { describe, it, expect } from 'vitest';
import { withFallback, ApiError } from '../apiClient';

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
});
