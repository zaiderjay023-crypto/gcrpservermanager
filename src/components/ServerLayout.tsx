import { Link, useParams, Outlet, useLocation } from "react-router-dom";
import { useServer } from "@/contexts/ServerContext";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Crown, Users, FileText, Home, Settings, ScrollText, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ServerLayout() {
  const { server, role } = useServer();
  const { profile, signOut } = useAuth();
  const { slug } = useParams();
  const loc = useLocation();
  if (!server) return null;

  const base = `/s/${slug}`;
  const nav = [
    { to: base, icon: Home, label: "Home", show: true, end: true },
    { to: `${base}/register`, icon: FileText, label: "My License", show: role === "citizen" || role === "police" || role === "staff" },
    { to: `${base}/police`, icon: Shield, label: "Police Panel", show: role === "police" || role === "staff" || role === "owner" },
    { to: `${base}/staff`, icon: Users, label: "Staff Panel", show: role === "staff" || role === "owner" },
    { to: `${base}/owner`, icon: Crown, label: "Owner Panel", show: role === "owner" },
    { to: `${base}/audit`, icon: ScrollText, label: "Audit Log", show: role === "owner" || role === "staff" },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 glass border-r border-border/50 flex flex-col">
        <div className="p-5 border-b border-border/50">
          <Link to="/servers" className="flex items-center gap-3">
            {server.logo_url ? <img src={server.logo_url} className="size-10 rounded-lg" /> : <div className="size-10 rounded-lg bg-gradient-primary" />}
            <div className="min-w-0">
              <p className="font-semibold truncate">{server.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.filter(n => n.show).map(n => {
            const active = n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <n.icon className="size-4" />{n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border/50">
          <div className="flex items-center gap-2 px-2 py-2">
            {profile?.discord_avatar && <img src={profile.discord_avatar} className="size-8 rounded-full" />}
            <div className="flex-1 min-w-0 text-xs">
              <p className="truncate font-medium">{profile?.discord_username}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={signOut}><LogOut className="size-4" /></Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto"><div className="container py-8 max-w-6xl"><Outlet /></div></main>
    </div>
  );
}
