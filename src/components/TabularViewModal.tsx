"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Filter } from "lucide-react";
import GlassCard from "./glass-card";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface Column {
  header: string;
  key: string;
  render?: (value: any, row: any) => React.ReactNode;
  wrap?: boolean;
}

interface TabularViewModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  columns: Column[];
}

export default function TabularViewModal({ title, isOpen, onClose, data, columns }: TabularViewModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = data.filter(row => 
    Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 md:p-12 overflow-hidden" data-swipe-ignore="true">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            className="relative w-full h-full max-w-7xl flex flex-col z-[201]"
          >
            <div className={cn(
              "flex-1 flex flex-col overflow-hidden rounded-3xl border border-tm-yellow/20 bg-tm-purple-dark/95 backdrop-blur-2xl shadow-2xl",
              "before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-br before:from-tm-yellow/5 before:to-tm-orange-dark/5"
            )}>
              {/* Header */}
              <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/5 border-b border-white/10">
                <div className="flex items-center gap-6">
                  <button 
                    onClick={onClose}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-tm-blue-gray hover:text-tm-yellow border border-white/10"
                  >
                    <X size={24} />
                  </button>
                  <div>
                    <h2 className="text-3xl font-black text-tm-yellow tracking-tighter uppercase italic leading-none">
                      {title}
                    </h2>
                    <p className="text-[10px] font-black text-tm-blue-gray uppercase tracking-widest mt-2">Comprehensive Data Archive</p>
                  </div>
                </div>

                <div className="relative flex-1 max-w-md group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-tm-blue-gray group-focus-within:text-tm-yellow transition-colors" size={18} />
                  <input
                    type="text"
                    placeholder="Search logs, details, or dates..."
                    className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-4 rounded-2xl outline-none focus:border-tm-yellow/50 focus:bg-tm-yellow/5 font-bold transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Table Container */}
              <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
                <div className="min-w-full inline-block align-middle">
                  <div className="overflow-hidden border border-white/5 rounded-2xl bg-white/[0.02]">
                    <table className="min-w-full divide-y divide-white/10">
                      <thead>
                        <tr className="bg-white/5">
                          {columns.map((col) => (
                            <th
                              key={col.key}
                              className={cn(
                                "px-3 md:px-6 py-4 md:py-5 text-left text-[10px] font-black text-tm-blue-gray uppercase tracking-widest border-b border-white/10",
                                col.wrap ? "w-full min-w-[150px]" : "w-auto"
                              )}
                            >
                              {col.header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredData.length > 0 ? (
                          filteredData.map((row, idx) => (
                            <tr 
                              key={idx} 
                              className="hover:bg-tm-yellow/[0.03] transition-colors group/row"
                            >
                              {columns.map((col) => (
                                <td key={col.key} className={cn("px-3 md:px-6 py-3 md:py-4", col.wrap ? "whitespace-normal w-full" : "whitespace-nowrap w-auto")}>
                                  <div className="text-sm font-bold text-white/80 group-hover/row:text-white transition-colors">
                                    {col.render ? col.render(row[col.key], row) : String(row[col.key])}
                                  </div>
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={columns.length} className="px-6 py-24 text-center">
                              <div className="flex flex-col items-center gap-4 opacity-40">
                                <Search size={48} className="text-tm-blue-gray" />
                                <p className="text-lg font-bold text-tm-blue-gray italic">No matching records found in the archives.</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 bg-white/5 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 px-8">
                <div className="flex gap-6">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-tm-blue-gray uppercase tracking-widest">Entry Count</span>
                    <span className="text-xl font-black text-white">{filteredData.length}</span>
                  </div>
                  <div className="w-[1px] h-8 bg-white/10 self-center" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-tm-blue-gray uppercase tracking-widest">Archive Status</span>
                    <span className="text-sm font-black text-tm-yellow uppercase tracking-tighter italic">Live Sync Active</span>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="w-full md:w-auto px-10 py-4 bg-tm-yellow text-tm-purple-dark font-black uppercase text-sm rounded-2xl shadow-xl shadow-tm-yellow/10 hover:scale-105 active:scale-95 transition-all"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
