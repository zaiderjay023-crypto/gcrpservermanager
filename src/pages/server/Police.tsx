import { useEffect, useState } from "react";
import { useServer } from "@/contexts/ServerContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { licenseApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Check, X, AlertTriangle, Ban, FileWarning } from "lucide-react";
import { toast } from "sonner";

export default function Police() {
  const { server, can, role } = useServer();
  const { user } = useAuth();
  const [pending, setPending] = useState<any[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [fines, setFines] = useState<any[]>([]);
  const [wanted, setWanted] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!server) return;
    const [a, b, f, w, r] = await Promise.all([
      supabase.from("licenses").select("*").eq("server_id", server.id).eq("status", "pending").order("created_at"),
      supabase.from("licenses").select("*").eq("server_id", server.id).in("status", ["approved","suspended"]).order("created_at", { ascending: false }).limit(50),
      supabase.from("fines").select("*").eq("server_id", server.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("wanted").select("*").eq("server_id", server.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("action_requests").select("*").eq("server_id", server.id).eq("status", "pending"),
    ]);
    setPending(a.data || []); setApproved(b.data || []); setFines(f.data || []); setWanted(w.data || []); setRequests(r.data || []);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, [server]);

  const audit = async (action: string, target_id?: string, details: any = {}) => {
    await supabase.from("audit_log").insert({ server_id: server!.id, actor_id: user!.id, actor_role: role, action, target_id, details });
  };

  const approveLicense = async (lic: any) => {
    const cap = can("approve_license");
    if (cap === "no") return toast.error("No permission");
    if (cap === "request") {
      await supabase.from("action_requests").insert({ server_id: server!.id, requester_id: user!.id, target_user_id: lic.user_id, target_discord_id: lic.discord_id, action: "approve_license", payload: { license_id: lic.id } });
      await audit("requested_approve_license", lic.id);
      toast.success("Request submitted");
      return refresh();
    }
    try {
      await licenseApi.generate(lic.id);
      await supabase.from("licenses").update({ reviewed_by: user!.id }).eq("id", lic.id);
      await audit("approved_license", lic.id);
      toast.success("License approved & sent");
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const rejectLicense = async (lic: any) => {
    const reason = prompt("Reason?"); if (!reason) return;
    await supabase.from("licenses").update({ status: "rejected", reviewed_by: user!.id, reviewed_at: new Date().toISOString(), rejection_reason: reason }).eq("id", lic.id);
    await audit("rejected_license", lic.id, { reason });
    refresh();
  };

  const issueFine = async (lic: any, amount: string, reason: string) => {
    const cap = can("issue_fine");
    if (cap === "no") return toast.error("No permission");
    const status = cap === "request" ? "pending_request" : "active";
    await supabase.from("fines").insert({ server_id: server!.id, target_user_id: lic.user_id, target_discord_id: lic.discord_id, issued_by: user!.id, amount: parseFloat(amount), reason, status });
    await audit(cap === "request" ? "requested_fine" : "issued_fine", lic.id, { amount, reason });
    toast.success(cap === "request" ? "Fine request submitted" : "Fine issued");
    refresh();
  };

  const requestWanted = async (lic: any, reason: string) => {
    const cap = can("request_wanted");
    if (cap === "no") return toast.error("No permission");
    const status = cap === "direct" ? "active" : "pending_request";
    await supabase.from("wanted").insert({ server_id: server!.id, target_user_id: lic.user_id, target_discord_id: lic.discord_id, issued_by: user!.id, reason, status });
    await audit(cap === "direct" ? "marked_wanted" : "requested_wanted", lic.id, { reason });
    refresh();
  };

  const requestSuspension = async (lic: any, days: string, reason: string) => {
    const cap = can("request_suspension");
    if (cap === "no") return toast.error("No permission");
    const until = new Date(Date.now() + parseInt(days) * 86400000).toISOString();
    if (cap === "direct") {
      await supabase.from("licenses").update({ status: "suspended", suspended_until: until }).eq("id", lic.id);
      await audit("suspended_license", lic.id, { until, reason });
    } else {
      await supabase.from("action_requests").insert({ server_id: server!.id, requester_id: user!.id, target_user_id: lic.user_id, target_discord_id: lic.discord_id, action: "request_suspension", payload: { license_id: lic.id, until, reason } });
      await audit("requested_suspension", lic.id, { reason });
    }
    refresh();
  };

  if (loading) return <Loader2 className="animate-spin" />;

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="text-3xl font-bold">Police Panel</h1>
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="licenses">Licenses ({approved.length})</TabsTrigger>
          <TabsTrigger value="fines">Fines</TabsTrigger>
          <TabsTrigger value="wanted">Wanted</TabsTrigger>
          {(role === "owner" || role === "staff") && <TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {pending.length === 0 && <p className="text-muted-foreground text-sm">No pending registrations.</p>}
          {pending.map(l => (
            <Card key={l.id} className="p-4 glass flex items-center justify-between">
              <div>
                <p className="font-semibold">{l.rp_name} <span className="text-muted-foreground">· age {l.rp_age}</span></p>
                <p className="text-xs text-muted-foreground">{l.rp_citizenship} · Roblox: {l.roblox_username}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => approveLicense(l)}><Check className="size-4 mr-1" />Approve</Button>
                <Button size="sm" variant="outline" onClick={() => rejectLicense(l)}><X className="size-4 mr-1" />Reject</Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="licenses" className="space-y-3 mt-4">
          {approved.map(l => <LicenseRow key={l.id} l={l} onFine={issueFine} onWanted={requestWanted} onSuspend={requestSuspension} />)}
        </TabsContent>

        <TabsContent value="fines" className="space-y-2 mt-4">
          {fines.map(f => (
            <Card key={f.id} className="p-3 glass text-sm">
              <p className="font-medium">${f.amount} — {f.reason}</p>
              <p className="text-xs text-muted-foreground">Status: {f.status}</p>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="wanted" className="space-y-2 mt-4">
          {wanted.map(w => (
            <Card key={w.id} className="p-3 glass text-sm">
              <p className="font-medium">{w.reason}</p>
              <p className="text-xs text-muted-foreground">Status: {w.status}</p>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="requests" className="space-y-2 mt-4">
          {requests.map(r => (
            <Card key={r.id} className="p-3 glass text-sm flex items-center justify-between">
              <div>
                <p className="font-medium capitalize">{r.action.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground">{JSON.stringify(r.payload)}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={async () => {
                  if (r.action === "approve_license") { await licenseApi.generate(r.payload.license_id); }
                  if (r.action === "request_suspension") { await supabase.from("licenses").update({ status: "suspended", suspended_until: r.payload.until }).eq("id", r.payload.license_id); }
                  await supabase.from("action_requests").update({ status: "approved", reviewed_by: user!.id, reviewed_at: new Date().toISOString() }).eq("id", r.id);
                  await audit("approved_request", r.id, { action: r.action });
                  refresh();
                }}>Approve</Button>
                <Button size="sm" variant="outline" onClick={async () => {
                  await supabase.from("action_requests").update({ status: "rejected", reviewed_by: user!.id, reviewed_at: new Date().toISOString() }).eq("id", r.id);
                  refresh();
                }}>Reject</Button>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LicenseRow({ l, onFine, onWanted, onSuspend }: any) {
  const [amount, setAmount] = useState(""); const [reason, setReason] = useState(""); const [days, setDays] = useState("7");
  return (
    <Card className="p-4 glass flex items-center justify-between">
      <div>
        <p className="font-semibold">{l.rp_name} <span className="text-muted-foreground text-xs font-mono">{l.license_number}</span></p>
        <p className="text-xs text-muted-foreground">{l.rp_citizenship} · status: {l.status}</p>
      </div>
      <div className="flex gap-2">
        <Dialog><DialogTrigger asChild><Button size="sm" variant="outline"><AlertTriangle className="size-4 mr-1" />Fine</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Issue Fine</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Amount</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
              <div><Label>Reason</Label><Textarea value={reason} onChange={e => setReason(e.target.value)} /></div>
              <Button className="w-full" onClick={() => onFine(l, amount, reason)}>Submit</Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog><DialogTrigger asChild><Button size="sm" variant="outline"><FileWarning className="size-4 mr-1" />Wanted</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Mark Wanted</DialogTitle></DialogHeader>
            <div className="space-y-3"><Label>Reason</Label><Textarea value={reason} onChange={e => setReason(e.target.value)} /><Button className="w-full" onClick={() => onWanted(l, reason)}>Submit</Button></div>
          </DialogContent>
        </Dialog>
        <Dialog><DialogTrigger asChild><Button size="sm" variant="outline"><Ban className="size-4 mr-1" />Suspend</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Suspend License</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Days</Label><Input type="number" value={days} onChange={e => setDays(e.target.value)} /></div>
              <div><Label>Reason</Label><Textarea value={reason} onChange={e => setReason(e.target.value)} /></div>
              <Button className="w-full" onClick={() => onSuspend(l, days, reason)}>Submit</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}
