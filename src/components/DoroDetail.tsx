import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { AiTwotoneDelete, AiOutlineDelete } from "react-icons/ai";
import { supabase } from "../lib/supabaseClient";
import { getPomodoroDetail } from "../lib/queries";
import { useAuth } from "../contexts/AuthContext";
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

  const { user: authUser } = useAuth();
  const navigate = useNavigate();

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

  const fetchDoroDetails = async () => {
    if (!doroId) return;

    const { data, error } = await getPomodoroDetail(doroId);

    if (data && !error) {
      setDoro(data as unknown as Doro);
      setAddingComment(false);
      setLikingDoro(false);
    }
  };

  const deletePin = async (id: string) => {
    const { error } = await supabase.from("pomodoros").delete().eq("id", id);
    if (!error) {
      navigate("/");
    }
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (!error) {
      fetchDoroDetails();
    }
  };

  useEffect(() => {
    fetchDoroDetails();
  }, [doroId]);

  const addLike = async (id: string) => {
    if (!authUser || hasLiked) return;

    setLikingDoro(true);

    const { error } = await supabase.from("likes").insert({
      pomodoro_id: id,
      user_id: authUser.id,
    });

    if (!error) {
      fetchDoroDetails();
    }
  };

  const removeLike = async (id: string) => {
    if (!authUser || !hasLiked) return;

    setLikingDoro(true);

    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("pomodoro_id", id)
      .eq("user_id", authUser.id);

    if (!error) {
      fetchDoroDetails();
    }
  };

  const addComment = async () => {
    if (!authUser || !comment || !doroId) return;

    setAddingComment(true);

    const { error } = await supabase.from("comments").insert({
      pomodoro_id: doroId,
      user_id: authUser.id,
      comment_text: comment,
    });

    if (!error) {
      fetchDoroDetails();
      setComment("");
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
          {doro?.image_url && (
            <div className="flex justify-center items-center md:items-start flex-initial">
              <img
                style={{ maxHeight: "600px" }}
                className="rounded-lg self-center"
                src={doro.image_url}
                alt="user-post"
              />
            </div>
          )}
          <div className="w-full p-5 flex-1 xl:min-w-620">
            <div className="flex justify-between align-center mt-2">
              <Link
                to={`/user-profile/${doro?.users?.id}`}
                className="flex gap-2 items-center bg-white text-green-700 font-bold text-lg relative hover:text-green-800 "
              >
                <img
                  src={doro?.users?.avatar_url || ''}
                  className="w-10 h-10 rounded-full"
                  alt="user-profile"
                />
                <p className="font-bold">{doro?.users?.user_name}</p>
              </Link>

              <div className="">
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
                    className="bg-white px-2 text-red-600 text-5xl rounded-full w-10 h-7 flex items-center justify-center outline-none"
                  >
                    {deleteHovered ? <AiTwotoneDelete /> : <AiOutlineDelete />}
                  </button>
                )}
              </div>
            </div>

            <dl className="my-6">
              {doro.launch_at && (
                <div className="mb-2 flex">
                  <dt className=" text-gray-500 w-16 mr-3 text-lg shrink-0 leading-tight font-bold ">
                    Started:
                  </dt>
                  <dd className="text-dark text-lg leading-tight">
                    {" "}
                    {isToday(new Date(doro.launch_at))
                      ? `Today ${format(new Date(doro.launch_at), "h:mm a")}`
                      : format(new Date(doro.launch_at), "MMM dd, h:mm a")}
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
                              <div key={like.id} className="">
                                <img
                                  className="w-5 h-5 mr-0.5 rounded-full object-cover block"
                                  src={like.users?.avatar_url || ''}
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
                        removeLike(doro.id);
                      }}
                      className={removeStyle}
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
                          key={comment.id}
                          className="flex items-start gap-1.5 mb-1"
                        >
                          <div className="flex content-center shrink-0">
                            <Link
                              to={`/user-profile/${comment.users?.id}`}
                              className="items-center"
                            >
                              <img
                                className="w-5 h-5 rounded-full object-cover block relative top-1"
                                src={comment.users?.avatar_url || ''}
                                alt="user-profile"
                              />
                            </Link>
                          </div>
                          <p>
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
                                className="text-red-600 text-large relative top-0.5 inline-flex items-center justify-center outline-none"
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
              <div id={`${doro.id}-commenting`}>
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
