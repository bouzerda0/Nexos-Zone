import { useState, useMemo } from "react";
import { MatchCard } from "@/components/MatchCard";
import { trpc } from "@/providers/trpc";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Car, Home, Utensils, MessageSquare, Activity, GraduationCap, Trophy, BarChart, Loader2 } from "lucide-react";

type ActivityItem = {
  id: string;
  type: 'match' | 'poll';
  date: Date;
  matchType?: string;
  location?: string;
  teamA?: string;
  teamB?: string;
  currentPlayers?: number;
  maxPlayers?: number;
  description?: string;
  question?: string;
  category?: string;
  options?: { id: string; text: string; votes: number }[];
  totalVotes?: number;
};

const pollsData: ActivityItem[] = [
  {
    id: "p1",
    type: "poll",
    date: new Date(Date.now() - 1000 * 60 * 30),
    category: "Campus Life",
    question: "What should be the theme for next week's hackathon?",
    totalVotes: 124,
    options: [
      { id: "o1", text: "AI Agents", votes: 65 },
      { id: "o2", text: "Web3/Crypto", votes: 20 },
      { id: "o3", text: "Green Tech", votes: 39 },
    ]
  },
  {
    id: "p2",
    type: "poll",
    date: new Date(Date.now() - 1000 * 60 * 60 * 5),
    category: "Food & Pulse",
    question: "Vote for Friday's special menu!",
    totalVotes: 89,
    options: [
      { id: "o4", text: "Pizza Party", votes: 42 },
      { id: "o5", text: "Tacos", votes: 47 },
    ]
  }
];

function PollCard({ item }: { item: ActivityItem }) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  return (
    <div className="bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer rounded-xl p-4 mb-3">
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs md:text-sm font-medium px-2 py-1 rounded-md bg-[#A29BFE]/10 text-[#A29BFE]">
          {item.category}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{item.totalVotes! + (selectedOption ? 1 : 0)} votes</span>
      </div>
      <h3 className="text-sm md:text-base font-medium mb-3 text-slate-800 dark:text-white">
        {item.question}
      </h3>
      <div className="flex flex-col gap-2">
        {item.options?.map(opt => {
          const isSelected = selectedOption === opt.id;
          const hasVoted = selectedOption !== null;
          const currentVotes = opt.votes + (isSelected ? 1 : 0);
          const totalVotes = item.totalVotes! + (hasVoted ? 1 : 0);
          const percent = Math.round((currentVotes / totalVotes) * 100);

          return (
            <button
              key={opt.id}
              onClick={(e) => { e.stopPropagation(); if (!hasVoted) setSelectedOption(opt.id); }}
              disabled={hasVoted}
              className={`relative overflow-hidden w-full text-left px-4 py-2.5 rounded-lg border transition-all ${
                isSelected 
                  ? "border-[#A29BFE] bg-[#A29BFE]/10" 
                  : "border-slate-200 dark:border-slate-700/50 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/40 dark:hover:bg-slate-800/80"
              } ${hasVoted && !isSelected ? "opacity-60" : ""}`}
            >
              {hasVoted && (
                <div 
                  className="absolute top-0 left-0 bottom-0 bg-[#A29BFE]/20 transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              )}
              <div className="relative z-10 flex justify-between items-center w-full">
                <span className={`text-sm ${isSelected ? 'text-[#A29BFE] font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                  {opt.text}
                </span>
                {hasVoted && (
                  <span className={`text-xs ${isSelected ? 'text-[#A29BFE] font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                    {percent}%
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  );
}

const modules = [
  {
    id: "forum",
    name: "Nexus Forum",
    description: "Memes, polls & culture",
    icon: MessageSquare,
    accent: "#A29BFE",
    path: "/forum",
  },
  {
    id: "transit",
    name: "Nexus Transit",
    description: "Share rides to campus",
    icon: Car,
    accent: "#00CEC9",
    path: "/transit",
  },
  {
    id: "pulse",
    name: "Nexus Pulse",
    description: "Food orders & events",
    icon: Utensils,
    accent: "#E17055",
    path: "/pulse",
  },
  {
    id: "habitat",
    name: "Nexus Habitat",
    description: "Find your perfect roommate",
    icon: Home,
    accent: "#FDCB6E",
    path: "/habitat",
  },
  {
    id: "spirit",
    name: "Nexus Spirit & Arena",
    description: "Prayer times & sports",
    icon: Activity,
    accent: "#55EFC4",
    path: "/spirit-arena",
  },
  {
    id: "zone01",
    name: "Zone 01 Profile",
    description: "Your XP stats & profile",
    icon: GraduationCap,
    accent: "#00B4D8",
    path: "/profile",
  },
];

export default function Hub() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: upcomingMatches, isLoading: matchesLoading } = trpc.spirit.matchUpcoming.useQuery();

  const combinedFeed = useMemo(() => {
    const feed: any[] = [...pollsData];
    if (upcomingMatches) {
      const liveMatches = upcomingMatches.map(m => ({
        id: m.id,
        type: "match" as const,
        date: new Date(m.matchDate),
        matchType: m.matchType,
        location: m.location,
        teamA: (m as any).teamA,
        teamB: (m as any).teamB,
        currentPlayers: m._count?.players ?? m.players?.length ?? 0,
        maxPlayers: m.maxPlayers,
        description: m.notes,
      }));
      feed.push(...liveMatches);
    }
    return feed.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [upcomingMatches]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h1 className="text-3xl font-semibold mb-2" style={{ color: "hsl(var(--foreground))" }}>
          Welcome back, {user?.login || "Student"}
        </h1>
        <p className="text-base" style={{ color: "hsl(var(--foreground) / 0.5)" }}>
          Choose your Nexus module
        </p>
      </motion.div>

      <div className="flex flex-wrap justify-center gap-6 max-w-[1200px]">
        {modules.map((module, index) => {
          const Icon = module.icon;
          return (
            <motion.button
              key={module.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              whileHover={{ y: -8, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (module.id === "zone01") {
                  navigate(`/profile/${user?.login || ""}`);
                } else {
                  navigate(module.path);
                }
              }}
              className="glass-card flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300"
              style={{
                width: "200px",
                height: "260px",
                padding: "24px",
                borderColor: `${module.accent}20`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = `${module.accent}80`;
                (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px ${module.accent}33`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = `${module.accent}20`;
                (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.3)";
              }}
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: `${module.accent}15` }}>
                <Icon size={32} color={module.accent} strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-1" style={{ color: "hsl(var(--foreground))" }}>
                  {module.name}
                </h3>
                <p className="text-xs" style={{ color: "hsl(var(--foreground) / 0.5)" }}>
                  {module.description}
                </p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl"
                style={{ background: module.accent }} />
            </motion.button>
          );
        })}
      </div>

      {/* Unified Activity Feed Section */}
      <div className="w-full max-w-[800px] mt-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 backdrop-blur-md rounded-2xl p-4 md:p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-foreground/10 text-foreground">
              <Activity size={20} />
            </div>
            <h2 className="text-lg md:text-xl font-semibold text-slate-800 dark:text-white">
              Latest Community Activity
            </h2>
          </div>

          <div className="flex flex-col gap-1">
            {matchesLoading && combinedFeed.length === pollsData.length ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
              </div>
            ) : combinedFeed.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No recent activity.</p>
            ) : (
              combinedFeed.map((item) => {
                if (item.type === "poll") {
                  return <PollCard key={item.id} item={item} />;
                }
                
                if (item.type === "match") {
                  return (
                    <MatchCard
                      key={item.id}
                      id={item.id}
                      matchType={item.matchType!}
                      matchDate={item.date}
                      location={item.location!}
                      teamA={item.teamA}
                      teamB={item.teamB}
                      currentPlayers={item.currentPlayers!}
                      maxPlayers={item.maxPlayers!}
                      description={item.description}
                    />
                  );
                }
                return null;
              })
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
