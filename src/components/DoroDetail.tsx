import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { AiTwotoneDelete, AiOutlineDelete } from "react-icons/ai";
import { client, urlFor } from "../client";
import { doroDetailQuery } from "../utils/data";
import Spinner from "./Spinner";
import { addStyle, removeStyle } from "../utils/styleDefs";
import { format, isToday } from "date-fns";
import { Doro, User } from "../types/models";

interface DoroDetailProps {
  user?: User;
}

const DoroDetail = ({ user }: DoroDetailProps) => {
  const { doroId } = useParams<{ doroId: string }>();
  const [doro, setDoro] = useState<Doro>();
  const [comment, setComment] = useState("");
  const [commentDeleteHovered, setCommentDeleteHovered] = useState("");
  const [likingDoro, setLikingDoro] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [deleteHovered, setDeleteHovered] = useState(false);

  useEffect(() => {
    const title = document.getElementById("crush-title");
    if (title && doro?.task) {
      title.innerHTML = `${doro.task} - Crush Quest`;
    }
  }, [doro]);

  const navigate = useNavigate();

  let alreadyLiked = doro?.likes?.filter(
    (item) => item?.postedBy?._id === user?._id
  ) || [];

  const hasLiked = alreadyLiked.length > 0;

  const fetchDoroDetails = () => {
    if (!doroId) return;

    const query = doroDetailQuery(doroId);

    if (query) {
      client.fetch<Doro[]>(`${query}`).then((data) => {
        setDoro(data[0]);
        setAddingComment(false);
        setLikingDoro(false);
      });
    }
  };

  const deletePin = (id: string) => {
    client.delete(id).then(() => {
      navigate("/");
    });
  };

  const deleteComment = (id: string, key: string) => {
    const commentToRemove = [`comments[_key=="${key}"]`];
    client
      .patch(id)
      .unset(commentToRemove)
      .commit()
      .then(() => {
        fetchDoroDetails();
      });
  };

  useEffect(() => {
    fetchDoroDetails();
  }, [doroId]);

  const addLike = (id: string) => {
    if (!hasLiked) {
      setLikingDoro(true);

      client
        .patch(id)
        .setIfMissing({ likes: [] })
        .insert("after", "likes[-1]", [
          {
            _key: uuidv4(),
            userId: user?._id,
            postedBy: {
              _type: "postedBy",
              _ref: user?._id,
            },
          },
        ])
        .commit()
        .then(() => {
          fetchDoroDetails();
        });
    }
  };

  const removeLike = (id: string) => {
    if (hasLiked && alreadyLiked.length > 0) {
      setLikingDoro(true);

      let likeKey = alreadyLiked[0]._key;

      console.log("id 🚜", id);

      const likeToRemove = [`likes[_key=="${likeKey}"]`];
      client
        .patch(id)
        .unset(likeToRemove)
        .commit()
        .then(() => {
          console.log();
          fetchDoroDetails();
        });
    }
  };

  const addComment = () => {
    if (comment && doroId) {
      setAddingComment(true);

      console.log("comment");

      client
        .patch(doroId)
        .setIfMissing({ comments: [] })
        .insert("after", "comments[-1]", [
          {
            _key: uuidv4(),
            commentText: comment,
            postedBy: { _type: "postedBy", _ref: user?._id },
          },
        ])
        .commit()
        .then(() => {
          fetchDoroDetails();
          setComment("");
        });
    }
  };

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
          className="flex xl:flex-row flex-col m-auto rounded-3xl ptb-3 bg-white"
          style={{ maxWidth: "1500px" }}
        >
          {doro?.image?.asset && (
            <div className="flex justify-center items-center md:items-start flex-initial">
              <img
                style={{ maxHeight: "600px" }}
                className="rounded-lg self-center"
                src={doro?.image && urlFor(doro?.image).url()}
                alt="user-post"
              />
            </div>
          )}
          <div className="w-full p-5 flex-1 xl:min-w-620">
            <div className="flex justify-between align-center mt-2">
              <Link
                to={`/user-profile/${doro?.postedBy._id}`}
                className="flex gap-2 items-center bg-white text-green-700 font-bold text-lg relative items-center hover:text-green-800 "
              >
                <img
                  src={doro?.postedBy.image}
                  className="w-10 h-10 rounded-full"
                  alt="user-profile"
                />
                <p className="font-bold">{doro?.postedBy.userName}</p>
              </Link>

              <div className="">
                {doro.postedBy?._id === user?._id?.toString() && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePin(doro._id);
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
            </div>

            <dl className="my-6">
              {doro.launchAt && (
                <div className="mb-2 flex">
                  <dt className=" text-gray-500 w-16 mr-3 text-lg shrink-0 leading-tight font-bold ">
                    Started:
                  </dt>
                  <dd className="text-dark text-lg leading-tight">
                    {" "}
                    {isToday(new Date(doro.launchAt))
                      ? `Today ${format(new Date(doro.launchAt), "h:mm a")}`
                      : format(new Date(doro.launchAt), "MMM dd, h:mm a")}
                  </dd>
                </div>
              )}
              {doro.task && (
                <div className="mb-2 flex">
                  <dt className=" text-gray-500 w-16 mr-3 text-lg shrink-0 leading-tight font-bold ">
                    Task:
                  </dt>
                  <dd className="text-dark text-lg leading-tight">
                    {doro.task}
                  </dd>
                </div>
              )}
              {doro.notes && (
                <div className="mb-2 flex">
                  <dt className="text-gray-500 w-16 mr-3 text-lg shrink-0 leading-tight font-bold ">
                    Notes:
                  </dt>
                  <dd className="text-dark text-lg leading-tight">
                    {doro.notes}
                  </dd>
                </div>
              )}
            </dl>
            {/* likes */}
            <div>
              {doro?.likes?.length > 0 && (
                <div className="mt-3">
                  <h2 className="mt-5 text-2xl mb-2">
                    Likes{" "}
                    {doro?.likes?.length > 0 && (
                      <span>({doro?.likes?.length})</span>
                    )}
                  </h2>
                  <div className="mb-3">
                    {doro?.likes?.length > 0 && (
                      <div className="mt-1.5">
                        <div className="flex gap-0.5">
                          {doro?.likes?.map((like, index) => (
                            <div key={like.postedBy?.image} className="">
                              <img
                                className="w-5 h-5 mr-0.5 rounded-full object-cover block"
                                src={like?.postedBy?.image}
                                alt="user-profile"
                              />
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
                        removeLike(doro._id);
                      }}
                      className={removeStyle}
                    >
                      Unlike
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addLike(doro._id);
                      }}
                      type="button"
                      disabled={likingDoro}
                      className="bg-red-600 text-white font-bold px-5 py-1 text-base rounded-lg transition hover:shadow-md outline-none"
                    >
                      {likingDoro ? "..." : "Like"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* comments */}
            <div className="mt-3">
              <div>
                {doro?.comments?.length > 0 && (
                  <div className="my-3">
                    <h2 className="mt-5 text-2xl mb-2">
                      <span>Comments</span>
                      <span> </span>
                      {doro?.comments?.length > 0 && (
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
                                className="w-5 h-5 rounded-full object-cover block relative top-1"
                                src={comment?.postedBy?.image}
                                alt="user-profile"
                              />
                            </Link>
                          </div>
                          <p>
                            <span key="cool">{comment?.commentText}</span>
                            <span key="double-cool"> </span>
                            {comment?.postedBy?._id ===
                              user?._id?.toString() && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteComment(doro._id, comment._key);
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
              <div id={`${doro._id}-commenting`}>
                <div className="flex items-end">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment"
                    className="block leading-tight outline-none text-base border-2 mr-3 border-gray-200 flex-grow p-2"
                  ></textarea>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addComment();
                    }}
                    disabled={comment?.length === 0 || addingComment}
                    type="button"
                    className="bg-red-600 text-white font-bold px-5 py-1 text-base rounded-lg hover:shadow-md outline-none"
                  >
                    {addingComment ? "Submitting" : "Submit"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DoroDetail;
