"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";

export default function Clock() {
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) {
    return <div className="h-[120px] sm:h-[160px]" />; // Prevent layout shift
  }

  return (
    <div className="text-center space-y-2">
      <h1 className="text-6xl sm:text-8xl font-black tracking-tighter text-tm-purple-dark dark:text-tm-yellow drop-shadow-sm">
        {format(time, "HH:mm:ss")}
      </h1>
      <p className="text-xl sm:text-2xl text-tm-blue-gray font-medium">
        {format(time, "EEEE, MMMM do yyyy")}
      </p>
    </div>
  );
}
