import { useEffect, useState } from "react";
import { useServer } from "@/contexts/ServerContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Audit() {
  const { server } = useServer();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!server) return;
    supabase.from("audit_log").select("*").eq("server_id", server.id).order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => { setLogs(data || []); setLoading(false); });
  }, [server]);

  if (loading) return <Loader2 className="animate-spin" />;
  return (
    <div className="space-y-4 animate-fade-up">
      <h1 className="text-3xl font-bold">Audit Log</h1>
      <p className="text-sm text-muted-foreground">Owners see all entries. Staff see all entries except those performed by the owner.</p>
      <div className="space-y-2">
        {logs.map(l => (
          <Card key={l.id} className="p-3 glass text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium capitalize">{l.action.replace(/_/g, " ")}</span>
              <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">role: <span className="capitalize">{l.actor_role || "system"}</span> · {Object.keys(l.details || {}).length > 0 && <code className="text-xs">{JSON.stringify(l.details)}</code>}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
