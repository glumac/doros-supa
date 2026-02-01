import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { removeStyle } from '../utils/styleDefs';

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className = '' }: LogoutButtonProps) {
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Log error but still navigate to login page
      console.error('Failed to sign out:', error);
    }
    // Always navigate to login regardless of signOut success/failure
    navigate("/login");
  };

  return (
    <button
      type="button"
      className={`cq-logout-button ${removeStyle} w-20 text-right ${className}`}
      onClick={() => logout()}
    >
      Log out
    </button>
  );
}

export default LogoutButton;
