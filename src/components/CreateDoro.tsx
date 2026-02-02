import React, { useState, useEffect, useContext, useRef } from "react";
import { AiOutlineCloudUpload } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { MdDelete } from "react-icons/md";
import { format, previousMonday, nextSunday, isMonday } from "date-fns";
import { supabase } from "../lib/supabaseClient";
import { uploadPomodoroImage } from "../lib/storage";
import { getWeeklyLeaderboard } from "../lib/queries";
import { useCreatePomodoroMutation } from "../hooks/useMutations";
import { useDragAndDrop } from "../hooks/useDragAndDrop";
import { validateImageFile, convertHeicIfNeeded, isHeicFile } from "../lib/imageValidation";
import Spinner from "./Spinner";
import whoosh from "../assets/whoosh.mp3";
import DoroContext from "../utils/DoroContext";
import { removeStyle } from "../utils/styleDefs";
import TimerStyled from "./TimerStyled";
import { GiTomato } from "react-icons/gi";
import { User } from "../types/models";
import { getAvatarPlaceholder } from "../utils/avatarPlaceholder";

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


interface CreateDoroProps {
  user?: User;
}

interface ImageUploadAreaProps {
  loading: boolean;
  convertingHeic?: boolean;
  imageAsset: SanityAsset | null;
  uploadError: string | null;
  onFileSelect: (file: File) => void;
  onError: (error: string) => void;
  onDelete: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  disabled: boolean;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ImageUploadArea = ({
  loading,
  convertingHeic = false,
  imageAsset,
  uploadError,
  onFileSelect,
  onError,
  onDelete,
  fileInputRef,
  disabled,
  onFileInputChange,
}: ImageUploadAreaProps) => {
  const {
    isDragging,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    onKeyDown,
    ariaProps,
  } = useDragAndDrop({
    onFileSelect,
    onError,
    fileInputRef,
    disabled,
  });

  const dropZoneClasses = `cq-create-doro-image-upload-area flex justify-center items-center flex-col border-2 border-dotted p-3 w-full h-420 transition-all duration-200 ${
    isDragging
      ? 'border-red-600 bg-red-50'
      : 'border-gray-300'
  } ${disabled ? 'pointer-events-none opacity-50' : ''} focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2`;

  return (
    <div
      className={dropZoneClasses}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onKeyDown={onKeyDown}
      {...ariaProps}
      aria-describedby="upload-hint"
      aria-errormessage={uploadError ? 'upload-error' : undefined}
    >
      {loading && (
        <div className="cq-create-doro-image-loading mt-8" aria-live="polite" aria-busy="true">
          <Spinner />
        </div>
      )}
      {convertingHeic && (
        <div className="cq-create-doro-image-converting mt-8" aria-live="polite" aria-busy="true">
          <Spinner />
          <p className="text-gray-600 mt-2 text-sm">Converting HEIC image...</p>
        </div>
      )}
      {uploadError && (
        <p
          id="upload-error"
          className="cq-create-doro-image-error text-red-600 mb-2 text-sm"
          role="alert"
        >
          {uploadError}
        </p>
      )}
      {!imageAsset && !loading && !convertingHeic && (
        <>
          <label
            className="cq-create-doro-image-upload-label cursor-pointer"
            htmlFor="upload-image-input"
          >
            <div className="cq-create-doro-image-upload-prompt flex flex-col items-center justify-center h-full">
              <div className="cq-create-doro-image-upload-icon-container flex max-w-full flex-col justify-center items-center">
                <p className="cq-create-doro-image-upload-icon font-bold text-2xl">
                  <AiOutlineCloudUpload />
                </p>
                <p className="cq-create-doro-image-upload-text text-center text-lg">
                  {isDragging ? 'Drop image here' : 'Drag and drop or click to upload'}
                </p>
              </div>

              <p
                id="upload-hint"
                className="cq-create-doro-image-upload-hint max-w-fit mt-32 text-center text-gray-400"
              >
                PNG, JPEG, GIF, WebP, or HEIC <br /> less than 5MB
              </p>
            </div>
          </label>
          <input
            id="upload-image-input"
            ref={fileInputRef}
            type="file"
            name="upload-image"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/heic"
            onChange={onFileInputChange}
            className="cq-create-doro-image-input w-0 h-0 opacity-0 absolute"
            aria-label="File input"
          />
        </>
      )}
      {imageAsset && !loading && (
        <div className="cq-create-doro-image-preview-container relative h-full flex justify-center align-center">
          <div className="cq-create-doro-image-preview flex align-center">
            <img
              src={imageAsset?.url}
              alt="uploaded-pic"
              className="cq-create-doro-image-preview-img w-full self-center"
            />
          </div>
          <button
            type="button"
            className="cq-create-doro-image-delete-button absolute bottom-3 right-3 p-3 rounded-full bg-white text-xl cursor-pointer outline-none hover:shadow-md transition-all duration-500 ease-in-out"
            onClick={onDelete}
            aria-label="Delete image"
            disabled={disabled}
          >
            <MdDelete />
          </button>
        </div>
      )}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {loading && 'Uploading image...'}
        {uploadError && `Upload failed: ${uploadError}`}
        {imageAsset && !loading && 'Image uploaded successfully'}
      </div>
    </div>
  );
};

// Dev flag: Set to true to make pomodoros last 5 seconds instead of 25 minutes
const DEV_MODE_SHORT_TIMER = import.meta.env.DEV && import.meta.env.VITE_DEV_SHORT_TIMER === 'true';

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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [convertingHeic, setConvertingHeic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const navigate = useNavigate();
  const createPomodoroMutation = useCreatePomodoroMutation();

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

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (imageAsset?.url && imageAsset.url.startsWith('blob:')) {
        URL.revokeObjectURL(imageAsset.url);
      }
    };
  }, [imageAsset?.url]);

  // 30-second safety timeout for image upload
  useEffect(() => {
    if (loading || convertingHeic) {
      // Start timeout
      uploadTimeoutRef.current = setTimeout(() => {
        setLoading(false);
        setConvertingHeic(false);
        setUploadError('Upload took too long. Please try again.');
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 30000); // 30 seconds
    } else {
      // Clear timeout when upload completes or errors
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
        uploadTimeoutRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
        uploadTimeoutRef.current = null;
      }
    };
  }, [loading, convertingHeic]);

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
    // This function is kept for potential future use, but leaderboard
    // is now managed by LeaderboardContext, not DoroContext
    if (user?.id) {
      await getWeeklyLeaderboard(user.id);
    }
  };

  const clearAll = () => {
    localStorage.removeItem("timerState");
    setTask("");
    setLaunchAt(null);
    setLoading(false);
    setNotes("");
    setCompleted(false);
    // Clean up object URL if it exists
    if (imageAsset?.url && imageAsset.url.startsWith('blob:')) {
      URL.revokeObjectURL(imageAsset.url);
    }
    setImageAsset(null);
    setUploadError(null);
    setIsActive(false);
    setIsPaused(false);
    setTimeLeft(null);
    doroContext.setInProgress(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadError(null);

    if (!user?.id) {
      setUploadError("You must be logged in to upload images");
      return;
    }

    let processedFile = file;

    try {
      // Convert HEIC to JPEG if needed
      if (isHeicFile(file)) {
        setConvertingHeic(true);
        processedFile = await convertHeicIfNeeded(file);
        setConvertingHeic(false);
      }

      // Validate file after conversion (to check final size)
      const validation = validateImageFile(processedFile);
      if (!validation.valid) {
        setUploadError(validation.error || 'Invalid file');
        return;
      }

      setLoading(true);

      const { imagePath, error } = await uploadPomodoroImage(processedFile, user.id);

      if (error) {
        setLoading(false);
        setUploadError(
          "Sorry, that image did not work. Please try a different image."
        );
        console.log("Upload failed:", error);
      } else if (imagePath) {
        // Use local object URL for immediate preview (avoids RLS issues with signed URLs)
        // The path will be stored in the database, and signed URLs will be generated
        // when displaying the pomodoro (handled in Doro.tsx and DoroDetail.tsx)
        const localUrl = URL.createObjectURL(processedFile);
        setImageAsset({ _id: imagePath, url: localUrl });
        setLoading(false);
        // Reset file input to allow re-uploading same file
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      setConvertingHeic(false);
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : "Network error. Please check your connection and try again.";
      setUploadError(errorMessage);
      console.error("Upload error:", error);
    }
  };

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    await handleFileUpload(selectedFile);
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
    if (task && user?.id) {
      setSaving(true);

      try {
        // Store the path (not URL) in the database
        // imageAsset._id contains the path, imageAsset.url is the signed URL for display
        const imagePath = imageAsset?._id || null;

        await createPomodoroMutation.mutateAsync({
          user_id: user.id,
          launch_at: launchAt || new Date().toISOString(),
          task,
          notes: notes || null,
          completed,
          image_url: imagePath, // Store path, not signed URL
        });

        // Success - mutation hook automatically invalidates leaderboard queries
        navigate("/");
        clearAll();
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
    <div className="cq-create-doro-container mt-5">
      {!doroContext.inProgress && !completed && (
        <form
          className="cq-create-doro-form bg-white border-solid border-2 border-red-600 rounded-3xl p-5 pb-7 max-w-lg lg:max-w-2xl mx-auto"
          onSubmit={(e) => {
            e.preventDefault();
            const durationInMinutes = DEV_MODE_SHORT_TIMER ? 5 / 60 : 25;
            startTimer(durationInMinutes);
          }}
        >
          <h1 className="cq-create-doro-title text-4xl sm:text-3xl font-bold mb-5">Let's flow.</h1>

          <label
            className="cq-create-doro-label block outline-none text-2xl sm:text-xl font-bold"
            htmlFor="what-do"
          >
            What bit of&nbsp;
            <a
              href="https://sive.rs/book/DeepWork"
              className="cq-create-doro-deep-work-link text-red-600 underline-offset-4 underline"
              target="_blank"
              rel="noreferrer"
            >
              deep work
            </a>{" "}
            will you focus on for the next {DEV_MODE_SHORT_TIMER ? '5 seconds' : '25 minutes'}?
          </label>
          <div className="cq-create-doro-input-container flex items-stretch mt-5 gap-2 flex-wrap">
            <input
              type="text"
              id="what-do"
              value={task}
              autoComplete="on"
              onChange={(e) => setTask(e.target.value)}
              placeholder="This 🍅's task is..."
              className="cq-create-doro-task-input max-w-full placeholder-gray-500 outline-none flex-grow text-2xl sm:text-xl font-bold border-2 rounded-lg border-gray-200 p-2"
            />

            <button
              type="submit"
              className="cq-create-doro-start-button bg-red-600 text-white font-bold px-5 text-base rounded-lg hover:shadow-md outline-none py-2.5"
            >
              Start!
            </button>
          </div>
        </form>
      )}
      {doroContext.inProgress && (
        <div className="cq-create-doro-timer-container bg-white border-solid border-2 border-red-600 rounded-3xl p-5 max-w-lg lg:max-w-2xl mx-auto">
          <div className="cq-create-doro-timer-header flex mb-3 justify-between items-center relative">
            <h3 className="cq-create-doro-timer-duration text-dark text-lg">{DEV_MODE_SHORT_TIMER ? '5 seconds' : '25 minutes'}</h3>
            <div className="cq-create-doro-timer-started">
              {launchAt && (
                <div className="cq-create-doro-timer-started-info flex gap-2">
                  <span className="text-gray-500 text-lg">Started At:</span>
                  <span className="cq-create-doro-timer-started-time text-dark text-lg">
                    {format(new Date(launchAt), "h:mm a")}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="cq-create-doro-timer-task flex justify-center font-medium text-xl mb-2">
            {task}
          </div>
          <div className="cq-create-doro-timer-display">
            {/* <MyTimer expiryTimestamp={time} completeFunc={finishDoro} /> */}
            <div style={{ textAlign: "center" }}>
              <div className="cq-create-doro-timer-component">
                <TimerStyled
                  seconds={formatTime(timeLeft).seconds}
                  minutes={formatTime(timeLeft).minutes}
                />
              </div>
              {isActive && !isPaused ? (
                <button
                  className="cq-create-doro-pause-button bg-red-600 text-white font-bold px-5 py-1 text-base rounded-lg hover:shadow-md outline-none"
                  onClick={pauseTimer}
                >
                  Pause
                </button>
              ) : (
                <button
                  className="cq-create-doro-resume-button bg-red-600 text-white font-bold px-5 py-1 text-base rounded-lg hover:shadow-md outline-none"
                  onClick={resumeTimer}
                >
                  Resume
                </button>
              )}
            </div>
          </div>
          <div className="cq-create-doro-timer-cancel-container flex justify-center mt-5">
            <button type="button" onClick={stopTimer} className={`cq-create-doro-timer-cancel-button ${removeStyle}`}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!doroContext.inProgress && completed && (
        <div className="cq-create-doro-completed-container flex flex-col justify-center items-center mt-5 lg:h-4/5 bg-white border-solid border-2 border-red-600 rounded-3xl p-5 pb-7 max-w-lg lg:max-w-2xl mx-auto">
          {fields && (
            <p className="cq-create-doro-error-message text-red-600 mb-5 text-xl transition-all duration-150 ease-in">
              Please add all fields.
            </p>
          )}
          <div className="cq-create-doro-completed-content flex lg:flex-row flex-col justify-between items-center bg-white lg:p-2 p-1 w-full">
            <div className="cq-create-doro-image-upload-container bg-secondaryColor rounded-lg p-3 flex flex-0.7 w-full">
              <ImageUploadArea
                loading={loading}
                convertingHeic={convertingHeic}
                imageAsset={imageAsset}
                uploadError={uploadError}
                onFileSelect={handleFileUpload}
                onError={setUploadError}
                onDelete={() => {
                  // Clean up object URL if it exists
                  if (imageAsset?.url && imageAsset.url.startsWith('blob:')) {
                    URL.revokeObjectURL(imageAsset.url);
                  }
                  setImageAsset(null);
                  setUploadError(null);
                }}
                fileInputRef={fileInputRef}
                disabled={loading || convertingHeic}
                onFileInputChange={uploadImage}
              />
            </div>

            <div className="cq-create-doro-completed-form flex flex-1 flex-col gap-6 lg:pl-5 mt-5 h-full w-full">
              {launchAt && (
                <div className="cq-create-doro-completed-start-time">
                  <p className="cq-create-doro-completed-start-time-label font-bold text-gray-500 text-lg leading-tight">
                    Start time:
                  </p>
                  <p className="cq-create-doro-completed-start-time-value mt-2">{format(new Date(launchAt), "h:mm a")}</p>
                </div>
              )}
              <div className="cq-create-doro-completed-task-field">
                <label
                  htmlFor="task"
                  className="cq-create-doro-completed-task-label font-bold block text-gray-500 text-lg leading-tight"
                >
                  Task:
                </label>
                <input
                  type="text"
                  id="task"
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="What did you work on?"
                  className="cq-create-doro-completed-task-input mt-2 block w-full outline-none text-base border-gray-200 p-2 placeholder-gray-500 outline-none flex-grow border-2 rounded-lg border-gray-200"
                />
              </div>
              <div className="cq-create-doro-completed-notes-field">
                <label
                  htmlFor="notes"
                  className="cq-create-doro-completed-notes-label font-bold block text-gray-500 text-lg leading-tight"
                >
                  Notes (public):
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How did it go?"
                  className="cq-create-doro-completed-notes-input mt-2 block leading-tight w-full outline-none border-2 rounded-lg text-base border-b-2 border-gray-200 p-2"
                />
              </div>
              <div className="cq-create-doro-completed-actions flex flex-col">
                <div className="cq-create-doro-completed-actions-row flex justify-between items-center mt-5">
                  {user && (
                    <div className="cq-create-doro-completed-user-info flex gap-2 mt-2 mb-2 items-center bg-white rounded-lg ">
                      <img
                        src={user?.avatar_url || getAvatarPlaceholder(40)}
                        className="cq-create-doro-completed-user-avatar w-10 h-10 rounded-full"
                        alt="user-profile"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getAvatarPlaceholder(40);
                        }}
                      />
                      <p className="cq-create-doro-completed-user-name font-bold">{user?.user_name}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={saving || loading || convertingHeic}
                    onClick={saveDoro}
                    className="cq-create-doro-completed-share-button bg-red-600 text-white font-bold p-2 flex rounded-lg w-28 justify-center items-center outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Share &nbsp;</span>
                    <GiTomato />
                  </button>
                </div>
                {(loading || convertingHeic) && (
                  <p className="cq-create-doro-upload-status text-sm text-gray-600 text-center mt-2">
                    {convertingHeic ? 'Converting image...' : 'Uploading image...'}
                  </p>
                )}
              </div>
              <div className="cq-create-doro-completed-cancel-container flex justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    clearAll();
                    doroContext.setInProgress(false);
                  }}
                  className={`cq-create-doro-completed-cancel-button mt-5 mb-0 ${removeStyle}`}
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
