import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useDesktopTimerSync } from "../hooks/useDesktopTimerSync";
import { useTimerControls } from "../hooks/useTimerControls";
import { readSavedTimerTimes, toDesktopTimerState } from "../lib/desktopBridge";
import DoroContext from "../utils/DoroContext";

/**
 * Desktop app only (render it only when isDesktop()): keeps the menu bar tray in sync
 * with the timer and runs tray commands on any page. Renders nothing.
 * Must sit inside the DoroContext provider.
 */
const DesktopTimerSync = () => {
  const { inProgress, isActive, isPaused, task } = useContext(DoroContext);
  const { pauseTimer, resumeTimer, stopTimer } = useTimerControls();
  const navigate = useNavigate();

  const state = toDesktopTimerState({ inProgress, isActive, isPaused, task }, readSavedTimerTimes());
  useDesktopTimerSync(state, {
    pause: pauseTimer,
    resume: resumeTimer,
    stop: stopTimer,
    start: () => navigate("/create-doro"),
  });

  return null;
};

export default DesktopTimerSync;
