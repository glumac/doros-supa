import React, { useState, useRef, useEffect } from "react";
import { HiMenu } from "react-icons/hi";
import { AiFillCloseCircle } from "react-icons/ai";
import { Link, Route, Routes } from "react-router-dom";
import { Sidebar, UserProfile } from "../components";
import DoroWrapper from "./DoroWrapper";
import { DoroProvider } from "../utils/DoroContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

interface SupabaseUser {
  id: string;
  user_name: string;
  avatar_url: string;
  email: string;
}

const Home = () => {
  const [toggleSidebar, setToggleSidebar] = useState(false);
  const [homeInProgress, setHomeInProgress] = useState(false);
  const [homeLeaderBoard, setHomeLeaderBoard] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<SupabaseUser | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user: authUser, loading } = useAuth();

  // Timer state
  const [timerState, setTimerState] = useState<any>(null);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [task, setTask] = useState('');
  const [launchAt, setLaunchAt] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!authUser || loading) return;

    // Fetch user profile from Supabase
    const fetchUserProfile = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (data && !error) {
        setUserProfile(data as SupabaseUser);
      }
    };

    fetchUserProfile();
  }, [authUser, loading]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, []);

  // Initialize timer state from localStorage
  useEffect(() => {
    const savedStateStr = localStorage.getItem("timerState");
    if (savedStateStr) {
      const savedState = JSON.parse(savedStateStr);
      const { endTime, pausedTimeLeft, isPaused: wasPaused, launchAt: savedLaunchAt, task: savedTask } = savedState;

      // Check if timer has expired but wasn't marked as completed
      if (endTime && endTime < Date.now() && !wasPaused) {
        setLaunchAt(savedLaunchAt);
        setTask(savedTask);
        setCompleted(true);
        setHomeInProgress(false);
        return;
      }

      setTimerState(savedState);
      setHomeInProgress(true);
      setLaunchAt(savedLaunchAt);
      setTask(savedTask);

      if (wasPaused && pausedTimeLeft) {
        setTimeLeft(pausedTimeLeft);
        setIsPaused(true);
        setIsActive(true);
      } else if (endTime && endTime > Date.now()) {
        setIsActive(true);
        setIsPaused(false);
        setTimeLeft(endTime - Date.now());
      }
    }
  }, []);

  // Timer countdown interval - runs globally
  useEffect(() => {
    if (!isActive || isPaused) return;

    const interval = setInterval(() => {
      const savedStateStr = localStorage.getItem("timerState");
      if (!savedStateStr) {
        setIsActive(false);
        return;
      }

      const savedState = JSON.parse(savedStateStr);
      if (!savedState.endTime) {
        setIsActive(false);
        return;
      }

      const endTime = parseInt(savedState.endTime.toString());
      const now = Date.now();
      const remaining = endTime - now;

      if (remaining <= 0) {
        setIsActive(false);
        setHomeInProgress(false);
        setCompleted(true);
        // Timer completion logic moved here from CreateDoro
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, isPaused]);

  const contextStuff = {
    inProgress: homeInProgress,
    setInProgress: setHomeInProgress,
    leaderBoard: homeLeaderBoard,
    setLeaderBoard: setHomeLeaderBoard,
    timerState,
    setTimerState,
    isActive,
    setIsActive,
    isPaused,
    setIsPaused,
    timeLeft,
    setTimeLeft,
    task,
    setTask,
    launchAt,
    setLaunchAt,
    completed,
    setCompleted,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  // Create a user object compatible with old components (temporary)
  const user = userProfile ? {
    _id: userProfile.id,
    userName: userProfile.user_name,
    image: userProfile.avatar_url,
  } : null;

  return (
    <div>
      <DoroProvider value={contextStuff}>
        <div className="flex bg-gray-50 back-pattern md:flex-row flex-col h-screen transition-height duration-75 ease-out">
          <div className="hidden md:flex h-screen flex-initial">
            {user ? <Sidebar user={user} /> : <Sidebar />}
          </div>
          <div className="flex md:hidden flex-row bg-white">
            <div className="p-2 w-full flex flex-row justify-between items-center shadow-md">
              <HiMenu
                fontSize={40}
                className="cursor-pointer"
                onClick={() => setToggleSidebar(true)}
              />
              <Link to="/">
                <h1 className="font-serif leading-none relative top-1.5 text-center text-red-600 text-4xl">
                  Crush Quest
                </h1>
              </Link>
              <Link to={`user-profile/${user?._id}`}>
                <img
                  src={user?.image}
                  alt="user-pic"
                  className="w-9 h-9 rounded-full "
                />
              </Link>
            </div>
            {toggleSidebar && (
              <div
                onClick={() => setToggleSidebar(false)}
                className="fixed cursor-pointer w-full bg-slate-300/75 right-0  h-screen overflow-y-auto shadow-md z-10"
              ></div>
            )}
            {toggleSidebar && (
              <div className="fixed w-3/5 bg-white h-screen overflow-y-auto shadow-md z-10 animate-slide-in">
                <div className="absolute w-full flex justify-end items-center p-2">
                  <AiFillCloseCircle
                    fontSize={30}
                    className="cursor-pointer"
                    onClick={() => setToggleSidebar(false)}
                  />
                </div>
                {user ? <Sidebar closeToggle={setToggleSidebar} user={user} /> : <Sidebar closeToggle={setToggleSidebar} />}
              </div>
            )}
          </div>
          <div
            className="pb-2 flex-1 h-screen overflow-y-scroll"
            ref={scrollRef}
          >
            <Routes>
              <Route path="/user-profile/:userId" element={<UserProfile />} />
              <Route path="/*" element={<DoroWrapper user={user} />} />
            </Routes>
          </div>
        </div>
      </DoroProvider>
    </div>
  );
};

export default Home;
