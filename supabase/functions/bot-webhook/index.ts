// Webhook from your Discord bot — called when a member is kicked/banned/leaves.
// Cleans up that user's data for that server. Auth via shared BOT_WEBHOOK_SECRET.
// POST /bot-webhook  body: { event: 'member_remove'|'member_ban', guild_id, discord_id }
//  Header: X-Bot-Secret: <BOT_WEBHOOK_SECRET>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bot-secret",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SECRET = Deno.env.get("BOT_WEBHOOK_SECRET")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.headers.get("x-bot-secret") !== SECRET) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  try {
    const { event, guild_id, discord_id } = await req.json();
    if (!guild_id || !discord_id) throw new Error("guild_id and discord_id required");

    const { data: server } = await admin.from("servers").select("id").eq("guild_id", guild_id).single();
    if (!server) return new Response(JSON.stringify({ ok: true, note: "server not registered" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: prof } = await admin.from("profiles").select("user_id").eq("discord_id", discord_id).maybeSingle();
    if (!prof) return new Response(JSON.stringify({ ok: true, note: "user never logged in" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Cascade: delete membership, license, fines, wanted, action_requests
    await admin.from("server_members").delete().eq("server_id", server.id).eq("user_id", prof.user_id);
    await admin.from("licenses").delete().eq("server_id", server.id).eq("user_id", prof.user_id);
    await admin.from("fines").delete().eq("server_id", server.id).eq("target_user_id", prof.user_id);
    await admin.from("wanted").delete().eq("server_id", server.id).eq("target_user_id", prof.user_id);
    await admin.from("action_requests").delete().eq("server_id", server.id).eq("target_user_id", prof.user_id);

    await admin.from("audit_log").insert({
      server_id: server.id,
      actor_id: null,
      actor_role: null,
      action: `bot_${event}`,
      details: { discord_id },
    });

    return new Response(JSON.stringify({ ok: true, cleaned: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
