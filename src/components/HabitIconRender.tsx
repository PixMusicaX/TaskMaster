import { Sparkles, Brain, Music, Code, Gamepad2, Book, Dumbbell, HeartPulse, Laptop, Target, Zap, Coffee, Mic, Phone, Mail, MessageSquare, GraduationCap, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

export const LUCIDE_ICONS: Record<string, any> = {
  Brain, Music, Code, Gamepad2, Book, Dumbbell, HeartPulse, Laptop, Target, Zap, Coffee, Sparkles, Mic, Phone, Mail, MessageSquare, GraduationCap, Terminal
};

export default function HabitIconRender({ icon, className, size = 20 }: { icon?: string | null, className?: string, size?: number }) {
  if (!icon) return <Sparkles className={className} size={size} />;
  
  // Check if it's a Lucide icon name
  const IconComponent = LUCIDE_ICONS[icon];
  if (IconComponent) return <IconComponent className={className} size={size} />;
  
  // Fallback to rendering as emoji/text
  return <span className={cn("inline-flex items-center justify-center", className)} style={{ fontSize: size }}>{icon}</span>;
}
