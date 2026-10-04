import { Home, CheckSquare, FileText, Calendar, Info, History } from "lucide-react";
import type { PersonaStyle } from "@/lib/persona";

// The app's pages as each game names them (shared by the menu bar and the pause menu)
export const PERSONA_MENU_ITEMS = [
  { href: "/", icon: Home, labels: { p3: "Dorm", p4: "Home", p5: "Hideout" } },
  { href: "/calendar", icon: Calendar, labels: { p3: "Calendar", p4: "Calendar", p5: "Calendar" } },
  { href: "/notes", icon: FileText, labels: { p3: "Diary", p4: "Notebook", p5: "Notes" } },
  { href: "/habits", icon: CheckSquare, labels: { p3: "Social Link", p4: "S.Link", p5: "Confidant" } },
  { href: "/history", icon: History, labels: { p3: "Records", p4: "Records", p5: "Records" } },
  { href: "/about", icon: Info, labels: { p3: "System", p4: "System", p5: "System" } },
] satisfies { href: string; icon: typeof Home; labels: Record<PersonaStyle, string> }[];
