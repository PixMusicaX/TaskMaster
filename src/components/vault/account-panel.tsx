"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Bot, ExternalLink, KeyRound, LogOut, MonitorSmartphone, PenLine, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import GlassCard from "@/components/glass-card";
import VaultSection from "./vault-section";
import { clearAccountStorage } from "@/components/account-scope";
import { getAccount, signOutDevice, signOutEverywhereElse, signOutHere, updateAiSettings, updatePersonalization } from "@/app/actions/account";
import { PERSONAL_FIELDS, PERSONAL_MAX_LENGTH, type Personalization } from "@/lib/personalization";
import { AI_PROVIDERS, AI_PROVIDER_INFO, type AiProvider, type AiSettingsView } from "@/lib/ai-providers";

type Account = Awaited<ReturnType<typeof getAccount>>;

const LABEL = "text-caption font-mono font-semibold uppercase tracking-[0.12em]";
const BUTTON = cn(LABEL, "inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed");
const BUTTON_PRIMARY = cn(BUTTON, "bg-tm-yellow/10 hover:bg-tm-yellow/20 text-tm-yellow border border-tm-yellow/20 hover:border-tm-yellow/40");
const BUTTON_QUIET = cn(BUTTON, "bg-tm-blue-gray/10 hover:bg-tm-blue-gray/20 text-tm-blue-gray border border-tm-blue-gray/10");
const FIELD = "w-full px-4 py-3 rounded-xl bg-tm-blue-gray/5 border border-tm-blue-gray/15 text-sm text-foreground placeholder:text-tm-blue-gray/50 outline-none focus:border-tm-yellow/50";

// "Chrome on Windows" from a user-agent string, as far as it can be told
function describeDevice(userAgent: string | null) {
  if (!userAgent) return "Unknown device";
  const browser = /Edg\//.test(userAgent) ? "Edge"
    : /OPR\//.test(userAgent) ? "Opera"
    : /Firefox\//.test(userAgent) ? "Firefox"
    : /Chrome\//.test(userAgent) ? "Chrome"
    : /Safari\//.test(userAgent) ? "Safari"
    : "Browser";
  const os = /Android/.test(userAgent) ? "Android"
    : /iPhone|iPad|iPod/.test(userAgent) ? "iOS"
    : /Windows/.test(userAgent) ? "Windows"
    : /Mac OS X/.test(userAgent) ? "macOS"
    : /Linux/.test(userAgent) ? "Linux"
    : null;
  return os ? `${browser} on ${os}` : browser;
}

// The account page loads this once and hands it to the two panels below, which sit apart on the page
export function useAccount() {
  const [account, setAccount] = useState<Account | null>(null);
  const reload = useCallback(async () => {
    try {
      setAccount(await getAccount());
    } catch (err) {
      console.error("Account failed to load:", err);
    }
  }, []);
  useEffect(() => {
    getAccount().then(setAccount).catch(err => console.error("Account failed to load:", err));
  }, []);
  return [account, reload] as const;
}

// Who is signed in, and on which devices
export default function AccountPanel({ account, onReload }: { account: Account | null; onReload: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function handleSignOut() {
    setBusy("signout");
    clearAccountStorage();
    try { localStorage.removeItem("tm_user"); } catch { /* storage blocked */ }
    await signOutHere();
  }

  async function handleSignOutDevice(id: string) {
    setBusy(id);
    await signOutDevice(id);
    await onReload();
    setBusy(null);
  }

  async function handleSignOutOthers() {
    if (!confirm("Sign out of every other device? They will need to sign in with Google again.")) return;
    setBusy("others");
    await signOutEverywhereElse();
    await onReload();
    setBusy(null);
  }

  const user = account?.user;
  const sessions = account?.sessions ?? [];

  return (
      <VaultSection icon={UserRound} iconClassName="text-tm-yellow" title="Account">
        <GlassCard className="p-5 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-tm-yellow/10 text-tm-yellow flex items-center justify-center shrink-0 overflow-hidden">
              {user?.image
                // eslint-disable-next-line @next/next/no-img-element -- a Google avatar, not worth an image-optimizer allowlist
                ? <img src={user.image} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                : <UserRound size={26} />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-foreground leading-tight truncate">{user?.name?.trim().split(/\s+/)[0] || (account ? "Player" : "Loading…")}</h3>
              <p className="text-sm text-tm-blue-gray font-medium truncate">{account?.demo ? "A made-up planner for trying things out" : user?.email ?? " "}</p>
              <p className={cn(LABEL, "text-tm-blue-gray/70 mt-1")}>{account?.demo ? "Demo session · nothing here is saved" : "Signed in with Google"}</p>
            </div>
            <button onClick={handleSignOut} disabled={busy !== null} className={BUTTON_PRIMARY}>
              <LogOut size={14} />
              {busy === "signout" ? "Leaving…" : account?.demo ? "Exit demo" : "Sign out"}
            </button>
          </div>

          <div className="h-px bg-tm-blue-gray/10" />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black text-foreground leading-tight">Signed-in devices</h3>
              {sessions.length > 1 && (
                <button onClick={handleSignOutOthers} disabled={busy !== null} className={BUTTON_QUIET}>
                  {busy === "others" ? "Signing out…" : "Sign out everywhere else"}
                </button>
              )}
            </div>
            <ul className="space-y-2">
              {sessions.map(s => (
                <li key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-tm-blue-gray/5 border border-tm-blue-gray/10">
                  <MonitorSmartphone size={18} className="text-tm-blue-gray shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{describeDevice(s.userAgent)}</p>
                    <p className="text-xs text-tm-blue-gray font-medium">Signed in {format(new Date(s.createdAt), "MMM d, yyyy")}</p>
                  </div>
                  {s.current
                    ? <span className={cn(LABEL, "text-tm-yellow")}>This device</span>
                    : (
                      <button onClick={() => handleSignOutDevice(s.id)} disabled={busy !== null} className={BUTTON_QUIET}>
                        {busy === s.id ? "…" : "Sign out"}
                      </button>
                    )}
                </li>
              ))}
              {account && sessions.length === 0 && <li className="text-sm text-tm-blue-gray font-medium">No devices to show.</li>}
            </ul>
          </div>
        </GlassCard>
      </VaultSection>
  );
}

// Which AI writes this account's quests
export function AiGuidePanel({ account }: { account: Account | null }) {
  return (
    <VaultSection icon={Bot} iconClassName="text-tm-orange-light" title="AI Guide">
      {account && <AiSettingsCard initial={account.ai} />}
    </VaultSection>
  );
}

// What the player wants the AI to know about them. Entirely optional: every field can stay empty.
export function PersonalizePanel({ account }: { account: Account | null }) {
  return (
    // The home page's invitation links straight here
    <div id="personalise" className="scroll-mt-24">
      <VaultSection icon={PenLine} iconClassName="text-tm-yellow" title="About You">
        {account && <PersonalizeCard initial={account.personal} />}
      </VaultSection>
    </div>
  );
}

function PersonalizeCard({ initial }: { initial: Personalization }) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    const result = await updatePersonalization(values);
    if (result.success) {
      setValues(result.personal);
      setMessage({ ok: true, text: "Saved. Your next quests, tips and answers will take this into account." });
    } else {
      setMessage({ ok: false, text: result.message });
    }
    setSaving(false);
  }

  return (
    <GlassCard className="p-5 md:p-8 space-y-5">
      <p className="text-sm text-tm-blue-gray font-medium max-w-2xl">
        Anything you write here is given to the AI alongside your planner, so the daily quest, the prep tip, the Tavern and the
        Taskmaster fit you better. All of it is optional: fill in what you like, leave the rest, change it any time.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {PERSONAL_FIELDS.map(field => (
          <label key={field.key} className="block space-y-2">
            <span className={cn(LABEL, "text-tm-blue-gray")}>{field.label}</span>
            <textarea
              rows={field.rows}
              maxLength={PERSONAL_MAX_LENGTH}
              value={values[field.key]}
              onChange={e => setValues(current => ({ ...current, [field.key]: e.target.value }))}
              placeholder={field.hint}
              className={cn(FIELD, "resize-y min-h-[4.5rem] leading-relaxed")}
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={saving} className={BUTTON_PRIMARY}>
          {saving ? "Saving…" : "Save"}
        </button>
        {message && (
          <p role="status" className={cn("text-sm font-medium", message.ok ? "text-tm-blue-gray" : "text-tm-orange-dark")}>{message.text}</p>
        )}
      </div>
    </GlassCard>
  );
}

function AiSettingsCard({ initial }: { initial: AiSettingsView }) {
  const [saved, setSaved] = useState(initial);
  const [provider, setProvider] = useState<AiProvider>(initial.provider);
  const [model, setModel] = useState(initial.model ?? "");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const info = AI_PROVIDER_INFO[provider];
  const savedTail = saved.keys[provider];

  function pickProvider(next: AiProvider) {
    setProvider(next);
    setApiKey("");
    setMessage(null);
    // A model name only makes sense for the provider it was saved with
    setModel(next === saved.provider ? saved.model ?? "" : "");
  }

  // `key`: a new key, "" to remove the saved one, undefined to leave it as it is
  async function save(key: string | undefined) {
    setSaving(true);
    setMessage(null);
    const result = await updateAiSettings({ provider, model, apiKey: key });
    if (result.success) {
      setSaved(result.ai);
      setApiKey("");
      setMessage({ ok: true, text: result.ai.keys[provider] ? `Saved. ${info.name} will write your quests from now on.` : `Saved, but ${info.name} has no key yet, so the AI stays offline.` });
    } else {
      setMessage({ ok: false, text: result.message });
    }
    setSaving(false);
  }

  return (
    <GlassCard className="p-5 md:p-8 space-y-5">
      <p className="text-sm text-tm-blue-gray font-medium max-w-2xl">
        Daily quests, prep tips, the Tavern and the Taskmaster are written by an AI service using your own API key.
        Pick a service and paste a key from it. The key is stored encrypted for this account only and is never shown again.
      </p>

      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="AI service">
        {AI_PROVIDERS.map(p => (
          <button
            key={p}
            role="radio"
            aria-checked={provider === p}
            onClick={() => pickProvider(p)}
            className={cn(
              "p-3 rounded-xl border text-left transition-colors",
              provider === p ? "bg-tm-yellow/10 border-tm-yellow/40" : "bg-tm-blue-gray/5 border-tm-blue-gray/10 hover:border-tm-blue-gray/30"
            )}
          >
            <span className="block font-black text-foreground leading-tight">{AI_PROVIDER_INFO[p].name}</span>
            <span className={cn(LABEL, saved.keys[p] ? "text-tm-yellow" : "text-tm-blue-gray/70")}>
              {saved.keys[p] ? `Key ••••${saved.keys[p]}` : "No key"}{saved.provider === p ? " · in use" : ""}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className={cn(LABEL, "text-tm-blue-gray flex items-center gap-2")}><KeyRound size={12} /> {info.name} API key</span>
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder={savedTail ? `Saved (••••${savedTail}). Paste to replace` : info.keyHint}
            className={FIELD}
          />
        </label>
        <label className="block space-y-2">
          <span className={cn(LABEL, "text-tm-blue-gray")}>Model (optional)</span>
          <input
            type="text"
            autoComplete="off"
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder={info.defaultModel}
            className={FIELD}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => save(apiKey.trim() ? apiKey : undefined)} disabled={saving} className={BUTTON_PRIMARY}>
          {saving ? "Saving…" : "Save"}
        </button>
        {savedTail && (
          <button onClick={() => { if (confirm(`Remove your saved ${info.name} key?`)) save(""); }} disabled={saving} className={BUTTON_QUIET}>
            Remove key
          </button>
        )}
        <a href={info.keysUrl} target="_blank" rel="noopener noreferrer" className={cn(LABEL, "inline-flex items-center gap-1.5 text-tm-blue-gray hover:text-foreground transition-colors")}>
          Get a key <ExternalLink size={12} />
        </a>
      </div>

      {message && (
        <p role="status" className={cn("text-sm font-medium", message.ok ? "text-tm-blue-gray" : "text-tm-orange-dark")}>{message.text}</p>
      )}
    </GlassCard>
  );
}
