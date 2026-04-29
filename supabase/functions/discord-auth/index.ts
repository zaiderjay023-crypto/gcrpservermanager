// Discord OAuth + guild/role helpers
// Endpoints:
//   POST /discord-auth/login        { code, redirect_uri } -> { access_token, refresh_token, user, supabase_session }
//   GET  /discord-auth/guilds       (auth required) -> guilds with our bot present, with user's roles per guild
//   GET  /discord-auth/roles?guild_id=...  -> all roles in guild
//   GET  /discord-auth/channels?guild_id=...  -> text channels in guild
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const DISCORD_API = "https://discord.com/api/v10";
const CLIENT_ID = Deno.env.get("DISCORD_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("DISCORD_CLIENT_SECRET")!;
const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

async function discordFetch(path: string, init: RequestInit = {}, token?: string) {
  const r = await fetch(`${DISCORD_API}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: token ? `Bearer ${token}` : `Bot ${BOT_TOKEN}`,
    },
  });
  return r;
}

async function getBotGuildIds(): Promise<Set<string>> {
  // paginate
  const ids = new Set<string>();
  let after: string | undefined;
  for (let i = 0; i < 10; i++) {
    const url = new URL(`${DISCORD_API}/users/@me/guilds`);
    url.searchParams.set("limit", "200");
    if (after) url.searchParams.set("after", after);
    const r = await fetch(url.toString(), { headers: { Authorization: `Bot ${BOT_TOKEN}` } });
    if (!r.ok) break;
    const arr = await r.json() as any[];
    if (!arr.length) break;
    for (const g of arr) ids.add(g.id);
    after = arr[arr.length - 1].id;
    if (arr.length < 200) break;
  }
  return ids;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/discord-auth/, "") || "/";

  try {
    // Public config (no auth) — exposes only the public client_id
    if (path === "/config" && req.method === "GET") {
      return new Response(JSON.stringify({ client_id: CLIENT_ID }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // ---------- LOGIN: exchange code -> Discord tokens -> Supabase user ----------
    if (path === "/login" && req.method === "POST") {
      const { code, redirect_uri } = await req.json();
      if (!code || !redirect_uri) throw new Error("Missing code or redirect_uri");

      const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri,
        }),
      });
      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        throw new Error(`Discord token exchange failed: ${err}`);
      }
      const tokens = await tokenRes.json();

      // Get Discord user
      const userRes = await discordFetch("/users/@me", {}, tokens.access_token);
      if (!userRes.ok) throw new Error("Failed to fetch Discord user");
      const discord = await userRes.json();

      const email = discord.email || `${discord.id}@discord.local`;
      const fakePassword = `discord_${discord.id}_${CLIENT_SECRET.slice(0, 12)}`;

      // Try create — if exists, just sign in
      let userId: string | null = null;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: fakePassword,
        email_confirm: true,
        user_metadata: { discord_id: discord.id, username: discord.username },
      });
      if (created?.user) {
        userId = created.user.id;
      } else {
        // find existing by email
        const { data: list } = await admin.auth.admin.listUsers();
        const existing = list?.users.find((u: any) => u.email === email);
        if (!existing) throw new Error(`Auth create failed: ${createErr?.message}`);
        userId = existing.id;
      }

      // upsert profile
      const avatar = discord.avatar
        ? `https://cdn.discordapp.com/avatars/${discord.id}/${discord.avatar}.png`
        : null;
      await admin.from("profiles").upsert({
        user_id: userId,
        discord_id: discord.id,
        discord_username: discord.username,
        discord_avatar: avatar,
        discord_access_token: tokens.access_token,
        discord_refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      }, { onConflict: "user_id" });

      // generate Supabase session via password sign-in
      const anon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: sess, error: signErr } = await anon.auth.signInWithPassword({ email, password: fakePassword });
      if (signErr) throw signErr;

      return new Response(JSON.stringify({
        session: sess.session,
        user: { id: userId, discord_id: discord.id, username: discord.username, avatar },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---------- Authenticated routes ----------
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: profile } = await admin.from("profiles").select("*").eq("user_id", user.id).single();
    if (!profile?.discord_access_token) throw new Error("No Discord token on profile");

    // ---------- GUILDS: user's guilds intersected with bot's guilds ----------
    if (path === "/guilds" && req.method === "GET") {
      const r = await discordFetch("/users/@me/guilds", {}, profile.discord_access_token);
      if (!r.ok) throw new Error("Failed to fetch user guilds");
      const userGuilds = await r.json() as any[];
      const botGuildIds = await getBotGuildIds();
      const shared = userGuilds.filter(g => botGuildIds.has(g.id));

      // fetch member roles for each shared guild (with bot token)
      const enriched = await Promise.all(shared.map(async (g) => {
        const mr = await discordFetch(`/guilds/${g.id}/members/${profile.discord_id}`);
        let roles: string[] = [];
        if (mr.ok) { const m = await mr.json(); roles = m.roles || []; }
        // is registered server in our DB?
        const { data: srv } = await admin.from("servers").select("id, slug, name, logo_url").eq("guild_id", g.id).maybeSingle();
        return {
          guild_id: g.id,
          name: g.name,
          icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
          owner: g.owner,
          permissions: g.permissions,
          roles,
          registered: !!srv,
          server: srv,
        };
      }));

      return new Response(JSON.stringify({ guilds: enriched }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---------- ROLES of a guild ----------
    if (path === "/roles" && req.method === "GET") {
      const guildId = url.searchParams.get("guild_id");
      if (!guildId) throw new Error("guild_id required");
      const r = await discordFetch(`/guilds/${guildId}/roles`);
      if (!r.ok) throw new Error("Failed to fetch roles");
      const roles = await r.json();
      return new Response(JSON.stringify({ roles }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---------- CHANNELS of a guild ----------
    if (path === "/channels" && req.method === "GET") {
      const guildId = url.searchParams.get("guild_id");
      if (!guildId) throw new Error("guild_id required");
      const r = await discordFetch(`/guilds/${guildId}/channels`);
      if (!r.ok) throw new Error("Failed to fetch channels");
      const channels = (await r.json() as any[]).filter((c: any) => c.type === 0);
      return new Response(JSON.stringify({ channels }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---------- MEMBER ROLES (live re-fetch for permission checks) ----------
    if (path === "/member-roles" && req.method === "GET") {
      const guildId = url.searchParams.get("guild_id");
      if (!guildId) throw new Error("guild_id required");
      const r = await discordFetch(`/guilds/${guildId}/members/${profile.discord_id}`);
      if (!r.ok) return new Response(JSON.stringify({ roles: [], in_guild: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const m = await r.json();
      return new Response(JSON.stringify({ roles: m.roles || [], in_guild: true, nick: m.nick }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("discord-auth error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
