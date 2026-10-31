import { cn } from "@/lib/utils";

// Text whose strike-through draws left to right when it's completed. It's a background on an
// inline span, cloned onto each line, so text that wraps gets a stroke through every line.
export default function StrikeText({ done, children, className, doneClassName = "opacity-50" }: {
  done: boolean;
  children: React.ReactNode;
  className?: string;
  doneClassName?: string;
}) {
  return (
    <span
      className={cn("transition-[opacity,background-size] duration-300 ease-in-out", done && doneClassName, className)}
      style={{
        backgroundImage: "linear-gradient(currentColor, currentColor)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left 55%",
        backgroundSize: `${done ? 100 : 0}% 2px`,
        WebkitBoxDecorationBreak: "clone",
        boxDecorationBreak: "clone",
      }}
    >
      {children}
    </span>
  );
}
