"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import Clock from "@/components/Clock";
import ScrollPrompt from "@/components/ScrollPrompt";
import AnalyticsSection from "@/components/AnalyticsSection";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden no-scrollbar relative scroll-smooth bg-background">
      {/* GLOBAL BACKGROUND ELEMENTS */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="fixed left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-indigo-500 opacity-10 blur-[100px]"></div>

      {/* HERO SECTION */}
      <section className="relative w-full min-h-[100dvh] shrink-0 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-transparent to-black/20">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="flex flex-col items-center gap-12 z-10 text-center">
              <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="flex flex-col items-center gap-6"
              >
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 1 }}
                  >
                    <h1 className="text-7xl md:text-8xl lg:text-[10rem] tracking-tight leading-none">
                      Welcome to <span className="text-white">Planner!</span>
                    </h1>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 1 }}
                  >
                    <Clock />
                  </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.8 }}
              >
                <Link 
                  href="/management"
                  className="group px-8 py-4 bg-white text-black rounded-2xl font-black uppercase text-sm tracking-[0.2em] flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                  Launch Planner
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
          </div>

          <ScrollPrompt />
      </section>

      {/* ANALYTICS SECTION */}
      <div className="min-h-screen w-full flex items-center justify-center bg-black/40 border-t border-white/5 backdrop-blur-3xl">
          <AnalyticsSection />
      </div>

      <footer className="p-12 text-center text-muted-foreground text-xs uppercase tracking-[0.4em] opacity-30">
          TaskMaster © 2026
      </footer>
    </main>
  );
}
