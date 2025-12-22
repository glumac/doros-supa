import { useEffect } from 'react';
import './App.css';
import { Routes, Route, useNavigate } from "react-router-dom";
import Home from "./container/Home";
import Login from "./components/Login";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Spinner from "./components/Spinner";

// Component that handles routing based on auth state
// Must be inside AuthProvider to use useAuth()
function AppRoutes() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for auth to finish loading before checking session
    if (!loading) {
      if (!user && window.location.pathname !== "/login") {
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
      <Route path="/*" element={<Home />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
