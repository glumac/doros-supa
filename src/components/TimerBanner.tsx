import React, { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GiTomato } from "react-icons/gi";
import DoroContext from "../utils/DoroContext";

const formatTime = (ms: number | null): { minutes: number; seconds: number } => {
  if (!ms) return { minutes: 0, seconds: 0 };
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / 1000 / 60) % 60);

  return {
    minutes,
    seconds,
  };
};

const TimerBanner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isActive, isPaused, timeLeft, task } = useContext(DoroContext);

  // Don't show banner if timer isn't active or we're already on create-doro page
  if (!isActive || location.pathname === "/create-doro") {
    return null;
  }

  const { minutes, seconds } = formatTime(timeLeft);

  return (
    <div
      onClick={() => navigate("/create-doro")}
      className="cq-timer-banner-container bg-red-600 hover:bg-red-700 text-white py-3 px-4 mt-2 mb-4 rounded-lg shadow-lg cursor-pointer transition-all duration-300 transform hover:scale-[1.01]"
    >
      <div className="cq-timer-banner-content flex items-center justify-between max-w-7xl mx-auto">
        <div className="cq-timer-banner-left flex items-center gap-3">
          <GiTomato className="cq-timer-banner-icon text-3xl animate-pulse" />
          <div className="cq-timer-banner-info">
            <div className="cq-timer-banner-status font-semibold text-lg">
              {isPaused ? "Pomodoro Paused" : "Pomodoro in Progress"}
            </div>
            {task && (
              <div className="cq-timer-banner-task text-sm text-red-100">
                {task}
              </div>
            )}
          </div>
        </div>

        <div className="cq-timer-banner-right flex items-center gap-4">
          <div className="cq-timer-banner-time text-3xl font-bold font-mono tracking-wider">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
          <div className="cq-timer-banner-hint text-sm text-red-100 hidden md:block">
            Click to view →
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimerBanner;
