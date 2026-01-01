import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useDeleteAccount } from '../useDeleteAccount';
import { supabase } from '../../lib/supabaseClient';
import * as queries from '../../lib/queries';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
    },
  },
}));

vi.mock('../../lib/queries', () => ({
  softDeleteAccount: vi.fn(),
}));

describe('useDeleteAccount', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call softDeleteAccount with correct userId', async () => {
    const mockSoftDelete = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(queries.softDeleteAccount).mockImplementation(mockSoftDelete);
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('user-123');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockSoftDelete).toHaveBeenCalledWith('user-123');
  });

  it('should sign out and clear query cache on success', async () => {
    const mockSoftDelete = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(queries.softDeleteAccount).mockImplementation(mockSoftDelete);
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: createWrapper(),
    });

    const clearSpy = vi.spyOn(queryClient, 'clear');

    result.current.mutate('user-123');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const mockError = new Error('Delete failed');
    const mockSoftDelete = vi.fn().mockResolvedValue({ data: null, error: mockError });
    vi.mocked(queries.softDeleteAccount).mockImplementation(mockSoftDelete);

    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('user-123');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(mockError);
    // Should not sign out on error
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });
});



