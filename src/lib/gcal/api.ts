// Calls to Google (server only): the consent flow and the player's primary calendar
import type { GoogleEvent } from "./map";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export const GCAL_SCOPE = "https://www.googleapis.com/auth/calendar.events.owned";

// The player's grant is gone (revoked, expired): only connecting again fixes it
export class GoogleAuthError extends Error {
  constructor() {
    super("Google Calendar access has ended");
    this.name = "GoogleAuthError";
  }
}

export class GoogleApiError extends Error {
  constructor(readonly status: number, detail: string) {
    super(`Google Calendar answered ${status}: ${detail}`);
    this.name = "GoogleApiError";
  }
}

export function consentUrl({ redirectUri, state, loginHint }: { redirectUri: string; state: string; loginHint?: string | null }) {
  const params = new URLSearchParams({
    client_id: process.env.AUTH_GOOGLE_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GCAL_SCOPE,
    state,
    // Both are needed for Google to hand over a refresh token every time
    access_type: "offline",
    prompt: "consent",
  });
  if (loginHint) params.set("login_hint", loginHint);
  return `${AUTH_URL}?${params}`;
}

// null when Google gave no refresh token, or the player unticked the calendar permission
export async function exchangeCode(code: string, redirectUri: string): Promise<string | null> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({
      code,
      redirect_uri: redirectUri,
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) return null;
  const data = await response.json() as { refresh_token?: string; scope?: string };
  if (!data.refresh_token || !data.scope?.split(" ").includes(GCAL_SCOPE)) return null;
  return data.refresh_token;
}

export async function accessTokenFor(refreshToken: string): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      grant_type: "refresh_token",
    }),
  });
  if (response.status === 400 || response.status === 401) throw new GoogleAuthError();
  if (!response.ok) throw new GoogleApiError(response.status, "token refresh failed");
  return (await response.json() as { access_token: string }).access_token;
}

// Best effort: the connection is removed here either way
export async function revokeToken(token: string) {
  try {
    await fetch(REVOKE_URL, { method: "POST", body: new URLSearchParams({ token }) });
  } catch (e) {
    console.error("Could not revoke the Google Calendar token:", e);
  }
}

async function call(token: string, url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (response.status === 401) throw new GoogleAuthError();
  if (!response.ok) throw new GoogleApiError(response.status, init.method ?? "GET");
  return response;
}

export type EventPage = { items?: GoogleEvent[]; nextPageToken?: string; nextSyncToken?: string; timeZone?: string };

export async function listEvents(token: string, params: Record<string, string>): Promise<EventPage> {
  // Recurring events arrive as one entry per occurrence, which is the shape the planner stores
  const query = new URLSearchParams({ ...params, singleEvents: "true", maxResults: "250" });
  return (await call(token, `${EVENTS_URL}?${query}`)).json();
}

// sendUpdates=none: a change here shows on guests' calendars without emailing them
const NO_EMAILS = "sendUpdates=none";

export async function insertEvent(token: string, id: string, body: object): Promise<GoogleEvent> {
  const response = await call(token, `${EVENTS_URL}?${NO_EMAILS}`, { method: "POST", body: JSON.stringify({ ...body, id }) });
  return response.json();
}

export async function patchEvent(token: string, id: string, body: object): Promise<GoogleEvent> {
  const response = await call(token, `${EVENTS_URL}/${encodeURIComponent(id)}?${NO_EMAILS}`, { method: "PATCH", body: JSON.stringify(body) });
  return response.json();
}

export async function deleteEvent(token: string, id: string) {
  await call(token, `${EVENTS_URL}/${encodeURIComponent(id)}?${NO_EMAILS}`, { method: "DELETE" });
}
