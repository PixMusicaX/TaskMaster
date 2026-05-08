"use client";

import { useTheme } from "./theme-provider";
import { User, Swords, ShieldAlert, Crosshair, Sword, Castle, SunMedium, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const rankIcons: Record<string, any> = {
  "Novice": User,
  "Squire": Swords,
  "Vanguard": ShieldAlert,
  "Veteran": Crosshair,
  "Knight": Sword,
  "Sentinel": Castle,
  "Paladin": SunMedium,
  "Grandmaster": Crown,
};

export default function ClassWatermark() {
  const { rank } = useTheme();
  
  const Icon = rankIcons[rank] || User;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center opacity-10 dark:opacity-[0.06]">
      <AnimatePresence mode="wait">
        <motion.div
          key={rank}
          initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)", x: "-50%", y: "-50%" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)", x: "-50%", y: "-50%" }}
          exit={{ opacity: 0, scale: 1.2, filter: "blur(10px)", x: "-50%", y: "-50%" }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="text-tm-blue-gray absolute top-1/2 left-1/2 w-[150vw] h-[150vw] md:w-[80vw] md:h-[80vw] lg:w-[60vw] lg:h-[60vw] flex items-center justify-center shrink-0"
        >
          <Icon size="100%" strokeWidth={0.5} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
