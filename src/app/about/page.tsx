"use client";

import GlassCard from "@/components/glass-card";
import { Info, Shield, Zap, Heart, Github, Twitter, Mail, Code2, Palette, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function AboutPage() {
  const stats = [
    { label: "Design", value: "Premium", icon: Palette },
    { label: "Performance", value: "Blazing", icon: Zap },
    { label: "Security", value: "Robust", icon: Shield },
    { label: "Built for", value: "Creatives", icon: Sparkles },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto space-y-16 pb-24">
      {/* Header section */}
      <div className="text-center space-y-4">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-tm-orange-dark mx-auto rounded-[2rem] flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-tm-orange-dark/20 mb-8"
        >
          T
        </motion.div>
        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-tm-purple-dark dark:text-tm-yellow">
          TaskMaster
        </h1>
        <p className="text-xl text-tm-blue-gray font-medium max-w-2xl mx-auto">
          Where productivity meets pure artistry. Designed for those who demand excellence in every pixel.
        </p>
      </div>

      {/* Grid of cards */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-8"
      >
        <motion.div variants={item}>
          <GlassCard className="h-full p-8 space-y-4 border-l-4 border-l-tm-yellow">
            <div className="w-12 h-12 bg-tm-yellow/10 rounded-2xl flex items-center justify-center text-tm-yellow">
              <Code2 size={24} />
            </div>
            <h2 className="text-2xl font-black">Our Philosophy</h2>
            <p className="text-tm-blue-gray leading-relaxed">
              We believe that tools shouldn't just be functional—they should be inspiring. TaskMaster was born from the idea that managing your life can be as beautiful as creating a masterpiece.
            </p>
          </GlassCard>
        </motion.div>

        <motion.div variants={item}>
          <GlassCard className="h-full p-8 space-y-4 border-l-4 border-l-tm-orange-light">
            <div className="w-12 h-12 bg-tm-orange-light/10 rounded-2xl flex items-center justify-center text-tm-orange-light">
              <Sparkles size={24} />
            </div>
            <h2 className="text-2xl font-black">Art Paint Aesthetic</h2>
            <p className="text-tm-blue-gray leading-relaxed">
              Featuring our signature "Gaseous Divider" and deep midnight tones, TaskMaster transforms your screen into a living canvas. Every interaction is designed to feel fluid and alive.
            </p>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <GlassCard key={i} className="p-6 text-center space-y-2 border-tm-blue-gray/5">
            <stat.icon className="mx-auto text-tm-blue-gray/40" size={20} />
            <p className="text-[10px] font-black uppercase tracking-widest text-tm-blue-gray">{stat.label}</p>
            <p className="text-xl font-black text-tm-purple-dark dark:text-tm-yellow">{stat.value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Footer / Connect */}
      <div className="pt-12 text-center space-y-8 border-t border-tm-blue-gray/10">
        <h3 className="text-xl font-bold">Connect with the Creator</h3>
        <div className="flex justify-center gap-6">
          <a href="#" className="p-4 bg-white/5 rounded-2xl hover:bg-tm-yellow/10 hover:text-tm-yellow transition-all border border-white/10">
            <Github size={24} />
          </a>
          <a href="#" className="p-4 bg-white/5 rounded-2xl hover:bg-tm-blue-gray/10 hover:text-tm-blue-gray transition-all border border-white/10">
            <Twitter size={24} />
          </a>
          <a href="#" className="p-4 bg-white/5 rounded-2xl hover:bg-tm-orange-light/10 hover:text-tm-orange-light transition-all border border-white/10">
            <Mail size={24} />
          </a>
        </div>
        <p className="text-xs font-black uppercase text-tm-blue-gray tracking-[0.3em]">
          Version 1.0.0 • © 2026 TaskMaster
        </p>
      </div>
    </div>
  );
}
