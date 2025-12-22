import React, { useState, useEffect, useContext } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { getWeeklyLeaderboard } from "../lib/queries";
import { RiHomeFill } from "react-icons/ri";
import { IoIosArrowForward } from "react-icons/io";
import { format, previousMonday, nextSunday, isMonday } from "date-fns";
import { GiTomato } from "react-icons/gi";
import DoroContext from "../utils/DoroContext";
import { removeStyle } from "../utils/styleDefs";
import { User, Doro } from "../types/models";
import CompactLeaderboard from "./CompactLeaderboard";

const isNotActiveStyle =
  "flex items-center px-5 gap-3 text-slate-500 hover:text-green-800 transition-all duration-200 ease-in-out capitalize";
const isActiveStyle =
  "flex items-center px-5 gap-3 font-extrabold border-r-2 border-black  transition-all duration-200 ease-in-out capitalize";

interface SidebarProps {
  closeToggle?: (value: boolean) => void;
  user?: User;
}

interface Leader extends User {
  count: number;
}

const Sidebar = ({ closeToggle, user }: SidebarProps) => {
  const [weekDoros, setWeekDoros] = useState<Doro[]>();
  const [weekLeaders, setWeekLeaders] = useState<Leader[]>();
  const [loading, setLoading] = useState(false);

  const doroContext = useContext(DoroContext);
  const getPreviousMonday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isMonday(today)) {
      return today;
    } else {
      return previousMonday(today);
    }
  };

  const getNextSunday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return nextSunday(getPreviousMonday());
  };

  const lastMonday = getPreviousMonday();
  const upcomingSunday = getNextSunday();
  const onCreateDoroPage = useLocation().pathname === "/create-doro";

  // console.log("getPreviousMonday", lastMondayISO);

  const handleCloseSidebar = () => {
    if (closeToggle) closeToggle(false);
  };

  useEffect(() => {
    setLoading(true);

    getWeeklyLeaderboard(user?._id).then(({ data, error }) => {
      if (data && !error) {
        // Transform Supabase data to match Leader interface
        const leaders = data.map((item: any) => ({
          _id: item.user_id,
          userName: item.user_name,
          image: item.avatar_url,
          count: item.completion_count,
        }));

        doroContext.setLeaderBoard(leaders);
      }
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="flex flex-col justify-between bg-white h-full overflow-y-scroll min-w-210 hide-scrollbar">
      <div className="flex items-center flex-col">
        <Link
          to="/"
          className="flex gap-2 my-6 pt-1 w-190 items-center justify-center"
          onClick={handleCloseSidebar}
        >
          <div className="pb-6 text-center">
            <h1 className="font-serif text-center text-red-600 transition hover:text-red-700 text-6xl">
              Crush Quest
            </h1>
          </div>
        </Link>
        <div className="flex flex-col gap-5">
          <div className="h-8">
            {!onCreateDoroPage && (
              <Link
                to="/create-doro"
                onClick={handleCloseSidebar}
                className="bg-red-600 font-semibold flex gap-2 text-white rounded-lg h-12 px-1 mx-3 md:h-8 flex text-base justify-center items-center transition hover:shadow-md hover:bg-red-700"
              >
                <span>Launch</span>
                <GiTomato />
              </Link>
            )}
          </div>

          <div className="flex justify-center">
            <a
              className={removeStyle}
              target="_blank"
              href="https://todoist.com/productivity-methods/pomodoro-technique"
              rel="noreferrer"
            >
              What is a Pomodoro?
            </a>
          </div>

          <div className="mt-5">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? isActiveStyle : isNotActiveStyle
              }
              onClick={handleCloseSidebar}
            >
              <RiHomeFill />
              Home
            </NavLink>
          </div>

          <div>
            <NavLink
              to="/discover"
              className={({ isActive }) =>
                isActive ? isActiveStyle : isNotActiveStyle
              }
              onClick={handleCloseSidebar}
            >
              🔍 Find Friends
            </NavLink>
          </div>

          <div>
            <h3 className="mt-2 px-5 font-semibold text-base 2xl:text-xl">
              This Week's Leaders
            </h3>

            <div>
              {lastMonday && (
                <p className="px-5 text-xs font-bold text-slate-600 mb-2">
                  {format(lastMonday, "EE M/dd")} -{" "}
                  {format(upcomingSunday, "EE M/dd")}
                </p>
              )}
            </div>
          </div>

          <CompactLeaderboard closeToggle={closeToggle} />
        </div>
      </div>
      {user && (
        <Link
          to={`user/${user?.id}`}
          className="flex my-5 mb-3 gap-2 p-2 items-center bg-white rounded-lg shadow-lg mx-3"
          onClick={handleCloseSidebar}
        >
          <img
            src={user?.avatar_url || ''}
            className="w-10 h-10 rounded-full"
            alt="user-profile"
          />
          <p>{user?.user_name}</p>
          <IoIosArrowForward />
        </Link>
      )}
    </div>
  );
};

export default Sidebar;
