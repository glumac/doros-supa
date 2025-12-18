import React, { useEffect, useState } from "react";
import { AiOutlineLogout } from "react-icons/ai";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { getUserProfile, getUserPomodoros } from "../lib/queries";
import { useAuth } from "../contexts/AuthContext";
import Doros from "./Doros";
import Spinner from "./Spinner";
import FollowButton from "./FollowButton";
import { addStyle, removeStyle } from "../utils/styleDefs";
import { User, Doro, DecodedJWT } from "../types/models";

const UserProfile = () => {
  const [user, setUser] = useState<User>();
  const [doros, setDoros] = useState<Doro[]>();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { user: authUser } = useAuth();

  useEffect(() => {
    if (!userId) return;

    getUserProfile(userId).then(({ data, error }) => {
      if (data && !error) {
        setUser(data);
      }
    });
  }, [userId]);

  useEffect(() => {
    getDoros();
  }, [userId]);

  const getDoros = async () => {
    if (!userId) return;

    const { data, error } = await getUserPomodoros(userId);
    if (data && !error) {
      setDoros(data as unknown as Doro[]);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
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
              src={user?.avatar_url || ''}
              alt="user-pic"
            />
          </div>
          <h1 className=" text-green-700 font-medium text-5xl text-center mt-3">
            {user?.user_name}
          </h1>
          <div className="text-red-600 p-2 flex justify-center items-center gap-3">
            {userId === authUser?.id ? (
              <div>
                <button
                  type="button"
                  className={removeStyle}
                  onClick={() => logout()}
                >
                  Log out
                </button>
              </div>
            ) : (
              <FollowButton userId={userId!} />
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
