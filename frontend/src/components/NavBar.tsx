import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function NavBar() {
  const { sitter, client, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold text-brand-600">
        🐾 PawScheduler
      </Link>
      <div className="flex items-center gap-4 text-sm">
        {sitter?.is_owner && (
          <Link to="/admin" className="text-gray-600 hover:text-brand-600 font-medium">
            Admin
          </Link>
        )}
        {sitter && (
          <Link to="/sitter" className="text-gray-600 hover:text-brand-600 font-medium">
            My Calendar
          </Link>
        )}
        {client && (
          <Link to="/client" className="text-gray-600 hover:text-brand-600 font-medium">
            My Bookings
          </Link>
        )}
        {(sitter || client) ? (
          <button
            onClick={handleSignOut}
            className="text-gray-500 hover:text-red-600"
          >
            Sign out
          </button>
        ) : (
          <Link to="/login" className="text-brand-600 font-medium">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
