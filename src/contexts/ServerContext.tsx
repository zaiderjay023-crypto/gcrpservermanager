import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { discordApi } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface ServerData {
  id: string; guild_id: string; name: string; logo_url: string | null; slug: string;
  owner_user_id: string; license_channel_id: string | null; fines_channel_id: string | null;
  wanted_channel_id: string | null; suspensions_channel_id: string | null;
  license_dm_message: string; fine_dm_message: string; wanted_dm_message: string; suspension_dm_message: string;
  license_template: any;
}
interface Permission { discord_role_id: string; action: string; mode: "direct" | "request"; panel: string; }

interface Ctx {
  server: ServerData | null;
  role: "owner" | "staff" | "police" | "citizen" | null;
  discordRoles: string[];
  perms: Permission[];
  can: (action: string) => "direct" | "request" | "no";
  refresh: () => Promise<void>;
}
const C = createContext<Ctx>({ server: null, role: null, discordRoles: [], perms: [], can: () => "no", refresh: async () => {} });
export const useServer = () => useContext(C);

export const ServerProvider = ({ children }: { children: ReactNode }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [server, setServer] = useState<ServerData | null>(null);
  const [role, setRole] = useState<Ctx["role"]>(null);
  const [discordRoles, setDiscordRoles] = useState<string[]>([]);
  const [perms, setPerms] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user || !slug) return;
    const { data: s } = await supabase.from("servers").select("*").eq("slug", slug).maybeSingle();
    if (!s) { navigate("/servers"); return; }
    setServer(s as any);
    const { data: m } = await supabase.from("server_members").select("role").eq("server_id", s.id).eq("user_id", user.id).maybeSingle();
    setRole((m?.role as any) ?? "citizen");
    const { data: p } = await supabase.from("server_role_permissions").select("*").eq("server_id", s.id);
    setPerms((p as any) ?? []);
    try {
      const r = await discordApi.memberRoles(s.guild_id);
      setDiscordRoles(r.roles ?? []);
    } catch (_) {}
  };

  useEffect(() => { if (authLoading) return; load().finally(() => setLoading(false)); }, [slug, user, authLoading]);

  const refresh = async () => { setLoading(true); await load(); setLoading(false); };

  const can = (action: string): "direct" | "request" | "no" => {
    if (role === "owner") return "direct";
    const matches = perms.filter(p => p.action === action && discordRoles.includes(p.discord_role_id));
    if (matches.some(m => m.mode === "direct")) return "direct";
    if (matches.some(m => m.mode === "request")) return "request";
    return "no";
  };

  if (loading || authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin size-8 text-primary" /></div>;
  return <C.Provider value={{ server, role, discordRoles, perms, can, refresh }}>{children}</C.Provider>;
};
