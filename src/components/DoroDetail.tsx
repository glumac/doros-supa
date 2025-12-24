import React, { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { AiTwotoneDelete, AiOutlineDelete } from "react-icons/ai";
import { useAuth } from "../contexts/AuthContext";
import { usePomodoroDetail } from "../hooks/useFeed";
import {
  useLikeMutation,
  useUnlikeMutation,
  useCommentMutation,
  useDeleteCommentMutation,
  useDeletePomodoroMutation,
} from "../hooks/useMutations";
import Spinner from "./Spinner";
import { addStyle, removeStyle } from "../utils/styleDefs";
import { format, isToday, getYear } from "date-fns";
import { getDetailImageUrl } from "../lib/storage";
import ImageModal from "./ImageModal";
import { Doro, User } from "../types/models";
import { getAvatarPlaceholder } from "../utils/avatarPlaceholder";

interface DoroDetailProps {
  user?: User;
}

const DoroDetail = ({ user }: DoroDetailProps) => {
  const { doroId } = useParams<{ doroId: string }>();
  const [comment, setComment] = useState("");
  const [commentDeleteHovered, setCommentDeleteHovered] = useState("");
  const [deleteHovered, setDeleteHovered] = useState(false);
  const [imageURL, setImageURL] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const imageButtonRef = useRef<HTMLButtonElement>(null);

  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  // Use React Query hooks
  const { data: doro, isLoading } = usePomodoroDetail(doroId, authUser?.id);
  const likeMutation = useLikeMutation();
  const unlikeMutation = useUnlikeMutation();
  const commentMutation = useCommentMutation();
  const deleteCommentMutation = useDeleteCommentMutation();
  const deletePomodoroMutation = useDeletePomodoroMutation();

  useEffect(() => {
    const title = document.getElementById("crush-title");
    if (title && doro?.task) {
      title.innerHTML = `${doro.task} - Crush Quest`;
    }
  }, [doro]);

  let alreadyLiked = doro?.likes?.filter(
    (item) => item?.user_id === authUser?.id
  ) || [];

  const hasLiked = alreadyLiked.length > 0;

  const deletePin = async (id: string) => {
    deletePomodoroMutation.mutate(id, {
      onSuccess: () => {
        navigate("/");
      },
    });
  };

  const deleteComment = async (commentId: string) => {
    deleteCommentMutation.mutate(commentId);
  };

  // Convert image path to signed URL if needed
  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!doro?.image_url) {
        setImageURL(null);
        return;
      }

      // If it's a Supabase storage URL (public URL that might not work with private bucket),
      // extract the path and generate a signed URL instead
      // Otherwise, if it's an external URL, use it directly
      if (doro.image_url.startsWith("http://") || doro.image_url.startsWith("https://")) {
        // Check if it's a Supabase storage URL - if so, getImageSignedUrl will handle it
        // Otherwise, it's an external URL - use directly
        if (!doro.image_url.includes("/pomodoro-images/")) {
          setImageURL(doro.image_url);
          return;
        }
      }

      // Convert to signed URL with detail-optimized size (2x for retina)
      try {
        const signedUrl = await getDetailImageUrl(doro.image_url);
        if (signedUrl) {
          setImageURL(signedUrl);
        } else {
          // If signed URL creation failed (e.g., image doesn't exist in storage),
          // set to null so image doesn't try to load invalid path
          setImageURL(null);
        }
      } catch (error) {
        console.error("Error generating signed URL:", error);
        // On unexpected error, don't try to load invalid path
        setImageURL(null);
      }
    };

    if (doro) {
      fetchSignedUrl();
    }
  }, [doro?.image_url]);

  const addLike = async (id: string) => {
    if (!authUser || hasLiked) return;
    likeMutation.mutate({ pomodoroId: id, userId: authUser.id });
  };

  const removeLike = async (id: string) => {
    if (!authUser || !hasLiked) return;
    unlikeMutation.mutate({ pomodoroId: id, userId: authUser.id });
  };

  const addComment = async () => {
    if (!authUser || !comment.trim() || !doroId) return;

    commentMutation.mutate(
      {
        pomodoroId: doroId,
        userId: authUser.id,
        commentText: comment,
      },
      {
        onSuccess: () => {
          setComment("");
        },
      }
    );
  };

  const isLikingDoro = likeMutation.isPending || unlikeMutation.isPending;
  const isAddingComment = commentMutation.isPending || deleteCommentMutation.isPending;

  if (isLoading) {
    return (
      <div className="mt-12">
        <Spinner message="Loading Pomodoro" />
      </div>
    );
  }

  if (!doro) {
    return (
      <div className="mt-12">
        <Spinner message="Loading Pomodoro" />
      </div>
    );
  }

  return (
    <>
      {doro && (
        <div
          className="cq-doro-detail-container flex xl:flex-row flex-col m-auto rounded-3xl ptb-3 bg-white"
          style={{ maxWidth: "1500px" }}
        >
          {doro?.image_url && (
            <button
              ref={imageButtonRef}
              type="button"
              onClick={() => setShowImageModal(true)}
              className="cq-doro-detail-image-container flex justify-center items-center md:items-start flex-initial bg-transparent border-none p-0 cursor-pointer"
              aria-label="View full size image"
            >
              {imageURL ? (
                <img
                  style={{ maxHeight: "600px" }}
                  className="cq-doro-detail-image rounded-lg self-center pointer-events-none"
                  src={imageURL}
                  alt="user-post"
                  onError={(e) => {
                    console.error("Image failed to load", { imageURL, originalImageUrl: doro.image_url });
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="cq-doro-detail-image-loading flex items-center justify-center" style={{ minHeight: "200px" }}>
                  <p className="cq-doro-detail-image-loading-text text-gray-500">Loading image...</p>
                </div>
              )}
            </button>
          )}
          <div className="cq-doro-detail-content w-full p-5 flex-1 xl:min-w-620">
            <div className="cq-doro-detail-header flex justify-between align-center mt-2">
              <Link
                to={`/user/${doro?.users?.id}`}
                className="cq-doro-detail-user-link flex gap-2 items-center bg-white text-green-700 font-bold text-lg relative hover:text-green-800 "
              >
                <img
                  src={doro?.users?.avatar_url || getAvatarPlaceholder(40)}
                  className="cq-doro-detail-user-avatar w-10 h-10 rounded-full"
                  alt="user-profile"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getAvatarPlaceholder(40);
                  }}
                />
                <p className="cq-doro-detail-user-name font-bold">{doro?.users?.user_name}</p>
              </Link>

              <div className="cq-doro-detail-delete-container">
                {doro.users?.id === authUser?.id && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePin(doro.id);
                    }}
                    title="Delete Pomodoro"
                    onMouseEnter={() => setDeleteHovered(true)}
                    onMouseLeave={() => setDeleteHovered(false)}
                    className="cq-doro-detail-delete-button bg-white px-2 text-red-600 text-5xl rounded-full w-10 h-7 flex items-center justify-center outline-none"
                  >
                    {deleteHovered ? <AiTwotoneDelete /> : <AiOutlineDelete />}
                  </button>
                )}
              </div>
            </div>

            <dl className="cq-doro-detail-details my-6">
              {doro.launch_at && (
                <div className="cq-doro-detail-started mb-2 flex">
                  <dt className="cq-doro-detail-started-label text-gray-500 w-16 mr-3 text-lg shrink-0 leading-tight font-bold ">
                    Started:
                  </dt>
                  <dd className="cq-doro-detail-started-value text-dark text-lg leading-tight">
                    {" "}
                    {isToday(new Date(doro.launch_at))
                      ? `Today ${format(new Date(doro.launch_at), "h:mm a")}`
                      : (() => {
                          const date = new Date(doro.launch_at);
                          const currentYear = getYear(new Date());
                          const dateYear = getYear(date);
                          return dateYear === currentYear
                            ? format(date, "MMM dd, h:mm a")
                            : format(date, "MMM dd, yyyy h:mm a");
                        })()}
                  </dd>
                </div>
              )}
              {doro.task && (
                <div className="cq-doro-detail-task mb-2 flex">
                  <dt className="cq-doro-detail-task-label text-gray-500 w-16 mr-3 text-lg shrink-0 leading-tight font-bold ">
                    Task:
                  </dt>
                  <dd className="cq-doro-detail-task-value text-dark text-lg leading-tight">
                    {doro.task}
                  </dd>
                </div>
              )}
              {doro.notes && (
                <div className="cq-doro-detail-notes mb-2 flex">
                  <dt className="cq-doro-detail-notes-label text-gray-500 w-16 mr-3 text-lg shrink-0 leading-tight font-bold ">
                    Notes:
                  </dt>
                  <dd className="cq-doro-detail-notes-value text-dark text-lg leading-tight">
                    {doro.notes}
                  </dd>
                </div>
              )}
            </dl>
            {/* likes */}
            <div className="cq-doro-detail-likes-section">
              {doro?.likes?.length > 0 && (
                <div className="cq-doro-detail-likes mt-3">
                  <h2 className="cq-doro-detail-likes-title mt-5 text-2xl mb-2">
                    Likes{" "}
                    {doro?.likes?.length > 0 && (
                      <span>({doro?.likes?.length})</span>
                    )}
                  </h2>
                  <div className="cq-doro-detail-likes-avatars mb-3">
                    {doro?.likes?.length > 0 && (
                      <div className="cq-doro-detail-likes-list mt-1.5">
                        <div className="cq-doro-detail-likes-avatars-container flex gap-0.5">
                          {doro?.likes?.map((like, index) => (
                              <div key={like.id} className="cq-doro-detail-like-avatar-item">
                                <img
                                  className="cq-doro-detail-like-avatar w-5 h-5 mr-0.5 rounded-full object-cover block"
                                  src={like.users?.avatar_url || getAvatarPlaceholder(20)}
                                alt="user-profile"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = getAvatarPlaceholder(20);
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="cq-doro-detail-like-button-container mb-2">
                <div className="cq-doro-detail-like-button-wrapper flex items-center shrink-0">
                  {hasLiked ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLike(doro.id);
                      }}
                      className={`cq-doro-detail-unlike-button ${removeStyle}`}
                    >
                      Unlike
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addLike(doro.id);
                      }}
                      type="button"
                      disabled={isLikingDoro}
                      className="cq-doro-detail-like-button bg-red-600 text-white font-bold px-5 py-1 text-base rounded-lg transition hover:shadow-md outline-none"
                    >
                      {isLikingDoro ? "..." : "Like"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* comments */}
            <div className="cq-doro-detail-comments-section mt-3">
              <div className="cq-doro-detail-comments-list-container">
                {doro?.comments?.length > 0 && (
                  <div className="cq-doro-detail-comments-list my-3">
                    <h2 className="cq-doro-detail-comments-title mt-5 text-2xl mb-2">
                      <span>Comments</span>
                      <span> </span>
                      {doro?.comments?.length > 0 && (
                        <span>({doro?.comments?.length})</span>
                      )}
                    </h2>
                    <div className="cq-doro-detail-comments-items">
                      {doro?.comments?.map((comment, index) => (
                        <div
                          key={comment.id}
                          className="cq-doro-detail-comment-item flex items-start gap-1.5 mb-1"
                        >
                          <div className="cq-doro-detail-comment-avatar-container flex content-center shrink-0">
                            <Link
                              to={`/user/${comment.users?.id}`}
                              className="cq-doro-detail-comment-user-link items-center"
                            >
                              <img
                                className="cq-doro-detail-comment-avatar w-5 h-5 rounded-full object-cover block relative top-1"
                                src={comment.users?.avatar_url || getAvatarPlaceholder(20)}
                                alt="user-profile"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = getAvatarPlaceholder(20);
                                }}
                              />
                            </Link>
                          </div>
                          <p className="cq-doro-detail-comment-text">
                            <span key="cool">{comment.comment_text}</span>
                            <span key="double-cool"> </span>
                            {comment.users?.id === authUser?.id && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteComment(comment.id);
                                }}
                                title="Delete Comment"
                                onMouseEnter={() =>
                                  setCommentDeleteHovered(comment.id)
                                }
                                onMouseLeave={() => setCommentDeleteHovered("")}
                                className="cq-doro-detail-comment-delete-button text-red-600 text-large relative top-0.5 inline-flex items-center justify-center outline-none"
                              >
                                {comment.id === commentDeleteHovered ? (
                                  <AiTwotoneDelete />
                                ) : (
                                  <AiOutlineDelete />
                                )}
                              </button>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div id={`${doro.id}-commenting`} className="cq-doro-detail-comment-form-container">
                <div className="cq-doro-detail-comment-form flex items-end">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment"
                    className="cq-doro-detail-comment-input block leading-tight outline-none text-base border-2 mr-3 border-gray-200 flex-grow p-2"
                  ></textarea>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addComment();
                    }}
                    disabled={comment?.length === 0 || isAddingComment}
                    type="button"
                    className="cq-doro-detail-comment-submit-button bg-red-600 text-white font-bold px-5 py-1 text-base rounded-lg hover:shadow-md outline-none"
                  >
                    {isAddingComment ? "Submitting" : "Submit"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {doro?.image_url && (
        <ImageModal
          isOpen={showImageModal}
          imagePath={doro.image_url}
          onClose={() => setShowImageModal(false)}
          triggerRef={imageButtonRef}
        />
      )}
    </>
  );
};

export default DoroDetail;
