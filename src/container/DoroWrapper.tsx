import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import {
  Navbar,
  Feed,
  DoroDetail,
  CreateDoro,
  Search,
  UserSearch,
  LeaderboardTabs,
  TimerBanner
} from "../components";
import type { User } from "../types/supabase";

interface DoroWrapperProps {
  user: User | null;
}

const DoroWrapper = ({ user }: DoroWrapperProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="px-2 md:px-5">
      <TimerBanner />
      <div className="">
        <Navbar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          user={user}
        />
      </div>
      <div className="h-full">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route
            path="/doro-detail/:doroId"
            element={user ? <DoroDetail user={user} /> : <DoroDetail />}
          />
          <Route
            path="/create-doro"
            element={user ? <CreateDoro user={user} /> : <CreateDoro />}
          />
          <Route
            path="/search"
            element={
              <Search searchTerm={searchTerm} />
            }
          />
          <Route
            path="/discover"
            element={<UserSearch />}
          />
          <Route
            path="/leaderboard"
            element={<LeaderboardTabs />}
          />
        </Routes>
      </div>
    </div>
  );
};

export default DoroWrapper;
