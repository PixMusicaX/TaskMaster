"use client";

import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Bell, MapPin, Settings, Sparkles, Volume2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SPRING } from "@/lib/motion";
import { isMuted, setMuted, subscribeMuted } from "@/lib/sfx";
import GlassCard from "@/components/glass-card";
import VaultSection from "./vault-section";
import { PERSONA_NAMES, getPersonaPreview, isPersonaOff, nextPersonaDay, setPersonaOff, setPersonaPreview, subscribePersonaSetting, type DevPersonaOverride } from "@/lib/persona";
import { usePersona } from "@/components/theme-provider";

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

const PREVIEW_OPTIONS: { value: DevPersonaOverride; label: string }[] = [
  { value: null, label: "Auto" },
  { value: "off", label: "Off" },
  { value: "p3", label: "P3" },
  { value: "p4", label: "P4" },
  { value: "p5", label: "P5" },
];

interface SettingsPanelProps {
  notificationPermission: string;
  locationPermission: string;
  onEnableNotifications: () => void;
  onEnableLocation: () => void;
}

export default function SettingsPanel({ notificationPermission, locationPermission, onEnableNotifications, onEnableLocation }: SettingsPanelProps) {
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);
  const personaOff = useSyncExternalStore(subscribePersonaSetting, isPersonaOff, () => false);
  const personaToday = usePersona();
  const preview = useSyncExternalStore(subscribePersonaSetting, getPersonaPreview, () => null);
  const next = nextPersonaDay();
  const personaStatus = personaOff
    ? "Off on this device"
    : personaToday
      ? `Today: ${PERSONA_NAMES[personaToday]} day`
      : next ? `Next: ${PERSONA_NAMES[next.style]} on ${format(next.date, "MMM d")}` : undefined;

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
        {/* TEMPORARY: preview any Persona style on any day (see setPersonaPreview) */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:pl-14">
          <span className="text-caption font-mono font-semibold uppercase tracking-[0.12em] text-tm-blue-gray">Preview</span>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Preview a Persona style">
            {PREVIEW_OPTIONS.map(o => (
              <button
                key={o.label}
                onClick={() => setPersonaPreview(o.value)}
                aria-pressed={preview === o.value}
                className={cn(
                  "px-2 sm:px-2.5 py-1.5 rounded-lg text-caption font-mono font-semibold uppercase transition-colors",
                  preview === o.value ? "bg-tm-yellow text-[var(--tm-on-accent)]" : "bg-tm-blue-gray/10 text-tm-blue-gray hover:bg-tm-blue-gray/20"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
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
      </GlassCard>
    </VaultSection>
  );
}
