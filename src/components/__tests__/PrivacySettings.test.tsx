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

const mockUserProfile = {
  id: 'user-123',
  user_name: 'Test User',
  email: 'test@example.com',
  avatar_url: 'https://example.com/avatar.jpg',
  require_follow_approval: false,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

const renderWithAuth = (component: React.ReactElement, user: User | null = mockUser) => {
  return render(
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <AuthContext.Provider value={{ user, session: null, userProfile: mockUserProfile, loading: false }}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('PrivacySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(queries.getBlockedUsers).mockResolvedValue({
      data: [],
      error: null
    });
    vi.mocked(queries.unblockUser).mockResolvedValue({
      error: null
    });
  });

  it('should show login message when user is not logged in', () => {
    render(
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <AuthContext.Provider value={{ user: null, session: null, userProfile: null, loading: false }}>
          <PrivacySettings />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByText(/Please log in to access privacy settings/i)).toBeInTheDocument();
  });

  it('should show loading state initially', async () => {
    vi.mocked(queries.getUserProfile).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 100))
    );

    renderWithAuth(<PrivacySettings />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should load and display current privacy settings', async () => {
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
        avatar_url: null,
        privacy_setting: null,
        require_follow_approval: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      error: null
    });

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
      expect(screen.getByText('Require Follow Approval')).toBeInTheDocument();
    });
  });

  it('should display toggle in off state when require_follow_approval is false', async () => {
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
        avatar_url: null,
        privacy_setting: null,
        require_follow_approval: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      error: null
    });

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      const toggleButton = screen.getByRole('button');
      const toggleSwitch = toggleButton.querySelector('div');
      expect(toggleSwitch).toHaveStyle({ left: '2px' });
    });
  });

  it('should display toggle in on state when require_follow_approval is true', async () => {
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
        avatar_url: null,
        privacy_setting: null,
        require_follow_approval: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      error: null
    });

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      const toggleButton = screen.getByRole('button');
      const toggleSwitch = toggleButton.querySelector('div');
      expect(toggleSwitch).toHaveStyle({ left: '24px' });
    });
  });

  it('should toggle setting when button is clicked', async () => {
    const user = userEvent.setup();

    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
        avatar_url: null,
        privacy_setting: null,
        require_follow_approval: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      error: null
    });

    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null }))
    }));
    const mockFrom = vi.fn(() => ({
      update: mockUpdate
    }));
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    const toggleButton = screen.getByRole('button');
    await user.click(toggleButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ require_follow_approval: true });
    });
  });

  it('should show success message after updating', async () => {
    const user = userEvent.setup();

    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
        avatar_url: null,
        privacy_setting: null,
        require_follow_approval: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      error: null
    });

    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null }))
    }));
    const mockFrom = vi.fn(() => ({
      update: mockUpdate
    }));
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    const toggleButton = screen.getByRole('button');
    await user.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText('Settings updated successfully')).toBeInTheDocument();
    });
  });

  it('should show error message on update failure', async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
        avatar_url: null,
        privacy_setting: null,
        require_follow_approval: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      error: null
    });

    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: new Error('Update failed') }))
    }));
    const mockFrom = vi.fn(() => ({
      update: mockUpdate
    }));
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    const toggleButton = screen.getByRole('button');
    await user.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to update settings')).toBeInTheDocument();
    });

    consoleError.mockRestore();
  });

  it('should disable button while saving', async () => {
    const user = userEvent.setup();

    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
        avatar_url: null,
        privacy_setting: null,
        require_follow_approval: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      error: null
    });

    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100)))
    }));
    const mockFrom = vi.fn(() => ({
      update: mockUpdate
    }));
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    const toggleButton = screen.getByRole('button');
    await user.click(toggleButton);

    expect(toggleButton).toBeDisabled();
  });


  it('should display description of what the setting does', async () => {
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: {
        id: 'user-123',
        user_name: 'Test User',
        email: 'test@example.com',
        avatar_url: null,
        privacy_setting: null,
        require_follow_approval: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      error: null
    });

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      expect(screen.getByText(/When enabled, users must send a follow request before they can follow you/i)).toBeInTheDocument();
      expect(screen.getByText(/You'll be able to approve or decline each request/i)).toBeInTheDocument();
      expect(screen.getByText(/Your weekly pomodoro totals will still appear on the global leaderboard/i)).toBeInTheDocument();
      expect(screen.getByText(/your total pomodoro count will still be visible in search/i)).toBeInTheDocument();
      expect(screen.getByText(/individual pomodoros will only be visible to approved followers/i)).toBeInTheDocument();
      expect(screen.getByText(/When disabled, anyone can follow you instantly/i)).toBeInTheDocument();
    });
  });
});
