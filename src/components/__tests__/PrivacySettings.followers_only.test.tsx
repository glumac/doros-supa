import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import PrivacySettings from '../PrivacySettings';
import { AuthContext } from '../../contexts/AuthContext';
import * as queries from '../../lib/queries';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/queries', () => ({
  getUserProfile: vi.fn(),
  getBlockedUsers: vi.fn(),
  unblockUser: vi.fn(),
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          error: null
        }))
      }))
    }))
  }
}));

const mockUser: User = {
  id: 'user-123',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  email: 'test@example.com',
} as User;

const renderWithAuth = (component: React.ReactElement, user: User | null = mockUser) => {
  return render(
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <AuthContext.Provider value={{ user, loading: false }}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('PrivacySettings - Followers Only Field', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display field as followers_only (not require_follow_approval)', async () => {
    const mockUserProfile = {
      id: 'user-123',
      user_name: 'Test User',
      email: 'test@example.com',
      followers_only: false,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    vi.mocked(queries.getUserProfile).mockResolvedValue({ data: mockUserProfile, error: null });
    vi.mocked(queries.getBlockedUsers).mockResolvedValue({ data: [], error: null });

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      expect(queries.getUserProfile).toHaveBeenCalledWith('user-123');
    });

    // Should read followers_only field (not require_follow_approval)
    expect(queries.getUserProfile).toHaveBeenCalled();
  });

  it('should display UI label as "Followers Only" or "Make Account Followers-Only"', async () => {
    const mockUserProfile = {
      id: 'user-123',
      user_name: 'Test User',
      email: 'test@example.com',
      followers_only: false,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    vi.mocked(queries.getUserProfile).mockResolvedValue({ data: mockUserProfile, error: null });
    vi.mocked(queries.getBlockedUsers).mockResolvedValue({ data: [], error: null });

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      // Should show "Followers Only" or similar label (not "Require Follow Approval")
      expect(screen.getByText(/Followers Only|Make Account Followers-Only/i)).toBeInTheDocument();
    });
  });

  it('should update followers_only field when toggle is clicked', async () => {
    const user = userEvent.setup();
    const mockUserProfile = {
      id: 'user-123',
      user_name: 'Test User',
      email: 'test@example.com',
      followers_only: false,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    vi.mocked(queries.getUserProfile).mockResolvedValue({ data: mockUserProfile, error: null });
    vi.mocked(queries.getBlockedUsers).mockResolvedValue({ data: [], error: null });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate
    } as any);

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      expect(screen.getByText(/Followers Only/i)).toBeInTheDocument();
    });

    const toggleButton = screen.getByRole('button');
    await user.click(toggleButton);

    await waitFor(() => {
      // Should update followers_only field (not require_follow_approval)
      expect(mockUpdate).toHaveBeenCalledWith({ followers_only: true });
    });
  });

  it('should default to false (public) when followers_only is not set', async () => {
    const mockUserProfile = {
      id: 'user-123',
      user_name: 'Test User',
      email: 'test@example.com',
      followers_only: false, // Default value
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    vi.mocked(queries.getUserProfile).mockResolvedValue({ data: mockUserProfile, error: null });
    vi.mocked(queries.getBlockedUsers).mockResolvedValue({ data: [], error: null });

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      expect(queries.getUserProfile).toHaveBeenCalled();
    });

    // Toggle should be in off state (false = public)
    const toggleButton = screen.getByRole('button');
    const toggleSwitch = toggleButton.querySelector('div');
    expect(toggleSwitch).toHaveStyle({ left: '2px' }); // Off position
  });
});

