"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, CheckSquare, FileText, Calendar, Moon, Sun, Info } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/habits", label: "Habits", icon: CheckSquare },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/about", label: "About", icon: Info },
];

import { GaseousDivider } from "./GaseousDivider";

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="sticky top-0 z-50 w-full">
      <nav className="w-full bg-background/80 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between relative z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-tm-orange-dark rounded-full flex items-center justify-center text-white font-bold text-lg">
            T
          </div>
          <span className="font-bold text-xl hidden sm:inline-block text-tm-purple-dark dark:text-tm-yellow">
            TaskMaster
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative px-3 py-2 rounded-full flex items-center gap-2 transition-colors",
                  isActive 
                    ? "text-tm-orange-dark font-medium" 
                    : "text-tm-blue-gray hover:text-tm-orange-light"
                )}
              >
                <item.icon size={20} />
                <span className="hidden md:inline">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="bubble"
                    className="absolute inset-0 bg-tm-yellow/20 dark:bg-tm-yellow/10 rounded-full -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-tm-blue-gray/10 text-tm-blue-gray transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon size={22} /> : <Sun size={22} className="text-tm-yellow" />}
        </button>
      </nav>
      <div className="relative h-px w-full overflow-visible">
        <GaseousDivider 
          hoveredSide={null} 
          variant="artpaint" 
          align="top" 
        />
      </div>
    </div>
  );
}
