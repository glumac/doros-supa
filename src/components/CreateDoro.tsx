import React, { useState, useEffect, useContext } from "react";
import { AiOutlineCloudUpload } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { MdDelete } from "react-icons/md";
import { format, previousMonday, nextSunday, isMonday } from "date-fns";
import { supabase } from "../lib/supabaseClient";
import { uploadPomodoroImage, deletePomodoroImage } from "../lib/storage";
import { getWeeklyLeaderboard } from "../lib/queries";
import Spinner from "./Spinner";
import whoosh from "../assets/whoosh.mp3";
import DoroContext from "../utils/DoroContext";
import { removeStyle } from "../utils/styleDefs";
import TimerStyled from "./TimerStyled";
import { GiTomato } from "react-icons/gi";
import { User, Doro } from "../types/models";

interface FormatTimeResult {
  minutes: number;
  seconds: number;
}

interface TimerState {
  endTime?: number;
  pausedTimeLeft?: number | undefined;
  isPaused: boolean;
  originalDuration: number;
  launchAt: string;
  task: string;
}

interface SanityAsset {
  _id: string;
  url: string;
}

interface Leader {
  _id: string;
  userName: string;
  image: string;
  count: number;
}

interface CreateDoroProps {
  user?: User;
}

// Helper function to give minutes and seconds
const formatTime = (ms: number | null): FormatTimeResult => {
  if (!ms) return { minutes: 0, seconds: 0 };
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / 1000 / 60) % 60);

  return {
    minutes,
    seconds,
  };
};

const CreateDoro = ({ user }: CreateDoroProps) => {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [fields, setFields] = useState(false);
  const [imageAsset, setImageAsset] = useState<SanityAsset | null>(null);
  const [wrongImageType, setWrongImageType] = useState(false);
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  const title = document.getElementById("crush-title");

  const doroContext = useContext(DoroContext);

  // Use context state instead of local state
  const { task, setTask, launchAt, setLaunchAt, completed, setCompleted,
          timeLeft, setTimeLeft, isActive, setIsActive, isPaused, setIsPaused } = doroContext;

  useEffect(() => {
    console.log("doroContext.inProgress", doroContext.inProgress);
    if (!doroContext.inProgress && title) {
      title.innerHTML = "Crush Quest";
    }
  }, [doroContext.inProgress]);

  // Only restore state if not already initialized by Home component
  useEffect(() => {
    // Skip if already initialized from context
    if (doroContext.inProgress || isActive || completed) {
      return;
    }

    // Check for saved timer state on mount
    const savedStateStr = localStorage.getItem("timerState");
    if (savedStateStr) {
      const savedState: TimerState = JSON.parse(savedStateStr);
      const { endTime, pausedTimeLeft, isPaused, launchAt, task } = savedState;

      // Check if timer has expired but wasn't marked as completed
      if (endTime && endTime < Date.now() && !isPaused) {
        setLaunchAt(launchAt);
        setTask(task);
        return setCompleted(true);
      }

      doroContext.setInProgress(true);
      setLaunchAt(launchAt);
      setTask(task);
      if (isPaused && pausedTimeLeft) {
        // Resume from paused state
        setTimeLeft(pausedTimeLeft);
        setIsPaused(true);
        setIsActive(true); // Need to set this too for the resume button
      } else if (endTime && endTime > Date.now()) {
        // Resume from active state
        setIsActive(true);
        setIsPaused(false);
        setTimeLeft(endTime - Date.now());
      }
    }
  }, []);

  // Timer completion handler
  useEffect(() => {
    if (completed && isActive === false && doroContext.inProgress === false) {
      finishDoro();
    }
  }, [completed, isActive, doroContext.inProgress]);

  useEffect(() => {
    if (!isActive || !title) return;
    const time = formatTime(timeLeft);
    title.innerHTML = `${time.minutes}:${time.seconds < 10 ? "0" : ""}${
      time.seconds
    }`;
  }, [timeLeft, isActive]);

  const startTimer = (durationInMinutes: number) => {
    doroContext.setInProgress(true);
    const launchTime = new Date().toISOString();
    setLaunchAt(launchTime);
    const audio = new Audio(whoosh);
    audio.play();

    const endTime = Date.now() + durationInMinutes * 60 * 1000;
    const timerState: TimerState = {
      endTime,
      task,
      isPaused: false,
      originalDuration: durationInMinutes * 60 * 1000,
      launchAt: launchTime,
    };

    localStorage.setItem("timerState", JSON.stringify(timerState));
    setIsActive(true);
    setIsPaused(false);
    setTimeLeft(durationInMinutes * 60 * 1000);
  };

  const pauseTimer = () => {
    const currentTimeLeft = timeLeft;
    const savedStateStr = localStorage.getItem("timerState");
    const originalDuration = savedStateStr
      ? JSON.parse(savedStateStr).originalDuration
      : 0;

    const timerState: TimerState = {
      task, // Ensure task is saved
      launchAt: launchAt || "", // Ensure launchAt is saved
      pausedTimeLeft: currentTimeLeft || undefined,
      isPaused: true,
      originalDuration,
    };

    localStorage.setItem("timerState", JSON.stringify(timerState));
    setIsPaused(true);
  };

  const resumeTimer = () => {
    const endTime = Date.now() + (timeLeft || 0);
    const savedStateStr = localStorage.getItem("timerState");
    const originalDuration = savedStateStr
      ? JSON.parse(savedStateStr).originalDuration
      : 0;

    const timerState: TimerState = {
      task, // Ensure task is saved
      launchAt: launchAt || "", // Ensure launchAt is saved
      endTime,
      isPaused: false,
      originalDuration,
    };

    localStorage.setItem("timerState", JSON.stringify(timerState));
    setIsPaused(false);
  };

  const stopTimer = () => {
    localStorage.removeItem("timerState");
    console.log("stopping timer");
    doroContext.setInProgress(false);
    setIsActive(false);
    setIsPaused(false);
    setTimeLeft(null);
  };

  // Add visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("visible 👀");
        const savedStateStr = localStorage.getItem("timerState");
        if (savedStateStr) {
          const savedState: TimerState = JSON.parse(savedStateStr);
          const { endTime, pausedTimeLeft, isPaused, launchAt, task } =
            savedState;

          // Check if timer has expired but wasn't marked as completed
          if (endTime && endTime < Date.now() && !isPaused) {
            setLaunchAt(launchAt);
            setTask(task);
            return setCompleted(true);
          }

          doroContext.setInProgress(true);
          setLaunchAt(launchAt);
          setTask(task);
          if (isPaused && pausedTimeLeft) {
            // Resume from paused state
            setTimeLeft(pausedTimeLeft);
            setIsPaused(true);
            setIsActive(true); // Need to set this too for the resume button
          } else if (endTime && endTime > Date.now()) {
            // Resume from active state
            setIsActive(true);
            setIsPaused(false);
            setTimeLeft(endTime - Date.now());
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [doroContext, setTask, setLaunchAt, setCompleted, setTimeLeft, setIsPaused, setIsActive]);

  const getPreviousMonday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isMonday(today)) {
      return today;
    } else {
      return previousMonday(today);
    }
  };

  const getUpdatedLeaders = async () => {
    const { data, error } = await getWeeklyLeaderboard();
    if (data && !error) {
      // Transform Supabase data to match Leader interface
      const leaders = data.map((item: any) => ({
        _id: item.user_id,
        userName: item.user_name,
        image: item.avatar_url,
        count: item.completion_count,
      }));
      doroContext.setLeaderBoard(leaders);
    }
  };

  const clearAll = () => {
    localStorage.removeItem("timerState");
    setTask("");
    setLaunchAt(null);
    setLoading(false);
    setNotes("");
    setCompleted(false);
    setImageAsset(null);
    setWrongImageType(false);
    setIsActive(false);
    setIsPaused(false);
    setTimeLeft(null);
    doroContext.setInProgress(false);
  };

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    console.log("FILE TYPE", selectedFile.type);

    // uploading asset to Supabase Storage
    if (
      selectedFile.type === "image/png" ||
      selectedFile.type === "image/svg" ||
      selectedFile.type === "image/jpeg" ||
      selectedFile.type === "image/jpg" ||
      selectedFile.type === "image/gif" ||
      selectedFile.type === "image/tiff" ||
      selectedFile.type === "image/webp" ||
      selectedFile.type === "image/heic"
    ) {
      setWrongImageType(false);
      setLoading(true);

      if (!user?._id) {
        setLoading(false);
        alert("You must be logged in to upload images");
        return;
      }

      const { imageUrl, error } = await uploadPomodoroImage(selectedFile, user._id);

      if (error) {
        setLoading(false);
        alert(
          "Sorry, that image did not work. (Note: HEIC - some iPhone- images are not supported yet if you upload from a computer and not iPhone :/)"
        );
        console.log("Upload failed:", error);
      } else if (imageUrl) {
        setImageAsset({ _id: imageUrl, url: imageUrl });
        setLoading(false);
      }
    } else {
      setLoading(false);
      setWrongImageType(true);
    }
  };

  const finishDoro = () => {
    doroContext.setInProgress(false);
    setCompleted(true);
    try {
      const audio = new Audio(whoosh);
      audio.play();
    } catch (error) {
      console.log("Audio playback failed:", error);
    }
    if (title) {
      title.innerHTML = "Done! 👏";
    }
  };

  const saveDoro = async () => {
    if (task && user?._id) {
      setSaving(true);

      try {
        const { error } = await supabase.from("pomodoros").insert({
          user_id: user._id,
          launch_at: launchAt || new Date().toISOString(),
          task,
          notes: notes || null,
          completed,
          image_url: imageAsset?.url || null,
        });

        if (error) {
          console.error("Error saving pomodoro:", error);
          alert("Failed to save pomodoro. Please try again.");
        } else {
          await getUpdatedLeaders();
          navigate("/");
          clearAll();
        }
      } catch (error) {
        console.error("Error saving pomodoro:", error);
        alert("Failed to save pomodoro. Please try again.");
      } finally {
        setSaving(false);
      }
    } else {
      setFields(true);

      setTimeout(() => {
        setFields(false);
      }, 2000);
    }
  };
  return (
    <div className="mt-5">
      {!doroContext.inProgress && !completed && (
        <div className="bg-white border-solid border-2 border-red-600 rounded-3xl p-5 pb-7 max-w-lg lg:max-w-2xl mx-auto">
          <h1 className="text-4xl sm:text-3xl font-bold mb-5">Let's flow.</h1>

          <label
            className="block outline-none text-2xl sm:text-xl font-bold"
            htmlFor="what-do"
          >
            What bit of&nbsp;
            <a
              href="https://sive.rs/book/DeepWork"
              className="text-red-600 underline-offset-4 underline"
              target="_blank"
              rel="noreferrer"
            >
              deep work
            </a>{" "}
            will you focus on for the next 25 minutes?
          </label>
          <div className="flex items-stretch mt-5 gap-2 flex-wrap">
            <input
              type="text"
              id="what-do"
              value={task}
              autoComplete="on"
              onChange={(e) => setTask(e.target.value)}
              placeholder="This 🍅's task is..."
              className="max-w-full placeholder-gray-500 outline-none flex-grow text-2xl sm:text-xl font-bold border-2 rounded-lg border-gray-200 p-2"
            />

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                startTimer(25);
              }}
              className="bg-red-600 text-white font-bold px-5 text-base rounded-lg hover:shadow-md outline-none py-2.5"
            >
              Start!
            </button>
          </div>
        </div>
      )}
      {doroContext.inProgress && (
        <div className="bg-white border-solid border-2 border-red-600 rounded-3xl p-5 max-w-lg lg:max-w-2xl mx-auto">
          <div className="flex mb-3 justify-between items-center relative">
            <h3 className="text-dark text-lg">25 minutes</h3>
            <div>
              {launchAt && (
                <div className="flex gap-2">
                  <span className="text-gray-500 text-lg">Started At:</span>
                  <span className="text-dark text-lg">
                    {format(new Date(launchAt), "h:mm a")}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center font-medium text-xl mb-2">
            {task}
          </div>
          <div>
            {/* <MyTimer expiryTimestamp={time} completeFunc={finishDoro} /> */}
            <div style={{ textAlign: "center" }}>
              <div>
                <TimerStyled
                  seconds={formatTime(timeLeft).seconds}
                  minutes={formatTime(timeLeft).minutes}
                />
              </div>
              {isActive && !isPaused ? (
                <button
                  className="bg-red-600 text-white font-bold px-5 py-1 text-base rounded-lg hover:shadow-md outline-none"
                  onClick={pauseTimer}
                >
                  Pause
                </button>
              ) : (
                <button
                  className="bg-red-600 text-white font-bold px-5 py-1 text-base rounded-lg hover:shadow-md outline-none"
                  onClick={resumeTimer}
                >
                  Resume
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-center mt-5">
            <button type="button" onClick={stopTimer} className={removeStyle}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!doroContext.inProgress && completed && (
        <div className="flex flex-col justify-center items-center mt-5 lg:h-4/5 bg-white border-solid border-2 border-red-600 rounded-3xl p-5 pb-7 max-w-lg lg:max-w-2xl mx-auto">
          {fields && (
            <p className="text-red-600 mb-5 text-xl transition-all duration-150 ease-in">
              Please add all fields.
            </p>
          )}
          <div className="flex lg:flex-row flex-col justify-between items-center bg-white lg:p-2 p-1 w-full">
            <div className="bg-secondaryColor rounded-lg p-3 flex flex-0.7 w-full">
              <div className=" flex justify-center items-center flex-col border-2 border-dotted border-gray-300 p-3 w-full h-420">
                {loading && (
                  <div className="mt-8">
                    <Spinner />
                  </div>
                )}
                {wrongImageType && <p>It&apos;s wrong file type.</p>}
                {!imageAsset ? (
                  // eslint-disable-next-line jsx-a11y/label-has-associated-control
                  <label>
                    <div className="flex cursor-pointer flex-col items-center justify-center h-full">
                      <div className="flex max-w-full flex-col justify-center items-center">
                        <p className="font-bold text-2xl">
                          <AiOutlineCloudUpload />
                        </p>
                        <p className="text-lg">Click to upload</p>
                      </div>

                      <p className="max-w-fit mt-32 text-center text-gray-400">
                        JPG, JPEG, SVG, PNG, GIF <br /> or TIFF less than 20MB
                      </p>
                    </div>
                    <input
                      type="file"
                      name="upload-image"
                      onChange={uploadImage}
                      className="w-0 h-0 opacity-0"
                    />
                  </label>
                ) : (
                  <div className="relative h-full flex justify-center align-center">
                    <div className="flex align-center">
                      <img
                        src={imageAsset?.url}
                        alt="uploaded-pic"
                        className="w-full self-center"
                      />
                    </div>
                    <button
                      type="button"
                      className="absolute bottom-3 right-3 p-3 rounded-full bg-white text-xl cursor-pointer outline-none hover:shadow-md transition-all duration-500 ease-in-out"
                      onClick={() => setImageAsset(null)}
                    >
                      <MdDelete />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-6 lg:pl-5 mt-5 h-full w-full">
              {launchAt && (
                <div>
                  <p className="font-bold text-gray-500 text-lg leading-tight">
                    Start time:
                  </p>
                  <p className="mt-2">{format(new Date(launchAt), "h:mm a")}</p>
                </div>
              )}
              <div>
                <label
                  htmlFor="task"
                  className="font-bold block text-gray-500 text-lg leading-tight"
                >
                  Task:
                </label>
                <input
                  type="text"
                  id="task"
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="What did you work on?"
                  className="mt-2 block w-full outline-none text-base border-gray-200 p-2 placeholder-gray-500 outline-none flex-grow border-2 rounded-lg border-gray-200"
                />
              </div>
              <div>
                <label
                  htmlFor="notes"
                  className="font-bold block text-gray-500 text-lg leading-tight"
                >
                  Notes (public):
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How did it go?"
                  className="mt-2 block leading-tight w-full outline-none border-2 rounded-lg text-base border-b-2 border-gray-200 p-2"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex justify-between items-center mt-5">
                  {user && (
                    <div className="flex gap-2 mt-2 mb-2 items-center bg-white rounded-lg ">
                      <img
                        src={user?.image}
                        className="w-10 h-10 rounded-full"
                        alt="user-profile"
                      />
                      <p className="font-bold">{user?.userName}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={saving}
                    onClick={saveDoro}
                    className="bg-red-600 text-white font-bold p-2 flex rounded-lg w-28 justify-center items-center outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Share &nbsp;</span>
                    <GiTomato />
                  </button>
                </div>
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    clearAll();
                    doroContext.setInProgress(false);
                  }}
                  className={`mt-5 mb-0 ${removeStyle}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateDoro;
