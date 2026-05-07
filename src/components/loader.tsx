"use client";

import { motion } from "framer-motion";

export function PremiumLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="relative w-16 h-16">
        {/* Outer Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 border-4 border-tm-yellow/20 border-t-tm-yellow rounded-full"
        />
        {/* Inner Ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="absolute inset-2 border-4 border-tm-orange-dark/20 border-t-tm-orange-dark rounded-full"
        />
        {/* Center Glow */}
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-4 bg-tm-yellow/30 blur-xl rounded-full"
        />
      </div>
      <p className="text-tm-blue-gray font-black text-xs uppercase tracking-[0.3em] animate-pulse">
        Synchronizing Data...
      </p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="w-full h-48 bg-white/5 border border-white/10 rounded-3xl relative overflow-hidden">
      <motion.div
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shadow-[0_0_50px_rgba(255,255,255,0.05)]"
      />
    </div>
  );
}
