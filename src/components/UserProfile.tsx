import React, { useEffect, useState } from "react";
import { AiOutlineLogout } from "react-icons/ai";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  getUserProfile,
  getUserPomodoros,
  isFollowingUser,
  getFollowers,
  getFollowing,
  getPendingFollowRequests,
  approveFollowRequest,
  rejectFollowRequest,
} from "../lib/queries";
import { useAuth } from "../contexts/AuthContext";
import Doros from "./Doros";
import Spinner from "./Spinner";
import FollowButton from "./FollowButton";
import Pagination from "./Pagination";
import FollowersModal from "./FollowersModal";
import { addStyle, removeStyle } from "../utils/styleDefs";
import { User, Doro, DecodedJWT } from "../types/models";

const UserProfile = () => {
  const [user, setUser] = useState<User>();
  const [doros, setDoros] = useState<Doro[]>();
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPomodoros, setTotalPomodoros] = useState<number>(0);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(false);
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [modalTab, setModalTab] = useState<'followers' | 'following'>('followers');
  const [followRequests, setFollowRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { user: authUser } = useAuth();
  const [searchParams] = useSearchParams();
  const pageSize = 20;

  useEffect(() => {
    if (!userId) return;

    getUserProfile(userId).then(({ data, error }) => {
      if (data && !error) {
        setUser(data);
      }
    });

    // Load followers and following counts
    getFollowers(userId).then(({ data }) => {
      setFollowerCount(data?.length || 0);
    });
    getFollowing(userId).then(({ data }) => {
      setFollowingCount(data?.length || 0);
    });

    // Load follow requests if viewing own profile
    if (authUser?.id === userId) {
      loadFollowRequests();
    }

    // Check if current user is following this profile user
    if (authUser?.id && userId !== authUser.id) {
      isFollowingUser(authUser.id, userId).then(({ isFollowing }) => {
        setIsFollowing(isFollowing);
      });
    }

    // Check for tab parameter in URL
    const tab = searchParams.get('tab');
    if (tab === 'requests' && authUser?.id === userId) {
      // Scroll to requests section
      setTimeout(() => {
        document.getElementById('follow-requests')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  }, [userId, authUser?.id, searchParams]);

  const loadFollowRequests = async () => {
    if (!userId) return;
    setLoadingRequests(true);
    try {
      const { data } = await getPendingFollowRequests(userId);
      setFollowRequests(data || []);
    } catch (error) {
      console.error('Error loading follow requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    if (!authUser) return;
    const { error } = await approveFollowRequest(requestId, authUser.id);
    if (!error) {
      loadFollowRequests();
      // Refresh follower count
      getFollowers(userId!).then(({ data }) => {
        setFollowerCount(data?.length || 0);
      });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!authUser) return;
    const { error } = await rejectFollowRequest(requestId, authUser.id);
    if (!error) {
      loadFollowRequests();
    }
  };

  const openFollowersModal = (tab: 'followers' | 'following') => {
    setModalTab(tab);
    setShowFollowersModal(true);
  };

  useEffect(() => {
    setCurrentPage(1);
    getDoros(1);
  }, [userId, isFollowing]);

  const getDoros = async (page: number = 1) => {
    if (!userId) return;

    setIsLoadingPage(true);
    const { data, error, count } = await getUserPomodoros(userId, page, pageSize);
    console.log('UserProfile - getDoros:', {
      userId, data, error,
      dataLength: data?.length,
      count, page
    });
    // Set doros even if it's an empty array (which happens when RLS blocks access)
    setDoros((data || []) as unknown as Doro[]);
    setTotalPomodoros(count || 0);
    setIsLoadingPage(false);
  };

  const handleFollowChange = (newFollowStatus: boolean) => {
    setIsFollowing(newFollowStatus);
    // Pomodoros will reload automatically due to the useEffect dependency on isFollowing
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    getDoros(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(totalPomodoros / pageSize);

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

          {/* Followers/Following Stats */}
          <div className="flex justify-center gap-6 mt-3 mb-2">
            <button
              onClick={() => openFollowersModal('followers')}
              className="text-center hover:underline cursor-pointer"
            >
              <div className="font-bold text-lg">{followerCount}</div>
              <div className="text-gray-600 text-sm">Followers</div>
            </button>
            <button
              onClick={() => openFollowersModal('following')}
              className="text-center hover:underline cursor-pointer"
            >
              <div className="font-bold text-lg">{followingCount}</div>
              <div className="text-gray-600 text-sm">Following</div>
            </button>
          </div>

          <div className="text-red-600 p-2 flex justify-center items-center gap-3">
            {userId === authUser?.id ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full font-semibold hover:bg-gray-300 transition"
                  onClick={() => navigate('/privacy-settings')}
                >
                  Privacy Settings
                </button>
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

          {/* Follow Requests Section (only for own profile) */}
          {userId === authUser?.id && followRequests.length > 0 && (
            <div id="follow-requests" className="mt-4 mx-4">
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="font-bold text-lg mb-3">
                  Follow Requests ({followRequests.length})
                </h3>
                {loadingRequests ? (
                  <div className="text-gray-600 text-center py-2">Loading...</div>
                ) : (
                  <div className="space-y-3">
                    {followRequests.map((request: any) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between gap-3 p-2 border-b last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              request.users?.avatar_url ||
                              `https://ui-avatars.com/api/?name=${request.users?.user_name}&background=007bff&color=fff`
                            }
                            alt={request.users?.user_name}
                            className="w-10 h-10 rounded-full"
                          />
                          <span className="font-medium">
                            {request.users?.user_name}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveRequest(request.id)}
                            className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-semibold hover:bg-blue-600 transition"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-semibold hover:bg-gray-300 transition"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="text-center mb-2  font-medium">
          <h3 className="text-xl">Completed Pomodoros:</h3>
        </div>

        <div className="px-2">
          {doros && doros.length > 0 && totalPomodoros > 0 && (
            <div className="text-center text-gray-600 text-sm mb-3">
              Showing {((currentPage - 1) * pageSize) + 1}–
              {Math.min(currentPage * pageSize, totalPomodoros)} of {totalPomodoros} pomodoros
            </div>
          )}

          {isLoadingPage ? (
            <Spinner message="Loading pomodoros..." />
          ) : doros && doros.length > 0 ? (
            <>
              <Doros doros={doros} reloadFeed={() => getDoros(currentPage)} />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                isLoading={isLoadingPage}
              />
            </>
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

      {/* Followers Modal */}
      {showFollowersModal && user && (
        <FollowersModal
          userId={userId!}
          userName={user.user_name}
          initialTab={modalTab}
          onClose={() => setShowFollowersModal(false)}
        />
      )}
    </div>
  );
};

export default UserProfile;
