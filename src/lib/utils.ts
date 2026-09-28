import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the custom type scale in globals.css, otherwise text-tiny is treated as a colour
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["micro", "tiny", "caption"] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSpecialDayColors(title: string = "") {
  return { 
    bg: "bg-tm-orange-dark", 
    text: "text-tm-orange-dark", 
    border: "border-tm-orange-dark", 
    shadow: "shadow-[0_0_15px_rgba(var(--tm-orange-dark-rgb,242,79,19),0.1)]" 
  };
}
