import { useEffect } from 'react';
import './App.css';
import { Routes, Route, useNavigate } from "react-router-dom";
import Home from "./container/Home";
import Login from "./components/Login";
import { AuthProvider } from "./contexts/AuthContext";
import { supabase } from "./lib/supabaseClient";

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check for Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/login");
      } else {
        // Check for timer in progress
        const pomInProgress = localStorage.getItem("timerState");
        if (pomInProgress) {
          navigate('/create-doro');
        }
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && window.location.pathname !== "/login") {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route path="/*" element={<Home />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
