"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageSquare, Send, Sparkles } from "lucide-react";
import GlassCard from "./glass-card";
import { askTaskmaster, getTaskmasterRemainingQueries } from "@/app/actions/taskmaster";
import { cn } from "@/lib/utils";

function formatResponse(text: string) {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return (
      <span key={i} className="block mb-3 last:mb-0">
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="text-tm-yellow font-black">{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={index} className="text-tm-yellow/80 font-bold">{part.slice(1, -1)}</em>;
          }
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  });
}

interface TaskmasterDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TaskmasterDialog({ isOpen, onClose }: TaskmasterDialogProps) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | string>(3);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getTaskmasterRemainingQueries().then((res) => {
        setRemaining(res.remaining);
      });
      setQuestion("");
      setResponse(null);
      setError(null);
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const noQueriesLeft = typeof remaining === 'number' && remaining <= 0;
    if (!question.trim() || loading || noQueriesLeft) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    const res = await askTaskmaster(question);
    
    if (res.success && res.answer) {
      setResponse(res.answer);
      if (res.remaining !== undefined) setRemaining(res.remaining);
    } else {
      setError(res.message || "An error occurred.");
    }

    setLoading(false);
  }

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
            className="relative w-full max-w-lg"
          >
            <GlassCard className="p-6 sm:p-8 border-tm-purple-dark/30 bg-background/95 dark:bg-tm-purple-dark/95 shadow-2xl overflow-hidden flex flex-col gap-6 relative">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <Sparkles size={120} />
              </div>

              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-tm-yellow/20 rounded-2xl">
                    <MessageSquare className="text-tm-yellow" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-foreground dark:text-tm-yellow tracking-tighter uppercase italic">
                      Ask The Taskmaster
                    </h2>
                    <p className="text-[10px] font-black uppercase text-tm-blue-gray tracking-widest">
                      {remaining} / 3 Queries Remaining
                    </p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 text-tm-blue-gray hover:text-tm-yellow transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="relative z-10">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask about your progress, habits, or next steps..."
                    className="w-full bg-black/10 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-2xl p-4 text-sm font-medium text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-tm-yellow/50 transition-all placeholder:text-tm-blue-gray/50"
                    rows={3}
                    disabled={loading || (typeof remaining === 'number' && remaining <= 0)}
                  />
                  <button
                    type="submit"
                    disabled={!question.trim() || loading || (typeof remaining === 'number' && remaining <= 0)}
                    className="self-end px-6 py-2 bg-tm-yellow text-tm-purple-dark font-black uppercase rounded-xl hover:scale-105 transition-all shadow-xl shadow-tm-yellow/20 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 text-xs tracking-widest"
                  >
                    {loading ? (
                      <span className="animate-pulse">Consulting...</span>
                    ) : (
                      <>
                        Ask <Send size={14} />
                      </>
                    )}
                  </button>
                </form>
              </div>

              <AnimatePresence>
                {response && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-tm-yellow/5 border border-tm-yellow/20 rounded-2xl relative z-10"
                  >
                    <div className="text-sm font-medium text-foreground/90 leading-relaxed italic">
                      {formatResponse(response)}
                    </div>
                  </motion.div>
                )}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-tm-orange-dark/10 border border-tm-orange-dark/20 rounded-2xl relative z-10"
                  >
                    <p className="text-xs font-bold text-tm-orange-dark uppercase tracking-widest text-center">
                      {error}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
