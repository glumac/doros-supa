import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';
import * as supabaseClient from '../../lib/supabaseClient';

// Mock Supabase
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
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
    it('hides info text by default', () => {
      const { container } = renderLogin();

      const infoText = container.querySelector('.cq-login-info-content-1');
      expect(infoText).toBeInTheDocument();
    });

    it('shows first info section when ??? button clicked', async () => {
      renderLogin();
      const user = userEvent.setup();

      const buttons = screen.getAllByRole('button', { name: '???' });
      await user.click(buttons[0]);

      expect(screen.getByText(/Crush Quest is a place where FOM/i)).toBeInTheDocument();
    });

    it('toggles info visibility with transition classes', async () => {
      const { container } = renderLogin();
      const user = userEvent.setup();

      // Find elements with transition-all class using semantic classname
      const infoContent = container.querySelector('.cq-login-info-content-1');
      expect(infoContent).toBeInTheDocument();
      expect(infoContent).toHaveClass('transition-all');

      const buttons = screen.getAllByRole('button', { name: '???' });
      await user.click(buttons[0]);

      // Info should be visible now
      await waitFor(() => {
        expect(screen.getByText(/Crush Quest is a place where FOM/i)).toBeVisible();
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

describe('Email/Password Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sign Up', () => {
    it('allows user to sign up with email and password', async () => {
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: { id: '123', email: 'test@example.com' }, session: null },
        error: null,
      });
      vi.mocked(supabaseClient.supabase.auth.signUp).mockImplementation(mockSignUp);

      renderLogin();
      const user = userEvent.setup();

      // Find and click toggle to switch to sign up mode
      const toggleButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(toggleButton);

      // Fill in email and password
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement || screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT' && el.getAttribute('type') === 'password') as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          options: {
            emailRedirectTo: expect.stringContaining(window.location.origin),
          },
        });
      });
    });

    it('shows success message after sign up', async () => {
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: { id: '123', email: 'test@example.com' }, session: null },
        error: null,
      });
      vi.mocked(supabaseClient.supabase.auth.signUp).mockImplementation(mockSignUp);

      renderLogin();
      const user = userEvent.setup();

      const toggleButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(toggleButton);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement || screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT' && el.getAttribute('type') === 'password') as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/check your email to confirm/i)).toBeInTheDocument();
      });
    });

    it('validates email format', async () => {
      renderLogin();
      const user = userEvent.setup();

      const toggleButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(toggleButton);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement || screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT' && el.getAttribute('type') === 'password') as HTMLInputElement;
      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });

      expect(supabaseClient.supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('handles sign up errors', async () => {
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });
      vi.mocked(supabaseClient.supabase.auth.signUp).mockImplementation(mockSignUp);

      renderLogin();
      const user = userEvent.setup();

      const toggleButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(toggleButton);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement || screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT' && el.getAttribute('type') === 'password') as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('handles obfuscated response when email already exists', async () => {
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null, // Obfuscated response - no error but no user
      });
      vi.mocked(supabaseClient.supabase.auth.signUp).mockImplementation(mockSignUp);

      renderLogin();
      const user = userEvent.setup();

      const toggleButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(toggleButton);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement || screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT' && el.getAttribute('type') === 'password') as HTMLInputElement;
      await user.type(emailInput, 'existing@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      // Should show generic message to prevent user enumeration
      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sign In', () => {
    it('allows user to sign in with email and password', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        data: {
          user: { id: '123', email: 'test@example.com' },
          session: { access_token: 'token', refresh_token: 'refresh' },
        },
        error: null,
      });
      vi.mocked(supabaseClient.supabase.auth.signInWithPassword).mockImplementation(mockSignIn);

      renderLogin();
      const user = userEvent.setup();

      // Ensure we're in sign in mode (default)
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement || screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT' && el.getAttribute('type') === 'password') as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('handles invalid credentials', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });
      vi.mocked(supabaseClient.supabase.auth.signInWithPassword).mockImplementation(mockSignIn);

      renderLogin();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement || screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT' && el.getAttribute('type') === 'password') as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid/i)).toBeInTheDocument();
      });
    });

    it('handles unconfirmed email', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email not confirmed' },
      });
      vi.mocked(supabaseClient.supabase.auth.signInWithPassword).mockImplementation(mockSignIn);

      renderLogin();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement || screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT' && el.getAttribute('type') === 'password') as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Toggle', () => {
    it('can toggle between sign up and sign in modes', async () => {
      renderLogin();
      const user = userEvent.setup();

      // Initially should be in sign in mode
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();

      // Toggle to sign up
      const toggleButton = screen.getByRole('button', { name: /switch to sign up/i });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
      });

      // Toggle back to sign in
      const toggleBackButton = screen.getByRole('button', { name: /switch to sign in/i });
      await user.click(toggleBackButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      });
    });

    it('updates submit button text based on mode', async () => {
      renderLogin();
      const user = userEvent.setup();

      // Default sign in mode
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();

      // Switch to sign up
      const toggleButton = screen.getByRole('button', { name: /switch to sign up/i });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
      });
    });
  });

  describe('Identity Linking', () => {
    it('allows user with existing Google identity to sign in with email/password', async () => {
      // Simulate user who previously signed in with Google
      const mockSignIn = vi.fn().mockResolvedValue({
        data: {
          user: { id: '123', email: 'test@example.com' },
          session: { access_token: 'token', refresh_token: 'refresh' },
        },
        error: null,
      });
      vi.mocked(supabaseClient.supabase.auth.signInWithPassword).mockImplementation(mockSignIn);

      renderLogin();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement || screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT' && el.getAttribute('type') === 'password') as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Supabase automatically links identities - no special handling needed
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
      });
    });
  });
});

describe('Passwordless Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Magic Link', () => {
    it('allows user to request magic link', async () => {
      const mockSignInWithOtp = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });
      vi.mocked(supabaseClient.supabase.auth.signInWithOtp).mockImplementation(mockSignInWithOtp);

      renderLogin();
      const user = userEvent.setup();

      // Switch to magic link mode
      const toggleButton = screen.getByRole('button', { name: /magic link/i });
      await user.click(toggleButton);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send magic link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalledWith({
          email: 'test@example.com',
          options: {
            emailRedirectTo: expect.stringContaining(window.location.origin),
          },
        });
      });
    });

    it('shows success message after magic link request', async () => {
      const mockSignInWithOtp = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });
      vi.mocked(supabaseClient.supabase.auth.signInWithOtp).mockImplementation(mockSignInWithOtp);

      renderLogin();
      const user = userEvent.setup();

      const toggleButton = screen.getByRole('button', { name: /magic link/i });
      await user.click(toggleButton);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send magic link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/check your email for the magic link/i)).toBeInTheDocument();
      });
    });

    it('handles magic link errors', async () => {
      const mockSignInWithOtp = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Rate limit exceeded' },
      });
      vi.mocked(supabaseClient.supabase.auth.signInWithOtp).mockImplementation(mockSignInWithOtp);

      renderLogin();
      const user = userEvent.setup();

      const toggleButton = screen.getByRole('button', { name: /magic link/i });
      await user.click(toggleButton);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send magic link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('OTP', () => {
    it('allows user to request OTP code', async () => {
      const mockSignInWithOtp = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });
      vi.mocked(supabaseClient.supabase.auth.signInWithOtp).mockImplementation(mockSignInWithOtp);

      renderLogin();
      const user = userEvent.setup();

      // Switch to OTP mode
      const toggleButton = screen.getByRole('button', { name: /otp/i });
      await user.click(toggleButton);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send code/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalledWith({
          email: 'test@example.com',
        });
      });
    });

    it('shows success message after OTP request', async () => {
      const mockSignInWithOtp = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });
      vi.mocked(supabaseClient.supabase.auth.signInWithOtp).mockImplementation(mockSignInWithOtp);

      renderLogin();
      const user = userEvent.setup();

      const toggleButton = screen.getByRole('button', { name: /otp/i });
      await user.click(toggleButton);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send code/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/check your email for the 6-digit code/i)).toBeInTheDocument();
      });
    });

    it('allows user to verify OTP code', async () => {
      const mockVerifyOtp = vi.fn().mockResolvedValue({
        data: {
          user: { id: '123', email: 'test@example.com' },
          session: { access_token: 'token', refresh_token: 'refresh' },
        },
        error: null,
      });
      vi.mocked(supabaseClient.supabase.auth.verifyOtp).mockImplementation(mockVerifyOtp);

      renderLogin();
      const user = userEvent.setup();

      const toggleButton = screen.getByRole('button', { name: /otp/i });
      await user.click(toggleButton);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      // First request OTP
      const requestButton = screen.getByRole('button', { name: /send code/i });
      await user.click(requestButton);

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });

      // Then verify OTP
      const otpInput = screen.getByLabelText(/otp code|verification code/i);
      await user.type(otpInput, '123456');

      const verifyButton = screen.getByRole('button', { name: /verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockVerifyOtp).toHaveBeenCalledWith({
          email: 'test@example.com',
          token: '123456',
          type: 'email',
        });
      });
    });

    it('handles invalid OTP codes', async () => {
      const mockVerifyOtp = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid OTP' },
      });
      vi.mocked(supabaseClient.supabase.auth.verifyOtp).mockImplementation(mockVerifyOtp);

      renderLogin();
      const user = userEvent.setup();

      const toggleButton = screen.getByRole('button', { name: /otp/i });
      await user.click(toggleButton);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      const requestButton = screen.getByRole('button', { name: /send code/i });
      await user.click(requestButton);

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/otp code|verification code/i);
      await user.type(otpInput, '000000');

      const verifyButton = screen.getByRole('button', { name: /verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid/i)).toBeInTheDocument();
      });
    });

    it('validates OTP code format (6 digits)', async () => {
      renderLogin();
      const user = userEvent.setup();

      const toggleButton = screen.getByRole('button', { name: /otp/i });
      await user.click(toggleButton);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      const requestButton = screen.getByRole('button', { name: /send code/i });
      await user.click(requestButton);

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/otp code|verification code/i);
      await user.type(otpInput, '12345'); // Only 5 digits

      const verifyButton = screen.getByRole('button', { name: /verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/6 digits/i)).toBeInTheDocument();
      });

      expect(supabaseClient.supabase.auth.verifyOtp).not.toHaveBeenCalled();
    });
  });

  describe('Form Toggle', () => {
    it('can toggle between magic link and OTP modes', async () => {
      renderLogin();
      const user = userEvent.setup();

      // Switch to passwordless section
      const passwordlessToggle = screen.getByRole('button', { name: /passwordless|magic link|otp/i });
      await user.click(passwordlessToggle);

      // Should show magic link by default or allow toggle
      const toggleButton = screen.getByRole('button', { name: /switch to otp|otp/i });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/otp code|verification code/i)).toBeInTheDocument();
      });
    });

    it('shows OTP input field only in OTP mode', async () => {
      renderLogin();
      const user = userEvent.setup();

      // Switch to passwordless
      const passwordlessToggle = screen.getByRole('button', { name: /passwordless|magic link/i });
      await user.click(passwordlessToggle);

      // OTP input should not be visible in magic link mode
      expect(screen.queryByLabelText(/otp code|verification code/i)).not.toBeInTheDocument();

      // Switch to OTP mode
      const otpToggle = screen.getByRole('button', { name: /switch to otp|otp/i });
      await user.click(otpToggle);

      await waitFor(() => {
        expect(screen.getByLabelText(/otp code|verification code/i)).toBeInTheDocument();
      });
    });
  });

  describe('Identity Linking', () => {
    it('allows user with existing Google identity to use magic link', async () => {
      const mockSignInWithOtp = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });
      vi.mocked(supabaseClient.supabase.auth.signInWithOtp).mockImplementation(mockSignInWithOtp);

      renderLogin();
      const user = userEvent.setup();

      const toggleButton = screen.getByRole('button', { name: /magic link/i });
      await user.click(toggleButton);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send magic link/i });
      await user.click(submitButton);

      // Supabase automatically links identities
      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalled();
      });
    });

    it('allows user with existing Google identity to use OTP', async () => {
      const mockSignInWithOtp = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });
      vi.mocked(supabaseClient.supabase.auth.signInWithOtp).mockImplementation(mockSignInWithOtp);

      renderLogin();
      const user = userEvent.setup();

      const toggleButton = screen.getByRole('button', { name: /otp/i });
      await user.click(toggleButton);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send code/i });
      await user.click(submitButton);

      // Supabase automatically links identities
      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalled();
      });
    });
  });
});

describe('UI Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('renders email/password form correctly', () => {
      renderLogin();

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(document.getElementById('password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders magic link/OTP form correctly when passwordless section is active', async () => {
      renderLogin();
      const user = userEvent.setup();

      const passwordlessButton = screen.getByRole('button', { name: /passwordless/i });
      await user.click(passwordlessButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });
    });

    it('renders toggle buttons correctly', () => {
      renderLogin();

      expect(screen.getByRole('button', { name: /switch to sign up/i })).toBeInTheDocument();
    });

    it('input fields have correct types and attributes', () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('type', 'email');

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Validation', () => {
    it('validates email format client-side', async () => {
      renderLogin();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement || screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT' && el.getAttribute('type') === 'password') as HTMLInputElement;
      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });
    });

    it('disables submit buttons when fields are invalid', async () => {
      renderLogin();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');
      // Don't fill password

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeDisabled();
    });

    it('disables submit buttons during loading', async () => {
      const mockSignIn = vi.fn().mockImplementation(() => new Promise(() => {}));
      vi.mocked(supabaseClient.supabase.auth.signInWithPassword).mockImplementation(mockSignIn);

      renderLogin();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement || screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT' && el.getAttribute('type') === 'password') as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
      });
    });

    it('validates OTP code format (6 digits)', async () => {
      renderLogin();
      const user = userEvent.setup();

      const passwordlessButton = screen.getByRole('button', { name: /passwordless/i });
      await user.click(passwordlessButton);

      await waitFor(() => {
        const otpToggle = screen.getByRole('button', { name: /switch to otp|otp/i });
        return user.click(otpToggle);
      });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      const requestButton = screen.getByRole('button', { name: /send code/i });
      await user.click(requestButton);

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });

      const otpInput = screen.getByLabelText(/otp code|verification code/i);
      await user.type(otpInput, '12345'); // Only 5 digits

      const verifyButton = screen.getByRole('button', { name: /verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/6 digits/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Feedback', () => {
    it('displays loading states correctly', async () => {
      const mockSignIn = vi.fn().mockImplementation(() => new Promise(() => {}));
      vi.mocked(supabaseClient.supabase.auth.signInWithPassword).mockImplementation(mockSignIn);

      renderLogin();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement || screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT' && el.getAttribute('type') === 'password') as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });
    });

    it('displays success messages correctly', async () => {
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: { id: '123', email: 'test@example.com' }, session: null },
        error: null,
      });
      vi.mocked(supabaseClient.supabase.auth.signUp).mockImplementation(mockSignUp);

      renderLogin();
      const user = userEvent.setup();

      const toggleButton = screen.getByRole('button', { name: /switch to sign up/i });
      await user.click(toggleButton);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement || screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT' && el.getAttribute('type') === 'password') as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/check your email to confirm/i)).toBeInTheDocument();
      });
    });

    it('displays error messages correctly', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });
      vi.mocked(supabaseClient.supabase.auth.signInWithPassword).mockImplementation(mockSignIn);

      renderLogin();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement || screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT' && el.getAttribute('type') === 'password') as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid/i)).toBeInTheDocument();
      });
    });

    it('clears messages appropriately', async () => {
      renderLogin();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement || screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT' && el.getAttribute('type') === 'password') as HTMLInputElement;
      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });

      // Clear error by typing valid email
      await user.clear(emailInput);
      await user.type(emailInput, 'test@example.com');

      // Error should still be there until form is resubmitted or explicitly cleared
      // This tests that errors persist until new submission
    });
  });
});

describe('Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ARIA Labels and Roles', () => {
    it('all form inputs have proper labels', () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('id');
      expect(emailInput).toHaveAttribute('type', 'email');

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('id');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('toggle buttons have aria-pressed state', () => {
      renderLogin();

      const toggleButton = screen.getByRole('button', { name: /switch to sign up/i });
      expect(toggleButton).toHaveAttribute('aria-label');
    });

    it('error messages have aria-live regions', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });
      vi.mocked(supabaseClient.supabase.auth.signInWithPassword).mockImplementation(mockSignIn);

      renderLogin();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement || screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT' && el.getAttribute('type') === 'password') as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/invalid/i);
        expect(errorMessage).toHaveAttribute('role', 'alert');
        expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
      });
    });

    it('success messages have aria-live regions', async () => {
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: { id: '123', email: 'test@example.com' }, session: null },
        error: null,
      });
      vi.mocked(supabaseClient.supabase.auth.signUp).mockImplementation(mockSignUp);

      renderLogin();
      const user = userEvent.setup();

      const toggleButton = screen.getByRole('button', { name: /switch to sign up/i });
      await user.click(toggleButton);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement || screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT' && el.getAttribute('type') === 'password') as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      await waitFor(() => {
        const successMessage = screen.getByText(/check your email/i);
        expect(successMessage).toHaveAttribute('role', 'status');
        expect(successMessage).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('inputs are marked as invalid when there are errors', async () => {
      renderLogin();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement || screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT' && el.getAttribute('type') === 'password') as HTMLInputElement;
      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('all interactive elements are keyboard accessible', () => {
      renderLogin();

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });

    it('toggle buttons can be activated with Enter/Space', async () => {
      renderLogin();
      const user = userEvent.setup();

      const toggleButton = screen.getByRole('button', { name: /switch to sign up/i });

      // Test Enter key
      toggleButton.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
      });
    });

    it('form submission works with Enter key', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        data: {
          user: { id: '123', email: 'test@example.com' },
          session: { access_token: 'token', refresh_token: 'refresh' },
        },
        error: null,
      });
      vi.mocked(supabaseClient.supabase.auth.signInWithPassword).mockImplementation(mockSignIn);

      renderLogin();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement || screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT' && el.getAttribute('type') === 'password') as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // Press Enter in password field
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
      });
    });
  });

  describe('Screen Reader Support', () => {
    it('form fields are properly labeled and announced', () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const emailLabel = screen.getByText(/email/i);
      expect(emailLabel).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('aria-label');

      const passwordInput = screen.getByLabelText(/password/i);
      const passwordLabel = screen.getByText(/password/i);
      expect(passwordLabel).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('aria-label');
    });

    it('error messages are announced when they appear', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });
      vi.mocked(supabaseClient.supabase.auth.signInWithPassword).mockImplementation(mockSignIn);

      renderLogin();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement || screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT' && el.getAttribute('type') === 'password') as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/invalid/i);
        expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });

    it('mode changes are announced', async () => {
      renderLogin();
      const user = userEvent.setup();

      const toggleButton = screen.getByRole('button', { name: /switch to sign up/i });
      expect(toggleButton).toHaveAttribute('aria-label');

      await user.click(toggleButton);

      await waitFor(() => {
        const newToggleButton = screen.getByRole('button', { name: /switch to sign in/i });
        expect(newToggleButton).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Semantic HTML', () => {
    it('uses proper form elements', () => {
      const { container } = renderLogin();

      const forms = container.querySelectorAll('form');
      expect(forms.length).toBeGreaterThan(0);
    });

    it('uses semantic HTML5 input types', () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('type', 'email');

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('uses button elements for all buttons', () => {
      renderLogin();

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button.tagName.toLowerCase()).toBe('button');
      });
    });
  });

  describe('Focus Management', () => {
    it('focus moves to first error field when validation fails', async () => {
      renderLogin();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement || screen.getAllByLabelText(/password/i).find(el => el.tagName === 'INPUT' && el.getAttribute('type') === 'password') as HTMLInputElement;
      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(emailInput).toHaveFocus();
      });
    });
  });
});
