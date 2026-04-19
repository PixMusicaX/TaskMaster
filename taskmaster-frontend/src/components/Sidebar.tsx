"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar as CalendarIcon, Settings, UserCircle, LogOut } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Analytics" },
    { href: "/management", icon: CalendarIcon, label: "Management" },
  ];

  return (
    <aside className="hidden md:flex flex-col w-24 glass border-r border-white/5 py-8 items-center justify-between z-30 shrink-0">
      <div className="flex flex-col gap-8">
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
          <span className="text-white font-black text-xl">T</span>
        </div>
        <nav className="flex flex-col gap-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "p-3 rounded-2xl transition-all group relative",
                  isActive 
                    ? "text-white bg-white/10 shadow-lg shadow-white/5" 
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className="w-6 h-6" />
                {isActive && (
                  <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-full shadow-[0_0_10px_white]" />
                )}
              </Link>
            );
          })}
          <button className="p-3 text-muted-foreground hover:text-white hover:bg-white/5 rounded-2xl transition-all">
            <Settings className="w-6 h-6" />
          </button>
        </nav>
      </div>
      <div className="flex flex-col gap-6">
        <UserCircle className="w-10 h-10 text-muted-foreground/30" />
        <LogOut className="w-6 h-6 text-rose-500/30 hover:text-rose-500 cursor-pointer transition-all" />
      </div>
    </aside>
  );
}
