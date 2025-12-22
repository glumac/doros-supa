import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
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

const mockUser = {
  id: 'user-123',
  user_name: 'Test User',
  email: 'test@example.com',
  avatar_url: 'https://example.com/avatar.jpg'
};

const renderWithAuth = (component: React.ReactElement, user = mockUser) => {
  return render(
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <AuthContext.Provider value={{ user, loading: false }}>
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
      data: null,
      error: null
    });
  });

  it('should show login message when user is not logged in', () => {
    render(
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <AuthContext.Provider value={{ user: null, loading: false }}>
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
        require_follow_approval: false
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
        require_follow_approval: false
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
        require_follow_approval: true
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
        require_follow_approval: false
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
        require_follow_approval: false
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
        require_follow_approval: false
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
        require_follow_approval: false
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

  it('should display informational note', async () => {
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: {
        id: 'user-123',
        require_follow_approval: false
      },
      error: null
    });

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      expect(screen.getByText(/This setting only controls who can follow you/i)).toBeInTheDocument();
      expect(screen.getByText(/Existing followers will not be affected/i)).toBeInTheDocument();
    });
  });

  it('should display description of what the setting does', async () => {
    vi.mocked(queries.getUserProfile).mockResolvedValue({
      data: {
        id: 'user-123',
        require_follow_approval: false
      },
      error: null
    });

    renderWithAuth(<PrivacySettings />);

    await waitFor(() => {
      expect(screen.getByText(/When enabled, users must send a follow request/i)).toBeInTheDocument();
      expect(screen.getByText(/When disabled, anyone can follow you instantly/i)).toBeInTheDocument();
    });
  });
});
