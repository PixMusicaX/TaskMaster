"use client";

import { motion, AnimatePresence } from "framer-motion";
import { RankCrest } from "@/lib/rank-icons";
import { useTheme } from "./theme-provider";

export default function ClassWatermark() {
  const { rank } = useTheme();

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center opacity-10 dark:opacity-[0.06]">
      <AnimatePresence mode="wait">
        {/* Opacity/scale only: animating blur on a full-screen layer is too costly on phones */}
        <motion.div
          key={rank}
          initial={{ opacity: 0, scale: 0.8, x: "-50%", y: "-50%" }}
          animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
          exit={{ opacity: 0, scale: 1.2, x: "-50%", y: "-50%" }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="text-tm-blue-gray absolute top-1/2 left-1/2 w-[150vw] h-[150vw] md:w-[80vw] md:h-[80vw] lg:w-[60vw] lg:h-[60vw] flex items-center justify-center shrink-0"
        >
          <RankCrest rank={rank} size="100%" strokeWidth={0.5} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
