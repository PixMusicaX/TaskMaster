"use client";
import { ChevronDown } from "lucide-react";

export default function ScrollPrompt() {
    const handleScroll = () => {
        const element = document.getElementById('analytics-section');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <button
            onClick={handleScroll}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-all cursor-pointer z-20 animate-bounce"
        >
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/50">
                Analytics
            </span>
            <ChevronDown className="w-5 h-5 text-white/50" />
        </button>
    );
}
