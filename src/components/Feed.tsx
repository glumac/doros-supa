import React, { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useFeed, useSearchPomodoros } from "../hooks/useFeed";
import { useAuth } from "../contexts/AuthContext";
import Doros from "./Doros";
import Spinner from "./Spinner";

const Feed = () => {
  const { user } = useAuth();
  const { categoryId } = useParams<{ categoryId?: string }>();
  const [searchParams] = useSearchParams();

  // Read feed type from URL param, default to 'global'
  const feedType = (searchParams.get('feed') || 'global') as 'global' | 'following';

  // Use React Query hooks - automatically switches between feed and search
  const { data: doros = [], isLoading: loading } = categoryId
    ? useSearchPomodoros(categoryId)
    : useFeed(20, user?.id, feedType);

  useEffect(() => {
    const title = document.getElementById("crush-title");
    if (title) {
      title.innerHTML = "Crush Quest";
    }
  }, []);

  if (loading) {
    return (
      <div className="cq-feed-loading mt-12">
        <Spinner message={`Checking the vine...`} />
      </div>
    );
  }

  if (doros.length === 0) {
    return (
      <div className="cq-feed-empty text-center mt-12 text-gray-600">
        <p className="cq-feed-empty-message">No pomodoros found</p>
      </div>
    );
  }

  return <div className="cq-feed-container">{doros && <Doros doros={doros} />}</div>;
};

export default Feed;
