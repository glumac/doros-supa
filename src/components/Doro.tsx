import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { AiTwotoneDelete, AiOutlineDelete } from "react-icons/ai";
import { format, isToday } from "date-fns";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { addStyle, removeStyle } from "../utils/styleDefs";
import { Doro as DoroType, Like, DecodedJWT } from "../types/models";

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

  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const { postedBy, image, _id, task, notes, launchAt } = doro;

  const imageURL = image || doro.imageUrl || null;

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
    <div className="my-4 bg-white border-solid border-2 border-red-600 rounded-3xl p-5 relative">
      <div className="flex justify-between items-center relative">
        <Link
          to={`/user-profile/${postedBy?._id}`}
          className="items-center relative z-10"
          // write react style to scale to 102% on hover
        >
          <div className="flex relative items-center">
            <div className="w-10">
              <img
                className="w-8 h-8 rounded-full object-cover block"
                src={postedBy?.image}
                alt="user-profile"
              />
            </div>
            <p className="text-green-700 font-bold text-lg relative items-center hover:shadow-md hover:text-green-800">
              {postedBy?.userName}
            </p>
          </div>
        </Link>
        <div className="flex justify-end items-center ">
          <div className="">
            {postedBy?._id === authUser?.id && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deletePin(_id);
                }}
                title="Delete Pomodoro"
                onMouseEnter={() => setDeleteHovered(true)}
                onMouseLeave={() => setDeleteHovered(false)}
                className="bg-white px-2 text-red-600 text-5xl rounded-full w-10 h-7 flex items-center justify-center outline-none"
              >
                {deleteHovered ? <AiTwotoneDelete /> : <AiOutlineDelete />}
              </button>
            )}
          </div>
          <p>
            {isToday(new Date(launchAt))
              ? `Today ${format(new Date(launchAt), "h:mm a")}`
              : format(new Date(launchAt), "MMM dd h:mm a")}
          </p>
        </div>
      </div>
      <Link
        to={`/doro-detail/${_id}`}
        className="before:content before:absolute before:top-0 before:left-0 before:w-full before:h-full before:rounded-3xl"
      >
        <div className="gap-2 mt-6 sm:block md:flex justify-between mb-4 md:mb-0">
          <dl className="leading-tight mb-3">
            {task && (
              <div className="mb-2 flex">
                <dt className="font-bold text-gray-500 w-16 text-lg shrink-0 leading-tight ">
                  Task:
                </dt>
                <dd className="text-dark text-lg leading-tight ">{task}</dd>
              </div>
            )}
            {notes && (
              <div className="mb-2 flex">
                <dt className="font-bold text-gray-500 w-16 text-lg  shrink-0 leading-tight   ">
                  Notes:
                </dt>
                <dd className="text-dark text-lg leading-tight ">{notes}</dd>
              </div>
            )}
          </dl>

          {imageURL && (
            <div className="relative cursor-zoom-in w-auto rounded-lg overflow-hidden transition-all duration-500 ease-in-out basis-1/3 shrink-0 ">
              <img
                className="rounded-lg block"
                src={imageURL}
                alt="User Pomodoro"
              />
            </div>
          )}
        </div>
      </Link>

      {/* likes */}
      {(doro?.likes?.length ?? 0) > 0 && (
        <div className="flex mt-3 gap-2">
          <h2 className="text-lg font-medium">
            Likes{" "}
            {(doro?.likes?.length ?? 0) > 0 && <span>({doro?.likes?.length})</span>}
          </h2>
          <div>
            {(doro?.likes?.length ?? 0) > 0 && (
              <div className="mt-1.5">
                <div className="flex gap-0.5">
                  {doro?.likes?.map((like, index) => (
                    <div key={like.postedBy?.image}>
                      <Link to={`user-profile/${like.postedBy?._id}`}>
                        <img
                          className="w-5 h-5 mr-0.5 rounded-full object-cover block relative"
                          src={like?.postedBy?.image}
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
      <div className="mb-2">
        <div className="flex items-center shrink-0">
          {hasLiked ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeLike(_id);
              }}
              className={removeStyle}
            >
              Unlike
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                addLike(_id);
              }}
              type="button"
              disabled={likingDoro}
              className={addStyle}
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
      <div>
        <div>
          {(doro?.comments?.length ?? 0) > 0 && (
            <div className="my-3">
              <h2 className="text-lg font-medium">
                <span>Comments</span>
                <span> </span>
                {(doro?.comments?.length ?? 0) > 0 && (
                  <span>({doro?.comments?.length})</span>
                )}
              </h2>
              <div>
                {doro?.comments?.map((comment, index) => (
                  <div
                    key={comment.id || comment._key}
                    className="flex items-start gap-1.5 mb-1"
                  >
                    <div className="flex content-center shrink-0">
                      <Link
                        to={`/user-profile/${comment?.postedBy?._id}`}
                        className="items-center"
                      >
                        <img
                          className="w-4 h-4 rounded-full object-cover block relative top-1"
                          src={comment?.postedBy?.image}
                          alt="user-profile"
                        />
                      </Link>
                    </div>
                    <p>
                      <span key="cool">{comment?.commentText || comment?.comment_text}</span>
                      <span key="double-cool"> </span>
                      {comment?.postedBy?._id === authUser?.id && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteComment(comment.id || comment._key);
                          }}
                          title="Delete Comment"
                          onMouseEnter={() =>
                            setCommentDeleteHovered(comment.id || comment._key)
                          }
                          onMouseLeave={() => setCommentDeleteHovered("")}
                          className="text-red-600 text-large relative top-0.5 inline-flex items-center justify-center outline-none"
                        >
                          {(comment.id || comment._key) === commentDeleteHovered ? (
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
          className={showAddComment ? removeStyle : addStyle}
          aria-expanded={showAddComment}
          onClick={toggleShowAddComment}
          aria-controls={`${doro._id}-commenting`}
        >
          {showAddComment ? "Cancel Comment" : "Comment"}
        </button>
        <div id={`${doro._id}-commenting`}>
          {showAddComment && (
            <div className="flex items-end">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment"
                className="block relative leading-tight outline-none text-base border-2 mr-3 border-gray-200 flex-grow p-2"
              ></textarea>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addComment(_id);
                }}
                disabled={comment?.length === 0 || addingComment}
                type="button"
                className="relative bg-red-600 text-white font-bold py-0.5 text-base rounded-lg transition hover:shadow-md outline-none disabled:opacity-70 px-3 py-0.5 text-base rounded-lg hover:shadow-md outline-none"
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
