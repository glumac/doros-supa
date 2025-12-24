import React from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { RiHomeFill } from "react-icons/ri";
import { IoIosArrowForward } from "react-icons/io";
import { format, previousMonday, nextSunday, isMonday } from "date-fns";
import { GiTomato } from "react-icons/gi";
import { removeStyle } from "../utils/styleDefs";
import { User, Doro } from "../types/models";
import { getAvatarPlaceholder } from "../utils/avatarPlaceholder";
import CompactLeaderboard from "./CompactLeaderboard";

const isNotActiveStyle =
  "flex items-center px-5 gap-3 text-slate-500 hover:text-green-800 transition-all duration-200 ease-in-out capitalize";
const isActiveStyle =
  "flex items-center px-5 gap-3 font-extrabold border-r-2 border-black  transition-all duration-200 ease-in-out capitalize";

interface SidebarProps {
  closeToggle?: (value: boolean) => void;
  user?: User;
}

const Sidebar = ({ closeToggle, user }: SidebarProps) => {
  const onCreateDoroPage = useLocation().pathname === "/create-doro";

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

  const handleCloseSidebar = () => {
    if (closeToggle) closeToggle(false);
  };

  return (
    <div className="cq-sidebar-container flex flex-col justify-between bg-white h-full overflow-y-auto w-fit min-w-210">
      <div className="cq-sidebar-content flex items-center flex-col">
        <Link
          to="/"
          className="cq-sidebar-logo-link flex gap-2 my-6 pt-1 w-190 items-center justify-center"
          onClick={handleCloseSidebar}
        >
          <div className="cq-sidebar-logo pb-6 text-center">
            <h1 className="cq-sidebar-title font-serif text-center text-red-600 transition hover:text-red-700 text-6xl">
              Crush Quest
            </h1>
          </div>
        </Link>
        <div className="cq-sidebar-navigation flex flex-col gap-5">
          <div className="cq-sidebar-launch-button-container h-8">
            {!onCreateDoroPage && (
              <Link
                to="/create-doro"
                onClick={handleCloseSidebar}
                className="cq-sidebar-launch-button bg-red-600 font-semibold flex gap-2 text-white rounded-lg h-12 px-1 mx-3 md:h-8 text-base justify-center items-center transition hover:shadow-md hover:bg-red-700"
              >
                <span>Launch</span>
                <GiTomato />
              </Link>
            )}
          </div>

          <div className="cq-sidebar-info-link-container flex justify-center">
            <a
              className={`cq-sidebar-info-link ${removeStyle}`}
              target="_blank"
              href="https://todoist.com/productivity-methods/pomodoro-technique"
              rel="noreferrer"
            >
              What is a Pomodoro?
            </a>
          </div>

          <div className="cq-sidebar-nav-item mt-5">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? isActiveStyle : isNotActiveStyle
              }
              onClick={handleCloseSidebar}
            >
              <RiHomeFill className="w-5 h-5" />
              Home
            </NavLink>
          </div>

          <div className="cq-sidebar-nav-item">
            <NavLink
              to="/discover"
              className={({ isActive }) =>
                isActive ? isActiveStyle : isNotActiveStyle
              }
              onClick={handleCloseSidebar}
            >
              <span className="w-5 h-5 flex items-center justify-center">🔍</span>
              Find Friends
            </NavLink>
          </div>

          <div className="cq-sidebar-leaderboard-section">
            <h3 className="cq-sidebar-leaderboard-title mt-2 px-5 font-semibold text-base 2xl:text-xl">
              This Week's Leaders
            </h3>

            <div className="cq-sidebar-leaderboard-date">
              {lastMonday && (
                <p className="cq-sidebar-leaderboard-date-text px-5 text-xs font-bold text-slate-600 mb-2">
                  {format(lastMonday, "EE M/dd")} -{" "}
                  {format(upcomingSunday, "EE M/dd")}
                </p>
              )}
            </div>
          </div>

          {closeToggle ? (
            <CompactLeaderboard closeToggle={closeToggle} />
          ) : (
            <CompactLeaderboard />
          )}
        </div>
      </div>
      {user && (
        <Link
          to={`/user/${user?.id}`}
          className="cq-sidebar-profile-link flex my-5 mb-3 gap-2 p-2 items-center bg-white rounded-lg shadow-lg mx-3"
          onClick={handleCloseSidebar}
        >
          <img
            src={user?.avatar_url || getAvatarPlaceholder(40)}
            className="cq-sidebar-profile-avatar w-10 h-10 rounded-full"
            alt="user-profile"
            onError={(e) => {
              (e.target as HTMLImageElement).src = getAvatarPlaceholder(40);
            }}
          />
          <p className="cq-sidebar-profile-name">{user?.user_name}</p>
          <IoIosArrowForward />
        </Link>
      )}
    </div>
  );
};

export default Sidebar;
