import React from "react";

export interface DoroContextValue {
  inProgress: boolean;
  setInProgress: React.Dispatch<React.SetStateAction<boolean>>;
  leaderBoard: any[];
  setLeaderBoard: React.Dispatch<React.SetStateAction<any[]>>;
}

export const DoroContext = React.createContext<DoroContextValue>({
  inProgress: false,
  setInProgress: () => {},
  leaderBoard: [],
  setLeaderBoard: () => {},
});

export const DoroProvider = DoroContext.Provider;
export default DoroContext;
