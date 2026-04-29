import { useEffect, useState } from "react";
import { useServer } from "@/contexts/ServerContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, UserMinus } from "lucide-react";
import { toast } from "sonner";

export default function Staff() {
  const { server, role } = useServer();
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!server) return;
    const [m, l] = await Promise.all([
      supabase.from("server_members").select("*").eq("server_id", server.id),
      supabase.from("licenses").select("*").eq("server_id", server.id).in("status", ["approved","suspended"]),
    ]);
    setMembers(m.data || []); setLicenses(l.data || []);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, [server]);

  const removeMember = async (m: any) => {
    if (!confirm("Remove this member from the website?")) return;
    await supabase.from("server_members").delete().eq("id", m.id);
    await supabase.from("audit_log").insert({ server_id: server!.id, actor_id: user!.id, actor_role: role, action: "removed_member", target_id: m.user_id, details: { discord_id: m.discord_id, was: m.role } });
    toast.success("Removed");
    refresh();
  };
  const removeLicense = async (l: any) => {
    if (!confirm("Delete this license?")) return;
    await supabase.from("licenses").delete().eq("id", l.id);
    await supabase.from("audit_log").insert({ server_id: server!.id, actor_id: user!.id, actor_role: role, action: "removed_license", target_id: l.id });
    toast.success("Removed");
    refresh();
  };

  if (loading) return <Loader2 className="animate-spin" />;

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="text-3xl font-bold">Staff Panel</h1>
      <Tabs defaultValue="police">
        <TabsList><TabsTrigger value="police">Police</TabsTrigger><TabsTrigger value="citizens">Citizens</TabsTrigger></TabsList>
        <TabsContent value="police" className="space-y-2 mt-4">
          {members.filter(m => m.role === "police").map(m => (
            <Card key={m.id} className="p-3 glass flex items-center justify-between text-sm">
              <span>Discord: {m.discord_id}</span>
              <Button size="sm" variant="outline" onClick={() => removeMember(m)}><UserMinus className="size-4 mr-1" />Remove</Button>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="citizens" className="space-y-2 mt-4">
          {licenses.map(l => (
            <Card key={l.id} className="p-3 glass flex items-center justify-between text-sm">
              <span>{l.rp_name} ({l.license_number})</span>
              <Button size="sm" variant="outline" onClick={() => removeLicense(l)}><UserMinus className="size-4 mr-1" />Revoke license</Button>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
