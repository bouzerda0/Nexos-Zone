import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Home } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function Header() {
  const { user, logout } = useAuth();
  const initials = user?.login
    ? user.login.toUpperCase().slice(0, 2)
    : "?";

  const hash = user?.avatarUrl;
  const avatarUrl = hash
    ? hash.startsWith("http")
      ? hash
      : "https://learn.zone01oujda.ma/git/avatars/" + hash
    : undefined;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6"
      style={{ background: "rgba(10, 10, 15, 0.6)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-3">
        <Link to="/hub" className="flex items-center gap-2 text-white no-underline">
          <span className="text-xl font-semibold tracking-tight">NEXUS</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(108, 92, 231, 0.2)", color: "#A29BFE", fontSize: "11px" }}>
            Zone 01 Oujda
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <Link
          to="/hub"
          className="flex items-center gap-1.5 text-sm transition-colors hover:text-white"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <Home size={16} />
          <span className="hidden sm:inline">Hub</span>
        </Link>

        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarImage 
              src={avatarUrl} 
              alt={user?.login || "User"} 
              className="object-cover"
            />
            <AvatarFallback 
              className="text-xs font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #6C5CE7, #A29BFE)" }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden sm:block" style={{ color: "rgba(255,255,255,0.8)" }}>
            {user?.login || "User"}
          </span>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm transition-colors hover:text-white"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
