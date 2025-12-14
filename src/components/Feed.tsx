import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

import { client } from "../client";
import { feedQuery, searchQuery } from "../utils/data";
import Doros from "./Doros";
import Spinner from "./Spinner";
import { Doro } from "../types/models";

const Feed = () => {
  const [doros, setDoros] = useState<Doro[]>();
  const [loading, setLoading] = useState(false);
  const { categoryId } = useParams<{ categoryId?: string }>();

  useEffect(() => {
    const title = document.getElementById("crush-title");
    if (title) {
      title.innerHTML = "Crush Quest";
    }
  }, []);

  useEffect(() => {
    getFeed();
  }, [categoryId]);

  const getFeed = (showLoader = true) => {
    // console.log("😛😛😛😛😛😛😛😛😛😛");
    if (categoryId) {
      // console.log("category id 😛😛😛😛😛😛😛😛😛😛");

      if (showLoader) {
        setLoading(true);
      }
      const query = searchQuery(categoryId);
      client.fetch<Doro[]>(query).then((data) => {
        setDoros(data);
        setLoading(false);
      });
    } else {
      if (showLoader) {
        setLoading(true);
      }

      client.fetch<Doro[]>(feedQuery).then((data) => {
        // console.log("feed data 😛", data);
        setDoros(data);
        setLoading(false);
      });
    }
  };

  if (loading) {
    return (
      <div className="mt-12">
        <Spinner message={`Checking the vine...`} />
      </div>
    );
  }
  return <div>{doros && <Doros doros={doros} reloadFeed={getFeed} />}</div>;
};

export default Feed;
