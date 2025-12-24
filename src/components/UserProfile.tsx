import React, { useEffect, useState } from "react";
import { AiOutlineLogout } from "react-icons/ai";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import {
  approveFollowRequest,
  rejectFollowRequest,
  blockUser,
} from "../lib/queries";
import { useAuth } from "../contexts/AuthContext";
import {
  useUserProfile,
  useUserPomodoros,
  useFollowers,
  useFollowing,
  usePendingFollowRequests,
} from "../hooks/useUserProfile";
import { useApproveFollowRequestMutation, useRejectFollowRequestMutation, useBlockUserMutation } from "../hooks/useMutations";
import { useIsFollowingUser } from "../hooks/useFollowStatus";
import { useBlockStatus } from "../hooks/useFollowStatus";
import Doros from "./Doros";
import Spinner from "./Spinner";
import FollowButton from "./FollowButton";
import BlockButton from "./BlockButton";
import Pagination from "./Pagination";
import FollowersModal from "./FollowersModal";
import { addStyle, removeStyle } from "../utils/styleDefs";
import { User, Doro, DecodedJWT } from "../types/models";
import { getAvatarPlaceholder } from "../utils/avatarPlaceholder";

const UserProfile = () => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [modalTab, setModalTab] = useState<'followers' | 'following'>('followers');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userId } = useParams<{ userId: string }>();
  const { user: authUser, userProfile: authUserProfile, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const pageSize = 20;

  // Use React Query hooks
  const { data: user, isLoading: isLoadingProfile } = useUserProfile(
    authUser?.id === userId ? undefined : userId
  );
  const { data: pomodorosData, isLoading: isLoadingPage } = useUserPomodoros(userId, currentPage, pageSize, authUser?.id);
  const { data: followers = [] } = useFollowers(userId);
  const { data: following = [] } = useFollowing(userId);
  const { data: followRequests = [], isLoading: loadingRequests } = usePendingFollowRequests(
    authUser?.id === userId ? userId : undefined
  );

  const doros = pomodorosData?.data || [];
  const totalPomodoros = pomodorosData?.count || 0;
  const followerCount = followers.length;
  const followingCount = following.length;

  // Use mutation hooks
  const approveMutation = useApproveFollowRequestMutation();
  const rejectMutation = useRejectFollowRequestMutation();
  const blockMutation = useBlockUserMutation();

  // Extract the tab param to avoid searchParams object reference changes
  const tabParam = searchParams.get('tab');

  // Use authUserProfile when viewing own profile
  const displayUser = authUser?.id === userId ? (authUserProfile as User) : user;

  useEffect(() => {
    if (!userId) return;

    // Wait for auth to finish loading before making decisions
    if (authLoading) {
      return;
    }

    // Check for tab parameter in URL
    if (tabParam === 'requests' && authUser?.id === userId) {
      // Scroll to requests section
      setTimeout(() => {
        document.getElementById('follow-requests')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  }, [userId, authUser?.id, authLoading, tabParam]);

  const { data: isFollowing = false } = useIsFollowingUser(authUser?.id, userId);
  const { data: blockStatus } = useBlockStatus(authUser?.id, userId);
  const iBlocked = !!blockStatus?.iBlocked;

  const handleApproveRequest = async (requestId: string) => {
    if (!authUser) return;
    approveMutation.mutate(
      { requestId, userId: authUser.id },
      {
        onSuccess: () => {
          // Additional invalidation for followers count
          queryClient.invalidateQueries({ queryKey: ['user', 'followers', userId] });
          // Notify FollowRequestsBanner to refresh
          window.dispatchEvent(new CustomEvent('followRequestUpdated'));
        },
        onError: (error: Error) => {
          alert(`Failed to approve request: ${error.message || 'Unknown error'}`);
        },
      }
    );
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!authUser) return;
    rejectMutation.mutate(
      { requestId, userId: authUser.id },
      {
        onSuccess: () => {
          // Notify FollowRequestsBanner to refresh
          window.dispatchEvent(new CustomEvent('followRequestUpdated'));
        },
        onError: (error: Error) => {
          alert(`Failed to reject request: ${error.message || 'Unknown error'}`);
        },
      }
    );
  };

  const handleBlockRequest = async (requestId: string, requesterId: string, userName?: string) => {
    if (!authUser) return;

    // Confirm before blocking
    if (!confirm(`Are you sure you want to block ${userName || 'this user'}? They will not be able to follow you or see your content.`)) {
      return;
    }

    blockMutation.mutate(
      { blockerId: authUser.id, blockedId: requesterId },
      {
        onSuccess: () => {
          // Additional invalidation for followers count
          queryClient.invalidateQueries({ queryKey: ['user', 'followers', userId] });
          // Notify FollowRequestsBanner to refresh
          window.dispatchEvent(new CustomEvent('followRequestUpdated'));
        },
        onError: (error: Error) => {
          alert(`Failed to block user: ${error.message || 'Unknown error'}`);
        },
      }
    );
  };

  const openFollowersModal = (tab: 'followers' | 'following') => {
    setModalTab(tab);
    setShowFollowersModal(true);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [userId, isFollowing]);

  const handleFollowChange = (newFollowStatus: boolean) => {
    // Pomodoros will reload automatically due to React Query refetch when currentPage resets
    queryClient.invalidateQueries({ queryKey: ["follow", "isFollowing", authUser?.id, userId] });
    queryClient.invalidateQueries({ queryKey: ["user", "followers", userId] });
    queryClient.invalidateQueries({ queryKey: ["user", "following", authUser?.id] });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(totalPomodoros / pageSize);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (isLoadingProfile || !displayUser) return <Spinner message="Loading profile" />;

  return (
    <div className="cq-user-profile-container relative pb-2 h-full justify-center items-center">
      <div className="cq-user-profile-content flex flex-col pb-5">
        <div className="cq-user-profile-header relative flex flex-col mb-4">
          <div className="cq-user-profile-banner-container flex flex-col justify-center items-center">
            <img
              className="cq-user-profile-banner w-full h-56 2xl:h-80 shadow-lg object-cover"
              src="/tomatoes-header.jpg"
              alt="Profile banner"
            />
            <img
              className="cq-user-profile-avatar rounded-full w-20 h-20 -mt-10 shadow-xl object-cover"
              src={displayUser?.avatar_url || getAvatarPlaceholder(80)}
              alt="user-pic"
            />
          </div>
          <h1 className="cq-user-profile-name text-green-700 font-medium text-5xl text-center mt-3">
            {displayUser?.user_name}
          </h1>

          {/* Followers/Following Stats */}
          <div className="cq-user-profile-stats flex justify-center gap-6 mt-3 mb-2">
            <button
              onClick={() => openFollowersModal('followers')}
              className="cq-user-profile-followers-button text-center hover:underline cursor-pointer"
            >
              <div className="cq-user-profile-followers-count font-bold text-lg">{followerCount}</div>
              <div className="cq-user-profile-followers-label text-gray-600 text-sm">Followers</div>
            </button>
            <button
              onClick={() => openFollowersModal('following')}
              className="cq-user-profile-following-button text-center hover:underline cursor-pointer"
            >
              <div className="cq-user-profile-following-count font-bold text-lg">{followingCount}</div>
              <div className="cq-user-profile-following-label text-gray-600 text-sm">Following</div>
            </button>
          </div>

          <div className="cq-user-profile-actions text-red-600 p-2 flex justify-center items-center gap-3">
            {userId === authUser?.id ? (
              <div className="cq-user-profile-own-actions flex gap-2">
                <button
                  type="button"
                  className={`cq-user-profile-privacy-button ${removeStyle}`}
                  onClick={() => navigate('/privacy-settings')}
                >
                  Privacy Settings
                </button>
                <button
                  type="button"
                  className={`cq-user-profile-logout-button ${removeStyle}`}
                  onClick={() => logout()}
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="cq-user-profile-visitor-actions flex gap-2 items-center">
                <FollowButton
                  userId={userId!}
                  initialIsFollowing={isFollowing}
                  onFollowChange={handleFollowChange}
                />
                {!isFollowing && (
                  <BlockButton
                    targetUserId={userId!}
                    targetUserName={displayUser?.user_name}
                    className="cq-user-profile-block-button"
                  />
                )}
              </div>
            )}
          </div>

          {/* Follow Requests Section (only for own profile) */}
          {userId === authUser?.id && followRequests.length > 0 && (
            <div id="follow-requests" className="cq-user-profile-follow-requests-section mt-4 mx-4">
              <div className="cq-user-profile-follow-requests-container bg-white rounded-lg shadow-md p-4">
                <h3 className="cq-user-profile-follow-requests-title font-bold text-lg mb-3">
                  Follow Requests ({followRequests.length})
                </h3>
                {loadingRequests ? (
                  <div className="cq-user-profile-follow-requests-loading text-gray-600 text-center py-2">Loading...</div>
                ) : (
                  <div className="cq-user-profile-follow-requests-list space-y-3">
                    {followRequests.map((request: any) => (
                      <div
                        key={request.id}
                        className="cq-user-profile-follow-request-item flex items-center justify-between gap-3 p-2 border-b last:border-b-0"
                      >
                        <div className="cq-user-profile-follow-request-user flex items-center gap-3">
                          <img
                            src={request.users?.avatar_url || getAvatarPlaceholder(40)}
                            alt={request.users?.user_name}
                            className="cq-user-profile-follow-request-avatar w-10 h-10 rounded-full"
                          />
                          <span className="cq-user-profile-follow-request-name font-medium">
                            {request.users?.user_name}
                          </span>
                        </div>
                        <div className="cq-user-profile-follow-request-actions flex gap-2">
                          <button
                            onClick={() => handleApproveRequest(request.id)}
                            className="cq-user-profile-follow-request-approve-button px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-semibold hover:bg-blue-600 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            className="cq-user-profile-follow-request-reject-button px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-semibold hover:bg-gray-300 transition"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleBlockRequest(request.id, request.requester_id, request.users?.user_name)}
                            className="cq-user-profile-follow-request-block-button px-3 py-1 bg-red-500 text-white rounded-full text-sm font-semibold hover:bg-red-600 transition"
                          >
                            Block
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
        <div className="cq-user-profile-pomodoros-header text-center mb-2 font-medium">
          <h3 className="cq-user-profile-pomodoros-title text-xl">Completed Pomodoros:</h3>
        </div>

        <div className="cq-user-profile-pomodoros-content px-2">
          {userId !== authUser?.id && iBlocked ? (
            <div className="cq-user-profile-blocked-state flex flex-col items-center justify-center text-center bg-white rounded-lg shadow-md p-6 mx-4">
              <div className="cq-user-profile-blocked-title text-lg font-semibold text-gray-800">
                You blocked {displayUser?.user_name}.
              </div>
              <div className="cq-user-profile-blocked-description text-sm text-gray-600 mt-2">
                Unblock to see their content again.
              </div>
              <div className="cq-user-profile-blocked-actions mt-4">
                <BlockButton
                  targetUserId={userId!}
                  targetUserName={displayUser?.user_name}
                />
              </div>
            </div>
          ) : (
            <>
              {doros && doros.length > 0 && totalPomodoros > 0 && (
                <div className="cq-user-profile-pomodoros-count text-center text-gray-600 text-sm mb-3">
                  Showing {((currentPage - 1) * pageSize) + 1}–
                  {Math.min(currentPage * pageSize, totalPomodoros)} of {totalPomodoros} pomodoros
                </div>
              )}

              {isLoadingPage ? (
                <div className="cq-user-profile-pomodoros-loading">
                  <Spinner message="Loading pomodoros..." />
                </div>
              ) : doros && doros.length > 0 ? (
                <>
                  <div className="cq-user-profile-pomodoros-list">
                    <Doros doros={doros as any} />
                  </div>
                  <div className="cq-user-profile-pomodoros-pagination">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      isLoading={isLoadingPage}
                    />
                  </div>
                </>
              ) : (
                <div className="cq-user-profile-pomodoros-empty flex flex-col justify-center items-center w-full text-1xl mt-2">
                  {userId !== authUser?.id && !isFollowing ? (
                    <>
                      <p className="cq-user-profile-pomodoros-empty-message font-medium text-gray-600 mb-3">
                        Follow {displayUser?.user_name} to see their pomodoros
                      </p>
                    </>
                  ) : (
                    <p className="cq-user-profile-pomodoros-empty-message font-bold">No Pomodoros Found!</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Followers Modal */}
      {showFollowersModal && displayUser && (
        <FollowersModal
          userId={userId!}
          userName={displayUser.user_name}
          initialTab={modalTab}
          onClose={() => setShowFollowersModal(false)}
        />
      )}
    </div>
  );
};

export default React.memo(UserProfile);
