import { Coins, Users, Home as HomeIcon, PenTool, Palette, Code, Laptop, Music, Gamepad2, Book, Dumbbell, HeartPulse, Plane, Map as MapIcon, Lightbulb, Moon, Phone, MessageSquare, Target, Film, Coffee, Mic, MapPin, Newspaper } from "lucide-react";

export function TaskIcon({ title, className, size = 14 }: { title: string, className?: string, size?: number }) {
  const t = title.toLowerCase();

  // Finance
  if (t.includes("money") || t.includes("pay") || t.includes("bill") || t.includes("salary") || t.includes("expense") || t.includes("tax") || t.includes("bank") || t.includes("wallet") || t.includes("coin")) return <Coins className={className} size={size} />;

  // Social & People
  if (t.includes("meet") || t.includes("date") || t.includes("friend") || t.includes("hangout") || t.includes("party") || t.includes("dinner") || t.includes("lunch") || t.includes("people")) return <Users className={className} size={size} />;

  // Home & Chores
  if (t.includes("home") || t.includes("clean") || t.includes("laundry") || t.includes("room") || t.includes("house") || t.includes("dish") || t.includes("fix") || t.includes("buy") || t.includes("order") || t.includes("shop")) return <HomeIcon className={className} size={size} />;

  // Creative & Writing
  if (t.includes("write") || t.includes("blog") || t.includes("journal") || t.includes("pen") || t.includes("draft") || t.includes("copy") || t.includes("edit")) return <PenTool className={className} size={size} />;
  if (t.includes("paint") || t.includes("draw") || t.includes("art") || t.includes("design") || t.includes("sketch") || t.includes("palette")) return <Palette className={className} size={size} />;

  // Tech & Programming
  if (t.includes("code") || t.includes("nextjs") || t.includes("rust") || t.includes("react") || t.includes("dev") || t.includes("programming") || t.includes("git") || t.includes("api") || t.includes("bug")) return <Code className={className} size={size} />;
  if (t.includes("laptop") || t.includes("work") || t.includes("office") || t.includes("meeting") || t.includes("sync") || t.includes("call") || t.includes("zoom") || t.includes("deploy") || t.includes("build")) return <Laptop className={className} size={size} />;

  // Entertainment & Hobby
  if (t.includes("piano") || t.includes("music") || t.includes("sing") || t.includes("song") || t.includes("guitar") || t.includes("listen") || t.includes("instrument")) return <Music className={className} size={size} />;
  if (t.includes("game") || t.includes("gaming") || t.includes("play") || t.includes("steam") || t.includes("ps5") || t.includes("xbox")) return <Gamepad2 className={className} size={size} />;

  // Learning
  if (t.includes("practice") || t.includes("study") || t.includes("learn") || t.includes("class") || t.includes("read") || t.includes("book") || t.includes("course") || t.includes("lecture")) return <Book className={className} size={size} />;

  // Health & Vitality
  if (t.includes("gym") || t.includes("workout") || t.includes("lift") || t.includes("exercise") || t.includes("run") || t.includes("walk") || t.includes("yoga") || t.includes("sport")) return <Dumbbell className={className} size={size} />;
  if (t.includes("health") || t.includes("vitality") || t.includes("med") || t.includes("doctor") || t.includes("hospital") || t.includes("dentist")) return <HeartPulse className={className} size={size} />;

  // Travel & Location
  if (t.includes("travel") || t.includes("trip") || t.includes("flight") || t.includes("plane") || t.includes("airport") || t.includes("hotel") || t.includes("stay") || t.includes("vacation")) return <Plane className={className} size={size} />;
  if (t.includes("map") || t.includes("location") || t.includes("visit") || t.includes("place")) return <MapIcon className={className} size={size} />;

  // Ideas & Strategy
  if (t.includes("idea") || t.includes("think") || t.includes("plan") || t.includes("brainstorm") || t.includes("strategy") || t.includes("lightbulb")) return <Lightbulb className={className} size={size} />;

  // Rest
  if (t.includes("sleep") || t.includes("nap") || t.includes("bed") || t.includes("rest") || t.includes("night") || t.includes("dream")) return <Moon className={className} size={size} />;

  // Communication
  if (t.includes("phone") || t.includes("mobile") || t.includes("whatsapp") || t.includes("signal")) return <Phone className={className} size={size} />;
  if (t.includes("mail") || t.includes("email") || t.includes("message") || t.includes("text") || t.includes("msg") || t.includes("talk") || t.includes("chat")) return <MessageSquare className={className} size={size} />;

  return <Target className={className} size={size} />;
}

const RELIEF_ICONS: Record<string, typeof Film> = {
  movie: Film,
  song: Music,
  food: Coffee,
  activity: Dumbbell,
  game: Gamepad2,
  book: Book,
  podcast: Mic,
  place: MapPin,
  article: Newspaper,
};

// Icon for an AI relief suggestion type; unknown types render Coffee only when `fallback` is set
export function ReliefTypeIcon({ type, size, className, fallback = false }: { type?: string | null, size: number, className?: string, fallback?: boolean }) {
  const Icon = (type && RELIEF_ICONS[type]) || (fallback ? Coffee : null);
  return Icon ? <Icon size={size} className={className} /> : null;
}
