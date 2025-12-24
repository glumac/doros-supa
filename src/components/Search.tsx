import React from "react";

import Doros from "./Doros";
import { useSearchPomodoros, useFeed } from "../hooks/useFeed";
import { useAuth } from "../contexts/AuthContext";
import Spinner from "./Spinner";

interface SearchProps {
  searchTerm: string;
}

const Search = ({ searchTerm }: SearchProps) => {
  const { user } = useAuth();
  // Use React Query hooks instead of manual state management
  const { data: pins = [], isLoading: loading } = searchTerm
    ? useSearchPomodoros(searchTerm.toLowerCase())
    : useFeed(20, user?.id);

  return (
    <div className="cq-search-container">
      {loading && <div className="cq-search-loading"><Spinner /></div>}
      {pins.length !== 0 && <div className="cq-search-results"><Doros doros={pins} /></div>}
      {pins.length === 0 && searchTerm !== "" && !loading && (
        <div className="cq-search-empty mt-10 text-center text-xl ">No Pins Found!</div>
      )}
    </div>
  );
};

export default Search;
