import React, { useEffect, useState } from "react";

import Doros from "./Doros";
import { getFeed, searchPomodoros } from "../lib/queries";
import Spinner from "./Spinner";
import { Doro } from "../types/models";

interface SearchProps {
  searchTerm: string;
}

const Search = ({ searchTerm }: SearchProps) => {
  const [pins, setPins] = useState<Doro[]>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);

      let result;
      if (searchTerm !== "") {
        result = await searchPomodoros(searchTerm.toLowerCase());
      } else {
        result = await getFeed(20);
      }

      if (result.data && !result.error) {
        setPins(result.data as unknown as Doro[]);
      }
      setLoading(false);
    };

    fetchResults();
  }, [searchTerm]);

  return (
    <div>
      {loading && <Spinner />}
      {pins?.length !== 0 && <Doros doros={pins} />}
      {pins?.length === 0 && searchTerm !== "" && !loading && (
        <div className="mt-10 text-center text-xl ">No Pins Found!</div>
      )}
    </div>
  );
};

export default Search;
