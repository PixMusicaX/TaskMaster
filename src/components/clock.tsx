"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { format } from "date-fns";
import { useMounted } from "@/lib/use-mounted";
import WeatherSketch from "@/components/weather-sketch";
import { DEV_WEATHERS, DEV_WEATHER_EVENT, getDevWeatherOverride } from "@/lib/dev-xp";

const subscribeDevWeather = (cb: () => void) => {
  window.addEventListener(DEV_WEATHER_EVENT, cb);
  return () => window.removeEventListener(DEV_WEATHER_EVENT, cb);
};

// `weather` and `location` are today's, once the Tavern has found them: the weather is sketched
// large and faded behind the digits (the dev tools can force any of the sketches), and the place is
// written over them in the same accent
export default function Clock({ weather, location }: { weather?: string | null; location?: string | null }) {
  const [time, setTime] = useState(new Date());
  const mounted = useMounted();
  const devWeather = useSyncExternalStore(subscribeDevWeather, getDevWeatherOverride, () => null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) {
    return <div className="h-[144px] sm:h-[188px]" />; // Prevent layout shift (the place line, the digits and the date)
  }

  const forced = DEV_WEATHERS.find(w => w.id === devWeather);
  const shown = devWeather === "off" ? null : forced?.weather ?? weather;
  const night = forced ? forced.night : time.getHours() < 6 || time.getHours() >= 18;

  return (
    <div className="text-center space-y-2">
      {/* Holds its line even before the place is known, so the clock doesn't jump when it arrives */}
      <p className="relative z-10 h-4 sm:h-5 flex items-center justify-center font-mono text-caption sm:text-xs font-extrabold uppercase tracking-[0.3em] text-tm-orange-dark/80">
        {location && <span className="tm-fade-in max-w-[80vw] truncate">{location}</span>}
      </p>
      <div className="relative">
        {shown && (
          <WeatherSketch
            weather={shown}
            night={night}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[58%] w-56 sm:w-80 opacity-35"
          />
        )}
        <h1 className="relative text-6xl sm:text-8xl font-display font-bold tracking-tight tabular-nums text-tm-purple-dark dark:text-tm-yellow drop-shadow-sm">
          {format(time, "HH:mm:ss")}
        </h1>
      </div>
      <p className="text-xl sm:text-2xl text-tm-blue-gray font-medium">
        {format(time, "EEEE, MMMM do yyyy")}
      </p>
    </div>
  );
}
