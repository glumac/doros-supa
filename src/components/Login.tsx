import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import tomatoes from "../assets/tomatoes.jpg";
import { supabase } from "../lib/supabaseClient";

const Login = () => {
  const [showingWhatIs, setShowingWhatIs] = useState(false);
  const [showingWhatIs2, setShowingWhatIs2] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

            <div className="cq-login-button-container shadow-2xl">
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
                  Crush Quest is a social Pomodoro app (think... Strava for productivity). Here, FOM (Friends of Mike) support
                  each other as we make our 2026 dreams come true.
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
