import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Image,
  BarChart3,
  MessageCircle,
  Send,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTheme } from "@/components/ThemeProvider";

type FilterType = "all" | "meme" | "poll" | "discussion";
type CreateType = "meme" | "poll" | "discussion";

export default function Forum() {
  const { theme } = useTheme();
  const [filter, setFilter] = useState<FilterType>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [expandedComments, setExpandedComments] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");

  const utils = trpc.useUtils();
  const queryInput = filter !== "all" ? { type: filter as "meme" | "poll" | "discussion" } : undefined;
  const { data: posts, isLoading } = trpc.forum.list.useQuery(queryInput);

  const commentMutation = trpc.forum.comment.useMutation({
    onSuccess: () => {
      utils.forum.list.invalidate();
      setCommentText("");
    },
    onError: (err) => {
      setToast({ message: err.message, type: "error" });
      setTimeout(() => setToast(null), 3000);
    },
  });

  const voteMutation = trpc.forum.votePoll.useMutation({
    onSuccess: () => {
      utils.forum.list.invalidate();
    },
    onError: (err) => {
      setToast({ message: err.message, type: "error" });
      setTimeout(() => setToast(null), 3000);
    },
  });

  return (
    <div className="min-h-screen px-6 py-8" style={{ maxWidth: 800, margin: "0 auto" }}>
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
          <span>Forum</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground module-header-border-forum pl-4">Nexus Forum</h1>
            <p className="text-base mt-2" style={{ color: "hsl(var(--foreground) / 0.5)" }}>Memes, polls & campus culture</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 h-11 rounded-xl font-medium text-sm transition-all hover:shadow-lg"
            style={{ background: "#A29BFE", color: "#0A0A0F" }}>
            <Plus size={18} />New Post
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(["all", "meme", "poll", "discussion"] as FilterType[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`filter-pill ${filter === f ? "active-forum" : ""}`}>
            {f === "all" ? "All" : f === "meme" ? "Memes" : f === "poll" ? "Polls" : "Discussions"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => <SkeletonPost key={i} />)}
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              {/* Author header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #6C5CE7, #A29BFE)" }}>
                  {post.user?.login?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{post.user?.login || "Anonymous"}</div>
                  <div className="text-xs" style={{ color: "hsl(var(--foreground) / 0.4)" }}>
                    @{post.user?.email?.split("@")[0] || "user"} · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </div>
                </div>
                <span className="ml-auto text-xs px-2 py-1 rounded-md font-medium"
                  style={{ background: post.type === "meme" ? "rgba(162,155,254,0.15)" : post.type === "poll" ? "rgba(0,206,201,0.15)" : "hsl(var(--foreground) / 0.06)",
                    color: post.type === "meme" ? "#A29BFE" : post.type === "poll" ? "#00CEC9" : "hsl(var(--foreground) / 0.5)" }}>
                  {post.type === "meme" ? "Meme" : post.type === "poll" ? "Poll" : "Discussion"}
                </span>
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-foreground mb-2">{post.title}</h3>
              <p className="text-sm mb-3" style={{ color: "hsl(var(--foreground) / 0.8)" }}>{post.content}</p>

              {/* Meme image */}
              {post.imageUrl && (
                <div className="mb-3 rounded-xl overflow-hidden">
                  <img src={post.imageUrl} alt={post.title} className="w-full max-h-96 object-contain" style={{ background: "hsl(var(--foreground) / 0.03)" }} />
                </div>
              )}

              {/* Poll widget */}
              {post.type === "poll" && post.poll && (
                <div className="mb-3 p-4 rounded-xl" style={{ background: "hsl(var(--foreground) / 0.03)" }}>
                  <p className="text-sm font-medium text-foreground mb-3">{post.poll.question}</p>
                  <div className="flex flex-col gap-2">
                    {post.poll.options.map((option) => {
                      const percentage = post.poll!.totalVotes > 0
                        ? Math.round((option.voteCount / post.poll!.totalVotes) * 100) : 0;
                      return (
                        <button key={option.id}
                          onClick={() => {
                            if (!post.poll!.hasVoted) {
                              voteMutation.mutate({ pollId: post.poll!.id, optionId: option.id });
                            }
                          }}
                          disabled={post.poll!.hasVoted || voteMutation.isPending}
                          className="relative h-10 rounded-lg overflow-hidden text-left px-3 flex items-center transition-all disabled:cursor-default"
                          style={{ background: "hsl(var(--foreground) / 0.06)", border: "1px solid hsl(var(--foreground) / 0.08)" }}>
                          {post.poll!.hasVoted && (
                            <div className="absolute inset-0 rounded-lg transition-all" style={{ width: `${percentage}%`, background: "rgba(162,155,254,0.15)" }} />
                          )}
                          <span className="relative z-10 text-sm text-foreground flex-1">{option.optionText}</span>
                          {post.poll!.hasVoted && (
                            <span className="relative z-10 text-xs font-medium" style={{ color: "#A29BFE" }}>{percentage}%</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs mt-2" style={{ color: "hsl(var(--foreground) / 0.4)" }}>
                    {post.poll.totalVotes} vote{post.poll.totalVotes !== 1 ? "s" : ""}
                    {post.poll.hasVoted ? " · You voted" : " · Click to vote"}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 pt-3" style={{ borderTop: "1px solid hsl(var(--foreground) / 0.06)" }}>
                <button onClick={() => setExpandedComments(expandedComments === post.id ? null : post.id)}
                  className="flex items-center gap-1.5 text-sm transition-colors hover:text-foreground"
                  style={{ color: "hsl(var(--foreground) / 0.5)" }}>
                  <MessageCircle size={16} />
                  <span>{post._count.comments} comment{post._count.comments !== 1 ? "s" : ""}</span>
                </button>
              </div>

              {/* Comments section */}
              <AnimatePresence>
                {expandedComments === post.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-4 pt-4" style={{ borderTop: "1px solid hsl(var(--foreground) / 0.06)" }}>
                      {/* Comment input */}
                      <div className="flex gap-2 mb-4">
                        <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && commentText.trim()) {
                              commentMutation.mutate({ postId: post.id, content: commentText.trim() });
                            }
                          }}
                          className="flex-1 h-9 rounded-lg px-3 text-sm text-foreground outline-none"
                          style={{ background: "hsl(var(--foreground) / 0.06)", border: "1px solid hsl(var(--foreground) / 0.08)" }}
                          placeholder="Add a comment..." />
                        <button onClick={() => {
                          if (commentText.trim()) commentMutation.mutate({ postId: post.id, content: commentText.trim() });
                        }} disabled={!commentText.trim() || commentMutation.isPending}
                          className="h-9 px-3 rounded-lg transition-all disabled:opacity-40"
                          style={{ background: "#A29BFE", color: "#0A0A0F" }}>
                          <Send size={14} />
                        </button>
                      </div>
                      {/* Comments list */}
                      <div className="flex flex-col gap-3">
                        {post.comments?.map((comment) => (
                          <div key={comment.id} className="flex gap-2">
                            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-semibold text-white"
                              style={{ background: "linear-gradient(135deg, #6C5CE7, #A29BFE)" }}>
                              {comment.user?.login?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">{comment.user?.login}</span>
                                <span className="text-xs" style={{ color: "hsl(var(--foreground) / 0.3)" }}>
                                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-sm" style={{ color: "hsl(var(--foreground) / 0.7)" }}>{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(162,155,254,0.1)" }}>
            <MessageSquare size={40} color="rgba(162,155,254,0.4)" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No posts yet</h3>
          <p className="text-sm mb-6 text-center" style={{ color: "hsl(var(--foreground) / 0.5)" }}>Be the first to share something with the community!</p>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-5 h-11 rounded-xl font-medium text-sm"
            style={{ background: "#A29BFE", color: "#0A0A0F" }}><Plus size={18} />New Post</button>
        </div>
      )}

      <AnimatePresence>
        {showCreate && <CreateForumModal onClose={() => setShowCreate(false)} setToast={setToast} />}
      </AnimatePresence>
    </div>
  );
}

function SkeletonPost() {
  return (
    <div className="glass-card p-6 animate-pulse" style={{ background: "hsl(var(--foreground) / 0.03)" }}>
      <div className="h-4 rounded w-1/4 mb-3" style={{ background: "hsl(var(--foreground) / 0.05)" }} />
      <div className="h-3 rounded w-3/4 mb-2" style={{ background: "hsl(var(--foreground) / 0.05)" }} />
      <div className="h-3 rounded w-1/2" style={{ background: "hsl(var(--foreground) / 0.05)" }} />
    </div>
  );
}

function CreateForumModal({ onClose, setToast }: { onClose: () => void; setToast: (t: { message: string; type: "success" | "error" }) => void }) {
  const utils = trpc.useUtils();
  const [type, setType] = useState<CreateType>("discussion");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  const createMutation = trpc.forum.create.useMutation({
    onSuccess: () => {
      utils.forum.list.invalidate();
      onClose();
    },
    onError: (err) => {
      setToast({ message: err.message, type: "error" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    const poll = type === "poll" ? { question: pollQuestion, options: pollOptions.filter(Boolean) } : undefined;
    if (type === "poll" && (!pollQuestion || pollOptions.filter(Boolean).length < 2)) {
      setToast({ message: "Poll needs a question and at least 2 options", type: "error" });
      return;
    }
    createMutation.mutate({ title, content, type, imageUrl: imageUrl || undefined, poll });
  };

  const inputClass = "w-full h-10 rounded-lg px-3 text-sm text-foreground outline-none";
  const inputStyle = { background: "hsl(var(--foreground) / 0.06)", border: "1px solid hsl(var(--foreground) / 0.08)" };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="glass-modal w-full max-w-lg p-6 my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">New Post</h2>
          <button onClick={onClose} className="text-foreground/40 hover:text-foreground"><X size={20} /></button>
        </div>

        {/* Type selector */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {(["meme", "poll", "discussion"] as CreateType[]).map((t) => (
            <button key={t} onClick={() => setType(t)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all"
              style={{
                background: type === t ? "rgba(162,155,254,0.15)" : "hsl(var(--foreground) / 0.06)",
                border: `1px solid ${type === t ? "rgba(162,155,254,0.4)" : "hsl(var(--foreground) / 0.08)"}`,
                color: type === t ? "#A29BFE" : "hsl(var(--foreground) / 0.5)",
              }}>
              {t === "meme" ? <Image size={18} /> : t === "poll" ? <BarChart3 size={18} /> : <MessageSquare size={18} />}
              {t === "meme" ? "Meme" : t === "poll" ? "Poll" : "Discussion"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "hsl(var(--foreground) / 0.7)" }}>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} style={inputStyle} placeholder="Give your post a title" />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
              {type === "meme" ? "Caption" : type === "poll" ? "Description" : "Body"}
            </label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} className={`${inputClass} h-24 py-2 resize-none`} style={inputStyle}
              placeholder={type === "meme" ? "What's funny about this?" : type === "poll" ? "Tell us more about your poll..." : "What's on your mind?"} />
          </div>

          {type === "meme" && (
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: "hsl(var(--foreground) / 0.7)" }}>Image URL</label>
              <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={inputClass} style={inputStyle} placeholder="Paste an image URL" />
            </div>
          )}

          {type === "poll" && (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "hsl(var(--foreground) / 0.7)" }}>Poll Question</label>
                <input type="text" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} className={inputClass} style={inputStyle} placeholder="Ask a question..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "hsl(var(--foreground) / 0.7)" }}>Options</label>
                <div className="flex flex-col gap-2">
                  {pollOptions.map((opt, i) => (
                    <input key={i} type="text" value={opt} onChange={(e) => {
                      const newOpts = [...pollOptions];
                      newOpts[i] = e.target.value;
                      setPollOptions(newOpts);
                    }} className={inputClass} style={inputStyle} placeholder={`Option ${i + 1}`} />
                  ))}
                  <button type="button" onClick={() => setPollOptions([...pollOptions, ""])}
                    className="text-sm py-1 transition-colors hover:text-foreground" style={{ color: "hsl(var(--foreground) / 0.5)" }}>
                    + Add Option
                  </button>
                </div>
              </div>
            </>
          )}

          <button type="submit" disabled={createMutation.isPending || !title || !content}
            className="w-full h-11 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
            style={{ background: "#A29BFE", color: "#0A0A0F" }}>
            {createMutation.isPending ? "Posting..." : "Post"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
