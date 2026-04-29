// License image generator + bot dispatch helper
// POST /generate-license  { license_id }  -> generates image from server template, uploads, returns URL, queues bot DM/post
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ImageMagick, initializeImageMagick, MagickFormat } from "https://deno.land/x/imagemagick_deno@0.0.26/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

let mInit = false;
async function ensureMagick() {
  if (!mInit) { await initializeImageMagick(); mInit = true; }
}

async function compose(templateBg: Uint8Array | null, fields: any[], values: Record<string, string>): Promise<Uint8Array> {
  await ensureMagick();
  // Build SVG overlay then composite
  const W = 1000, H = 600;
  const safeText = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svgFields = fields.map((f: any) => {
    const v = values[f.key] ?? "";
    return `<text x="${f.x ?? 50}" y="${f.y ?? 50}" font-size="${f.fontSize ?? 28}" fill="${f.color ?? '#ffffff'}" font-family="${f.fontFamily ?? 'Arial'}" font-weight="600">${safeText(v)}</text>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    ${templateBg ? "" : `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5865f2"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)" rx="20"/>`}
    ${svgFields}
  </svg>`;

  let out: Uint8Array = new Uint8Array();
  if (templateBg) {
    await ImageMagick.read(templateBg, async (img) => {
      img.resize(W, H);
      await ImageMagick.read(new TextEncoder().encode(svg), async (overlay) => {
        img.composite(overlay, 0, 0);
        await img.write(MagickFormat.Png, (data) => { out = new Uint8Array(data); });
      });
    });
  } else {
    await ImageMagick.read(new TextEncoder().encode(svg), async (img) => {
      await img.write(MagickFormat.Png, (data) => { out = new Uint8Array(data); });
    });
  }
  return out;
}

async function botDM(discordId: string, content: string, fileUrl?: string) {
  // open DM
  const dmRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
    method: "POST",
    headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient_id: discordId }),
  });
  if (!dmRes.ok) throw new Error("DM channel open failed");
  const dm = await dmRes.json();
  const body: any = { content };
  if (fileUrl) body.embeds = [{ image: { url: fileUrl }, color: 0x5865f2 }];
  await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function botChannel(channelId: string, content: string, fileUrl?: string) {
  const body: any = { content };
  if (fileUrl) body.embeds = [{ image: { url: fileUrl }, color: 0x5865f2 }];
  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { license_id } = await req.json();
    if (!license_id) throw new Error("license_id required");

    const { data: lic } = await admin.from("licenses").select("*, server:servers(*)").eq("id", license_id).single();
    if (!lic) throw new Error("License not found");

    const tmpl = lic.server.license_template || { fields: [] };
    let bgBytes: Uint8Array | null = null;
    if (tmpl.bg_url) {
      try {
        const r = await fetch(tmpl.bg_url);
        if (r.ok) bgBytes = new Uint8Array(await r.arrayBuffer());
      } catch (_) {}
    }

    const licNumber = `RP-${lic.server.slug.toUpperCase().slice(0, 4)}-${lic.id.slice(0, 6).toUpperCase()}`;
    const values = {
      rp_name: lic.rp_name,
      rp_age: String(lic.rp_age),
      rp_citizenship: lic.rp_citizenship,
      roblox_username: lic.roblox_username,
      license_number: licNumber,
      server_name: lic.server.name,
      issued_at: new Date().toLocaleDateString(),
    };

    const png = await compose(bgBytes, tmpl.fields || [
      { key: "server_name", x: 50, y: 60, fontSize: 36 },
      { key: "rp_name", x: 50, y: 180, fontSize: 42 },
      { key: "rp_age", x: 50, y: 240, fontSize: 24 },
      { key: "rp_citizenship", x: 50, y: 290, fontSize: 24 },
      { key: "roblox_username", x: 50, y: 340, fontSize: 24 },
      { key: "license_number", x: 50, y: 540, fontSize: 22, color: "#ffd700" },
    ], values);

    const path = `${lic.server_id}/${lic.id}.png`;
    await admin.storage.from("licenses").upload(path, png, { contentType: "image/png", upsert: true });
    const { data: pub } = admin.storage.from("licenses").getPublicUrl(path);
    const imageUrl = pub.publicUrl;

    await admin.from("licenses").update({ license_image_url: imageUrl, license_number: licNumber, status: "approved", reviewed_at: new Date().toISOString() }).eq("id", license_id);

    // Send DM and channel post
    try { await botDM(lic.discord_id, lic.server.license_dm_message || "Your license is ready!", imageUrl); } catch (e) { console.error("DM fail", e); }
    if (lic.server.license_channel_id) {
      try { await botChannel(lic.server.license_channel_id, `📋 New license issued: **${lic.rp_name}** (${licNumber})`, imageUrl); } catch (e) { console.error("Channel fail", e); }
    }

    return new Response(JSON.stringify({ image_url: imageUrl, license_number: licNumber }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
