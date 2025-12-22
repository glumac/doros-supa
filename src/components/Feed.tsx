import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getFeed, searchPomodoros } from "../lib/queries";
import { useAuth } from "../contexts/AuthContext";
import Doros from "./Doros";
import Spinner from "./Spinner";

const Feed = () => {
  const { user } = useAuth();
  const [doros, setDoros] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { categoryId } = useParams<{ categoryId?: string }>();

  useEffect(() => {
    const title = document.getElementById("crush-title");
    if (title) {
      title.innerHTML = "Crush Quest";
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [categoryId]);

  const fetchFeed = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      let result;
      if (categoryId) {
        // Search by category/term
        result = await searchPomodoros(categoryId);
      } else {
        // Get main feed (pass user ID to filter blocked users)
        result = await getFeed(20, user?.id);
      }

      if (result.data) {
        // Use Supabase data directly (no transformation needed)
        setDoros(result.data);
      } else if (result.error) {
        console.error("Error fetching feed:", result.error);
      }
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
    }
  };

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

  return <div className="cq-feed-container">{doros && <Doros doros={doros} reloadFeed={fetchFeed} />}</div>;
};

export default Feed;
