import React from "react";

export interface TimerState {
  endTime?: number;
  pausedTimeLeft?: number | undefined;
  isPaused: boolean;
  originalDuration: number;
  launchAt: string;
  task: string;
}

export interface DoroContextValue {
  inProgress: boolean;
  setInProgress: React.Dispatch<React.SetStateAction<boolean>>;
  leaderBoard: any[];
  setLeaderBoard: React.Dispatch<React.SetStateAction<any[]>>;
  timerState: TimerState | null;
  setTimerState: React.Dispatch<React.SetStateAction<TimerState | null>>;
  isActive: boolean;
  setIsActive: React.Dispatch<React.SetStateAction<boolean>>;
  isPaused: boolean;
  setIsPaused: React.Dispatch<React.SetStateAction<boolean>>;
  timeLeft: number | null;
  setTimeLeft: React.Dispatch<React.SetStateAction<number | null>>;
  task: string;
  setTask: React.Dispatch<React.SetStateAction<string>>;
  launchAt: string | null;
  setLaunchAt: React.Dispatch<React.SetStateAction<string | null>>;
  completed: boolean;
  setCompleted: React.Dispatch<React.SetStateAction<boolean>>;
}

export const DoroContext = React.createContext<DoroContextValue>({
  inProgress: false,
  setInProgress: () => {},
  leaderBoard: [],
  setLeaderBoard: () => {},
  timerState: null,
  setTimerState: () => {},
  isActive: false,
  setIsActive: () => {},
  isPaused: false,
  setIsPaused: () => {},
  timeLeft: null,
  setTimeLeft: () => {},
  task: '',
  setTask: () => {},
  launchAt: null,
  setLaunchAt: () => {},
  completed: false,
  setCompleted: () => {},
});

export const DoroProvider = DoroContext.Provider;
export default DoroContext;
