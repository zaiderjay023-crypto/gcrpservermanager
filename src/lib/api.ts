import { supabase } from "@/integrations/supabase/client";

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function authedFetch(path: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    ...(init.headers as Record<string, string> || {}),
  };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  const r = await fetch(`${FN_BASE}${path}`, { ...init, headers });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(err);
  }
  return r.json();
}

export const discordApi = {
  login: (code: string, redirect_uri: string) => authedFetch("/discord-auth/login", { method: "POST", body: JSON.stringify({ code, redirect_uri }) }),
  guilds: () => authedFetch("/discord-auth/guilds"),
  roles: (guild_id: string) => authedFetch(`/discord-auth/roles?guild_id=${guild_id}`),
  channels: (guild_id: string) => authedFetch(`/discord-auth/channels?guild_id=${guild_id}`),
  memberRoles: (guild_id: string) => authedFetch(`/discord-auth/member-roles?guild_id=${guild_id}`),
};

export const licenseApi = {
  generate: (license_id: string) => authedFetch("/generate-license", { method: "POST", body: JSON.stringify({ license_id }) }),
};

export async function getDiscordOAuthUrl() {
  const r = await fetch(`${FN_BASE}/discord-auth/config`, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
  const { client_id } = await r.json();
  const redirect = `${window.location.origin}/auth/callback`;
  const scopes = ["identify", "email", "guilds", "guilds.members.read"].join(" ");
  return `https://discord.com/api/oauth2/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=${encodeURIComponent(scopes)}`;
}
