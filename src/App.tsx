import { useEffect } from 'react';
import './App.css';
import { Routes, Route, useNavigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import Home from "./container/Home";
import Login from "./components/Login";
import { TocPrivacy } from "./components";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Spinner from "./components/Spinner";
import { queryClient } from "./lib/queryClient";

// Component that handles routing based on auth state
// Must be inside AuthProvider to use useAuth()
function AppRoutes() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for auth to finish loading before checking session
    if (!loading) {
      const publicPaths = ["/login", "/toc-privacy"];
      const isPublicPath = publicPaths.includes(window.location.pathname);

      if (!user && !isPublicPath) {
        navigate("/login");
      } else if (user && window.location.pathname === "/login") {
        // Redirect logged-in users away from login page
        navigate("/");
      }
    }
  }, [user, loading, navigate]);

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
