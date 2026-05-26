import { Routes, Route, Navigate } from "react-router";
import { lazy, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LOGIN_PATH } from "@/const";
import ShaderBackground from "@/components/ShaderBackground";
import Header from "@/components/Header";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

const Hub = lazy(() => import("@/pages/Hub"));
const Transit = lazy(() => import("@/pages/Transit"));
const Habitat = lazy(() => import("@/pages/Habitat"));
const Pulse = lazy(() => import("@/pages/Pulse"));
const Forum = lazy(() => import("@/pages/Forum"));
const SpiritArena = lazy(() => import("@/pages/SpiritArena"));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0F" }}>
        <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: "#6C5CE7", borderRightColor: "#A29BFE" }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={LOGIN_PATH} replace />;
  }

  return (
    <>
      <ShaderBackground />
      <div className="relative z-10 min-h-screen" style={{ background: "rgba(10, 10, 15, 0.92)" }}>
        <Header />
        <div className="pt-16">
          {children}
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/hub"
        element={
          <ProtectedRoute>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#6C5CE7" }} /></div>}>
              <Hub />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transit"
        element={
          <ProtectedRoute>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#00CEC9" }} /></div>}>
              <Transit />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/habitat"
        element={
          <ProtectedRoute>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#FDCB6E" }} /></div>}>
              <Habitat />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pulse"
        element={
          <ProtectedRoute>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#E17055" }} /></div>}>
              <Pulse />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/forum"
        element={
          <ProtectedRoute>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#A29BFE" }} /></div>}>
              <Forum />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/spirit-arena"
        element={
          <ProtectedRoute>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#55EFC4" }} /></div>}>
              <SpiritArena />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/hub" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
