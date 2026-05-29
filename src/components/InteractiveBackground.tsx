import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function InteractiveBackground() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [mounted, setMounted] = useState(false);

  // Orb 1: Faster, tight follow
  const springX1 = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY1 = useSpring(mouseY, { stiffness: 50, damping: 20 });

  // Orb 2: Slower, floaty trailing effect
  const springX2 = useSpring(mouseX, { stiffness: 30, damping: 30 });
  const springY2 = useSpring(mouseY, { stiffness: 30, damping: 30 });

  useEffect(() => {
    setMounted(true);
    // Center initially before mouse moves
    mouseX.set(window.innerWidth / 2);
    mouseY.set(window.innerHeight / 2);

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-background pointer-events-none transition-colors duration-500">
      {/* Orb 1 */}
      <motion.div
        style={{
          x: springX1,
          y: springY1,
          translateX: "-50%",
          translateY: "-50%",
        }}
        className="absolute top-0 left-0 w-[45vw] h-[45vw] min-w-[350px] min-h-[350px] rounded-full bg-indigo-300/40 dark:bg-indigo-600/30 blur-[100px] md:blur-[140px]"
      />
      
      {/* Orb 2: Slightly offset so the colors blend naturally around the cursor */}
      <motion.div
        style={{
          x: springX2,
          y: springY2,
          translateX: "-25%",
          translateY: "-75%",
        }}
        className="absolute top-0 left-0 w-[50vw] h-[50vw] min-w-[400px] min-h-[400px] rounded-full bg-sky-200/40 dark:bg-cyan-500/20 blur-[110px] md:blur-[150px]"
      />

      {/* Technical Grid / Mesh Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)] opacity-60 dark:opacity-30" />
    </div>
  );
}
