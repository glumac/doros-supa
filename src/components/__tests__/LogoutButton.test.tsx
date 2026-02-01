import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import LogoutButton from '../LogoutButton';
import { supabase } from '../../lib/supabaseClient';

// Mock supabase
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signOut: vi.fn()
    }
  }
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('LogoutButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should render logout button with correct text', () => {
    render(<LogoutButton />, { wrapper: createWrapper() });

    const logoutButton = screen.getByRole('button', { name: /log out/i });
    expect(logoutButton).toBeInTheDocument();
    expect(logoutButton).toHaveTextContent('Log out');
  });

  it('should have correct default CSS classes', () => {
    render(<LogoutButton />, { wrapper: createWrapper() });

    const logoutButton = screen.getByRole('button', { name: /log out/i });
    expect(logoutButton).toHaveClass('cq-logout-button');
    expect(logoutButton).toHaveClass('w-20');
    expect(logoutButton).toHaveClass('text-right');
  });

  it('should apply additional custom className', () => {
    const customClass = 'custom-class';
    render(<LogoutButton className={customClass} />, { wrapper: createWrapper() });

    const logoutButton = screen.getByRole('button', { name: /log out/i });
    expect(logoutButton).toHaveClass(customClass);
    expect(logoutButton).toHaveClass('cq-logout-button'); // Should still have default classes
  });

  it('should call supabase.auth.signOut when clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    render(<LogoutButton />, { wrapper: createWrapper() });

    const logoutButton = screen.getByRole('button', { name: /log out/i });
    await user.click(logoutButton);

    expect(supabase.auth.signOut).toHaveBeenCalledOnce();
  });

  it('should navigate to login page after signOut', async () => {
    const user = userEvent.setup();
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    render(<LogoutButton />, { wrapper: createWrapper() });

    const logoutButton = screen.getByRole('button', { name: /log out/i });
    await user.click(logoutButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('should handle signOut errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock signOut to throw an error
    vi.mocked(supabase.auth.signOut).mockRejectedValue(new Error('Sign out failed'));

    render(<LogoutButton />, { wrapper: createWrapper() });

    const logoutButton = screen.getByRole('button', { name: /log out/i });

    // Should not throw even if signOut fails
    await expect(user.click(logoutButton)).resolves.not.toThrow();

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalledOnce();
    });

    // Should still attempt to navigate even if signOut fails
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    consoleErrorSpy.mockRestore();
  });

  it('should have correct button type', () => {
    render(<LogoutButton />, { wrapper: createWrapper() });

    const logoutButton = screen.getByRole('button', { name: /log out/i });
    expect(logoutButton).toHaveAttribute('type', 'button');
  });

  it('should be accessible with keyboard navigation', async () => {
    const user = userEvent.setup();
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    render(<LogoutButton />, { wrapper: createWrapper() });

    const logoutButton = screen.getByRole('button', { name: /log out/i });

    // Focus the button
    await user.tab();
    expect(logoutButton).toHaveFocus();

    // Activate with Enter key
    await user.keyboard('{Enter}');
    expect(supabase.auth.signOut).toHaveBeenCalledOnce();
  });

  it('should handle multiple rapid clicks gracefully', async () => {
    const user = userEvent.setup();
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    render(<LogoutButton />, { wrapper: createWrapper() });

    const logoutButton = screen.getByRole('button', { name: /log out/i });

    // Click multiple times rapidly
    await user.click(logoutButton);
    await user.click(logoutButton);
    await user.click(logoutButton);

    // Should handle multiple calls gracefully
    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });
});
