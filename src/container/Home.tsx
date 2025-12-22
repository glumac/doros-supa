import React, { useState, useRef, useEffect, useMemo } from "react";
import { HiMenu } from "react-icons/hi";
import { AiFillCloseCircle } from "react-icons/ai";
import { Link, Route, Routes } from "react-router-dom";
import { Sidebar, UserProfile, FollowRequestsBanner, PrivacySettings } from "../components";
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
  const authContext = useAuth();
  const { user: authUser, loading } = authContext;

  // Track if auth context reference changes
  const prevAuthContext = React.useRef(authContext);
  if (prevAuthContext.current !== authContext) {
    console.log('🔄 AuthContext changed!', {
      oldUser: prevAuthContext.current.user?.id,
      newUser: authContext.user?.id,
      oldLoading: prevAuthContext.current.loading,
      newLoading: authContext.loading,
    });
    prevAuthContext.current = authContext;
  }

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
  // Only updates state when absolutely necessary to minimize re-renders
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
      } else {
        // Only update timeLeft (which triggers re-render) if the component needs it
        // TimerBanner and CreateDoro will read from localStorage or context
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, isPaused]);

  // Create a user object compatible with old components (temporary)
  // Use useMemo to prevent recreating the object on every render
  const user = useMemo(() => {
    return userProfile ? {
      _id: userProfile.id,
      userName: userProfile.user_name,
      image: userProfile.avatar_url,
    } : null;
  }, [userProfile?.id, userProfile?.user_name, userProfile?.avatar_url]);

  // Memoize context object to prevent unnecessary re-renders
  const contextStuff = useMemo(() => ({
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
  }), [
    homeInProgress,
    homeLeaderBoard,
    timerState,
    isActive,
    isPaused,
    timeLeft,
    task,
    launchAt,
    completed,
  ]);

  // Track if contextStuff reference changes
  const prevContextStuff = React.useRef(contextStuff);
  if (prevContextStuff.current !== contextStuff) {
    console.log('🔄 contextStuff CHANGED (this is expected when dependencies change)');
    prevContextStuff.current = contextStuff;
  }

  // Debug: Track what's causing re-renders
  const renderCount = React.useRef(0);
  const prevState = React.useRef<any>({});
  renderCount.current++;

  const currentState = {
    isActive,
    isPaused,
    timeLeft,
    homeInProgress,
    authUserId: authUser?.id,
    userProfileId: userProfile?.id,
    toggleSidebar,
    homeLeaderBoard: homeLeaderBoard.length,
    timerState,
    task,
    launchAt,
    completed,
  };

  if (renderCount.current > 1) {
    const changes: string[] = [];
    Object.keys(currentState).forEach((key) => {
      if (prevState.current[key] !== (currentState as any)[key]) {
        changes.push(`${key}: ${JSON.stringify(prevState.current[key])} → ${JSON.stringify((currentState as any)[key])}`);
      }
    });

    if (changes.length > 0) {
      console.log(`🔄 Home render #${renderCount.current}:`, changes);
    } else {
      console.log(`🔄 Home render #${renderCount.current}: No state changes (context or props changed)`);
    }
  }

  prevState.current = currentState;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex bg-gray-50 back-pattern md:flex-row flex-col h-screen transition-height duration-75 ease-out">
        <DoroProvider value={contextStuff}>
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
              <Link to={`user/${user?._id}`}>
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
        </DoroProvider>
        <div
          className="pb-2 flex-1 h-screen overflow-y-scroll"
          ref={scrollRef}
        >
          <FollowRequestsBanner />
          <Routes>
            <Route path="/user/:userId" element={<UserProfile />} />
            <Route path="/privacy-settings" element={<PrivacySettings />} />
            <Route path="/*" element={
              <DoroProvider value={contextStuff}>
                <DoroWrapper user={user} />
              </DoroProvider>
            } />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Home;
