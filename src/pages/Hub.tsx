import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Car, Home, Utensils, MessageSquare, Activity, GraduationCap } from "lucide-react";

const modules = [
  {
    id: "transit",
    name: "Nexus Transit",
    description: "Share rides to campus",
    icon: Car,
    accent: "#00CEC9",
    path: "/transit",
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
    id: "pulse",
    name: "Nexus Pulse",
    description: "Food orders & events",
    icon: Utensils,
    accent: "#E17055",
    path: "/pulse",
  },
  {
    id: "forum",
    name: "Nexus Forum",
    description: "Memes, polls & culture",
    icon: MessageSquare,
    accent: "#A29BFE",
    path: "/forum",
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
    path: "/zone01-profile",
  },
];

export default function Hub() {
  const { user } = useAuth();
  const navigate = useNavigate();

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
              onClick={() => navigate(module.path)}
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
    </div>
  );
}
