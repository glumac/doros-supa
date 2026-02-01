import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findFirstPomodoroInRange } from '../queries';
import { supabase } from '../supabaseClient';

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('findFirstPomodoroInRange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should find the first pomodoro in a date range and calculate correct page number', async () => {
    const mockFirstPomodoro = {
      id: 'pomodoro-123',
      launch_at: '2024-01-15T10:00:00Z',
    };

    // Mock the query chain for finding the first pomodoro
    const firstPomodoroChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: mockFirstPomodoro,
        error: null,
      }),
    };

    // Mock the count query for pomodoros after this one
    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockResolvedValue({
        count: 39, // 39 newer pomodoros means this is #40, so page 2
        error: null,
      }),
    };
    countChain.eq.mockReturnValue(countChain); // Ensure chaining works for both eq() calls

    // Mock the total count query
    const totalCountChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    totalCountChain.eq = vi.fn().mockReturnValueOnce(totalCountChain).mockResolvedValueOnce({
      count: 100,
      error: null,
    });

    (supabase.from as any)
      .mockReturnValueOnce(firstPomodoroChain)
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(totalCountChain);

    const result = await findFirstPomodoroInRange(
      'user-123',
      '2024-01-01T00:00:00',
      '2024-01-31T23:59:59',
      20
    );

    expect(result).toEqual({
      pomodoroId: 'pomodoro-123',
      pageNumber: 2, // Position 40 / pageSize 20 = page 2
      totalCount: 100,
    });

    // Verify the first pomodoro query
    expect(firstPomodoroChain.select).toHaveBeenCalledWith('id, launch_at');
    expect(firstPomodoroChain.eq).toHaveBeenCalledWith('user_id', 'user-123');
    expect(firstPomodoroChain.eq).toHaveBeenCalledWith('completed', true);
    expect(firstPomodoroChain.gte).toHaveBeenCalledWith('launch_at', '2024-01-01T00:00:00');
    expect(firstPomodoroChain.lte).toHaveBeenCalledWith('launch_at', '2024-01-31T23:59:59');
    expect(firstPomodoroChain.order).toHaveBeenCalledWith('launch_at', { ascending: true });
    expect(firstPomodoroChain.limit).toHaveBeenCalledWith(1);
  });

  it('should return page 1 when pomodoro is the most recent', async () => {
    const mockFirstPomodoro = {
      id: 'pomodoro-newest',
      launch_at: '2024-01-15T10:00:00Z',
    };

    const firstPomodoroChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: mockFirstPomodoro,
        error: null,
      }),
    };

    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockResolvedValue({
        count: 0, // No newer pomodoros, this is #1
        error: null,
      }),
    };
    countChain.eq.mockReturnValue(countChain);

    const totalCountChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    totalCountChain.eq = vi.fn().mockReturnValueOnce(totalCountChain).mockResolvedValueOnce({
      count: 50,
      error: null,
    });

    (supabase.from as any)
      .mockReturnValueOnce(firstPomodoroChain)
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(totalCountChain);

    const result = await findFirstPomodoroInRange(
      'user-123',
      '2024-01-01T00:00:00',
      '2024-01-31T23:59:59',
      20
    );

    expect(result).toEqual({
      pomodoroId: 'pomodoro-newest',
      pageNumber: 1,
      totalCount: 50,
    });
  });

  it('should return null when no pomodoro found in range', async () => {
    const firstPomodoroChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };

    (supabase.from as any).mockReturnValueOnce(firstPomodoroChain);

    const result = await findFirstPomodoroInRange(
      'user-123',
      '2024-01-01T00:00:00',
      '2024-01-31T23:59:59',
      20
    );

    expect(result).toBeNull();
  });

  it('should return null when there is a database error', async () => {
    const firstPomodoroChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    };

    (supabase.from as any).mockReturnValueOnce(firstPomodoroChain);

    const result = await findFirstPomodoroInRange(
      'user-123',
      '2024-01-01T00:00:00',
      '2024-01-31T23:59:59',
      20
    );

    expect(result).toBeNull();
  });

  it('should calculate correct page for last position', async () => {
    const mockFirstPomodoro = {
      id: 'pomodoro-oldest',
      launch_at: '2024-01-01T10:00:00Z',
    };

    const firstPomodoroChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: mockFirstPomodoro,
        error: null,
      }),
    };

    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockResolvedValue({
        count: 99, // 99 newer = position 100, last on page 5
        error: null,
      }),
    };
    countChain.eq.mockReturnValue(countChain);

    const totalCountChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    totalCountChain.eq = vi.fn().mockReturnValueOnce(totalCountChain).mockResolvedValueOnce({
      count: 100,
      error: null,
    });

    (supabase.from as any)
      .mockReturnValueOnce(firstPomodoroChain)
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(totalCountChain);

    const result = await findFirstPomodoroInRange(
      'user-123',
      '2024-01-01T00:00:00',
      '2024-01-31T23:59:59',
      20
    );

    expect(result).toEqual({
      pomodoroId: 'pomodoro-oldest',
      pageNumber: 5, // Position 100 / pageSize 20 = page 5
      totalCount: 100,
    });
  });
});
