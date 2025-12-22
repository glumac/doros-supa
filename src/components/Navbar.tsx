import { Link, useLocation } from "react-router-dom";
import { GiTomato } from "react-icons/gi";
import type { User } from "../types/models";
import { getAvatarPlaceholder } from "../utils/avatarPlaceholder";

interface NavbarProps {
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  user: User | null;
}

const Navbar = ({ searchTerm, setSearchTerm, user }: NavbarProps) => {
  const onCreateDoroPage = useLocation().pathname === "/create-doro";

  if (user) {
    return (
      <div className="cq-navbar-container flex gap-2 justify-end md:gap-5 w-full mt-5 pb-7 ">
        <div className="cq-navbar-actions flex gap-3 ">
          {!onCreateDoroPage && (
            <Link
              to="/create-doro"
              className="cq-navbar-launch-button bg-red-600 hover:bg-red-700 font-semibold transition flex gap-2 text-white rounded-lg h-12 px-4 md:h-12 flex text-2xl justify-center items-center"
            >
              <GiTomato />
              <span>Launch pomodoro</span>
            </Link>
          )}
          <Link
            to={`/user/${user.id}`}
            className="cq-navbar-user-link hidden md:block hover:shadow-md"
          >
            <img
              src={user.avatar_url || getAvatarPlaceholder(48)}
              alt="user-pic"
              className="cq-navbar-user-avatar w-12 h-12 rounded-lg object-cover"
            />
          </Link>
        </div>
      </div>
    );
  }

  return null;
};

export default Navbar;
