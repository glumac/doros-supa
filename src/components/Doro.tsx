import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { AiTwotoneDelete, AiOutlineDelete } from "react-icons/ai";
import { format, isToday, getYear } from "date-fns";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { addStyle, removeStyle } from "../utils/styleDefs";
import { getImageSignedUrl } from "../lib/storage";
import { Doro as DoroType, Like, DecodedJWT } from "../types/models";
import { getAvatarPlaceholder } from "../utils/avatarPlaceholder";

interface DoroProps {
  doro: DoroType;
  reloadFeed?: ((clearCache: boolean) => void) | undefined;
  className?: string;
}

const Doro = ({ doro, reloadFeed }: DoroProps) => {
  const [deleteHovered, setDeleteHovered] = useState(false);
  const [commentDeleteHovered, setCommentDeleteHovered] = useState("");
  const [likingDoro, setLikingDoro] = useState(false);
  const [showAddComment, setShowAddComment] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [comment, setComment] = useState("");
  const [imageURL, setImageURL] = useState<string | null>(null);

  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const { users, id, task, notes, launch_at, image_url } = doro;

  // Convert image path to signed URL if needed
  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!image_url) {
        setImageURL(null);
        return;
      }

      // If it's a Supabase storage URL (public URL that might not work with private bucket),
      // extract the path and generate a signed URL instead
      // Otherwise, if it's an external URL, use it directly
      if (image_url.startsWith("http://") || image_url.startsWith("https://")) {
        // Check if it's a Supabase storage URL - if so, getImageSignedUrl will handle it
        // Otherwise, it's an external URL - use directly
        if (!image_url.includes("/pomodoro-images/")) {
          setImageURL(image_url);
          return;
        }
      }

      // Convert to signed URL (handles both paths and Supabase storage URLs)
      try {
        const signedUrl = await getImageSignedUrl(image_url);
        if (signedUrl) {
          setImageURL(signedUrl);
        } else {
          // Fallback: try using the original value
          setImageURL(image_url);
        }
      } catch (error) {
        console.error("Error generating signed URL:", error);
        // Fallback: try using the original value
        setImageURL(image_url);
      }
    };

    fetchSignedUrl();
  }, [image_url]);

  const deletePin = async (id: string) => {
    const { error } = await supabase.from("pomodoros").delete().eq("id", id);
    if (!error && reloadFeed) {
      reloadFeed(true);
    }
  };

  const toggleShowAddComment = () => {
    setShowAddComment(!showAddComment);
  };

  useEffect(() => {
    if (!showAddComment) {
      setComment("");
    }
  }, [showAddComment]);

  let alreadyLiked = doro?.likes?.filter(
    (item) => item?.user_id === authUser?.id
  ) || [];

  const hasLiked = alreadyLiked.length > 0;

  const addLike = async (id: string) => {
    if (!authUser || hasLiked) return;

    console.log("adding like");
    setLikingDoro(true);

    const { error } = await supabase.from("likes").insert({
      pomodoro_id: id,
      user_id: authUser.id,
    });

    if (!error) {
      console.log("like added");
      if (reloadFeed) reloadFeed(false);
    }
    setLikingDoro(false);
  };

  const removeLike = async (id: string) => {
    if (!authUser || !hasLiked) return;

    setLikingDoro(true);

    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("pomodoro_id", id)
      .eq("user_id", authUser.id);

    if (!error && reloadFeed) {
      reloadFeed(false);
    }
    setLikingDoro(false);
  };

  const addComment = async (id: string) => {
    if (!authUser) return;

    console.log("adding comment start ✅");
    setAddingComment(true);

    const { error } = await supabase.from("comments").insert({
      pomodoro_id: id,
      user_id: authUser.id,
      comment_text: comment,
    });

    if (!error) {
      console.log("comment added");
      if (reloadFeed) reloadFeed(false);
      setComment("");
    }
    setAddingComment(false);
  };

  const deleteComment = async (commentId: string) => {
    setAddingComment(true);

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (!error && reloadFeed) {
      reloadFeed(false);
    }
    setAddingComment(false);
  };

  return (
    <div className="cq-doro-card my-4 bg-white border-solid border-2 border-red-600 rounded-3xl p-5 relative">
      <div className="cq-doro-header flex justify-between items-center relative">
        <Link
          to={`/user/${users?.id}`}
          className="cq-doro-user-link items-center relative z-10"
          // write react style to scale to 102% on hover
        >
          <div className="cq-doro-user-info flex relative items-center">
            <div className="cq-doro-user-avatar-container w-10">
              <img
                className="cq-doro-user-avatar w-8 h-8 rounded-full object-cover block"
                src={users?.avatar_url || getAvatarPlaceholder(32)}
                alt="user-profile"
              />
            </div>
            <p className="cq-doro-user-name text-green-700 font-bold text-lg relative items-center hover:shadow-md hover:text-green-800">
              {users?.user_name}
            </p>
          </div>
        </Link>
        <div className="cq-doro-header-actions flex justify-end items-center ">
          <div className="cq-doro-delete-container">
            {users?.id === authUser?.id && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deletePin(id);
                }}
                title="Delete Pomodoro"
                onMouseEnter={() => setDeleteHovered(true)}
                onMouseLeave={() => setDeleteHovered(false)}
                className="cq-doro-delete-button bg-white px-2 text-red-600 text-5xl rounded-full w-10 h-7 flex items-center justify-center outline-none"
              >
                {deleteHovered ? <AiTwotoneDelete /> : <AiOutlineDelete />}
              </button>
            )}
          </div>
          <p className="cq-doro-timestamp">
            {launch_at && new Date(launch_at).toString() !== 'Invalid Date'
              ? isToday(new Date(launch_at))
                ? `Today ${format(new Date(launch_at), "h:mm a")}`
                : (() => {
                    const date = new Date(launch_at);
                    const currentYear = getYear(new Date());
                    const dateYear = getYear(date);
                    return dateYear === currentYear
                      ? format(date, "MMM dd h:mm a")
                      : format(date, "MMM dd, yyyy h:mm a");
                  })()
              : 'Date unavailable'}
          </p>
        </div>
      </div>
      <Link
        to={`/doro-detail/${id}`}
        className="cq-doro-content-link before:content before:absolute before:top-0 before:left-0 before:w-full before:h-full before:rounded-3xl"
      >
        <div className="cq-doro-content gap-2 mt-6 sm:block md:flex justify-between mb-4 md:mb-0">
          <dl className="cq-doro-details leading-tight mb-3">
            {task && (
              <div className="cq-doro-task mb-2 flex">
                <dt className="cq-doro-task-label font-bold text-gray-500 w-16 text-lg shrink-0 leading-tight ">
                  Task:
                </dt>
                <dd className="cq-doro-task-value text-dark text-lg leading-tight ">{task}</dd>
              </div>
            )}
            {notes && (
              <div className="cq-doro-notes mb-2 flex">
                <dt className="cq-doro-notes-label font-bold text-gray-500 w-16 text-lg  shrink-0 leading-tight   ">
                  Notes:
                </dt>
                <dd className="cq-doro-notes-value text-dark text-lg leading-tight ">{notes}</dd>
              </div>
            )}
          </dl>

          {imageURL && (
            <div className="cq-doro-image-container relative cursor-zoom-in w-auto rounded-lg overflow-hidden transition-all duration-500 ease-in-out basis-1/3 shrink-0 ">
              <img
                className="cq-doro-image rounded-lg block"
                src={imageURL}
                alt="User Pomodoro"
              />
            </div>
          )}
        </div>
      </Link>

      {/* likes */}
      {(doro?.likes?.length ?? 0) > 0 && (
        <div className="cq-doro-likes-section flex mt-3 gap-2">
          <h2 className="cq-doro-likes-title text-lg font-medium">
            Likes{" "}
            {(doro?.likes?.length ?? 0) > 0 && <span>({doro?.likes?.length})</span>}
          </h2>
          <div className="cq-doro-likes-avatars">
            {(doro?.likes?.length ?? 0) > 0 && (
              <div className="cq-doro-likes-list mt-1.5">
                <div className="cq-doro-likes-avatars-container flex gap-0.5">
                  {doro?.likes?.map((like, index) => (
                    <div key={like.id} className="cq-doro-like-avatar-item">
                      <Link to={`user/${like.users?.id}`} className="cq-doro-like-avatar-link">
                        <img
                          className="cq-doro-like-avatar w-5 h-5 mr-0.5 rounded-full object-cover block relative"
                          src={like.users?.avatar_url || getAvatarPlaceholder(20)}
                          alt="user-profile"
                        />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="cq-doro-like-button-container mb-2">
        <div className="cq-doro-like-button-wrapper flex items-center shrink-0">
          {hasLiked ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeLike(id);
              }}
              className={`cq-doro-unlike-button ${removeStyle}`}
            >
              Unlike
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                addLike(id);
              }}
              type="button"
              disabled={likingDoro}
              className={`cq-doro-like-button ${addStyle}`}
              style={{
                cursor: likingDoro ? "auto" : "pointer",
                paddingLeft: likingDoro ? "20px" : "",
                paddingRight: likingDoro ? "20px" : "",
              }}
            >
              {likingDoro ? "    ...    " : "Like"}
            </button>
          )}
        </div>
      </div>
      {/* comments */}
      <div className="cq-doro-comments-section">
        <div className="cq-doro-comments-list-container">
          {(doro?.comments?.length ?? 0) > 0 && (
            <div className="cq-doro-comments-list my-3">
              <h2 className="cq-doro-comments-title text-lg font-medium">
                <span>Comments</span>
                <span> </span>
                {(doro?.comments?.length ?? 0) > 0 && (
                  <span>({doro?.comments?.length})</span>
                )}
              </h2>
              <div className="cq-doro-comments-items">
                {doro?.comments?.map((comment, index) => (
                  <div
                    key={comment.id}
                    className="cq-doro-comment-item flex items-start gap-1.5 mb-1"
                  >
                    <div className="cq-doro-comment-avatar-container flex content-center shrink-0">
                      <Link
                        to={`/user/${comment.users?.id}`}
                        className="cq-doro-comment-user-link items-center"
                      >
                        <img
                          className="cq-doro-comment-avatar w-4 h-4 rounded-full object-cover block relative top-1"
                          src={comment.users?.avatar_url || getAvatarPlaceholder(16)}
                          alt="user-profile"
                        />
                      </Link>
                    </div>
                    <p className="cq-doro-comment-text">
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
                          className="cq-doro-comment-delete-button text-red-600 text-large relative top-0.5 inline-flex items-center justify-center outline-none"
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
        <button
          type="button"
          className={`cq-doro-comment-toggle-button ${showAddComment ? removeStyle : addStyle}`}
          aria-expanded={showAddComment}
          onClick={toggleShowAddComment}
          aria-controls={`${doro.id}-commenting`}
        >
          {showAddComment ? "Cancel Comment" : "Comment"}
        </button>
        <div id={`${doro.id}-commenting`} className="cq-doro-comment-form-container">
          {showAddComment && (
            <div className="cq-doro-comment-form flex items-end">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment"
                className="cq-doro-comment-input block relative leading-tight outline-none text-base border-2 mr-3 border-gray-200 flex-grow p-2"
              ></textarea>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addComment(id);
                }}
                disabled={comment?.length === 0 || addingComment}
                type="button"
                className="cq-doro-comment-submit-button relative bg-red-600 text-white font-bold py-0.5 text-base rounded-lg transition hover:shadow-md outline-none disabled:opacity-70 px-3"
              >
                {addingComment ? "Submitting" : "Submit"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Doro;
