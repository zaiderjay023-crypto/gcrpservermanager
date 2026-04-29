import { useEffect, useState } from "react";
import { useServer } from "@/contexts/ServerContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { discordApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

const ACTIONS = [
  { v: "approve_license", l: "Approve License Registration", panel: "police" },
  { v: "issue_fine", l: "Issue Fine", panel: "police" },
  { v: "request_wanted", l: "Mark Wanted", panel: "police" },
  { v: "request_suspension", l: "Suspend License", panel: "police" },
  { v: "kick_police", l: "Remove Police Member", panel: "staff" },
  { v: "kick_citizen", l: "Remove Citizen License", panel: "staff" },
];

export default function Owner() {
  const { server, refresh } = useServer();
  const { user } = useAuth();
  const [s, setS] = useState<any>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [perms, setPerms] = useState<any[]>([]);
  const [tplBg, setTplBg] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (server) setS({ ...server }); }, [server]);
  useEffect(() => {
    if (!server) return;
    discordApi.channels(server.guild_id).then(r => setChannels(r.channels)).catch(() => {});
    discordApi.roles(server.guild_id).then(r => setRoles(r.roles.filter((x: any) => x.name !== "@everyone"))).catch(() => {});
    supabase.from("server_role_permissions").select("*").eq("server_id", server.id).then(({ data }) => setPerms(data || []));
  }, [server]);

  const save = async () => {
    setBusy(true);
    try {
      let logo_url = s.logo_url;
      const updates: any = {
        name: s.name, logo_url,
        license_channel_id: s.license_channel_id, fines_channel_id: s.fines_channel_id,
        wanted_channel_id: s.wanted_channel_id, suspensions_channel_id: s.suspensions_channel_id,
        license_dm_message: s.license_dm_message, fine_dm_message: s.fine_dm_message,
        wanted_dm_message: s.wanted_dm_message, suspension_dm_message: s.suspension_dm_message,
        license_template: s.license_template,
      };
      if (tplBg) {
        const path = `${server!.id}/template-${Date.now()}.png`;
        await supabase.storage.from("license-templates").upload(path, tplBg, { upsert: true });
        const url = supabase.storage.from("license-templates").getPublicUrl(path).data.publicUrl;
        updates.license_template = { ...(s.license_template || {}), bg_url: url };
        setS({ ...s, license_template: updates.license_template });
      }
      const { error } = await supabase.from("servers").update(updates).eq("id", server!.id);
      if (error) throw error;
      toast.success("Saved");
      refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const addPerm = async (action: string, role_id: string, mode: "direct" | "request", panel: string) => {
    const { data, error } = await supabase.from("server_role_permissions").insert({ server_id: server!.id, action, discord_role_id: role_id, mode, panel }).select().single();
    if (error) return toast.error(error.message);
    setPerms([...perms, data]);
  };
  const delPerm = async (id: string) => {
    await supabase.from("server_role_permissions").delete().eq("id", id);
    setPerms(perms.filter(p => p.id !== id));
  };

  if (!s) return <Loader2 className="animate-spin" />;

  const fields = s.license_template?.fields || [];
  const setFields = (f: any[]) => setS({ ...s, license_template: { ...(s.license_template || {}), fields: f } });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Owner Panel</h1>
        <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}Save all</Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="channels">Channels & Messages</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="template">License Template</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-4">
          <Card className="p-5 glass space-y-4">
            <div><Label>Server name</Label><Input value={s.name} onChange={e => setS({ ...s, name: e.target.value })} /></div>
            {s.logo_url && <img src={s.logo_url} className="size-20 rounded-xl" />}
            <div><Label>Replace logo</Label><Input type="file" accept="image/*" onChange={async e => {
              const f = e.target.files?.[0]; if (!f) return;
              const path = `${server!.id}/${Date.now()}-${f.name}`;
              await supabase.storage.from("server-logos").upload(path, f);
              const url = supabase.storage.from("server-logos").getPublicUrl(path).data.publicUrl;
              setS({ ...s, logo_url: url });
            }} /></div>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="space-y-4 mt-4">
          {[
            { k: "license_channel_id", l: "License posts channel", m: "license_dm_message", ml: "License DM message" },
            { k: "fines_channel_id", l: "Fines channel", m: "fine_dm_message", ml: "Fine DM message" },
            { k: "wanted_channel_id", l: "Wanted channel", m: "wanted_dm_message", ml: "Wanted DM message" },
            { k: "suspensions_channel_id", l: "Suspensions channel", m: "suspension_dm_message", ml: "Suspension DM message" },
          ].map(x => (
            <Card key={x.k} className="p-5 glass space-y-3">
              <div>
                <Label>{x.l}</Label>
                <Select value={s[x.k] ?? ""} onValueChange={v => setS({ ...s, [x.k]: v })}>
                  <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
                  <SelectContent>{channels.map(c => <SelectItem key={c.id} value={c.id}># {c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{x.ml}</Label><Textarea value={s[x.m] || ""} onChange={e => setS({ ...s, [x.m]: e.target.value })} /></div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">Map Discord roles to actions. Direct = can perform immediately. Request = needs approval.</p>
          <Card className="p-5 glass space-y-3">
            <h3 className="font-semibold">Add permission</h3>
            <PermAdder roles={roles} onAdd={addPerm} />
          </Card>
          <div className="space-y-2">
            {perms.map(p => {
              const role = roles.find(r => r.id === p.discord_role_id);
              return (
                <Card key={p.id} className="p-3 glass flex items-center justify-between text-sm">
                  <div><span className="font-medium" style={{ color: role ? `#${role.color.toString(16).padStart(6,'0')}` : undefined }}>@{role?.name || p.discord_role_id}</span> — {p.action} <span className="text-muted-foreground">({p.mode}, {p.panel} panel)</span></div>
                  <Button size="icon" variant="ghost" onClick={() => delPerm(p.id)}><Trash2 className="size-4" /></Button>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="template" className="space-y-4 mt-4">
          <Card className="p-5 glass space-y-3">
            <Label>Background image (optional, 1000×600 recommended)</Label>
            <Input type="file" accept="image/*" onChange={e => setTplBg(e.target.files?.[0] || null)} />
            {s.license_template?.bg_url && <img src={s.license_template.bg_url} className="rounded-lg max-w-full" />}
          </Card>
          <Card className="p-5 glass space-y-3">
            <div className="flex items-center justify-between">
              <Label>Text fields</Label>
              <Button size="sm" variant="outline" onClick={() => setFields([...fields, { key: "rp_name", x: 50, y: 50, fontSize: 28, color: "#ffffff", fontFamily: "Arial" }])}><Plus className="size-4 mr-1" />Add field</Button>
            </div>
            {fields.length === 0 && <p className="text-sm text-muted-foreground">Add fields to position text on the license. Available keys: rp_name, rp_age, rp_citizenship, roblox_username, license_number, server_name, issued_at.</p>}
            {fields.map((f: any, i: number) => (
              <div key={i} className="grid grid-cols-6 gap-2 items-end">
                <div className="col-span-2"><Label className="text-xs">Key</Label>
                  <Select value={f.key} onValueChange={v => { const nf = [...fields]; nf[i].key = v; setFields(nf); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["rp_name","rp_age","rp_citizenship","roblox_username","license_number","server_name","issued_at"].map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">X</Label><Input type="number" value={f.x} onChange={e => { const nf = [...fields]; nf[i].x = +e.target.value; setFields(nf); }} /></div>
                <div><Label className="text-xs">Y</Label><Input type="number" value={f.y} onChange={e => { const nf = [...fields]; nf[i].y = +e.target.value; setFields(nf); }} /></div>
                <div><Label className="text-xs">Size</Label><Input type="number" value={f.fontSize} onChange={e => { const nf = [...fields]; nf[i].fontSize = +e.target.value; setFields(nf); }} /></div>
                <div className="flex gap-1"><Input type="color" value={f.color} onChange={e => { const nf = [...fields]; nf[i].color = e.target.value; setFields(nf); }} /><Button size="icon" variant="ghost" onClick={() => setFields(fields.filter((_:any,j:number)=>j!==i))}><Trash2 className="size-4" /></Button></div>
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PermAdder({ roles, onAdd }: any) {
  const [r, setR] = useState(""); const [a, setA] = useState(""); const [m, setM] = useState<"direct" | "request">("direct"); const [panel, setPanel] = useState("police");
  return (
    <div className="grid grid-cols-5 gap-2 items-end">
      <div className="col-span-2"><Label className="text-xs">Discord role</Label>
        <Select value={r} onValueChange={setR}><SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>{roles.map((x: any) => <SelectItem key={x.id} value={x.id}>@{x.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label className="text-xs">Action</Label>
        <Select value={a} onValueChange={(v) => { setA(v); const ax = ACTIONS.find(z => z.v === v); if (ax) setPanel(ax.panel); }}>
          <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>{ACTIONS.map(x => <SelectItem key={x.v} value={x.v}>{x.l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label className="text-xs">Mode</Label>
        <Select value={m} onValueChange={(v: any) => setM(v)}><SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="direct">Direct</SelectItem><SelectItem value="request">Request</SelectItem></SelectContent>
        </Select>
      </div>
      <Button onClick={() => { if (r && a) { onAdd(a, r, m, panel); setR(""); setA(""); }}}><Plus className="size-4" /></Button>
    </div>
  );
}
