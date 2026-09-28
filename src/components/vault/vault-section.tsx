import type { LucideIcon } from "lucide-react";

// Section heading shared across the Vault page
export default function VaultSection({ icon: Icon, iconClassName, title, children }: {
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <Icon className={iconClassName} size={28} />
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground tracking-tight uppercase">{title}</h2>
      </div>
      {children}
    </section>
  );
}
