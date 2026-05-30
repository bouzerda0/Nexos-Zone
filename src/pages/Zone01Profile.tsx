import { useState, useEffect, useRef } from "react";
import { motion, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { trpc } from "@/providers/trpc";
import {
  GraduationCap,
  TrendingUp,
  Zap,
  EyeOff,
  ArrowLeft,
  Loader2,
  Star,
  Trophy,
  CalendarDays,
} from "lucide-react";
import { Link, useParams } from "react-router";

// ── XP level calculation ─────────────────────────────────────────────
function computeLevel(xp: number): { level: number; progress: number } {
  // Zone 01 uses a logarithmic level curve
  if (xp <= 0) return { level: 0, progress: 0 };
  const level = Math.floor(Math.log2(xp / 1000 + 1));
  const currentLevelXp = (Math.pow(2, level) - 1) * 1000;
  const nextLevelXp = (Math.pow(2, level + 1) - 1) * 1000;
  const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
  return { level, progress: Math.min(Math.max(progress, 0), 100) };
}

function formatXp(xp: number): string {
  if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(2)} MB`;
  if (xp >= 1_000) return `${(xp / 1_000).toFixed(1)} kB`;
  return `${xp} B`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Animated XP Counter ──────────────────────────────────────────────
function AnimatedXpCounter({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 40, damping: 20 });
  const display = useTransform(spring, (v) => formatXp(Math.round(v)));
  const [text, setText] = useState(formatXp(0));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsub = display.on("change", (v) => setText(v));
    return unsub;
  }, [display]);

  return <span ref={ref}>{text}</span>;
}



// ── Bento Grid Cell wrapper ──────────────────────────────────────────
function BentoCell({
  children,
  className = "",
  delay = 0,
  glowColor = "rgba(0,180,216,0.08)",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  glowColor?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`relative rounded-3xl overflow-hidden ${className}`}
      style={{
        background: "hsl(var(--foreground) / 0.04)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid hsl(var(--foreground) / 0.07)",
        boxShadow: `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 hsl(var(--foreground) / 0.04)`,
      }}
      whileHover={{
        borderColor: "rgba(0,180,216,0.25)",
        boxShadow: `0 12px 48px rgba(0,0,0,0.35), 0 0 60px ${glowColor}`,
      }}
    >
      {children}
    </motion.div>
  );
}

// ── Main Page Component ──────────────────────────────────────────────
export default function Zone01Profile() {
  const { login } = useParams<{ login: string }>();
  const [imgError, setImgError] = useState(false);

  const { data: profileData, isLoading, error, refetch } = trpc.zone01.getProfile.useQuery(
    { login: login || "" },
    { enabled: !!login, retry: false }
  );

  const level = profileData ? computeLevel(profileData.totalXp) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <Loader2 size={48} className="animate-spin mb-4" style={{ color: "#00B4D8" }} />
        <p className="text-sm" style={{ color: "hsl(var(--foreground) / 0.5)" }}>
          Loading profile...
        </p>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255,107,107,0.1)" }}
          >
            <EyeOff size={32} color="#FF6B6B" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Profile Not Found
          </h1>
          <p style={{ color: "hsl(var(--foreground) / 0.45)" }} className="text-sm max-w-sm mx-auto mb-6">
            {error?.message || "Could not locate this user in the Nexus database."}
          </p>
          <Link
            to="/hub"
            className="flex items-center justify-center gap-2 text-sm transition-colors hover:text-foreground mx-auto"
            style={{ color: "hsl(var(--foreground) / 0.4)" }}
          >
            <ArrowLeft size={14} />
            Back to Hub
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Data loaded → Bento Grid Dashboard ─────────────────────
  const initials =
    (profileData.firstName?.[0] || "") + (profileData.lastName?.[0] || profileData.login?.[0] || "");

  return (
    <div className="min-h-screen px-6 py-8 max-w-[1200px] mx-auto">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div className="flex items-center gap-3">
          <Link
            to="/hub"
            className="flex items-center gap-1.5 text-sm transition-colors hover:text-foreground"
            style={{ color: "hsl(var(--foreground) / 0.4)" }}
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Student Dashboard</h1>
            <p className="text-xs" style={{ color: "hsl(var(--foreground) / 0.4)" }}>
              Zone 01 Oujda — Intra Profile
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="text-xs px-4 py-2 rounded-xl transition-all duration-200"
          style={{
            background: "hsl(var(--foreground) / 0.06)",
            border: "1px solid hsl(var(--foreground) / 0.08)",
            color: "hsl(var(--foreground) / 0.5)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(0,180,216,0.4)";
            e.currentTarget.style.color = "#00B4D8";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "";
            e.currentTarget.style.color = "";
          }}
        >
          Refresh Data
        </button>
      </motion.div>

      {/* ── Bento Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 auto-rows-min">
        {/* ── Profile Card (2×2) ──────────────────────────────── */}
        <BentoCell className="col-span-1 md:col-span-2 md:row-span-2 p-8" delay={0.05}>
          {/* Decorative gradient orb */}
          <div
            className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full pointer-events-none opacity-40"
            style={{
              background: "radial-gradient(circle, rgba(0,180,216,0.2), transparent 70%)",
            }}
          />

          <div className="relative z-10 flex flex-col items-center text-center gap-5 h-full justify-center">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 120 }}
              className="relative"
            >
              {profileData.avatarUrl && !imgError ? (
                <img
                  src={profileData.avatarUrl}
                  alt={profileData.login}
                  onError={() => setImgError(true)}
                  className="w-28 h-28 rounded-3xl object-cover"
                  style={{
                    border: "3px solid rgba(0,180,216,0.3)",
                    boxShadow: "0 8px 40px rgba(0,180,216,0.2)",
                  }}
                />
              ) : (
                <div
                  className="w-28 h-28 rounded-3xl flex items-center justify-center text-3xl font-bold text-white"
                  style={{
                    background: "linear-gradient(135deg, #00B4D8, #0077B6)",
                    boxShadow: "0 8px 40px rgba(0,180,216,0.25)",
                  }}
                >
                  {initials.toUpperCase()}
                </div>
              )}
              {/* Online indicator dot */}
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2"
                style={{
                  background: "#00E676",
                  borderColor: "#0A0A0F",
                  boxShadow: "0 0 12px rgba(0,230,118,0.4)",
                }}
              />
            </motion.div>

            {/* Name & Login */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {profileData.firstName} {profileData.lastName}
              </h2>
              <p className="text-sm font-mono" style={{ color: "#00B4D8" }}>
                @{profileData.login}
              </p>
            </div>

            {/* Quick stats badges */}
            <div className="flex gap-3 flex-wrap justify-center">
              <span
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(0,180,216,0.1)",
                  border: "1px solid rgba(0,180,216,0.2)",
                  color: "#00B4D8",
                }}
              >
                <Star size={12} />
                Level {level?.level ?? 0}
              </span>
              <span
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(0,230,118,0.1)",
                  border: "1px solid rgba(0,230,118,0.2)",
                  color: "#00E676",
                }}
              >
                <Trophy size={12} />
                {profileData.recentTransactions.length}+ Projects
              </span>
            </div>
          </div>
        </BentoCell>

        {/* ── XP Total Card ──────────────────────────────────── */}
        <BentoCell className="col-span-1 p-6" delay={0.1} glowColor="rgba(0,230,118,0.08)">
          <div className="flex flex-col h-full justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: "hsl(var(--foreground) / 0.4)" }}>
                Total XP
              </span>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(0,230,118,0.1)" }}
              >
                <TrendingUp size={16} color="#00E676" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground tracking-tight">
                <AnimatedXpCounter value={profileData.totalXp} />
              </p>
              <p className="text-xs mt-1" style={{ color: "hsl(var(--foreground) / 0.35)" }}>
                {profileData.totalXp.toLocaleString()} bytes earned
              </p>
            </div>
          </div>
        </BentoCell>

        {/* ── Level Card ─────────────────────────────────────── */}
        <BentoCell className="col-span-1 p-6" delay={0.15} glowColor="rgba(162,155,254,0.08)">
          <div className="flex flex-col h-full justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: "hsl(var(--foreground) / 0.4)" }}>
                Current Level
              </span>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(162,155,254,0.1)" }}
              >
                <Zap size={16} color="#A29BFE" />
              </div>
            </div>
            <div>
              <p className="text-4xl font-bold text-foreground tracking-tight">
                {level?.level ?? 0}
              </p>
              {/* Progress bar to next level */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px]" style={{ color: "hsl(var(--foreground) / 0.35)" }}>
                    Progress
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: "#A29BFE" }}>
                    {(level?.progress ?? 0).toFixed(0)}%
                  </span>
                </div>
                <div
                  className="w-full h-1.5 rounded-full overflow-hidden"
                  style={{ background: "hsl(var(--foreground) / 0.06)" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg, #A29BFE, #6C5CE7)",
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${level?.progress ?? 0}%` }}
                    transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            </div>
          </div>
        </BentoCell>

        {/* ── Recent XP Transactions (spans 2 cols) ──────────── */}
        <BentoCell className="col-span-1 md:col-span-2 lg:col-span-2 p-6" delay={0.2}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} style={{ color: "hsl(var(--foreground) / 0.4)" }} />
              <span className="text-sm font-semibold text-foreground">Recent XP Gains</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
              background: "rgba(0,180,216,0.1)",
              color: "#00B4D8",
              border: "1px solid rgba(0,180,216,0.15)",
            }}>
              Last {profileData.recentTransactions.length} projects
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {profileData.recentTransactions.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: "hsl(var(--foreground) / 0.3)" }}>
                No XP transactions found
              </p>
            ) : (
              profileData.recentTransactions.map((tx, i) => (
                <motion.div
                  key={`${tx.project}-${i}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors duration-150"
                  style={{ background: "hsl(var(--foreground) / 0.02)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "hsl(var(--foreground) / 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "hsl(var(--foreground) / 0.02)";
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                      style={{
                        background: "rgba(0,180,216,0.1)",
                        color: "#00B4D8",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {tx.project}
                      </p>
                      <p className="text-[10px]" style={{ color: "hsl(var(--foreground) / 0.3)" }}>
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-xs font-mono font-semibold flex-shrink-0 ml-3"
                    style={{ color: "#00E676" }}
                  >
                    +{formatXp(tx.amount)}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </BentoCell>

        {/* ── XP Breakdown Mini Card ─────────────────────────── */}
        <BentoCell className="col-span-1 lg:col-span-2 p-6" delay={0.25} glowColor="rgba(253,203,110,0.08)">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} style={{ color: "hsl(var(--foreground) / 0.4)" }} />
            <span className="text-sm font-semibold text-foreground">XP Breakdown</span>
          </div>

          {/* Visual bar chart of top 5 projects by XP */}
          <div className="flex flex-col gap-3">
            {profileData.recentTransactions.slice(0, 5).map((tx, i) => {
              const maxXp = Math.max(
                ...profileData.recentTransactions.slice(0, 5).map((t) => t.amount)
              );
              const barWidth = maxXp > 0 ? (tx.amount / maxXp) * 100 : 0;
              const barColors = [
                "#00B4D8",
                "#00E676",
                "#A29BFE",
                "#FDCB6E",
                "#E17055",
              ];

              return (
                <div key={`bar-${tx.project}-${i}`} className="flex items-center gap-3">
                  <span
                    className="text-[10px] w-20 truncate text-right flex-shrink-0"
                    style={{ color: "hsl(var(--foreground) / 0.5)" }}
                  >
                    {tx.project}
                  </span>
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ background: "hsl(var(--foreground) / 0.04)" }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: barColors[i % barColors.length] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{
                        duration: 0.8,
                        delay: 0.5 + i * 0.1,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    />
                  </div>
                  <span
                    className="text-[10px] font-mono flex-shrink-0 w-14 text-right"
                    style={{ color: barColors[i % barColors.length] }}
                  >
                    {formatXp(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </BentoCell>
      </div>
    </div>
  );
}
