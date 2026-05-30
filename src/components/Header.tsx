import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Home, Car, Utensils, Activity, Sun, Moon, MessageSquare, Fingerprint, Menu, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const initials = user?.login
    ? user.login.toUpperCase().slice(0, 2)
    : "?";

  const hash = user?.avatarUrl;
  const avatarUrl = typeof hash === "string" && hash
    ? (hash.startsWith("http") ? hash : `https://learn.zone01oujda.ma/git/avatars/${hash}`)
    : undefined;

  const navItems = [
    { name: "Forum", path: "/forum", icon: MessageSquare, color: "#A29BFE" },
    { name: "Transit", path: "/transit", icon: Car, color: "#00CEC9" },
    { name: "Pulse", path: "/pulse", icon: Utensils, color: "#E17055" },
    { name: "Habitat", path: "/habitat", icon: Home, color: "#FDCB6E" },
    { name: "Spirit", path: "/spirit-arena", icon: Activity, color: "#55EFC4" },
  ];

  return (
    <>
      <header 
        className="fixed top-0 left-0 right-0 z-50 h-16 grid grid-cols-2 md:grid-cols-[1fr_auto_1fr] items-center px-4 md:px-6 transition-colors duration-300 border-b"
        style={{ 
          background: "hsl(var(--background) / 0.7)", 
          backdropFilter: "blur(20px)", 
          WebkitBackdropFilter: "blur(20px)", 
          borderColor: "hsl(var(--border) / 0.5)"
        }}
      >
        {/* LEFT SIDE: Brand/Logo */}
        <div className="flex items-center justify-self-start">
          <Link 
            to="/hub" 
            className="flex items-center gap-2 md:gap-2.5 cursor-pointer hover:opacity-80 transition-opacity no-underline group"
          >
            <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-primary to-primary/70 text-primary-foreground rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 ring-1 ring-foreground/10 group-hover:shadow-primary/50 transition-all duration-300">
              <Fingerprint className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <h1 className="text-lg md:text-xl sm:text-2xl font-extrabold tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-br from-foreground to-foreground/50 drop-shadow-sm m-0">
                Nexus
              </h1>
              <span className="hidden sm:flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold tracking-wider bg-purple-500/10 border border-purple-500/20 text-purple-400 shadow-[0_0_10px_-3px_rgba(168,85,247,0.3)] group-hover:bg-purple-500/20 group-hover:border-purple-500/30 transition-all duration-300 uppercase whitespace-nowrap">
                Zone 01 Oujda
              </span>
            </div>
          </Link>
        </div>

        {/* CENTER: Navigation Fix (Elevated with Framer Motion) */}
        <nav 
          className="hidden md:flex items-center justify-center p-1.5 rounded-full transition-all duration-300 shadow-sm"
          style={{ 
            background: "hsl(var(--foreground) / 0.05)", 
            border: "1px solid hsl(var(--foreground) / 0.1)" 
          }}
          onMouseLeave={() => setHoveredPath(null)}
        >
          <ul className="flex items-center gap-1 sm:gap-2 m-0 p-0 list-none">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const isHovered = hoveredPath === item.path;

              return (
                <li key={item.name} className="relative">
                  <Link
                    to={item.path}
                    onMouseEnter={() => setHoveredPath(item.path)}
                    className="relative flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-sm font-medium transition-colors duration-300 z-10 no-underline"
                    style={{ 
                      color: isActive || isHovered ? "hsl(var(--foreground))" : "hsl(var(--foreground) / 0.5)",
                      textShadow: isActive ? `0 0 10px ${item.color}44` : "none"
                    }}
                  >
                    <item.icon 
                      size={isActive ? 16 : 14} 
                      className="sm:w-4 sm:h-4 transition-transform duration-300"
                      style={{ 
                        color: isActive || isHovered ? item.color : "hsl(var(--foreground) / 0.3)",
                        transform: isHovered ? "scale(1.1)" : "scale(1)"
                      }}
                    />
                    <span>{item.name}</span>
                  </Link>

                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="nav-glow"
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] rounded-full z-20"
                        style={{ background: item.color, boxShadow: `0 0 12px ${item.color}` }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      />
                    )}
                  </AnimatePresence>

                  {isHovered && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full w-full h-full -z-0"
                      style={{ 
                        background: "hsl(var(--foreground) / 0.1)",
                        border: "1px solid hsl(var(--foreground) / 0.15)"
                      }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* RIGHT SIDE: User Avatar & Auth (Strictly Preserved + Theme Toggle) */}
        <div className="flex items-center gap-2 sm:gap-4 justify-self-end">
          <Link
            to="/hub"
            className="hidden md:flex items-center gap-1.5 text-sm transition-colors hover:text-foreground"
            style={{ color: "hsl(var(--foreground) / 0.5)" }}
          >
            <Home size={16} />
            <span className="hidden sm:inline">Hub</span>
          </Link>
          
          <motion.button
            id="theme-toggle"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 md:p-2 rounded-full transition-colors border shadow-sm"
            style={{ 
              background: "hsl(var(--foreground) / 0.05)", 
              color: "hsl(var(--foreground) / 0.7)",
              borderColor: "hsl(var(--foreground) / 0.1)"
            }}
          >
            {theme === "dark" ? <Sun size={16} className="md:w-[18px] md:h-[18px]" /> : <Moon size={16} className="md:w-[18px] md:h-[18px]" />}
          </motion.button>

          <Link 
            to={`/profile/${user?.login}`} 
            className="flex items-center gap-1.5 md:gap-2 px-1 md:px-2 py-1 md:py-1.5 rounded-lg transition-all hover:bg-foreground/5 cursor-pointer no-underline"
          >
            <Avatar className="w-6 h-6 md:w-8 md:h-8 border">
              <AvatarImage 
                src={avatarUrl} 
                alt={user?.login || "User"} 
                className="object-cover"
              />
              <AvatarFallback 
                className="text-[10px] md:text-xs font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #6C5CE7, #A29BFE)" }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden sm:block transition-opacity hover:opacity-80" style={{ color: "hsl(var(--foreground) / 0.8)" }}>
              {user?.login || "User"}
            </span>
          </Link>

          <button
            onClick={logout}
            className="hidden md:flex items-center gap-1.5 text-sm transition-colors hover:text-foreground hover:bg-foreground/5 px-2 py-1 rounded-md"
            style={{ color: "hsl(var(--foreground) / 0.5)" }}
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>

          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 rounded-full transition-colors border shadow-sm ml-1"
            style={{ 
              background: "hsl(var(--foreground) / 0.05)", 
              color: "hsl(var(--foreground) / 0.7)",
              borderColor: "hsl(var(--foreground) / 0.1)"
            }}
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* MOBILE MENU DROPDOWN (Strictly Mobile Only) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="fixed top-16 left-0 right-0 z-40 border-b overflow-hidden md:hidden shadow-2xl"
            style={{ 
              background: "hsl(var(--background) / 0.95)", 
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderColor: "hsl(var(--border) / 0.5)"
            }}
          >
            <div className="flex flex-col gap-2 p-4">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-300 no-underline"
                    style={{ 
                      background: isActive ? `${item.color}22` : "hsl(var(--foreground) / 0.03)",
                      color: isActive ? item.color : "hsl(var(--foreground) / 0.8)",
                      border: `1px solid ${isActive ? item.color + '44' : 'transparent'}`
                    }}
                  >
                    <item.icon size={20} style={{ color: isActive ? item.color : "inherit" }} />
                    <span className="font-semibold text-base">{item.name}</span>
                  </Link>
                );
              })}
              
              <Link
                to="/hub"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-300 no-underline"
                style={{ background: "hsl(var(--foreground) / 0.03)", color: "hsl(var(--foreground) / 0.8)", border: "1px solid transparent" }}
              >
                <Home size={20} />
                <span className="font-semibold text-base">Hub</span>
              </Link>
              
              <div className="h-[1px] w-full my-2" style={{ background: "hsl(var(--border) / 0.5)" }} />
              
              <button
                onClick={() => { setIsMobileMenuOpen(false); logout(); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-300 no-underline w-full text-left"
                style={{ 
                  background: "hsl(var(--destructive) / 0.1)",
                  color: "hsl(var(--destructive))",
                  border: "1px solid hsl(var(--destructive) / 0.2)"
                }}
              >
                <LogOut size={20} />
                <span className="font-semibold text-base">Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
