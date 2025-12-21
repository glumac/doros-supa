import React, { useEffect, useState } from "react";
import { AiOutlineLogout } from "react-icons/ai";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { getUserProfile, getUserPomodoros, isFollowingUser } from "../lib/queries";
import { useAuth } from "../contexts/AuthContext";
import Doros from "./Doros";
import Spinner from "./Spinner";
import FollowButton from "./FollowButton";
import { addStyle, removeStyle } from "../utils/styleDefs";
import { User, Doro, DecodedJWT } from "../types/models";

const UserProfile = () => {
  const [user, setUser] = useState<User>();
  const [doros, setDoros] = useState<Doro[]>();
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
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

    // Check if current user is following this profile user
    if (authUser?.id && userId !== authUser.id) {
      isFollowingUser(authUser.id, userId).then(({ isFollowing }) => {
        setIsFollowing(isFollowing);
      });
    }
  }, [userId, authUser?.id]);

  useEffect(() => {
    getDoros();
  }, [userId, isFollowing]);

  const getDoros = async () => {
    if (!userId) return;

    const { data, error } = await getUserPomodoros(userId);
    console.log('UserProfile - getDoros:', { userId, data, error, dataLength: data?.length });
    // Set doros even if it's an empty array (which happens when RLS blocks access)
    setDoros((data || []) as unknown as Doro[]);
  };

  const handleFollowChange = (newFollowStatus: boolean) => {
    setIsFollowing(newFollowStatus);
    // Pomodoros will reload automatically due to the useEffect dependency on isFollowing
  };

  console.log('UserProfile render:', {
    userId,
    authUserId: authUser?.id,
    isFollowing,
    dorosLength: doros?.length,
    shouldShowPrompt: userId !== authUser?.id && !isFollowing
  });

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
              className="w-full h-56 2xl:h-80 shadow-lg object-cover"
              src="/tomatoes-header.jpg"
              alt="Profile banner"
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
              <FollowButton userId={userId!} onFollowChange={handleFollowChange} />
            )}
          </div>
        </div>
        <div className="text-center mb-2  font-medium">
          <h3 className="text-xl">Completed Pomodoros:</h3>
        </div>

        <div className="px-2">
          {doros && doros.length > 0 ? (
            <Doros doros={doros} reloadFeed={getDoros} />
          ) : (
            <div className="flex flex-col justify-center items-center w-full text-1xl mt-2">
              {userId !== authUser?.id && !isFollowing ? (
                <>
                  <p className="font-medium text-gray-600 mb-3">
                    Follow {user?.user_name} to see their pomodoros
                  </p>
                </>
              ) : (
                <p className="font-bold">No Pomodoros Found!</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
