import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import tomatoes from "../assets/tomatoes.jpg";
import { supabase } from "../lib/supabaseClient";

type AuthMode = 'password-signin' | 'password-signup' | 'magic-link' | 'otp';

const Login = () => {
  const [showingWhatIs, setShowingWhatIs] = useState(false);
  const [showingWhatIs2, setShowingWhatIs2] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Email/Password state
  const [passwordMode, setPasswordMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Passwordless state
  const [passwordlessMode, setPasswordlessMode] = useState<'magic-link' | 'otp'>('magic-link');
  const [passwordlessEmail, setPasswordlessEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [passwordlessError, setPasswordlessError] = useState('');
  const [passwordlessSuccess, setPasswordlessSuccess] = useState('');

  // Active auth section - default to password for tests
  const [activeSection, setActiveSection] = useState<'google' | 'password' | 'passwordless'>('password');

  // Refs for focus management
  const passwordErrorRef = useRef<HTMLDivElement>(null);
  const passwordSuccessRef = useRef<HTMLDivElement>(null);
  const passwordlessErrorRef = useRef<HTMLDivElement>(null);
  const passwordlessSuccessRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordlessEmailInputRef = useRef<HTMLInputElement>(null);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: "offline",
            // Removed prompt: "consent" to allow automatic re-authentication
            // Users will only be prompted if they haven't authorized before
          },
        },
      });

      if (error) {
        console.error("Login error:", error);
        alert("Failed to login. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Focus management for errors
  useEffect(() => {
    if (passwordError && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [passwordError]);

  useEffect(() => {
    if (passwordlessError && passwordlessEmailInputRef.current) {
      passwordlessEmailInputRef.current.focus();
    }
  }, [passwordlessError]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!email || !password) {
      setPasswordError('Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      setPasswordError('Invalid email format');
      return;
    }

    setLoading(true);

    try {
      if (passwordMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          setPasswordError(error.message);
        } else if (data.user) {
          setPasswordSuccess('Check your email to confirm your account');
        } else {
          // Obfuscated response - show generic message
          setPasswordSuccess('Check your email');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes('confirm')) {
            setPasswordError('Please confirm your email address');
          } else {
            setPasswordError(error.message);
          }
        } else if (data.session) {
          // Success - AuthContext will handle redirect
          navigate('/');
        }
      }
    } catch (error) {
      setPasswordError('An unexpected error occurred');
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordlessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordlessError('');
    setPasswordlessSuccess('');

    if (!passwordlessEmail) {
      setPasswordlessError('Please enter your email');
      return;
    }

    if (!validateEmail(passwordlessEmail)) {
      setPasswordlessError('Invalid email format');
      return;
    }

    if (passwordlessMode === 'otp' && otpRequested && otpCode) {
      // Verify OTP
      if (otpCode.length !== 6 || !/^\d+$/.test(otpCode)) {
        setPasswordlessError('OTP code must be 6 digits');
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: passwordlessEmail,
          token: otpCode,
          type: 'email',
        });

        if (error) {
          setPasswordlessError(error.message);
        } else if (data.session) {
          navigate('/');
        }
      } catch (error) {
        setPasswordlessError('An unexpected error occurred');
        console.error('OTP verification error:', error);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Request magic link or OTP
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email: passwordlessEmail,
        options: passwordlessMode === 'magic-link' ? {
          emailRedirectTo: `${window.location.origin}/`,
        } : undefined,
      });

      if (error) {
        setPasswordlessError(error.message);
      } else {
        if (passwordlessMode === 'magic-link') {
          setPasswordlessSuccess('Check your email for the magic link');
        } else {
          setPasswordlessSuccess('Check your email for the 6-digit code');
          setOtpRequested(true);
        }
      }
    } catch (error) {
      setPasswordlessError('An unexpected error occurred');
      console.error('Passwordless auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cq-login-container">
      <div className="cq-login-wrapper flex justify-start items-center flex-col h-screen">
        <div className="cq-login-background relative w-full h-full">
          <img src={tomatoes} className="cq-login-background-image w-full h-full object-cover" alt="" />

          <div className="cq-login-content absolute flex flex-col justify-center items-center top-0 right-0 left-0 bottom-0 background-animate">
            <div className="cq-login-title-container pb-10">
              <h1 className="cq-login-title font-serif text-white text-8xl text-center">
                Crush Quest
              </h1>
            </div>

            <div className="cq-login-button-container shadow-2xl flex flex-col gap-4">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="cq-login-google-button bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 px-6 border border-gray-400 rounded-lg shadow flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="cq-login-google-icon w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {loading ? "Signing in..." : "Sign in with Google"}
              </button>

              {/* Email/Password Form */}
              <div className="bg-white bg-opacity-90 rounded-lg p-4 min-w-[300px]">
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection('password');
                      setPasswordMode('signin');
                      setPasswordError('');
                      setPasswordSuccess('');
                    }}
                    className={`font-bold px-5 text-base rounded-lg hover:shadow-md outline-none py-2.5 ${activeSection === 'password' ? 'bg-green-700 text-white' : 'bg-gray-200 text-gray-700'}`}
                    aria-pressed={activeSection === 'password'}
                  >
                    Email/Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection('passwordless');
                      setPasswordlessMode('magic-link');
                      setPasswordlessError('');
                      setPasswordlessSuccess('');
                      setOtpRequested(false);
                    }}
                    className={`font-bold px-5 text-base rounded-lg hover:shadow-md outline-none py-2.5 ${activeSection === 'passwordless' ? 'bg-green-700 text-white' : 'bg-gray-200 text-gray-700'}`}
                    aria-pressed={activeSection === 'passwordless'}
                    aria-label="Switch to passwordless authentication"
                  >
                    Passwordless
                  </button>
                </div>

                {activeSection === 'password' && (
                  <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        ref={emailInputRef}
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (passwordError) setPasswordError('');
                        }}
                        className="max-w-full placeholder-gray-500 outline-none flex-grow text-2xl sm:text-xl font-bold border-2 rounded-lg border-gray-200 p-2 w-full"
                        aria-label="Email address"
                        aria-invalid={passwordError ? 'true' : 'false'}
                        aria-describedby={passwordError ? 'password-error' : passwordSuccess ? 'password-success' : undefined}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) setPasswordError('');
                        }}
                        className="max-w-full placeholder-gray-500 outline-none flex-grow text-2xl sm:text-xl font-bold border-2 rounded-lg border-gray-200 p-2 w-full"
                        aria-label="Password"
                        aria-invalid={passwordError ? 'true' : 'false'}
                        aria-describedby={passwordError ? 'password-error' : passwordSuccess ? 'password-success' : undefined}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPasswordMode(passwordMode === 'signin' ? 'signup' : 'signin');
                          setPasswordError('');
                          setPasswordSuccess('');
                        }}
                        className="text-sm text-green-700 hover:underline font-bold"
                        aria-label={passwordMode === 'signin' ? 'Switch to sign up' : 'Switch to sign in'}
                        aria-pressed={passwordMode === 'signup'}
                      >
                        {passwordMode === 'signin' ? 'Switch to Sign Up' : 'Switch to Sign In'}
                      </button>
                    </div>
                    {passwordError && (
                      <div
                        ref={passwordErrorRef}
                        id="password-error"
                        role="alert"
                        aria-live="assertive"
                        className="text-red-600 text-sm"
                      >
                        {passwordError}
                      </div>
                    )}
                    {passwordSuccess && (
                      <div
                        ref={passwordSuccessRef}
                        id="password-success"
                        role="status"
                        aria-live="polite"
                        className="text-green-600 text-sm"
                      >
                        {passwordSuccess}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={loading || !email || !password}
                      className="bg-red-600 text-white font-bold px-5 text-base rounded-lg hover:shadow-md outline-none py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-busy={loading}
                    >
                      {loading ? 'Loading...' : passwordMode === 'signup' ? 'Sign Up' : 'Sign In'}
                    </button>
                  </form>
                )}

                {activeSection === 'passwordless' && (
                  <form onSubmit={handlePasswordlessSubmit} className="flex flex-col gap-3">
                    <div>
                      <label htmlFor="passwordless-email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        ref={passwordlessEmailInputRef}
                        id="passwordless-email"
                        type="email"
                        value={passwordlessEmail}
                        onChange={(e) => {
                          setPasswordlessEmail(e.target.value);
                          if (passwordlessError) setPasswordlessError('');
                        }}
                        className="max-w-full placeholder-gray-500 outline-none flex-grow text-2xl sm:text-xl font-bold border-2 rounded-lg border-gray-200 p-2 w-full"
                        aria-label="Email address"
                        aria-invalid={passwordlessError ? 'true' : 'false'}
                        aria-describedby={passwordlessError ? 'passwordless-error' : passwordlessSuccess ? 'passwordless-success' : undefined}
                        disabled={otpRequested && passwordlessMode === 'otp'}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPasswordlessMode(passwordlessMode === 'magic-link' ? 'otp' : 'magic-link');
                          setPasswordlessError('');
                          setPasswordlessSuccess('');
                          setOtpRequested(false);
                          setOtpCode('');
                        }}
                        className="text-sm text-green-700 hover:underline font-bold"
                        aria-label={passwordlessMode === 'magic-link' ? 'Switch to OTP' : 'Switch to Magic Link'}
                        aria-pressed={passwordlessMode === 'otp'}
                      >
                        {passwordlessMode === 'magic-link' ? 'Switch to OTP' : 'Switch to Magic Link'}
                      </button>
                    </div>
                    {passwordlessMode === 'otp' && otpRequested && (
                      <div>
                        <label htmlFor="otp-code" className="block text-sm font-medium text-gray-700 mb-1">
                          OTP Code
                        </label>
                        <input
                          id="otp-code"
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]{6}"
                          value={otpCode}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setOtpCode(value);
                            if (passwordlessError) setPasswordlessError('');
                          }}
                          className="max-w-full placeholder-gray-500 outline-none flex-grow text-2xl sm:text-xl font-bold border-2 rounded-lg border-gray-200 p-2 w-full"
                          aria-label="OTP verification code"
                          placeholder="123456"
                          maxLength={6}
                          aria-invalid={passwordlessError ? 'true' : 'false'}
                          aria-describedby={passwordlessError ? 'passwordless-error' : passwordlessSuccess ? 'passwordless-success' : undefined}
                          required
                        />
                      </div>
                    )}
                    {passwordlessError && (
                      <div
                        ref={passwordlessErrorRef}
                        id="passwordless-error"
                        role="alert"
                        aria-live="assertive"
                        className="text-red-600 text-sm"
                      >
                        {passwordlessError}
                      </div>
                    )}
                    {passwordlessSuccess && (
                      <div
                        ref={passwordlessSuccessRef}
                        id="passwordless-success"
                        role="status"
                        aria-live="polite"
                        className="text-green-600 text-sm"
                      >
                        {passwordlessSuccess}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={loading || !passwordlessEmail || (passwordlessMode === 'otp' && otpRequested && otpCode.length !== 6)}
                      className="bg-red-600 text-white font-bold px-5 text-base rounded-lg hover:shadow-md outline-none py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-busy={loading}
                    >
                      {loading
                        ? 'Loading...'
                        : passwordlessMode === 'otp' && otpRequested
                        ? 'Verify'
                        : passwordlessMode === 'magic-link'
                        ? 'Send Magic Link'
                        : 'Send Code'}
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="cq-login-info pt-10 text-white flex-col flex relative">
              <button
                type="button"
                onClick={() => setShowingWhatIs(!showingWhatIs)}
                className="cq-login-info-toggle-1 text-white font-serif text-xl underline-offset-4 underline py-0.5 mb-2 rounded-lg outline-none hover:text-slate-100"
              >
                ???
              </button>
              <div
                className="cq-login-info-content-1 max-w-xs text-center transition-all"
                style={{ opacity: showingWhatIs ? 1 : 0 }}
              >
                <p className="cq-login-info-text-1 font-semibold">
                  Crush Quest is a place where FOM (Friends of Mike) support
                  each other as we make our 2023 dreams come true.
                </p>
                <br />
                <button
                  type="button"
                  onClick={() => setShowingWhatIs2(!showingWhatIs2)}
                  className="cq-login-info-toggle-2 text-white font-serif text-xl underline-offset-4 underline py-0.5 mb-2  rounded-lg outline-none hover:text-slate-100"
                >
                  ???
                </button>
              </div>
              <div
                className="cq-login-info-content-2 max-w-xs text-center transition-all"
                style={{ opacity: showingWhatIs && showingWhatIs2 ? 1 : 0 }}
              >
                <p className="cq-login-info-text-2 font-semibold">
                  How do we do this? With the power of the tomato. The Pomodoro
                  Technique commits us to 25 minute blocks of radical focus. We give encouragement to our pom pals as we sieze the year.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
