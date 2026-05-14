import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import NavBar from "./components/NavBar";
import Login from "./pages/Login";
import AcceptInvite from "./pages/AcceptInvite";
import ClientRegister from "./pages/ClientRegister";
import ClientPortal from "./pages/ClientPortal";
import SitterPortal from "./pages/SitterPortal";
import AdminDashboard from "./pages/AdminDashboard";
import EmbedView from "./pages/EmbedView";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireClient({ children }: { children: JSX.Element }) {
  const { client, user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!client) return <Navigate to="/register/client" replace />;
  return children;
}

function RequireSitter({ children }: { children: JSX.Element }) {
  const { sitter, loading } = useAuth();
  if (loading) return null;
  if (!sitter) return <Navigate to="/login" replace />;
  return children;
}

function RequireOwner({ children }: { children: JSX.Element }) {
  const { sitter, loading } = useAuth();
  if (loading) return null;
  if (!sitter?.is_owner) return <Navigate to="/" replace />;
  return children;
}

function Home() {
  const { sitter, client } = useAuth();
  if (sitter?.is_owner) return <Navigate to="/admin" replace />;
  if (sitter) return <Navigate to="/sitter" replace />;
  if (client) return <Navigate to="/client" replace />;
  return <Navigate to="/embed" replace />;
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Embed view — no navbar, designed to be iframed */}
        <Route path="/embed" element={<EmbedView />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/invite/:token" element={<AcceptInvite />} />

        {/* Authenticated routes — with navbar */}
        <Route
          path="/*"
          element={
            <>
              <NavBar />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route
                  path="/register/client"
                  element={
                    <RequireAuth>
                      <ClientRegister />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/client"
                  element={
                    <RequireClient>
                      <ClientPortal />
                    </RequireClient>
                  }
                />
                <Route
                  path="/sitter"
                  element={
                    <RequireSitter>
                      <SitterPortal />
                    </RequireSitter>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <RequireOwner>
                      <AdminDashboard />
                    </RequireOwner>
                  }
                />
              </Routes>
            </>
          }
        />
      </Routes>
    </div>
  );
}
