import { useContext } from "react";
import DoroContext, { type TimerState } from "../utils/DoroContext";

/**
 * Pause / resume / stop for the running doro. Moved out of CreateDoro unchanged so the
 * desktop tray can use the same handlers from any page.
 */
export function useTimerControls() {
  const { task, launchAt, timeLeft, setIsPaused, setInProgress, setIsActive, setTimeLeft } =
    useContext(DoroContext);

  const pauseTimer = () => {
    const currentTimeLeft = timeLeft;
    const savedStateStr = localStorage.getItem("timerState");
    const originalDuration = savedStateStr
      ? JSON.parse(savedStateStr).originalDuration
      : 0;

    const timerState: TimerState = {
      task, // Ensure task is saved
      launchAt: launchAt || "", // Ensure launchAt is saved
      pausedTimeLeft: currentTimeLeft || undefined,
      isPaused: true,
      originalDuration,
    };

    localStorage.setItem("timerState", JSON.stringify(timerState));
    setIsPaused(true);
  };

  const resumeTimer = () => {
    const endTime = Date.now() + (timeLeft || 0);
    const savedStateStr = localStorage.getItem("timerState");
    const originalDuration = savedStateStr
      ? JSON.parse(savedStateStr).originalDuration
      : 0;

    const timerState: TimerState = {
      task, // Ensure task is saved
      launchAt: launchAt || "", // Ensure launchAt is saved
      endTime,
      isPaused: false,
      originalDuration,
    };

    localStorage.setItem("timerState", JSON.stringify(timerState));
    setIsPaused(false);
  };

  const stopTimer = () => {
    localStorage.removeItem("timerState");
    console.log("stopping timer");
    setInProgress(false);
    setIsActive(false);
    setIsPaused(false);
    setTimeLeft(null);
  };

  return { pauseTimer, resumeTimer, stopTimer };
}
