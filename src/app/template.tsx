"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ROUTES } from "@/lib/routes";
import { EASE } from "@/lib/motion";

// Index of the page we came from; templates remount on every navigation
let lastIndex = -1;

// Pages slide in from the side they sit on in the nav/swipe order
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const index = ROUTES.indexOf(pathname);
  const direction = lastIndex === -1 || index === -1 ? 0 : Math.sign(index - lastIndex);

  useEffect(() => {
    lastIndex = index;
  }, [index]);

  return (
    <div className="overflow-x-clip">
      <motion.div
        initial={{ opacity: 0, x: direction * 28, y: direction === 0 ? 12 : 0 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.4, ease: EASE.out }}
      >
        {children}
      </motion.div>
    </div>
  );
}
