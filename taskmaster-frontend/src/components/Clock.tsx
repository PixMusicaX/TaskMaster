"use client";
import { useState, useEffect } from 'react';

export default function Clock() {
    const [time, setTime] = useState<string>("");

    useEffect(() => {
        setTime(new Date().toLocaleTimeString());
        const timer = setInterval(() => {
            setTime(new Date().toLocaleTimeString());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    if (!time) return null;

    return (
        <div className="text-amber-400 text-5xl md:text-6xl font-black font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(251,191,36,0.5)] mt-4">
            {time}
        </div>
    );
}
