"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, TrendingUp, TrendingDown, Swords, Brain, Coins, HeartPulse, Users } from "lucide-react";
import GlassCard from "./glass-card";
import { useEffect, useState } from "react";

const statIcons: Record<string, any> = {
  strength: Swords,
  intelligence: Brain,
  wealth: Coins,
  vitality: HeartPulse,
  charisma: Users,
};

const statColors: Record<string, string> = {
  strength: "var(--tm-orange-dark)",
  intelligence: "var(--tm-yellow)",
  wealth: "var(--tm-orange-light)",
  vitality: "var(--tm-red)",
  charisma: "var(--tm-blue-gray)",
};

interface RecapModalProps {
  stats: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function RecapModal({ stats, isOpen, onClose }: RecapModalProps) {
  if (!stats) return null;

  const TopIcon = statIcons[stats.topStat] || Trophy;
  const WeakIcon = statIcons[stats.weakStat] || Trophy;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl"
          >
            <GlassCard className="p-8 border-tm-yellow/30 bg-tm-purple-dark/95 shadow-2xl overflow-hidden">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-tm-blue-gray hover:text-tm-yellow transition-colors"
              >
                <X size={24} />
              </button>

              <div className="text-center space-y-2 mb-8">
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Trophy className="mx-auto text-tm-yellow mb-2" size={48} />
                  <h2 className="text-3xl font-black text-tm-yellow tracking-tighter uppercase italic">
                    {stats.monthName} Season Recap
                  </h2>
                </motion.div>
                <p className="text-tm-blue-gray font-bold uppercase tracking-[0.2em] text-xs">
                  Season Accomplishments
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Main Stats */}
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-4"
                >
                  <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-4">
                    <div className="p-3 bg-tm-yellow/20 rounded-2xl">
                      <Trophy className="text-tm-yellow" size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-tm-blue-gray uppercase tracking-widest">Final XP</p>
                      <p className="text-2xl font-black text-white">{stats.xp} XP</p>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-4">
                    <div className="p-3 bg-tm-orange-dark/20 rounded-2xl">
                      <TrendingUp className="text-tm-orange-dark" size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-tm-blue-gray uppercase tracking-widest">Highest Level</p>
                      <p className="text-2xl font-black text-white">Level {stats.level}</p>
                    </div>
                  </div>
                </motion.div>

                {/* Narrative */}
                <motion.div 
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-4"
                >
                  <div className="p-6 rounded-3xl bg-tm-yellow/5 border border-tm-yellow/10">
                    <div className="flex items-center gap-3 mb-2">
                      <TopIcon className="text-tm-yellow" size={20} />
                      <span className="text-xs font-black uppercase text-tm-yellow tracking-widest">Dominant Stat</span>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed italic">
                      You dominated <span className="text-tm-yellow font-bold uppercase">{stats.topStat}</span> this month. Your dedication to your craft is showing.
                    </p>
                  </div>

                  <div className="p-6 rounded-3xl bg-tm-red/5 border border-tm-red/10">
                    <div className="flex items-center gap-3 mb-2">
                      <WeakIcon className="text-tm-red" size={20} />
                      <span className="text-xs font-black uppercase text-tm-red tracking-widest">Neglected Area</span>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed italic">
                      <span className="text-tm-red font-bold uppercase">{stats.weakStat}</span> was neglected. Balance is key to becoming a true Master.
                    </p>
                  </div>
                </motion.div>
              </div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-8 text-center"
              >
                <button
                  onClick={onClose}
                  className="px-8 py-3 bg-tm-yellow text-tm-purple-dark font-black uppercase rounded-2xl hover:scale-105 transition-transform shadow-xl shadow-tm-yellow/20"
                >
                  Continue to Next Season
                </button>
              </motion.div>

              {/* Decorative elements */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-tm-yellow/10 blur-[60px] rounded-full pointer-events-none" />
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-tm-orange-dark/10 blur-[60px] rounded-full pointer-events-none" />
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
