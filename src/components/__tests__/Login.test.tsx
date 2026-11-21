import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';
import * as supabaseClient from '../../lib/supabaseClient';
import type { DorosBridge } from '../../types/desktop';

// Mock Supabase
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
    },
  },
}));

const renderLogin = () => {
  return render(
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <Login />
    </BrowserRouter>
  );
};

describe('Login CSS behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial render and visibility', () => {
    it('renders login page with full screen layout', () => {
      const { container } = renderLogin();

      const flexContainer = container.querySelector('.cq-login-wrapper');
      expect(flexContainer).toBeInTheDocument();
      expect(flexContainer).toHaveClass('h-screen');
    });

    it('displays Crush Quest title', () => {
      renderLogin();

      expect(screen.getByText('Crush Quest')).toBeInTheDocument();
      expect(screen.getByText('Crush Quest')).toHaveClass('text-white', 'text-8xl');
    });

    it('displays Google sign in button', () => {
      renderLogin();

      const button = screen.getByRole('button', { name: /sign in with google/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('bg-white', 'hover:bg-gray-100', 'shadow');
    });

    it('displays background image', () => {
      const { container } = renderLogin();

      const image = container.querySelector('.cq-login-background-image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveClass('w-full', 'h-full', 'object-cover');
    });
  });

  describe('interactive button states', () => {
    it('shows enabled button by default', () => {
      renderLogin();

      const button = screen.getByRole('button', { name: /sign in with google/i });
      expect(button).toBeEnabled();
      expect(button).not.toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('shows loading state when signing in', async () => {
      const mockSignIn = vi.fn().mockImplementation(() => new Promise(() => {}));
      vi.mocked(supabaseClient.supabase.auth.signInWithOAuth).mockImplementation(mockSignIn);

      renderLogin();
      const user = userEvent.setup();

      const button = screen.getByRole('button', { name: /sign in with google/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Signing in...')).toBeInTheDocument();
      });
    });

    it('disables button during loading', async () => {
      const mockSignIn = vi.fn().mockImplementation(() => new Promise(() => {}));
      vi.mocked(supabaseClient.supabase.auth.signInWithOAuth).mockImplementation(mockSignIn);

      renderLogin();
      const user = userEvent.setup();

      const button = screen.getByRole('button', { name: /sign in with google/i });
      await user.click(button);

      await waitFor(() => {
        const loadingButton = screen.getByRole('button', { name: /signing in/i });
        expect(loadingButton).toBeDisabled();
        expect(loadingButton).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
      });
    });
  });

  describe('conditional visibility for info sections', () => {
    it('shows the first info section by default and hides the second', () => {
      const { container } = renderLogin();

      expect(
        screen.getByText(/Crush Quest is a social Pomodoro app/i)
      ).toBeVisible();

      const secondInfo = container.querySelector('.cq-login-info-content-2');
      expect(secondInfo).toBeInTheDocument();
      expect(
        screen.getByText(/How do we do this\?/i)
      ).not.toBeVisible();
    });

    it('shows second info section when ??? button clicked', async () => {
      renderLogin();
      const user = userEvent.setup();

      const button = screen.getByRole('button', { name: '???' });
      await user.click(button);

      expect(screen.getByText(/How do we do this\?/i)).toBeVisible();
    });

    it('toggles info visibility with transition classes', async () => {
      const { container } = renderLogin();
      const user = userEvent.setup();

      // Find elements with transition-all class using semantic classname
      const infoContent = container.querySelector('.cq-login-info-content-2');
      expect(infoContent).toBeInTheDocument();
      expect(infoContent).toHaveClass('transition-all');

      const button = screen.getByRole('button', { name: '???' });
      await user.click(button);

      // Info should be visible now
      await waitFor(() => {
        expect(screen.getByText(/How do we do this\?/i)).toBeVisible();
      });
    });
  });

  describe('layout and positioning', () => {
    it('centers content with absolute positioning', () => {
      const { container } = renderLogin();

      const absoluteContainer = container.querySelector('.cq-login-content');
      expect(absoluteContainer).toBeInTheDocument();
      expect(absoluteContainer).toHaveClass('absolute', 'flex', 'flex-col', 'justify-center', 'items-center');
    });

    it('applies shadow to login button', () => {
      renderLogin();

      const buttonContainer = screen.getByRole('button', { name: /sign in with google/i }).parentElement;
      expect(buttonContainer).toHaveClass('shadow-2xl');
    });
  });
});

describe('Login sign-in flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabaseClient.supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: 'https://supabase.example/auth/v1/authorize?provider=google' },
      error: null,
    } as never);
  });

  afterEach(() => {
    delete window.doros;
  });

  it('web: keeps the in-page redirect back to this origin', async () => {
    renderLogin();
    await userEvent.setup().click(screen.getByRole('button', { name: /sign in with google/i }));

    await waitFor(() => {
      expect(supabaseClient.supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: { access_type: 'offline' },
        },
      });
    });
  });

  describe('desktop app (window.doros present)', () => {
    let openExternal: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      openExternal = vi.fn();
      const bridge: DorosBridge = {
        updateTimer: vi.fn(),
        onTrayCommand: vi.fn(() => () => {}),
        openExternal,
        onAuthCallback: vi.fn(() => () => {}),
      };
      window.doros = bridge;
    });

    it('asks Supabase for the OAuth URL with the doros:// redirect, without navigating', async () => {
      renderLogin();
      await userEvent.setup().click(screen.getByRole('button', { name: /sign in with google/i }));

      await waitFor(() => {
        expect(supabaseClient.supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: 'doros://auth-callback',
            skipBrowserRedirect: true,
            queryParams: { access_type: 'offline' },
          },
        });
      });
    });

    it('opens the OAuth URL in the system browser', async () => {
      renderLogin();
      await userEvent.setup().click(screen.getByRole('button', { name: /sign in with google/i }));

      await waitFor(() => {
        expect(openExternal).toHaveBeenCalledWith(
          'https://supabase.example/auth/v1/authorize?provider=google',
        );
      });
    });

    it('shows an error and does not open the browser when Supabase fails', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(supabaseClient.supabase.auth.signInWithOAuth).mockResolvedValue({
        data: { provider: 'google', url: null },
        error: new Error('nope'),
      } as never);

      renderLogin();
      await userEvent.setup().click(screen.getByRole('button', { name: /sign in with google/i }));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to login. Please try again.');
      });
      expect(openExternal).not.toHaveBeenCalled();

      alertSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });
});
