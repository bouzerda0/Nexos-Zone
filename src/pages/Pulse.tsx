import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Utensils,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Timer,
  MapPin,
  Calendar,
  Users,
  PartyPopper,
} from "lucide-react";
import { format } from "date-fns";

type TabType = "food" | "events";
type FoodFilter = "all" | "open" | "locked" | "mine";
type EventFilter = "all" | "upcoming" | "mine";

export default function Pulse() {
  const [tab, setTab] = useState<TabType>("food");
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState<TabType>("food");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  return (
    <div className="min-h-screen px-6 py-8" style={{ maxWidth: 1200, margin: "0 auto" }}>
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

      <div className="mb-8">
        <div className="text-sm mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
          <Link to="/hub" className="hover:text-white transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>Hub</Link>
          <span className="mx-2">/</span>
          <span>Pulse</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white module-header-border-pulse pl-4">
              Nexus Pulse
            </h1>
            <p className="text-base mt-2" style={{ color: "rgba(255,255,255,0.5)" }}>
              Food orders & events
            </p>
          </div>
          <button
            onClick={() => { setCreateType(tab); setShowCreate(true); }}
            className="flex items-center gap-2 px-5 h-11 rounded-xl font-medium text-sm transition-all hover:shadow-lg"
            style={{ background: "#E17055", color: "#0A0A0F" }}
          >
            <Plus size={18} />
            {tab === "food" ? "Start Food Order" : "Create Event"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <button onClick={() => setTab("food")} className="px-6 py-3 text-sm font-medium transition-colors relative"
          style={{ color: tab === "food" ? "#E17055" : "rgba(255,255,255,0.4)" }}>
          Food Orders
          {tab === "food" && <motion.div layoutId="pulseTab" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "#E17055" }} />}
        </button>
        <button onClick={() => setTab("events")} className="px-6 py-3 text-sm font-medium transition-colors relative"
          style={{ color: tab === "events" ? "#E17055" : "rgba(255,255,255,0.4)" }}>
          Events
          {tab === "events" && <motion.div layoutId="pulseTab" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "#E17055" }} />}
        </button>
      </div>

      {tab === "food" ? (
        <FoodOrdersTab setToast={setToast} />
      ) : (
        <EventsTab setToast={setToast} />
      )}

      <AnimatePresence>
        {showCreate && (
          <CreatePulseModal type={createType} onClose={() => setShowCreate(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function FoodOrdersTab({ setToast }: { setToast: (t: { message: string; type: "success" | "error" }) => void }) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FoodFilter>("all");
  const utils = trpc.useUtils();

  const queryInput = filter === "mine" ? { mine: true } : filter !== "all" ? { status: filter as "open" | "locked" } : undefined;
  const { data: posts, isLoading } = trpc.pulse.foodList.useQuery(queryInput);

  const joinMutation = trpc.pulse.foodJoin.useMutation({
    onSuccess: (data) => { setToast({ message: data.message, type: "success" }); utils.pulse.foodList.invalidate(); },
    onError: (err) => { setToast({ message: err.message, type: "error" }); },
  });
  const leaveMutation = trpc.pulse.foodLeave.useMutation({
    onSuccess: () => { setToast({ message: "Left the order", type: "success" }); utils.pulse.foodList.invalidate(); },
  });

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        {(["all", "open", "locked", "mine"] as FoodFilter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`filter-pill ${filter === f ? "active-pulse" : ""}`}>
            {f === "all" ? "All" : f === "open" ? "Open" : f === "locked" ? "Locked" : "My Orders"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => {
            const bookingCount = post._count?.bookings ?? post.bookings?.length ?? 0;
            const isFull = post.status === "locked";
            const isExpired = new Date(post.orderDeadline) < new Date();
            const hasJoined = post.bookings?.some((b) => b.userId === user?.id);
            const isOwner = post.userId === user?.id;

            return (
              <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">{post.restaurantName}</h3>
                  <span className="text-xs px-2 py-1 rounded-md font-medium"
                    style={{ background: isFull ? "rgba(253,203,110,0.1)" : isExpired ? "rgba(239,68,68,0.1)" : "rgba(52,211,153,0.1)",
                      color: isFull ? "#FDCB6E" : isExpired ? "#ef4444" : "#34d399" }}>
                    {isFull ? "Locked" : isExpired ? "Expired" : "Open"}
                  </span>
                </div>
                <p className="text-sm mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>Ordering: {post.menuItems}</p>
                <p className="text-sm mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Delivery: {post.deliveryFee} MAD total</p>
                <div className="flex items-center gap-2 mb-3 text-sm" style={{ color: isExpired ? "#ef4444" : "rgba(255,255,255,0.5)" }}>
                  <Timer size={14} />
                  <span>{isExpired ? "Expired" : format(new Date(post.orderDeadline), "MMM d, h:mm a")}</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, #6C5CE7, #A29BFE)" }}>
                    {post.user?.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{post.user?.name}</span>
                </div>
                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                    <span>{bookingCount}/5 people</span>
                    <span>{Math.round((bookingCount / 5) * 100)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${(bookingCount / 5) * 100}%`, background: "#E17055" }} />
                  </div>
                </div>
                {hasJoined ? (
                  <button onClick={() => leaveMutation.mutate({ postId: post.id })}
                    className="w-full h-10 rounded-xl text-sm font-medium transition-all"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                    Leave Order
                  </button>
                ) : (
                  <button onClick={() => joinMutation.mutate({ postId: post.id })}
                    disabled={isFull || isExpired || isOwner || joinMutation.isPending}
                    className="w-full h-10 rounded-xl text-sm font-medium transition-all hover:shadow-lg disabled:opacity-40"
                    style={{ background: "#E17055", color: "#0A0A0F" }}>
                    {joinMutation.isPending ? "Joining..." : isOwner ? "Your Order" : isFull ? "Full" : isExpired ? "Expired" : "Join Order"}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<Utensils size={40} color="rgba(225,112,85,0.4)" />} title="No food orders yet"
          description="Start a group order and split the delivery fee!" action="Start Food Order" onAction={() => {}} accent="#E17055" />
      )}
    </>
  );
}

function EventsTab({ setToast }: { setToast: (t: { message: string; type: "success" | "error" }) => void }) {
  const [filter, setFilter] = useState<EventFilter>("all");
  const utils = trpc.useUtils();

  const queryInput = filter === "mine" ? { mine: true } : filter !== "all" ? { status: "upcoming" as const } : undefined;
  const { data: events, isLoading } = trpc.pulse.eventList.useQuery(queryInput);

  const joinMutation = trpc.pulse.eventJoin.useMutation({
    onSuccess: (data) => { setToast({ message: data.message, type: "success" }); utils.pulse.eventList.invalidate(); },
    onError: (err) => { setToast({ message: err.message, type: "error" }); },
  });
  const leaveMutation = trpc.pulse.eventLeave.useMutation({
    onSuccess: () => { setToast({ message: "Left the event", type: "success" }); utils.pulse.eventList.invalidate(); },
  });

  const eventTypeColors: Record<string, string> = {
    movie: "#A29BFE", board_games: "#00CEC9", study: "#55EFC4", other: "#FDCB6E",
  };
  const eventTypeLabels: Record<string, string> = {
    movie: "Movie Night", board_games: "Board Games", study: "Study Session", other: "Other",
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        {(["all", "upcoming", "mine"] as EventFilter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`filter-pill ${filter === f ? "active-pulse" : ""}`}>
            {f === "all" ? "All" : f === "upcoming" ? "Upcoming" : "My Events"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : events && events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const isAttending = event.isAttending;
            const isPast = new Date(event.eventDate) < new Date();
            const isFull = event.maxAttendees && (event._count?.attendees ?? 0) >= event.maxAttendees;

            return (
              <motion.div key={event.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase px-3 py-1 rounded-md"
                    style={{ background: `${eventTypeColors[event.eventType]}15`, color: eventTypeColors[event.eventType] }}>
                    {eventTypeLabels[event.eventType]}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-md"
                    style={{ background: event.status === "upcoming" ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.06)",
                      color: event.status === "upcoming" ? "#34d399" : "rgba(255,255,255,0.5)" }}>
                    {event.status}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{event.title}</h3>
                <p className="text-sm mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>{event.description}</p>
                <div className="flex flex-col gap-2 mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <div className="flex items-center gap-2 text-sm"><MapPin size={14} />{event.location}</div>
                  <div className="flex items-center gap-2 text-sm"><Calendar size={14} />{format(new Date(event.eventDate), "MMM d, yyyy h:mm a")}</div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users size={14} />
                    {event._count?.attendees ?? 0} attending{event.maxAttendees ? ` / ${event.maxAttendees} max` : " (no limit)"}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, #6C5CE7, #A29BFE)" }}>
                    {event.user?.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{event.user?.name}</span>
                </div>
                {isAttending ? (
                  <button onClick={() => leaveMutation.mutate({ eventId: event.id })}
                    className="w-full h-10 rounded-xl text-sm font-medium transition-all"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                    Leave Event
                  </button>
                ) : (
                  <button onClick={() => joinMutation.mutate({ eventId: event.id })}
                    disabled={isPast || isFull || joinMutation.isPending}
                    className="w-full h-10 rounded-xl text-sm font-medium transition-all hover:shadow-lg disabled:opacity-40"
                    style={{ background: "#E17055", color: "#0A0A0F" }}>
                    {joinMutation.isPending ? "Joining..." : isPast ? "Passed" : isFull ? "Full" : "Join Event"}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<PartyPopper size={40} color="rgba(225,112,85,0.4)" />} title="No events yet"
          description="Create an event and bring the community together!" action="Create Event" onAction={() => {}} accent="#E17055" />
      )}
    </>
  );
}

function CreatePulseModal({ type, onClose }: { type: TabType; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [foodForm, setFoodForm] = useState({ restaurantName: "", menuItems: "", deliveryFee: "", orderDeadline: "" });
  const [eventForm, setEventForm] = useState({ title: "", description: "", eventType: "movie" as const, location: "", eventDate: "", maxAttendees: "" });

  const foodMutation = trpc.pulse.foodCreate.useMutation({
    onSuccess: () => { utils.pulse.foodList.invalidate(); onClose(); },
  });
  const eventMutation = trpc.pulse.eventCreate.useMutation({
    onSuccess: () => { utils.pulse.eventList.invalidate(); onClose(); },
  });

  const handleFoodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodForm.restaurantName || !foodForm.menuItems || !foodForm.orderDeadline) return;
    foodMutation.mutate({
      restaurantName: foodForm.restaurantName,
      menuItems: foodForm.menuItems,
      deliveryFee: Number(foodForm.deliveryFee) || 0,
      orderDeadline: foodForm.orderDeadline,
    });
  };

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.description || !eventForm.location || !eventForm.eventDate) return;
    eventMutation.mutate({
      title: eventForm.title,
      description: eventForm.description,
      eventType: eventForm.eventType,
      location: eventForm.location,
      eventDate: eventForm.eventDate,
      maxAttendees: eventForm.maxAttendees ? Number(eventForm.maxAttendees) : null,
    });
  };

  const inputClass = "w-full h-10 rounded-lg px-3 text-sm text-white outline-none";
  const inputStyle = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="glass-modal w-full max-w-md p-6 my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">{type === "food" ? "Start Food Order" : "Create Event"}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={20} /></button>
        </div>

        {type === "food" ? (
          <form onSubmit={handleFoodSubmit} className="flex flex-col gap-4">
            <div><label className="text-sm font-medium mb-2 block" style={{ color: "rgba(255,255,255,0.7)" }}>Restaurant</label>
              <input type="text" value={foodForm.restaurantName} onChange={(e) => setFoodForm({ ...foodForm, restaurantName: e.target.value })} className={inputClass} style={inputStyle} placeholder="Restaurant name" /></div>
            <div><label className="text-sm font-medium mb-2 block" style={{ color: "rgba(255,255,255,0.7)" }}>Menu Items</label>
              <textarea value={foodForm.menuItems} onChange={(e) => setFoodForm({ ...foodForm, menuItems: e.target.value })} className={`${inputClass} h-20 py-2 resize-none`} style={inputStyle} placeholder="What are you ordering?" /></div>
            <div><label className="text-sm font-medium mb-2 block" style={{ color: "rgba(255,255,255,0.7)" }}>Delivery Fee (MAD)</label>
              <input type="number" value={foodForm.deliveryFee} onChange={(e) => setFoodForm({ ...foodForm, deliveryFee: e.target.value })} className={inputClass} style={inputStyle} placeholder="0" /></div>
            <div><label className="text-sm font-medium mb-2 block" style={{ color: "rgba(255,255,255,0.7)" }}>Order Deadline</label>
              <input type="datetime-local" value={foodForm.orderDeadline} onChange={(e) => setFoodForm({ ...foodForm, orderDeadline: e.target.value })} className={inputClass} style={{ ...inputStyle, colorScheme: "dark" }} /></div>
            <div><label className="text-sm font-medium mb-2 block" style={{ color: "rgba(255,255,255,0.7)" }}>Max People</label>
              <input type="text" disabled value="5 (fixed)" className={inputClass} style={{ ...inputStyle, opacity: 0.5 }} /></div>
            <button type="submit" disabled={foodMutation.isPending} className="w-full h-11 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
              style={{ background: "#E17055", color: "#0A0A0F" }}>{foodMutation.isPending ? "Creating..." : "Start Order"}</button>
          </form>
        ) : (
          <form onSubmit={handleEventSubmit} className="flex flex-col gap-4">
            <div><label className="text-sm font-medium mb-2 block" style={{ color: "rgba(255,255,255,0.7)" }}>Title</label>
              <input type="text" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} className={inputClass} style={inputStyle} placeholder="Event title" /></div>
            <div><label className="text-sm font-medium mb-2 block" style={{ color: "rgba(255,255,255,0.7)" }}>Description</label>
              <textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} className={`${inputClass} h-20 py-2 resize-none`} style={inputStyle} placeholder="What's this event about?" /></div>
            <div><label className="text-sm font-medium mb-2 block" style={{ color: "rgba(255,255,255,0.7)" }}>Event Type</label>
              <select value={eventForm.eventType} onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value as typeof eventForm.eventType })} className={inputClass} style={{ ...inputStyle, color: "white" }}>
                <option value="movie">Movie Night</option>
                <option value="board_games">Board Games</option>
                <option value="study">Study Session</option>
                <option value="other">Other</option>
              </select></div>
            <div><label className="text-sm font-medium mb-2 block" style={{ color: "rgba(255,255,255,0.7)" }}>Location</label>
              <input type="text" value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} className={inputClass} style={inputStyle} placeholder="Where?" /></div>
            <div><label className="text-sm font-medium mb-2 block" style={{ color: "rgba(255,255,255,0.7)" }}>Event Date</label>
              <input type="datetime-local" value={eventForm.eventDate} onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })} className={inputClass} style={{ ...inputStyle, colorScheme: "dark" }} /></div>
            <div><label className="text-sm font-medium mb-2 block" style={{ color: "rgba(255,255,255,0.7)" }}>Max Attendees (optional)</label>
              <input type="number" value={eventForm.maxAttendees} onChange={(e) => setEventForm({ ...eventForm, maxAttendees: e.target.value })} className={inputClass} style={inputStyle} placeholder="Leave empty for no limit" /></div>
            <button type="submit" disabled={eventMutation.isPending} className="w-full h-11 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
              style={{ background: "#E17055", color: "#0A0A0F" }}>{eventMutation.isPending ? "Creating..." : "Create Event"}</button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card p-6 animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }}>
      <div className="h-4 rounded w-1/3 mb-4" style={{ background: "rgba(255,255,255,0.05)" }} />
      <div className="h-3 rounded w-2/3 mb-2" style={{ background: "rgba(255,255,255,0.05)" }} />
      <div className="h-8 rounded w-full" style={{ background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}

function EmptyState({ icon, title, description, action, onAction, accent }: {
  icon: React.ReactNode; title: string; description: string; action: string; onAction: () => void; accent: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: `${accent}15` }}>{icon}</div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-sm mb-6 text-center" style={{ color: "rgba(255,255,255,0.5)" }}>{description}</p>
      <button onClick={onAction} className="flex items-center gap-2 px-5 h-11 rounded-xl font-medium text-sm"
        style={{ background: accent, color: "#0A0A0F" }}><Plus size={18} />{action}</button>
    </div>
  );
}
