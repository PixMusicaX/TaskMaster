"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun } from "lucide-react";
import { format } from "date-fns";
import { daysToFullMoon, moonPhaseIndex, personaTimeOfDay, readCachedWeather, type PersonaStyle, type WeatherKind } from "@/lib/persona";
import { cn } from "@/lib/utils";

const WEATHER_ICONS: Record<WeatherKind, typeof Sun> = {
  clear: Sun,
  cloudy: Cloud,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
  fog: CloudFog,
};

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function useWeather() {
  const [weather, setWeather] = useState<WeatherKind>("clear");
  useEffect(() => {
    const read = () => setWeather(readCachedWeather());
    read();
    // The home page refreshes the cached weather after it loads
    const id = setInterval(read, 60_000);
    return () => clearInterval(id);
  }, []);
  return weather;
}

// Moon drawn as a lit disc with a shadow sliding across it (0 = new … 4 = full)
function MoonGlyph({ phase, className }: { phase: number; className?: string }) {
  const lit = phase <= 4 ? phase / 4 : (8 - phase) / 4;
  const waxing = phase <= 4;
  const shadowX = (waxing ? -1 : 1) * lit * 20;
  return (
    <svg viewBox="-10 -10 20 20" className={className} aria-hidden>
      <defs>
        <mask id={`moon-${phase}`}>
          <circle r="9" fill="#fff" />
          {phase !== 4 && <circle r="9" cx={shadowX} fill="#000" />}
        </mask>
      </defs>
      <circle r="9" fill="currentColor" opacity="0.18" />
      <circle r="9" fill="currentColor" mask={`url(#moon-${phase})`} />
    </svg>
  );
}

export default function PersonaHud({ style, dark, className }: { style: PersonaStyle; dark: boolean; className?: string }) {
  const now = useNow();
  const weather = useWeather();
  const time = personaTimeOfDay(style, now, dark);
  const WeatherIcon = WEATHER_ICONS[weather];
  const md = format(now, "M/d");
  const label = `${format(now, "EEEE, MMMM d")}, ${time}`;

  if (style === "p5") {
    return (
      <motion.div
        className={cn("relative flex items-center gap-2 select-none", className)}
        initial={{ opacity: 0, x: 40, rotate: -14 }}
        animate={{ opacity: 1, x: 0, rotate: -6 }}
        transition={{ type: "spring", stiffness: 420, damping: 20 }}
        aria-label={label}
        role="img"
      >
        <div className="relative leading-none">
          <span className="absolute inset-0 translate-x-[3px] translate-y-[3px] text-black font-display text-[30px] sm:text-[38px]" aria-hidden>{md}</span>
          <span className="relative font-display text-[30px] sm:text-[38px] text-white" style={{ WebkitTextStroke: "1px #000" }}>{md}</span>
        </div>
        <div className="flex flex-col items-start gap-0.5">
          <span className="bg-white text-black font-display text-[13px] px-1.5 leading-tight -skew-x-12">{format(now, "EEE").toUpperCase()}</span>
          <span className="bg-black text-white font-display text-[11px] px-1.5 leading-tight -skew-x-12 whitespace-nowrap">{time.toUpperCase()}</span>
        </div>
        <span className="hidden sm:flex w-8 h-8 items-center justify-center bg-[#e5001b] text-white border-2 border-black rotate-12" style={{ clipPath: "polygon(50% 0, 63% 30%, 98% 35%, 70% 58%, 80% 95%, 50% 75%, 20% 95%, 30% 58%, 2% 35%, 37% 30%)" }}>
          <WeatherIcon size={14} strokeWidth={3} />
        </span>
      </motion.div>
    );
  }

  if (style === "p4") {
    return (
      <motion.div
        className={cn("relative flex items-stretch select-none", className)}
        initial={{ opacity: 0, scaleY: 0.05 }}
        animate={{ opacity: [0, 1, 0.6, 1], scaleY: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        aria-label={label}
        role="img"
      >
        <div className="flex items-center gap-1.5 bg-[#181512] text-[#ffe100] pl-2.5 pr-2 py-1 rounded-l-lg -skew-x-6 border-2 border-[#181512]">
          <span className="font-display text-[22px] sm:text-[26px] leading-none italic">{format(now, "MM/dd")}</span>
          <span className="font-display text-[12px] leading-none bg-[#ffe100] text-[#181512] px-1 py-0.5 rounded">{format(now, "EEE")}</span>
        </div>
        <div className="flex flex-col justify-center bg-white border-2 border-l-0 border-[#181512] px-2 rounded-r-lg -skew-x-6 leading-tight">
          <span className="text-[11px] font-black text-[#181512] whitespace-nowrap">{time}</span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-[#e35200] capitalize"><WeatherIcon size={11} strokeWidth={3} /> {weather}</span>
        </div>
      </motion.div>
    );
  }

  // P3
  const phase = moonPhaseIndex(now);
  const toFull = daysToFullMoon(now);
  return (
    <motion.div
      className={cn("relative flex items-center gap-2.5 select-none", className)}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      aria-label={`${label}, ${toFull === 0 ? "full moon tonight" : `full moon in ${toFull} days`}`}
      role="img"
    >
      <div className="flex flex-col items-end leading-none">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[28px] sm:text-[34px] font-light tracking-tight text-tm-yellow italic">{md}</span>
          <span className="text-[11px] font-medium px-1 py-0.5 bg-tm-yellow text-[var(--tm-on-accent)] -skew-x-12">{format(now, "EEE").slice(0, 2)}</span>
        </div>
        <span className={cn("p3-hud text-[10px] uppercase tracking-[0.28em] mt-0.5", dark ? "text-tm-red p-blink" : "text-tm-blue-gray")}>{time}</span>
      </div>
      <div className="flex flex-col items-center gap-0.5 text-tm-yellow">
        <MoonGlyph phase={phase} className={cn("w-6 h-6", dark && "p3-moon-pulse")} />
        <span className="text-[9px] uppercase tracking-widest text-tm-blue-gray whitespace-nowrap">{toFull === 0 ? "Full" : `${toFull}d`}</span>
      </div>
      {!dark && <WeatherIcon size={16} className="hidden sm:block text-tm-blue-gray" />}
    </motion.div>
  );
}
