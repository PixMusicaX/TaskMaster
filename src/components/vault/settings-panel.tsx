"use client";

import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Bell, CalendarDays, MapPin, PartyPopper, Settings, Sparkles, Volume2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SPRING } from "@/lib/motion";
import { isMuted, setMuted, subscribeMuted } from "@/lib/sfx";
import GlassCard from "@/components/glass-card";
import VaultSection from "./vault-section";
import { PERSONA_NAMES, isPersonaOff, nextPersonaDay, setPersonaOff, subscribePersonaSetting } from "@/lib/persona";
import { usePersona } from "@/components/theme-provider";
import { HOLIDAY_REGIONS } from "@/lib/personalization";
import { SPECIAL_DAYS, isSpecialOff, nextSpecialDay, setSpecialOff, subscribeSpecialSetting } from "@/lib/special-days";
import { useSpecial } from "@/components/theme-provider";

function Switch({ on, disabled, onClick, label }: { on: boolean; disabled?: boolean; onClick: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative w-12 h-7 rounded-full shrink-0 transition-colors",
        on ? "bg-tm-yellow" : "bg-tm-blue-gray/25",
        // A locked "on" switch still reads as on; only a locked "off" one fades
        disabled && (on ? "cursor-default" : "opacity-60 cursor-not-allowed")
      )}
    >
      <motion.span
        className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow"
        animate={{ x: on ? 20 : 0 }}
        transition={SPRING.snappy}
      />
    </button>
  );
}

function SettingRow({ icon: Icon, title, description, status, children }: {
  icon: typeof Bell;
  title: string;
  description: string;
  status?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-tm-yellow/10 text-tm-yellow flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-black text-foreground leading-tight">{title}</h3>
        <p className="text-xs text-tm-blue-gray mt-0.5 font-medium">{description}</p>
        {status && (
          <p className={cn("text-caption font-mono font-semibold uppercase tracking-[0.12em] mt-1", status.startsWith("Blocked") ? "text-tm-orange-dark" : "text-tm-blue-gray/70")}>
            {status}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

interface SettingsPanelProps {
  notificationPermission: string;
  locationPermission: string;
  onEnableNotifications: () => void;
  onEnableLocation: () => void;
  // Country whose holidays fill the calendar ("" for none); null until the account has loaded
  holidayRegion: string | null;
  holidayBusy: boolean;
  holidayStatus?: string;
  onHolidayRegionChange: (region: string) => void;
}

export default function SettingsPanel({ notificationPermission, locationPermission, onEnableNotifications, onEnableLocation, holidayRegion, holidayBusy, holidayStatus, onHolidayRegionChange }: SettingsPanelProps) {
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);
  const personaOff = useSyncExternalStore(subscribePersonaSetting, isPersonaOff, () => true);
  const personaToday = usePersona();
  const next = nextPersonaDay();
  const personaStatus = personaOff
    ? "Off on this device"
    : personaToday
      ? `Today: ${PERSONA_NAMES[personaToday]} day`
      : next ? `Next: ${PERSONA_NAMES[next.style]} on ${format(next.date, "MMM d")}` : undefined;

  const specialOff = useSyncExternalStore(subscribeSpecialSetting, isSpecialOff, () => false);
  const specialToday = useSpecial();
  const nextSpecial = nextSpecialDay();
  const specialStatus = specialOff
    ? "Off on this device"
    : specialToday
      ? `Today: ${SPECIAL_DAYS[specialToday].name}`
      : nextSpecial ? `Next: ${SPECIAL_DAYS[nextSpecial.id].name} on ${format(nextSpecial.date, "MMM d")}` : undefined;

  return (
    <VaultSection icon={Settings} iconClassName="text-tm-yellow" title="Settings">
      <GlassCard className="p-5 md:p-8 space-y-6">
        <SettingRow icon={Volume2} title="Sounds" description="Completion, level-up and rank-up sounds, plus haptics on supported phones.">
          <Switch on={!muted} onClick={() => setMuted(!muted)} label="Sounds" />
        </SettingRow>
        <div className="h-px bg-tm-blue-gray/10" />
        <SettingRow
          icon={Sparkles}
          title="Persona days"
          description="Six random days a month when the app turns into Persona 3, 4 or 5."
          status={personaStatus}
        >
          <Switch on={!personaOff} onClick={() => setPersonaOff(!personaOff)} label="Persona days" />
        </SettingRow>
        <div className="h-px bg-tm-blue-gray/10" />
        <SettingRow
          icon={PartyPopper}
          title="Special days"
          description="One day every month with its own colours, menu, page transitions and backdrop."
          status={specialStatus}
        >
          <Switch on={!specialOff} onClick={() => setSpecialOff(!specialOff)} label="Special days" />
        </SettingRow>
        <div className="h-px bg-tm-blue-gray/10" />
        <SettingRow
          icon={Bell}
          title="Notifications"
          description="Alerts for your events and reminders."
          status={notificationPermission === "denied" ? "Blocked in browser settings" : notificationPermission === "granted" ? "Managed in browser settings" : undefined}
        >
          <Switch
            on={notificationPermission === "granted"}
            disabled={notificationPermission !== "default"}
            onClick={onEnableNotifications}
            label="Notifications"
          />
        </SettingRow>
        <div className="h-px bg-tm-blue-gray/10" />
        <SettingRow
          icon={MapPin}
          title="Location"
          description="Weather-aware relief picks in the Tavern."
          status={locationPermission === "denied" ? "Blocked in browser settings" : locationPermission === "granted" ? "Managed in browser settings" : undefined}
        >
          <Switch
            on={locationPermission === "granted"}
            disabled={locationPermission === "granted" || locationPermission === "denied"}
            onClick={onEnableLocation}
            label="Location"
          />
        </SettingRow>
        <div className="h-px bg-tm-blue-gray/10" />
        <SettingRow
          icon={CalendarDays}
          title="Holiday region"
          description="Which country's public holidays appear on your calendar as special days."
          status={holidayBusy ? "Updating your calendar…" : holidayStatus}
        >
          <select
            aria-label="Holiday region"
            value={holidayRegion ?? ""}
            disabled={holidayRegion === null || holidayBusy}
            onChange={e => onHolidayRegionChange(e.target.value)}
            className="max-w-[46%] sm:max-w-[220px] appearance-none bg-tm-yellow/10 border border-tm-yellow/30 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-tm-yellow transition-all cursor-pointer text-tm-purple-dark dark:text-tm-yellow disabled:opacity-60 disabled:cursor-wait"
          >
            {HOLIDAY_REGIONS.map(region => (
              <option key={region.code} value={region.code} className="bg-tm-purple-dark text-white font-sans">{region.name}</option>
            ))}
          </select>
        </SettingRow>
      </GlassCard>
    </VaultSection>
  );
}
