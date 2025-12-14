import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { AiTwotoneDelete, AiOutlineDelete } from "react-icons/ai";
import { format, isToday } from "date-fns";
import { client, urlFor } from "../client";
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

  const navigate = useNavigate();

  const { postedBy, image, _id, task, notes, launchAt } = doro;

  console.log("image", image);

  const imageURL = image && image.asset ? urlFor(image).url() : null;

  // console.log("doro", doro);

  const userItem = localStorage.getItem("user");
  const user: DecodedJWT | null =
    userItem && userItem !== "undefined"
      ? JSON.parse(userItem)
      : localStorage.clear();

  // console.log("user", user);
  // console.log("likes", doro.likes);
  // console.log("comments", doro.comments);

  const deletePin = (id: string) => {
    client.delete(id).then(() => {
      if (reloadFeed) reloadFeed(true);
    });
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
    (item) => item?.postedBy?._id === user?.sub
  ) || [];

  const hasLiked = alreadyLiked.length > 0;

  const addLike = (id: string) => {
    console.log("adding like");
    setLikingDoro(true);
    if (!hasLiked) {
      client
        .patch(id)
        .setIfMissing({ likes: [] })
        .insert("after", "likes[-1]", [
          {
            _key: uuidv4(),
            userId: user?.sub,
            postedBy: {
              _type: "postedBy",
              _ref: user?.sub,
            },
          },
        ])
        .commit()
        .then(() => {
          console.log("like added");
          if (reloadFeed) reloadFeed(false);
          setLikingDoro(false);
        });
    }
  };

  const removeLike = (id: string) => {
    if (hasLiked && alreadyLiked.length > 0) {
      setLikingDoro(true);

      console.log("so cool", alreadyLiked);

      const firstLike = alreadyLiked[0];
      if (!firstLike) return;
      let likeKey = firstLike._key;

      console.log("id 🚜", id);

      const likeToRemove = [`likes[_key=="${likeKey}"]`];
      client
        .patch(id)
        .unset(likeToRemove)
        .commit()
        .then(() => {
          console.log();
          if (reloadFeed) reloadFeed(false);
          setLikingDoro(false);
        });
    }
  };

  const addComment = (id: string) => {
    console.log("adding comment start ✅");
    setAddingComment(true);

    client
      .patch(id)
      .setIfMissing({ comments: [] })
      .insert("after", "comments[-1]", [
        {
          _key: uuidv4(),
          commentText: comment,
          userId: user?.sub,
          postedBy: {
            _type: "postedBy",
            _ref: user?.sub,
          },
        },
      ])
      .commit()
      .then(() => {
        console.log("comment added");
        setAddingComment(false);
        // this is corny AF. Pull in new data don't reload the page
        if (reloadFeed) reloadFeed(false);
        setComment("");
      });
  };

  const deleteComment = (id: string, key: string) => {
    setAddingComment(true);

    const commentToRemove = [`comments[_key=="${key}"]`];
    client
      .patch(id)
      .unset(commentToRemove)
      .commit()
      .then(() => {
        if (reloadFeed) reloadFeed(false);
        setLikingDoro(false);
      });
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
            {postedBy?._id === user?.sub?.toString() && (
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
                    key={comment._key}
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
                      <span key="cool">{comment?.commentText}</span>
                      <span key="double-cool"> </span>
                      {comment?.postedBy?._id === user?.sub?.toString() && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteComment(_id, comment._key);
                          }}
                          title="Delete Pomodoro"
                          onMouseEnter={() =>
                            setCommentDeleteHovered(comment._key)
                          }
                          onMouseLeave={() => setCommentDeleteHovered("")}
                          className="text-red-600 text-large relative top-0.5 inline-flex items-center justify-center outline-none"
                        >
                          {comment._key === commentDeleteHovered ? (
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
