import React, { useEffect, useState } from "react";
import { AiOutlineLogout } from "react-icons/ai";
import { useParams, useNavigate } from "react-router-dom";
import { googleLogout } from "@react-oauth/google";

import { userCreatedDorosQuery, userQuery } from "../utils/data";
import { client } from "../client";
import Doros from "./Doros";
import Spinner from "./Spinner";
import { addStyle, removeStyle } from "../utils/styleDefs";
import { User, Doro, DecodedJWT } from "../types/models";

const UserProfile = () => {
  const [user, setUser] = useState<User>();
  const [doros, setDoros] = useState<Doro[]>();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();

  const userItem = localStorage.getItem("user");
  const User: DecodedJWT | null =
    userItem && userItem !== "undefined"
      ? JSON.parse(userItem)
      : localStorage.clear();

  useEffect(() => {
    if (!userId) return;

    const query = userQuery(userId);
    client.fetch<User[]>(query).then((data) => {
      console.log("data", data);
      setUser(data[0]);
    });
  }, [userId]);

  useEffect(() => {
    getDoros();
  }, [userId]);

  const getDoros = () => {
    if (!userId) return;

    const createdDorosQuery = userCreatedDorosQuery(userId);

    client.fetch<Doro[]>(createdDorosQuery).then((data) => {
      setDoros(data);
    });
  };

  const logout = () => {
    localStorage.clear();
    googleLogout();
    navigate("/login");
  };

  if (!user) return <Spinner message="Loading profile" />;

  return (
    <div className="relative pb-2 h-full justify-center items-center">
      <div className="flex flex-col pb-5">
        <div className="relative flex flex-col mb-4">
          <div className="flex flex-col justify-center items-center">
            <img
              className=" w-full h-340 2xl:h-510 shadow-lg object-cover"
              src="https://source.unsplash.com/1600x900/?tomato"
              alt="user-pic"
            />
            <img
              className="rounded-full w-20 h-20 -mt-10 shadow-xl object-cover"
              src={user?.image}
              alt="user-pic"
            />
          </div>
          <h1 className=" text-green-700 font-medium text-5xl text-center mt-3">
            {user?.userName}
          </h1>
          <div className="text-red-600 p-2 flex justify-center">
            {userId === User?.sub && (
              <div>
                <button
                  type="button"
                  className={removeStyle}
                  onClick={() => logout()}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="text-center mb-2  font-medium">
          <h3 className="text-xl">Completed Pomodoros:</h3>
        </div>

        <div className="px-2">
          <Doros doros={doros} reloadFeed={getDoros} />
        </div>

        {doros?.length === 0 && (
          <div className="flex justify-center font-bold items-center w-full text-1xl mt-2">
            No Pomodoros Found!
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
