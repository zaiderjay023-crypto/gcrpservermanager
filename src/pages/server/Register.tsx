import { useEffect, useState } from "react";
import { useServer } from "@/contexts/ServerContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const { server } = useServer();
  const { user, profile } = useAuth();
  const [existing, setExisting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ rp_name: "", rp_age: "", rp_citizenship: "", roblox_username: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!server || !user) return;
    supabase.from("licenses").select("*").eq("server_id", server.id).eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { setExisting(data); setLoading(false); });
  }, [server, user]);

  const submit = async () => {
    if (!form.rp_name || !form.rp_age || !form.rp_citizenship || !form.roblox_username) return toast.error("Fill all fields");
    setSubmitting(true);
    const { error } = await supabase.from("licenses").insert({
      server_id: server!.id, user_id: user!.id, discord_id: profile!.discord_id,
      rp_name: form.rp_name, rp_age: parseInt(form.rp_age), rp_citizenship: form.rp_citizenship, roblox_username: form.roblox_username,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Registration submitted! A police officer will review it.");
    const { data } = await supabase.from("licenses").select("*").eq("server_id", server!.id).eq("user_id", user!.id).single();
    setExisting(data);
  };

  if (loading) return <Loader2 className="animate-spin" />;

  if (existing) {
    const colorMap: Record<string, string> = { pending: "text-warning", approved: "text-success", rejected: "text-destructive", suspended: "text-destructive" };
    return (
      <div className="space-y-6 animate-fade-up">
        <h1 className="text-3xl font-bold">My License</h1>
        <Card className="p-6 glass">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{existing.rp_name}</h2>
            <span className={`text-sm font-medium capitalize ${colorMap[existing.status]}`}>{existing.status}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-muted-foreground">Age</p><p>{existing.rp_age}</p></div>
            <div><p className="text-muted-foreground">Citizenship</p><p>{existing.rp_citizenship}</p></div>
            <div><p className="text-muted-foreground">Roblox</p><p>{existing.roblox_username}</p></div>
            {existing.license_number && <div><p className="text-muted-foreground">License #</p><p className="font-mono">{existing.license_number}</p></div>}
          </div>
          {existing.license_image_url && (
            <div className="mt-6">
              <img src={existing.license_image_url} className="w-full rounded-xl shadow-elegant" />
            </div>
          )}
          {existing.rejection_reason && <p className="mt-4 text-sm text-destructive">Reason: {existing.rejection_reason}</p>}
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl animate-fade-up">
      <h1 className="text-3xl font-bold mb-2">Citizen Registration</h1>
      <p className="text-muted-foreground mb-6">Fill out the form to apply for your roleplay license.</p>
      <Card className="p-6 glass space-y-4">
        <div><Label>RP Name</Label><Input value={form.rp_name} onChange={e => setForm({ ...form, rp_name: e.target.value })} /></div>
        <div><Label>RP Age</Label><Input type="number" value={form.rp_age} onChange={e => setForm({ ...form, rp_age: e.target.value })} /></div>
        <div><Label>RP Citizenship</Label><Input value={form.rp_citizenship} onChange={e => setForm({ ...form, rp_citizenship: e.target.value })} /></div>
        <div><Label>Roblox Username</Label><Input value={form.roblox_username} onChange={e => setForm({ ...form, roblox_username: e.target.value })} /></div>
        <Button className="w-full" onClick={submit} disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : <FileText className="size-4 mr-2" />}Submit registration
        </Button>
      </Card>
    </div>
  );
}
