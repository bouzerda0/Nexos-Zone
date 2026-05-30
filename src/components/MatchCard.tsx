import { format } from "date-fns";

export interface MatchCardProps {
  id: string;
  matchType: string;
  matchDate: string | Date;
  location: string;
  teamA?: string;
  teamB?: string;
  currentPlayers: number;
  maxPlayers: number;
  description?: string;
  onClick?: () => void;
}

export function MatchCard({
  matchType,
  matchDate,
  location,
  teamA,
  teamB,
  currentPlayers,
  maxPlayers,
  description,
  onClick,
}: MatchCardProps) {
  const isFootball = matchType === "football";
  const bgAccent = isFootball ? "bg-[#55EFC4]/10" : "bg-[#A29BFE]/10";
  const textAccent = isFootball ? "text-[#55EFC4]" : "text-[#A29BFE]";

  const formattedDate = format(new Date(matchDate), "MMM d, h:mm a");

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer rounded-xl p-4 mb-3"
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-xs md:text-sm font-medium px-2 py-1 rounded-md ${bgAccent} ${textAccent} uppercase`}>
          {matchType}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{formattedDate}</span>
      </div>
      
      <h3 className="text-sm md:text-base font-medium mb-1 text-slate-800 dark:text-white mt-1">
        {teamA || "TBA"} <span className="text-slate-400 font-normal mx-1">vs</span> {teamB || "TBA"}
      </h3>
      
      <div className="flex justify-between items-center mt-2 text-xs md:text-sm text-slate-500 dark:text-slate-400">
        <span>{location}</span>
        <span>{currentPlayers}/{maxPlayers} players</span>
      </div>

      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
          {description}
        </p>
      )}
    </div>
  );
}
