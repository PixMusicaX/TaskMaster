"use client";
import React, { useState } from "react";
import { Plus, Trash2, Listo, Circle, Star, Calendar, CheckSquare, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type BulletType = "note" | "event" | "task";

export interface BulletItem {
  id: string;
  type: BulletType;
  text: string;
}

interface BulletEditorProps {
  bullets: BulletItem[];
  onChange: (bullets: BulletItem[]) => void;
}

const typeConfig = {
  note: { icon: Circle, label: "Note", color: "text-indigo-400" },
  event: { icon: Calendar, label: "Event", color: "text-amber-400" },
  task: { icon: CheckSquare, label: "Task", color: "text-emerald-400" },
};

export default function BulletEditor({ bullets, onChange }: BulletEditorProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const addBullet = () => {
    const newBullet: BulletItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: "note",
      text: "",
    };
    onChange([...bullets, newBullet]);
  };

  const updateBullet = (id: string, updates: Partial<BulletItem>) => {
    onChange(bullets.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const removeBullet = (id: string) => {
    onChange(bullets.filter((b) => b.id !== id));
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addBullet();
    } else if (e.key === "Backspace" && bullets[index].text === "" && bullets.length > 1) {
      e.preventDefault();
      removeBullet(bullets[index].id);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground/40">Daily Log</span>
        <button 
          onClick={addBullet}
          className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest"
        >
          <Plus className="w-3 h-3" /> Add Item
        </button>
      </div>

      <div className="flex flex-col gap-3 min-h-[200px]">
        <AnimatePresence initial={false}>
          {bullets.map((bullet, index) => {
            const Config = typeConfig[bullet.type];
            return (
              <motion.div
                key={bullet.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="group flex items-start gap-4 relative"
              >
                {/* Type Selector Dropdown */}
                <div className="relative pt-1 flex-shrink-0">
                  <button
                    onClick={() => setActiveMenu(activeMenu === bullet.id ? null : bullet.id)}
                    className={`p-1.5 rounded-lg transition-all border ${Config.color} bg-white/5 border-white/5 hover:border-white/20`}
                  >
                    <Config.icon className="w-4 h-4" />
                  </button>
                  
                  {activeMenu === bullet.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                      <div className="absolute top-full left-0 mt-2 w-32 glass rounded-xl border border-white/10 shadow-2xl z-50 p-1 overflow-hidden">
                        {(Object.keys(typeConfig) as BulletType[]).map((type) => {
                          const T = typeConfig[type];
                          return (
                            <button
                              key={type}
                              onClick={() => {
                                updateBullet(bullet.id, { type });
                                setActiveMenu(null);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white hover:bg-white/5 transition-all rounded-lg"
                            >
                              <T.icon className={`w-3 h-3 ${T.color}`} />
                              {T.label}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Input Text Area */}
                <textarea
                  autoFocus={index === bullets.length - 1 && bullet.text === ""}
                  value={bullet.text}
                  onChange={(e) => updateBullet(bullet.id, { text: e.target.value })}
                  onKeyDown={(e) => onKeyDown(e, index)}
                  rows={1}
                  placeholder="Focus on..."
                  className="flex-1 bg-transparent border-none outline-none text-white/90 font-medium py-1.5 resize-none overflow-hidden placeholder:text-muted-foreground/20 italic text-sm"
                  style={{ height: 'auto' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                />

                {/* Delete Button */}
                <button
                  onClick={() => removeBullet(bullet.id)}
                  className="opacity-0 group-hover:opacity-40 hover:!opacity-100 p-2 text-rose-500 transition-all rounded-lg pt-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {bullets.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl p-12 text-center opacity-30">
            <span className="text-sm font-medium italic">Empty journal...</span>
            <button onClick={addBullet} className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:text-white underline transition-all">Start fresh</button>
          </div>
        )}
      </div>
    </div>
  );
}
