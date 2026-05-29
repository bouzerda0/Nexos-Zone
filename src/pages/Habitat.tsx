import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  MapPin,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check,
  XCircle,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

type FilterType = "all" | "open" | "mine";

export default function Habitat() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [filter, setFilter] = useState<FilterType>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showRequests, setShowRequests] = useState<number | null>(null);
  const [expandedRules, setExpandedRules] = useState<number | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestPostId, setRequestPostId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const utils = trpc.useUtils();

  const queryInput = filter === "mine" ? { mine: true } : filter !== "all" ? { status: filter as "open" } : undefined;
  const { data: posts, isLoading } = trpc.habitat.list.useQuery(queryInput);

  const sendRequestMutation = trpc.habitat.sendRequest.useMutation({
    onSuccess: (data) => {
      setToast({ message: data.message, type: "success" });
      utils.habitat.list.invalidate();
      setRequestPostId(null);
      setRequestMessage("");
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err) => {
      setToast({ message: err.message, type: "error" });
      setTimeout(() => setToast(null), 3000);
    },
  });

  const respondMutation = trpc.habitat.respondToRequest.useMutation({
    onSuccess: (data) => {
      setToast({ message: data.message, type: "success" });
      utils.habitat.list.invalidate();
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err) => {
      setToast({ message: err.message, type: "error" });
      setTimeout(() => setToast(null), 3000);
    },
  });

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
            <span className="text-sm text-foreground">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8">
        <div className="text-sm mb-2" style={{ color: "hsl(var(--foreground) / 0.4)" }}>
          <Link to="/hub" className="hover:text-foreground transition-colors" style={{ color: "hsl(var(--foreground) / 0.4)" }}>Hub</Link>
          <span className="mx-2">/</span>
          <span>Habitat</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground module-header-border-habitat pl-4">
              Nexus Habitat
            </h1>
            <p className="text-base mt-2" style={{ color: "hsl(var(--foreground) / 0.5)" }}>
              Find roommates who match your lifestyle
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 h-11 rounded-xl font-medium text-sm transition-all hover:shadow-lg"
            style={{ background: "#FDCB6E", color: "#0A0A0F" }}
          >
            <Plus size={18} />
            Post Your Place
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(["all", "open", "mine"] as FilterType[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`filter-pill ${filter === f ? "active-habitat" : ""}`}>
            {f === "all" ? "All" : f === "open" ? "Available" : "My Posts"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card p-6 animate-pulse" style={{ background: "hsl(var(--foreground) / 0.03)" }}>
              <div className="h-4 rounded w-1/3 mb-4" style={{ background: "hsl(var(--foreground) / 0.05)" }} />
              <div className="h-3 rounded w-2/3 mb-2" style={{ background: "hsl(var(--foreground) / 0.05)" }} />
              <div className="h-8 rounded w-full" style={{ background: "hsl(var(--foreground) / 0.05)" }} />
            </div>
          ))}
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map((post) => {
            const isOwner = post.userId === user?.id;
            const hasRequested = post.myRequestStatus !== null;
            const tags = post.tags ? JSON.parse(post.tags) : [];
            const isOpen = post.status === "open";

            return (
              <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase px-3 py-1 rounded-md"
                    style={{ background: isOpen ? "rgba(253,203,110,0.15)" : "hsl(var(--foreground) / 0.08)", color: isOpen ? "#FDCB6E" : "hsl(var(--foreground) / 0.5)" }}>
                    {post.status === "open" ? "Available" : post.status === "filled" ? "Filled" : "Closed"}
                  </span>
                  <span className="text-xs font-semibold px-3 py-1 rounded-md"
                    style={{ background: "rgba(253,203,110,0.1)", color: "#FDCB6E" }}>
                    {post._count.accepted}/{post.spotsAvailable} spots filled
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-1">{post.title}</h3>
                <div className="flex items-center gap-2 mb-2" style={{ color: "hsl(var(--foreground) / 0.6)" }}>
                  <MapPin size={14} />
                  <span className="text-sm">{post.address}</span>
                </div>
                <p className="text-lg font-semibold mb-3" style={{ color: "#FDCB6E" }}>
                  {post.rentPerPerson} MAD/person
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {Array.isArray(tags) && tags.map((tag: string, i: number) => (
                    <span key={i} className="text-xs px-3 py-1 rounded-full"
                      style={{ background: "rgba(253,203,110,0.1)", color: "#FDCB6E", border: "1px solid rgba(253,203,110,0.2)" }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Rules */}
                <button onClick={() => setExpandedRules(expandedRules === post.id ? null : post.id)}
                  className="flex items-center gap-1 text-sm mb-3 transition-colors hover:text-foreground"
                  style={{ color: "hsl(var(--foreground) / 0.5)" }}>
                  House Rules
                  {expandedRules === post.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <AnimatePresence>
                  {expandedRules === post.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mb-3">
                      <p className="text-sm" style={{ color: "hsl(var(--foreground) / 0.6)" }}>{post.rules}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Owner */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, #6C5CE7, #A29BFE)" }}>
                    {post.user?.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span className="text-sm" style={{ color: "hsl(var(--foreground) / 0.7)" }}>{post.user?.name}</span>
                </div>

                {/* Actions */}
                {isOwner ? (
                  <div className="flex flex-col gap-2">
                    {post._count.pendingRequests > 0 && (
                      <button onClick={() => setShowRequests(showRequests === post.id ? null : post.id)}
                        className="w-full h-10 rounded-xl text-sm font-medium transition-all"
                        style={{ background: "rgba(253,203,110,0.15)", color: "#FDCB6E", border: "1px solid rgba(253,203,110,0.3)" }}>
                        View {post._count.pendingRequests} Pending Request{post._count.pendingRequests !== 1 ? "s" : ""}
                      </button>
                    )}
                    {/* Requests drawer */}
                    <AnimatePresence>
                      {showRequests === post.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden">
                          <div className="flex flex-col gap-2 mt-2 p-3 rounded-xl" style={{ background: "hsl(var(--foreground) / 0.03)" }}>
                            {post.requests?.filter((r) => r.status === "pending").map((req) => (
                              <div key={req.id} className="flex items-start justify-between gap-2 p-2 rounded-lg" style={{ background: "hsl(var(--foreground) / 0.04)" }}>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
                                      style={{ background: "linear-gradient(135deg, #6C5CE7, #A29BFE)" }}>
                                      {req.user?.name?.[0]?.toUpperCase() || "?"}
                                    </div>
                                    <span className="text-sm text-foreground truncate">{req.user?.name}</span>
                                  </div>
                                  {req.message && <p className="text-xs truncate" style={{ color: "hsl(var(--foreground) / 0.5)" }}>{req.message}</p>}
                                </div>
                                <div className="flex gap-1">
                                  <button onClick={() => respondMutation.mutate({ requestId: req.id, action: "accept" })}
                                    className="p-1.5 rounded-lg transition-colors" style={{ background: "rgba(52,211,153,0.15)" }}>
                                    <Check size={14} color="#34d399" />
                                  </button>
                                  <button onClick={() => respondMutation.mutate({ requestId: req.id, action: "reject" })}
                                    className="p-1.5 rounded-lg transition-colors" style={{ background: "rgba(239,68,68,0.15)" }}>
                                    <XCircle size={14} color="#ef4444" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : isOpen && !hasRequested ? (
                  requestPostId === post.id ? (
                    <div className="flex flex-col gap-2">
                      <textarea value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)}
                        className="w-full h-20 rounded-lg px-3 py-2 text-sm text-foreground outline-none resize-none"
                        style={{ background: "hsl(var(--foreground) / 0.06)", border: "1px solid hsl(var(--foreground) / 0.08)" }}
                        placeholder="Tell them about yourself..." />
                      <div className="flex gap-2">
                        <button onClick={() => { setRequestPostId(null); setRequestMessage(""); }}
                          className="flex-1 h-9 rounded-lg text-sm transition-colors" style={{ background: "hsl(var(--foreground) / 0.06)", color: "hsl(var(--foreground) / 0.6)" }}>
                          Cancel
                        </button>
                        <button onClick={() => sendRequestMutation.mutate({ postId: post.id, message: requestMessage })}
                          className="flex-1 h-9 rounded-lg text-sm font-medium transition-all" style={{ background: "#FDCB6E", color: "#0A0A0F" }}>
                          Send Request
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setRequestPostId(post.id)}
                      className="w-full h-10 rounded-xl text-sm font-medium transition-all hover:shadow-lg"
                      style={{ background: "#FDCB6E", color: "#0A0A0F" }}>
                      Send Request
                    </button>
                  )
                ) : hasRequested ? (
                  <button disabled className="w-full h-10 rounded-xl text-sm font-medium opacity-50 cursor-not-allowed"
                    style={{ background: "rgba(253,203,110,0.15)", color: "#FDCB6E", border: "1px solid rgba(253,203,110,0.3)" }}>
                    Request {post.myRequestStatus === "pending" ? "Pending" : post.myRequestStatus === "accepted" ? "Accepted" : "Rejected"}
                  </button>
                ) : (
                  <button disabled className="w-full h-10 rounded-xl text-sm font-medium opacity-50 cursor-not-allowed"
                    style={{ background: "hsl(var(--foreground) / 0.06)", color: "hsl(var(--foreground) / 0.4)" }}>
                    {post.status === "filled" ? "Filled" : "Closed"}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(253,203,110,0.1)" }}>
            <Home size={40} color="rgba(253,203,110,0.4)" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No listings yet</h3>
          <p className="text-sm mb-6 text-center" style={{ color: "hsl(var(--foreground) / 0.5)" }}>
            Be the first to post your place and find a roommate!
          </p>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-5 h-11 rounded-xl font-medium text-sm"
            style={{ background: "#FDCB6E", color: "#0A0A0F" }}>
            <Plus size={18} />
            Post Your Place
          </button>
        </div>
      )}

      <AnimatePresence>
        {showCreate && <CreateHabitatModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  );
}

function CreateHabitatModal({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    title: "", description: "", address: "", rentPerPerson: "",
    spotsAvailable: "", tags: "", rules: "",
  });

  const createMutation = trpc.habitat.create.useMutation({
    onSuccess: () => {
      utils.habitat.list.invalidate();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.address || !form.rentPerPerson || !form.spotsAvailable || !form.rules) return;
    createMutation.mutate({
      title: form.title,
      description: form.description,
      address: form.address,
      rentPerPerson: Number(form.rentPerPerson),
      spotsAvailable: Number(form.spotsAvailable),
      tags: JSON.stringify(form.tags.split(",").map((t) => t.trim()).filter(Boolean)),
      rules: form.rules,
    });
  };

  const inputClass = "w-full h-10 rounded-lg px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-amber-400/30";
  const inputStyle = { background: "hsl(var(--foreground) / 0.06)", border: "1px solid hsl(var(--foreground) / 0.08)" };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="glass-modal w-full max-w-md p-6 my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Post Your Place</h2>
          <button onClick={onClose} className="text-foreground/40 hover:text-foreground"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "hsl(var(--foreground) / 0.7)" }}>Title</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} style={inputStyle} placeholder="e.g., Shared apartment near campus" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "hsl(var(--foreground) / 0.7)" }}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} h-20 py-2 resize-none`} style={inputStyle} placeholder="Describe the place..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "hsl(var(--foreground) / 0.7)" }}>Address</label>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} style={inputStyle} placeholder="Full address" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: "hsl(var(--foreground) / 0.7)" }}>Rent (MAD/person)</label>
              <input type="number" value={form.rentPerPerson} onChange={(e) => setForm({ ...form, rentPerPerson: e.target.value })} className={inputClass} style={inputStyle} placeholder="1500" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: "hsl(var(--foreground) / 0.7)" }}>Available Spots</label>
              <input type="number" min={1} max={10} value={form.spotsAvailable} onChange={(e) => setForm({ ...form, spotsAvailable: e.target.value })} className={inputClass} style={inputStyle} placeholder="1-10" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "hsl(var(--foreground) / 0.7)" }}>Tags (comma separated)</label>
            <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className={inputClass} style={inputStyle} placeholder="Quiet, Clean, Non-smoker..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "hsl(var(--foreground) / 0.7)" }}>House Rules</label>
            <textarea value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} className={`${inputClass} h-20 py-2 resize-none`} style={inputStyle} placeholder="What are your house rules?" />
          </div>
          <button type="submit" disabled={createMutation.isPending}
            className="w-full h-11 rounded-xl text-sm font-medium transition-all hover:shadow-lg disabled:opacity-40"
            style={{ background: "#FDCB6E", color: "#0A0A0F" }}>
            {createMutation.isPending ? "Posting..." : "Post Your Place"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
