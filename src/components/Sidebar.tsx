import React, { useState, useEffect, useContext } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { client } from "../client";
import { RiHomeFill } from "react-icons/ri";
import { IoIosArrowForward } from "react-icons/io";
import { lastWeek } from "../utils/data";
import { format, previousMonday, nextSunday, isMonday } from "date-fns";
import { GiTomato } from "react-icons/gi";
import DoroContext from "../utils/DoroContext";
import { removeStyle } from "../utils/styleDefs";
import { User, Doro } from "../types/models";

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

    client.fetch<Doro[]>(lastWeek).then((data) => {
      // console.log("data", data);
      setWeekDoros(data);
      setLoading(false);

      // TO DO: not filter by date on the front end
      const users = data.reduce((acc: Record<string, Leader>, curr) => {
        let launchAt = new Date(curr.launchAt);
        // console.log("coolDate", launchAt);
        if (launchAt < lastMonday) {
          // console.log("skipping");
        } else {
          // console.log("not skipping");
          const posterId = curr.postedBy?._id;
          if (posterId) {
            if (!acc[posterId]) {
              acc[posterId] = {
                ...curr.postedBy,
                count: 1,
              };
            } else {
              acc[posterId].count++;
            }
          }
        }

        return acc;
      }, {});

      const usersArray = Object.values(users);

      const sortedUsers = usersArray.sort((a, b) => {
        return b.count - a.count;
      });

      // console.log("sortedUsers", sortedUsers);
      doroContext.setLeaderBoard(sortedUsers);
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
            <h3 className="mt-2 px-5 font-semibold text-base 2xl:text-xl">
              This Week's Leaders
            </h3>

            <div>
              {lastMonday && (
                <p className="px-5 text-xs font-bold text-slate-600">
                  {format(lastMonday, "EE M/dd")} -{" "}
                  {format(upcomingSunday, "EE M/dd")}
                </p>
              )}
            </div>
          </div>

          <div>
            {Array.isArray(doroContext?.leaderBoard) &&
              doroContext?.leaderBoard?.slice(0, 10).map((leader) => (
                <Link
                  to={`user-profile/${leader?._id}`}
                  key={leader?._id}
                  onClick={handleCloseSidebar}
                  className="flex gap-2 px-2 py-1 font-bold items-center mx-3 transition text-green-700 hover:text-green-800 transition-all duration-200 ease-in-out"
                >
                  <img
                    src={leader?.image}
                    className="w-8 h-8 rounded-full basis-3"
                    alt="user-profile"
                  />
                  <div className="flex justify-between basis-full">
                    <p>{leader?.userName}</p>
                    <p className="font-medium text-slate-800 ">
                      {leader?.count}
                    </p>
                  </div>
                </Link>
              ))}
          </div>

          {Array.isArray(doroContext?.leaderBoard) &&
            doroContext?.leaderBoard.length === 0 && (
              <div className="text-xs text-center border-2 border-green-200 mx-3 p-2">
                Fresh week!
                <br />
                Be the first to start a doro!
              </div>
            )}
        </div>
      </div>
      {user && (
        <Link
          to={`user-profile/${user?._id}`}
          className="flex my-5 mb-3 gap-2 p-2 items-center bg-white rounded-lg shadow-lg mx-3"
          onClick={handleCloseSidebar}
        >
          <img
            src={user?.image}
            className="w-10 h-10 rounded-full"
            alt="user-profile"
          />
          <p>{user?.userName}</p>
          <IoIosArrowForward />
        </Link>
      )}
    </div>
  );
};

export default Sidebar;
