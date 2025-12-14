import { useEffect } from 'react';
import './App.css';
import { Routes, Route, useNavigate } from "react-router-dom";
import Home from "./container/Home";
import Login from "./components/Login";
import { GoogleOAuthProvider } from "@react-oauth/google";

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const userItem = localStorage.getItem("user");
    const User =
      userItem !== "undefined" && userItem
        ? JSON.parse(userItem)
        : null;

    if (!User) {
      localStorage.clear();
      navigate("/login");
    } else {
      // get pomInProgress from localstorage
      const pomInProgress = localStorage.getItem("timerState");
      console.log("pomInProgress", pomInProgress);

      if (pomInProgress) {
        navigate('/create-doro');
      }
    }
  }, [navigate]);

  return (
      <GoogleOAuthProvider clientId={import.meta.env.REACT_APP_GOOGLE_API_TOKEN as string}>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route path="/*" element={<Home />} />
      </Routes>
    </GoogleOAuthProvider>
  );
}

export default App;
