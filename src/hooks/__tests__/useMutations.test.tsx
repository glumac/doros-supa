import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useCreatePomodoroMutation } from '../useMutations';
import { supabase } from '../../lib/supabaseClient';

// Mock supabase
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('useCreatePomodoroMutation', () => {
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

  it('should create a pomodoro successfully', async () => {
    const mockInsert = vi.fn().mockResolvedValue({
      data: { id: 'pomodoro-123' },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any);

    const { result } = renderHook(() => useCreatePomodoroMutation(), {
      wrapper: createWrapper(),
    });

    const pomodoroData = {
      user_id: 'user-123',
      task: 'Test task',
      notes: 'Test notes',
      completed: true,
      launch_at: new Date().toISOString(),
      image_url: null,
    };

    result.current.mutate(pomodoroData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockInsert).toHaveBeenCalledWith(pomodoroData);
  });

  it('should handle errors when creating a pomodoro', async () => {
    const mockError = new Error('Database error');
    const mockInsert = vi.fn().mockResolvedValue({
      data: null,
      error: mockError,
    });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any);

    const { result } = renderHook(() => useCreatePomodoroMutation(), {
      wrapper: createWrapper(),
    });

    const pomodoroData = {
      user_id: 'user-123',
      task: 'Test task',
      notes: null,
      completed: true,
      launch_at: new Date().toISOString(),
      image_url: null,
    };

    result.current.mutate(pomodoroData);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(mockError);
  });

  it('should invalidate leaderboard queries on success', async () => {
    const mockInsert = vi.fn().mockResolvedValue({
      data: { id: 'pomodoro-123' },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any);

    const { result } = renderHook(() => useCreatePomodoroMutation(), {
      wrapper: createWrapper(),
    });

    // Spy on queryClient.invalidateQueries
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const pomodoroData = {
      user_id: 'user-123',
      task: 'Test task',
      notes: null,
      completed: true,
      launch_at: new Date().toISOString(),
      image_url: null,
    };

    result.current.mutate(pomodoroData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify leaderboard queries are invalidated
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['leaderboard', 'global'] })
    );
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['leaderboard', 'friends'] })
    );
  });

  it('should invalidate feed queries on success', async () => {
    const mockInsert = vi.fn().mockResolvedValue({
      data: { id: 'pomodoro-123' },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any);

    const { result } = renderHook(() => useCreatePomodoroMutation(), {
      wrapper: createWrapper(),
    });

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const pomodoroData = {
      user_id: 'user-123',
      task: 'Test task',
      notes: null,
      completed: true,
      launch_at: new Date().toISOString(),
      image_url: null,
    };

    result.current.mutate(pomodoroData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['feed'] })
    );
  });

  it('should invalidate user pomodoros queries on success', async () => {
    const mockInsert = vi.fn().mockResolvedValue({
      data: { id: 'pomodoro-123' },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any);

    const { result } = renderHook(() => useCreatePomodoroMutation(), {
      wrapper: createWrapper(),
    });

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const pomodoroData = {
      user_id: 'user-123',
      task: 'Test task',
      notes: null,
      completed: true,
      launch_at: new Date().toISOString(),
      image_url: null,
    };

    result.current.mutate(pomodoroData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['user', 'pomodoros'] })
    );
  });
});
