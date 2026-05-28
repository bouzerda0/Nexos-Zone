import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  ArrowRight,
  Clock,
  MapPin,
  Plus,
  X,
  CheckCircle2,
  Users,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

type FilterType = "all" | "aller" | "retour" | "mine";

export default function Transit() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterType>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const utils = trpc.useUtils();

  const queryInput =
    filter === "mine" ? { mine: true } : filter !== "all" ? { direction: filter as "aller" | "retour" } : {};

  const { data: posts, isLoading } = trpc.transit.list.useQuery(queryInput);
  const bookMutation = trpc.transit.book.useMutation({
    onSuccess: (data) => {
      setToast({ message: data.message, type: "success" });
      utils.transit.list.invalidate();
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err) => {
      setToast({ message: err.message, type: "error" });
      setTimeout(() => setToast(null), 3000);
    },
  });
  const cancelBookingMutation = trpc.transit.cancelBooking.useMutation({
    onSuccess: () => {
      setToast({ message: "Booking cancelled", type: "success" });
      utils.transit.list.invalidate();
      setTimeout(() => setToast(null), 3000);
    },
  });

  const getSeatCount = (post: typeof posts extends (infer T)[] | undefined ? T : never) => {
    return post._count?.bookings ?? post.bookings?.length ?? 0;
  };

  const hasBooked = (post: typeof posts extends (infer T)[] | undefined ? T : never) => {
    return post.bookings?.some((b) => b.userId === user?.id);
  };

  const isOwner = (post: typeof posts extends (infer T)[] | undefined ? T : never) => {
    return post.userId === user?.id;
  };

  return (
    <div className="min-h-screen px-6 py-8" style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 glass-card px-4 py-3 flex items-center gap-2"
            style={{ borderLeft: `3px solid ${toast.type === "success" ? "#55EFC4" : "#E17055"}` }}
          >
            {toast.type === "success" ? <CheckCircle2 size={16} color="#55EFC4" /> : <AlertCircle size={16} color="#E17055" />}
            <span className="text-sm text-white">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumb + Header */}
      <div className="mb-8">
        <div className="text-sm mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
          <Link to="/hub" className="hover:text-white transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>Hub</Link>
          <span className="mx-2">/</span>
          <span>Transit</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white module-header-border-transit pl-4">
              Nexus Transit
            </h1>
            <p className="text-base mt-2" style={{ color: "rgba(255,255,255,0.5)" }}>
              Find or offer rides to Zone 01 Oujda
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 h-11 rounded-xl font-medium text-sm transition-all hover:shadow-lg"
            style={{ background: "#00CEC9", color: "#0A0A0F" }}
          >
            <Plus size={18} />
            Offer a Ride
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["all", "aller", "retour", "mine"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`filter-pill ${filter === f ? "active-transit" : ""}`}
          >
            {f === "all" ? "All" : f === "aller" ? "Aller to Campus" : f === "retour" ? "Retour from Campus" : "My Rides"}
          </button>
        ))}
      </div>

      {/* Ride Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="h-4 rounded w-1/3 mb-4" style={{ background: "rgba(255,255,255,0.05)" }} />
              <div className="h-3 rounded w-2/3 mb-2" style={{ background: "rgba(255,255,255,0.05)" }} />
              <div className="h-3 rounded w-1/2 mb-4" style={{ background: "rgba(255,255,255,0.05)" }} />
              <div className="h-8 rounded w-full" style={{ background: "rgba(255,255,255,0.05)" }} />
            </div>
          ))}
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => {
            const seatCount = getSeatCount(post);
            const seatsLeft = 4 - seatCount;
            const isFull = post.status === "full";
            const isCancelled = post.status === "cancelled";
            const isPast = new Date(post.departureTime) < new Date();
            const userBooked = hasBooked(post);
            const userIsOwner = isOwner(post);

            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 flex flex-col gap-4"
              >
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase px-3 py-1 rounded-md"
                    style={{ background: "rgba(0,206,201,0.15)", color: "#00CEC9" }}>
                    {post.direction}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-md ${isFull ? "text-amber-400" : isCancelled ? "text-red-400" : "text-emerald-400"}`}
                    style={{ background: isFull ? "rgba(253,203,110,0.1)" : isCancelled ? "rgba(239,68,68,0.1)" : "rgba(52,211,153,0.1)" }}>
                    {isFull ? "Full" : isCancelled ? "Cancelled" : "Open"}
                  </span>
                </div>

                {/* Route */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white font-medium">{post.fromLocation}</span>
                  <ArrowRight size={14} color="#00CEC9" />
                  <span className="text-sm text-white font-medium">{post.toLocation}</span>
                </div>

                {/* Details */}
                <div className="flex flex-col gap-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={14} />
                    <span>{format(new Date(post.departureTime), "MMM d, yyyy h:mm a")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={14} />
                    <span>{post.meetingPoint}</span>
                  </div>
                </div>

                {/* Driver */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, #6C5CE7, #A29BFE)" }}>
                    {post.user?.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                    {post.user?.name || "Unknown"}
                  </span>
                </div>

                {/* Passengers */}
                <div className="flex items-center gap-2">
                  <Users size={14} color="rgba(255,255,255,0.5)" />
                  <div className="flex -space-x-2">
                    {post.bookings?.slice(0, 4).map((b, i) => (
                      <div key={i} className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-semibold text-white"
                        style={{ background: "linear-gradient(135deg, #6C5CE7, #A29BFE)", borderColor: "#0A0A0F" }}>
                        {b.user?.name?.[0]?.toUpperCase() || "?"}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {seatCount}/4
                  </span>
                </div>

                {/* Seats & Action */}
                <div className="mt-auto pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium" style={{ color: isFull ? "#FDCB6E" : seatsLeft <= 1 ? "#E17055" : "rgba(255,255,255,0.7)" }}>
                      {isFull ? "FULL" : isCancelled ? "Cancelled" : isPast ? "Departed" : `${seatsLeft} seat${seatsLeft !== 1 ? "s" : ""} left`}
                    </span>
                  </div>

                  {userBooked ? (
                    <button
                      onClick={() => cancelBookingMutation.mutate({ postId: post.id })}
                      className="w-full h-10 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                      style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
                    >
                      Cancel Booking
                    </button>
                  ) : (
                    <button
                      onClick={() => bookMutation.mutate({ postId: post.id })}
                      disabled={isFull || isCancelled || isPast || userIsOwner || bookMutation.isPending}
                      className="w-full h-10 rounded-xl text-sm font-medium transition-all hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: "#00CEC9", color: "#0A0A0F" }}
                    >
                      {bookMutation.isPending ? "Booking..." : userIsOwner ? "Your Ride" : isFull ? "Full" : isPast ? "Departed" : "Book Seat"}
                    </button>
                  )}
                </div>

                {post.notes && (
                  <p className="text-xs italic" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {post.notes}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <EmptyState onCreate={() => setShowCreate(true)} />
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && <CreateRideModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(0,206,201,0.1)" }}>
        <Car size={40} color="rgba(0,206,201,0.4)" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">No rides yet</h3>
      <p className="text-sm mb-6 text-center" style={{ color: "rgba(255,255,255,0.5)" }}>
        Be the first to offer a ride and help your classmates get to campus!
      </p>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 px-5 h-11 rounded-xl font-medium text-sm transition-all hover:shadow-lg"
        style={{ background: "#00CEC9", color: "#0A0A0F" }}
      >
        <Plus size={18} />
        Offer a Ride
      </button>
    </div>
  );
}

function CreateRideModal({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    direction: "aller" as "aller" | "retour",
    fromLocation: "",
    toLocation: "",
    departureTime: "",
    meetingPoint: "",
    notes: "",
  });

  const createMutation = trpc.transit.create.useMutation({
    onSuccess: () => {
      utils.transit.list.invalidate();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fromLocation || !form.toLocation || !form.departureTime || !form.meetingPoint) return;
    createMutation.mutate(form);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-modal w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Offer a Ride</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "rgba(255,255,255,0.7)" }}>Direction</label>
            <div className="flex gap-2">
              {(["aller", "retour"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm({ ...form, direction: d })}
                  className="flex-1 h-10 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: form.direction === d ? "rgba(0,206,201,0.2)" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${form.direction === d ? "rgba(0,206,201,0.4)" : "rgba(255,255,255,0.08)"}`,
                    color: form.direction === d ? "#00CEC9" : "rgba(255,255,255,0.6)",
                  }}
                >
                  {d === "aller" ? "To Campus" : "From Campus"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "rgba(255,255,255,0.7)" }}>From Location</label>
            <input
              type="text"
              value={form.fromLocation}
              onChange={(e) => setForm({ ...form, fromLocation: e.target.value })}
              className="w-full h-10 rounded-lg px-3 text-sm text-white outline-none focus:ring-2"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              placeholder={form.direction === "aller" ? "Your starting point" : "Zone 01 Oujda"}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "rgba(255,255,255,0.7)" }}>To Location</label>
            <input
              type="text"
              value={form.toLocation}
              onChange={(e) => setForm({ ...form, toLocation: e.target.value })}
              className="w-full h-10 rounded-lg px-3 text-sm text-white outline-none focus:ring-2"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              placeholder={form.direction === "aller" ? "Zone 01 Oujda" : "Your destination"}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "rgba(255,255,255,0.7)" }}>Departure Time</label>
            <input
              type="datetime-local"
              value={form.departureTime}
              onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
              className="w-full h-10 rounded-lg px-3 text-sm text-white outline-none focus:ring-2"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", colorScheme: "dark" }}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "rgba(255,255,255,0.7)" }}>Meeting Point</label>
            <input
              type="text"
              value={form.meetingPoint}
              onChange={(e) => setForm({ ...form, meetingPoint: e.target.value })}
              className="w-full h-10 rounded-lg px-3 text-sm text-white outline-none focus:ring-2"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              placeholder="Where to meet"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "rgba(255,255,255,0.7)" }}>Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full h-20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 resize-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              placeholder="Any additional info..."
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending || !form.fromLocation || !form.toLocation || !form.departureTime || !form.meetingPoint}
            className="w-full h-11 rounded-xl text-sm font-medium transition-all hover:shadow-lg disabled:opacity-40"
            style={{ background: "#00CEC9", color: "#0A0A0F" }}
          >
            {createMutation.isPending ? "Creating..." : "Create Ride"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
