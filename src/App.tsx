import { useEffect } from 'react';
import './App.css';
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import Home from "./container/Home";
import Login from "./components/Login";
import RestoreAccount from "./container/RestoreAccount";
import UnsubscribeEmail from "./container/UnsubscribeEmail";
import { TocPrivacy } from "./components";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Spinner from "./components/Spinner";
import { queryClient } from "./lib/queryClient";
import { AdminDashboard } from "./components/AdminDashboard";
import { AdminGuard } from "./components/AdminGuard";

// Component that handles routing based on auth state
// Must be inside AuthProvider to use useAuth()
function AppRoutes() {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Wait for auth to finish loading before checking session
    if (!loading) {
      const publicPaths = ["/login", "/toc-privacy", "/unsubscribe"];
      const isPublicPath = publicPaths.includes(location.pathname);
      const isRestorePath = location.pathname === "/restore-account";

      // Check deleted user redirect FIRST (before login redirect)
      // This prevents a deleted user on /login from being redirected to / then to /restore-account
      if (user && userProfile?.deleted_at && !isRestorePath && !isPublicPath) {
        // Redirect deleted users to restore page
        navigate("/restore-account");
      } else if (user && !userProfile?.deleted_at && isRestorePath) {
        // Redirect non-deleted users away from restore page
        navigate("/");
      } else if (!user && !isPublicPath) {
        // Redirect unauthenticated users to login
        navigate("/login");
      } else if (user && !userProfile?.deleted_at && location.pathname === "/login") {
        // Redirect logged-in (non-deleted) users away from login page
        navigate("/");
      }
    }
  }, [user, userProfile, loading, navigate, location.pathname]);

  // Show loading spinner while checking session
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route path="toc-privacy" element={<TocPrivacy />} />
      <Route path="restore-account" element={<RestoreAccount />} />
      <Route path="unsubscribe" element={<UnsubscribeEmail />} />
      <Route
        path="admin"
        element={
          <AdminGuard>
            <AdminDashboard />
          </AdminGuard>
        }
      />
      <Route path="/*" element={<Home />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
