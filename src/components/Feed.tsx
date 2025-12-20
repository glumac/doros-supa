import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getFeed, searchPomodoros } from "../lib/queries";
import Doros from "./Doros";
import Spinner from "./Spinner";

const Feed = () => {
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
        // Get main feed
        result = await getFeed(20);
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
      <div className="mt-12">
        <Spinner message={`Checking the vine...`} />
      </div>
    );
  }

  if (doros.length === 0) {
    return (
      <div className="text-center mt-12 text-gray-600">
        <p>No pomodoros found</p>
      </div>
    );
  }

  return <div>{doros && <Doros doros={doros} reloadFeed={fetchFeed} />}</div>;
};

export default Feed;
