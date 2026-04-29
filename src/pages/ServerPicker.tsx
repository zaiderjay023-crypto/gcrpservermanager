import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { discordApi } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Crown, ChevronRight, LogOut, Shield } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Guild { guild_id: string; name: string; icon: string | null; owner: boolean; roles: string[]; registered: boolean; server: any; }

export default function ServerPicker() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [busy, setBusy] = useState(true);
  const [creating, setCreating] = useState<Guild | null>(null);
  const [serverName, setServerName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/"); return; }
    discordApi.guilds().then(r => setGuilds(r.guilds)).catch(e => toast.error(e.message)).finally(() => setBusy(false));
  }, [user, loading]);

  const enterServer = async (g: Guild) => {
    // ensure membership exists
    await supabase.from("server_members").upsert({
      server_id: g.server.id, user_id: user!.id, discord_id: profile!.discord_id,
      role: g.owner ? "owner" : "citizen",
    }, { onConflict: "server_id,user_id" });
    navigate(`/s/${g.server.slug}`);
  };

  const createServer = async () => {
    if (!creating || !serverName || !slug) return;
    setSubmitting(true);
    try {
      let logo_url: string | null = null;
      if (logoFile) {
        const path = `${creating.guild_id}/${Date.now()}-${logoFile.name}`;
        const { error } = await supabase.storage.from("server-logos").upload(path, logoFile);
        if (error) throw error;
        logo_url = supabase.storage.from("server-logos").getPublicUrl(path).data.publicUrl;
      }
      const { data, error } = await supabase.from("servers").insert({
        guild_id: creating.guild_id, name: serverName, slug,
        owner_user_id: user!.id, logo_url,
      }).select().single();
      if (error) throw error;
      await supabase.from("server_members").insert({ server_id: data.id, user_id: user!.id, discord_id: profile!.discord_id, role: "owner" });
      toast.success("Server created!");
      setCreating(null);
      navigate(`/s/${slug}`);
    } catch (e: any) { toast.error(e.message); } finally { setSubmitting(false); }
  };

  if (loading || busy) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin size-8 text-primary" /></div>;

  return (
    <div className="min-h-screen">
      <nav className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-3">
          {profile?.discord_avatar && <img src={profile.discord_avatar} className="size-10 rounded-full ring-2 ring-primary/30" />}
          <div>
            <p className="font-semibold">{profile?.discord_username}</p>
            <p className="text-xs text-muted-foreground">Pick a server</p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => { signOut().then(() => navigate("/")); }}><LogOut className="size-4 mr-2" />Sign out</Button>
      </nav>

      <main className="container py-8">
        <div className="mb-8 animate-fade-up">
          <h1 className="text-4xl font-bold mb-2">Your servers</h1>
          <p className="text-muted-foreground">Servers where the bot is installed appear here. Owners can register a new one.</p>
        </div>

        {guilds.length === 0 && (
          <Card className="p-8 text-center">
            <Shield className="size-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No matching servers</h3>
            <p className="text-sm text-muted-foreground">Make sure your bot is installed in a Discord server you're part of.</p>
          </Card>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {guilds.map((g, i) => (
            <Card key={g.guild_id} className="p-5 glass glow-on-hover animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-start gap-4 mb-4">
                {g.icon ? <img src={g.icon} className="size-14 rounded-xl" /> : <div className="size-14 rounded-xl bg-gradient-primary flex items-center justify-center font-bold text-xl">{g.name[0]}</div>}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{g.name}</h3>
                  <div className="flex gap-2 mt-1">
                    {g.owner && <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning flex items-center gap-1"><Crown className="size-3" />Owner</span>}
                    {g.registered && <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success">Active</span>}
                    {!g.registered && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Not registered</span>}
                  </div>
                </div>
              </div>
              {g.registered ? (
                <Button className="w-full" onClick={() => enterServer(g)}>Enter <ChevronRight className="size-4 ml-1" /></Button>
              ) : g.owner ? (
                <Dialog open={creating?.guild_id === g.guild_id} onOpenChange={(o) => { if (!o) setCreating(null); else { setCreating(g); setServerName(g.name); setSlug(g.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20)); }}}>
                  <DialogTrigger asChild><Button variant="outline" className="w-full"><Plus className="size-4 mr-1" />Register server</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Register {g.name}</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div><Label>Display name</Label><Input value={serverName} onChange={e => setServerName(e.target.value)} /></div>
                      <div><Label>URL slug</Label><Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} /></div>
                      <div><Label>Server logo</Label><Input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} /></div>
                      <Button className="w-full" onClick={createServer} disabled={submitting}>{submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}Create server</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <Button variant="outline" className="w-full" disabled>Owner must register</Button>
              )}
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
