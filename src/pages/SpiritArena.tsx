import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Moon,
  Trophy,
  MapPin,
  Clock,
  Users,
  Check,
  TrophyIcon,
  CircleDot,
} from "lucide-react";
import { format } from "date-fns";
import { useTheme } from "@/components/ThemeProvider";

export default function SpiritArena() {
  const { theme } = useTheme();
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const utils = trpc.useUtils();
  const { data: prayerTimes, isLoading: prayerLoading } = trpc.spirit.prayerTimes.useQuery();
  const { data: todayMatch, isLoading: matchLoading } = trpc.spirit.matchToday.useQuery();
  const { data: upcomingMatches } = trpc.spirit.matchUpcoming.useQuery();

  const joinMutation = trpc.spirit.joinMatch.useMutation({
    onSuccess: (data) => {
      setToast({ message: data.message, type: "success" });
      utils.spirit.matchToday.invalidate();
      utils.spirit.matchUpcoming.invalidate();
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err) => {
      setToast({ message: err.message, type: "error" });
      setTimeout(() => setToast(null), 3000);
    },
  });
  const leaveMutation = trpc.spirit.leaveMatch.useMutation({
    onSuccess: () => {
      setToast({ message: "Left the match", type: "success" });
      utils.spirit.matchToday.invalidate();
      setTimeout(() => setToast(null), 3000);
    },
  });
  const cancelMutation = trpc.spirit.cancelMatch.useMutation({
    onSuccess: () => {
      setToast({ message: "Match cancelled", type: "success" });
      utils.spirit.matchToday.invalidate();
      setTimeout(() => setToast(null), 3000);
    },
  });

  const { user } = useAuth();
  const isMatchPlayer = todayMatch?.players?.some((p) => p.userId === user?.id);
  const isMatchOwner = todayMatch?.userId === user?.id;

  const prayers = [
    { name: "Fajr", time: prayerTimes?.fajr, icon: Moon },
    { name: "Dhuhr", time: prayerTimes?.dhuhr, icon: CircleDot },
    { name: "Asr", time: prayerTimes?.asr, icon: CircleDot },
    { name: "Maghrib", time: prayerTimes?.maghrib, icon: Moon },
    { name: "Isha", time: prayerTimes?.isha, icon: Moon },
  ];

  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const findCurrentPrayer = () => {
    if (!prayerTimes) return -1;
    const times = prayers.map((p) => {
      if (!p.time) return 0;
      const [h, m] = p.time.split(":").map(Number);
      return h + m / 60;
    });
    for (let i = times.length - 1; i >= 0; i--) {
      if (currentHour >= times[i]) return i;
    }
    return -1;
  };
  const currentPrayerIdx = findCurrentPrayer();
  const nextPrayerIdx = currentPrayerIdx + 1 < prayers.length ? currentPrayerIdx + 1 : 0;

  return (
    <div className="min-h-screen px-6 py-8" style={{ maxWidth: 1200, margin: "0 auto" }}>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 glass-card px-4 py-3 flex items-center gap-2"
            style={{ borderLeft: `3px solid ${toast.type === "success" ? "#55EFC4" : "#E17055"}` }}>
            {toast.type === "success" ? <CheckCircle2 size={16} color="#55EFC4" /> : <AlertCircle size={16} color="#E17055" />}
            <span className="text-sm text-foreground">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8">
        <div className="text-sm mb-2" style={{ color: "hsl(var(--foreground) / 0.4)" }}>
          <Link to="/hub" className="hover:text-foreground transition-colors" style={{ color: "hsl(var(--foreground) / 0.4)" }}>Hub</Link>
          <span className="mx-2">/</span>
          <span>Spirit & Arena</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-foreground module-header-border-spirit pl-4">Nexus Spirit & Arena</h1>
          <p className="text-base mt-2" style={{ color: "hsl(var(--foreground) / 0.5)" }}>Stay grounded, stay active</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prayer Times */}
        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(85,239,196,0.15)" }}>
              <Moon size={20} color="#55EFC4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Today's Prayer Times</h2>
              <p className="text-xs" style={{ color: "hsl(var(--foreground) / 0.4)" }}>Oujda, Morocco · {prayerTimes?.date ? format(new Date(prayerTimes.date), "EEEE, MMM d") : format(new Date(), "EEEE, MMM d")}</p>
            </div>
          </div>

          {prayerLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "hsl(var(--foreground) / 0.03)" }} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {prayers.map((prayer, idx) => {
                const isPassed = idx < currentPrayerIdx;
                const isCurrent = idx === nextPrayerIdx;
                const Icon = prayer.icon;

                return (
                  <div key={prayer.name}
                    className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                    style={{
                      background: isCurrent ? "rgba(85,239,196,0.08)" : "transparent",
                      borderLeft: isCurrent ? "3px solid #55EFC4" : "3px solid transparent",
                    }}>
                    <div className="flex items-center gap-3">
                      <Icon size={16} style={{ color: isCurrent ? "#55EFC4" : isPassed ? "hsl(var(--foreground) / 0.3)" : "hsl(var(--foreground) / 0.5)" }} />
                      <span className="text-base" style={{ color: isPassed ? "hsl(var(--foreground) / 0.4)" : "hsl(var(--foreground))" }}>{prayer.name}</span>
                      {isPassed && <Check size={14} color="rgba(85,239,196,0.5)" />}
                    </div>
                    <span className="text-lg font-medium" style={{ color: isCurrent ? "#55EFC4" : isPassed ? "hsl(var(--foreground) / 0.4)" : "hsl(var(--foreground) / 0.8)" }}>
                      {prayer.time}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs mt-4" style={{ color: "hsl(var(--foreground) / 0.3)" }}>Times calculated for Oujda</p>
        </div>

        {/* Arena - Today's Match */}
        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(85,239,196,0.15)" }}>
              <Trophy size={20} color="#55EFC4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Today's Match</h2>
              <p className="text-xs" style={{ color: "hsl(var(--foreground) / 0.4)" }}>{format(new Date(), "EEEE, MMM d")}</p>
            </div>
          </div>

          {matchLoading ? (
            <div className="h-32 rounded-lg animate-pulse" style={{ background: "hsl(var(--foreground) / 0.03)" }} />
          ) : todayMatch ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase px-3 py-1 rounded-md"
                  style={{ background: todayMatch.matchType === "football" ? "rgba(52,211,153,0.15)" : "rgba(108,92,231,0.15)",
                    color: todayMatch.matchType === "football" ? "#34d399" : "#A29BFE" }}>
                  {todayMatch.matchType}
                </span>
                <span className="text-xs px-2 py-1 rounded-md" style={{ background: "rgba(52,211,153,0.1)", color: "#34d399" }}>Scheduled</span>
              </div>

              <div className="flex flex-col gap-2" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
                <div className="flex items-center gap-2 text-sm"><MapPin size={14} />{todayMatch.location}</div>
                <div className="flex items-center gap-2 text-sm"><Clock size={14} />{format(new Date(todayMatch.matchDate), "h:mm a")}</div>
                <div className="flex items-center gap-2 text-sm">
                  <Users size={14} />
                  {todayMatch._count?.players ?? todayMatch.players?.length ?? 0}/{todayMatch.maxPlayers} players
                </div>
              </div>

              {/* Organizer */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #6C5CE7, #A29BFE)" }}>
                  {todayMatch.user?.login?.[0]?.toUpperCase() || "?"}
                </div>
                <span className="text-sm" style={{ color: "hsl(var(--foreground) / 0.7)" }}>{todayMatch.user?.login}</span>
              </div>

              {/* Players avatars */}
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {todayMatch.players?.slice(0, 6).map((p, i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-semibold text-white"
                      style={{ background: "linear-gradient(135deg, #6C5CE7, #A29BFE)", borderColor: "#0A0A0F" }}>
                      {p.user?.login?.[0]?.toUpperCase() || "?"}
                    </div>
                  ))}
                </div>
                {(todayMatch.players?.length ?? 0) > 6 && (
                  <span className="text-xs" style={{ color: "hsl(var(--foreground) / 0.5)" }}>+{(todayMatch.players?.length ?? 0) - 6} more</span>
                )}
              </div>

              {todayMatch.notes && (
                <p className="text-xs italic" style={{ color: "hsl(var(--foreground) / 0.4)" }}>{todayMatch.notes}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-2">
                {isMatchPlayer ? (
                  <button onClick={() => leaveMutation.mutate({ matchId: todayMatch.id })}
                    className="flex-1 h-10 rounded-xl text-sm font-medium transition-all"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                    Leave Match
                  </button>
                ) : (
                  <button onClick={() => joinMutation.mutate({ matchId: todayMatch.id })}
                    disabled={joinMutation.isPending || (todayMatch._count?.players ?? todayMatch.players?.length ?? 0) >= todayMatch.maxPlayers}
                    className="flex-1 h-10 rounded-xl text-sm font-medium transition-all hover:shadow-lg disabled:opacity-40"
                    style={{ background: "#55EFC4", color: "#0A0A0F" }}>
                    {joinMutation.isPending ? "Joining..." : (todayMatch._count?.players ?? todayMatch.players?.length ?? 0) >= todayMatch.maxPlayers ? "Full" : "Join Match"}
                  </button>
                )}
                {isMatchOwner && (
                  <button onClick={() => cancelMutation.mutate({ matchId: todayMatch.id })}
                    className="h-10 px-4 rounded-xl text-sm font-medium transition-all"
                    style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(85,239,196,0.08)" }}>
                <TrophyIcon size={40} color="rgba(85,239,196,0.3)" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No match scheduled</h3>
              <p className="text-sm text-center mb-6" style={{ color: "hsl(var(--foreground) / 0.5)" }}>No match scheduled for today. Be the first to organize one!</p>
              <button onClick={() => setShowCreateMatch(true)}
                className="w-full h-10 rounded-xl text-sm font-medium transition-all hover:shadow-lg"
                style={{ background: "#55EFC4", color: "#0A0A0F" }}>
                Create Match
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming matches */}
      {upcomingMatches && upcomingMatches.length > 0 && (
        <div className="mt-6 glass-card p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">Upcoming Matches</h3>
          <div className="flex flex-col gap-2">
            {upcomingMatches.map((match) => (
              <div key={match.id} className="flex items-center justify-between px-4 py-3 rounded-lg" style={{ background: "hsl(var(--foreground) / 0.03)" }}>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded"
                    style={{ background: match.matchType === "football" ? "rgba(52,211,153,0.1)" : "rgba(108,92,231,0.1)",
                      color: match.matchType === "football" ? "#34d399" : "#A29BFE" }}>
                    {match.matchType}
                  </span>
                  <span className="text-sm text-foreground">{format(new Date(match.matchDate), "MMM d")}</span>
                  <span className="text-sm" style={{ color: "hsl(var(--foreground) / 0.5)" }}>{match.location}</span>
                </div>
                <span className="text-xs" style={{ color: "hsl(var(--foreground) / 0.4)" }}>
                  {match._count?.players ?? match.players?.length ?? 0}/{match.maxPlayers} players
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showCreateMatch && <CreateMatchModal onClose={() => setShowCreateMatch(false)} setToast={setToast} />}
      </AnimatePresence>
    </div>
  );
}

function CreateMatchModal({ onClose, setToast }: { onClose: () => void; setToast: (t: { message: string; type: "success" | "error" }) => void }) {
  const utils = trpc.useUtils();
  const { theme } = useTheme();
  const [form, setForm] = useState({
    matchType: "football" as "football" | "basketball",
    location: "",
    matchDate: "",
    maxPlayers: "10",
    notes: "",
  });

  const createMutation = trpc.spirit.createMatch.useMutation({
    onSuccess: async () => {
      await utils.spirit.matchToday.invalidate();
      await utils.spirit.matchUpcoming.invalidate();
      onClose();
    },
    onError: (err) => {
      setToast({ message: err.message, type: "error" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.location || !form.matchDate) return;
    createMutation.mutate({
      matchType: form.matchType,
      location: form.location,
      matchDate: new Date(form.matchDate).toISOString(),
      maxPlayers: Number(form.maxPlayers) || 10,
      notes: form.notes || undefined,
    });
  };

  const inputClass = "w-full h-10 rounded-lg px-3 text-sm text-foreground outline-none";
  const inputStyle = { background: "hsl(var(--foreground) / 0.06)", border: "1px solid hsl(var(--foreground) / 0.08)" };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="glass-modal w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Create Match</h2>
          <button onClick={onClose} className="text-foreground/40 hover:text-foreground"><X size={20} /></button>
        </div>

        <div className="mb-4 p-3 rounded-lg text-xs" style={{ background: "rgba(85,239,196,0.08)", color: "#55EFC4", border: "1px solid rgba(85,239,196,0.2)" }}>
          Only one match per day is allowed. If a match already exists for the selected date, you won't be able to create a new one.
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "hsl(var(--foreground) / 0.7)" }}>Match Type</label>
            <div className="flex gap-2">
              {(["football", "basketball"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setForm({ ...form, matchType: t })}
                  className="flex-1 h-10 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: form.matchType === t ? "rgba(85,239,196,0.2)" : "hsl(var(--foreground) / 0.06)",
                    border: `1px solid ${form.matchType === t ? "rgba(85,239,196,0.4)" : "hsl(var(--foreground) / 0.08)"}`,
                    color: form.matchType === t ? "#55EFC4" : "hsl(var(--foreground) / 0.6)",
                  }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "hsl(var(--foreground) / 0.7)" }}>Location</label>
            <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputClass} style={inputStyle} placeholder="Where will the match be played?" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "hsl(var(--foreground) / 0.7)" }}>Match Date & Time</label>
            <input type="datetime-local" value={form.matchDate} onChange={(e) => setForm({ ...form, matchDate: e.target.value })} className={inputClass} style={{ ...inputStyle, colorScheme: theme === "dark" ? "dark" : "light" }} />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "hsl(var(--foreground) / 0.7)" }}>Max Players</label>
            <input type="number" value={form.maxPlayers} onChange={(e) => setForm({ ...form, maxPlayers: e.target.value })} className={inputClass} style={inputStyle} min={2} max={22} />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "hsl(var(--foreground) / 0.7)" }}>Notes (optional)</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputClass} h-20 py-2 resize-none`} style={inputStyle} placeholder="Any additional info..." />
          </div>
          <button type="submit" disabled={createMutation.isPending || !form.location || !form.matchDate}
            className="w-full h-11 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
            style={{ background: "#55EFC4", color: "#0A0A0F" }}>
            {createMutation.isPending ? "Creating..." : "Create Match"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
