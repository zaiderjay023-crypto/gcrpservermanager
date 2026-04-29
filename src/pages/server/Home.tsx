import { useServer } from "@/contexts/ServerContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, FileText, Users, AlertTriangle } from "lucide-react";

export default function ServerHome() {
  const { server, role } = useServer();
  const { user } = useAuth();
  const [stats, setStats] = useState({ licenses: 0, pending: 0, fines: 0, wanted: 0 });

  useEffect(() => {
    if (!server) return;
    (async () => {
      const [l, p, f, w] = await Promise.all([
        supabase.from("licenses").select("id", { count: "exact", head: true }).eq("server_id", server.id).eq("status", "approved"),
        supabase.from("licenses").select("id", { count: "exact", head: true }).eq("server_id", server.id).eq("status", "pending"),
        supabase.from("fines").select("id", { count: "exact", head: true }).eq("server_id", server.id).eq("status", "active"),
        supabase.from("wanted").select("id", { count: "exact", head: true }).eq("server_id", server.id).eq("status", "active"),
      ]);
      setStats({ licenses: l.count || 0, pending: p.count || 0, fines: f.count || 0, wanted: w.count || 0 });
    })();
  }, [server]);

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-4xl font-bold mb-2">Welcome to {server?.name}</h1>
        <p className="text-muted-foreground">You are signed in as <span className="text-foreground font-medium capitalize">{role}</span>.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: FileText, label: "Active Licenses", val: stats.licenses, color: "text-primary" },
          { icon: Shield, label: "Pending", val: stats.pending, color: "text-warning" },
          { icon: AlertTriangle, label: "Active Fines", val: stats.fines, color: "text-destructive" },
          { icon: Users, label: "Wanted", val: stats.wanted, color: "text-accent" },
        ].map((s, i) => (
          <Card key={i} className="p-5 glass animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <s.icon className={`size-5 mb-3 ${s.color}`} />
            <p className="text-3xl font-bold">{s.val}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
