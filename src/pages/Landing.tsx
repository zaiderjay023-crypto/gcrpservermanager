import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getDiscordOAuthUrl } from "@/lib/api";
import { Shield, Users, Zap, Crown, FileCheck, Bot } from "lucide-react";

const DiscordIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.956 2.419-2.157 2.419zm7.974 0c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419z"/></svg>
);

const LogoMark = () => (
  <div className="size-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-elegant">
    <Shield className="size-8 text-primary-foreground" />
  </div>
);

export default function Landing() {
  const { user } = useAuth();
  const [introDone, setIntroDone] = useState(false);
  const handleLogin = async () => { window.location.href = await getDiscordOAuthUrl(); };

  useEffect(() => {
    if (sessionStorage.getItem("logo-intro-seen")) { setIntroDone(true); return; }
    const t = setTimeout(() => {
      sessionStorage.setItem("logo-intro-seen", "1");
      setIntroDone(true);
    }, 2300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {!introDone && (
        <div className="logo-intro" aria-hidden>
          <LogoMark />
        </div>
      )}

      {/* nav */}
      <nav className="container flex items-center justify-between py-4 sm:py-6 relative z-10 gap-3">
        <div className={`flex items-center gap-2 font-bold text-lg sm:text-xl transition-opacity duration-300 ${introDone ? "opacity-100" : "opacity-0"}`}>
          <div className="size-9 rounded-lg bg-gradient-primary flex items-center justify-center shadow-elegant">
            <Shield className="size-5 text-primary-foreground" />
          </div>
          <span>RolePlay<span className="gradient-text">Hub</span></span>
        </div>
        {user ? (
          <Link to="/servers"><Button variant="default" size="sm" className="sm:h-10 sm:px-4">Open Dashboard</Button></Link>
        ) : (
          <Button onClick={handleLogin} size="sm" className="bg-[#5865F2] hover:bg-[#5865F2]/90 text-white sm:h-10 sm:px-4">
            <DiscordIcon className="size-4 sm:mr-2" />
            <span className="hidden sm:inline">Login with Discord</span>
          </Button>
        )}
      </nav>

      {/* hero */}
      <section className="container py-20 md:py-32 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-8 animate-fade-up">
          <span className="size-2 rounded-full bg-success animate-pulse-glow" />
          <span className="text-sm text-muted-foreground">Live multi-server roleplay management</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          The premium hub for<br /><span className="gradient-text">Discord roleplay servers</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          Authenticate with Discord, register citizens, issue licenses, manage police actions — all from one beautifully crafted control panel that syncs live with your server roles.
        </p>
        <div className="flex flex-wrap justify-center gap-4 animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <Button size="lg" onClick={handleLogin} className="bg-[#5865F2] hover:bg-[#5865F2]/90 text-white glow-on-hover px-8 h-12">
            <DiscordIcon className="size-5 mr-2" />Get Started with Discord
          </Button>
        </div>
      </section>

      {/* features */}
      <section className="container py-20 grid md:grid-cols-3 gap-6 relative z-10">
        {[
          { icon: Crown, title: "Owner Panel", desc: "Register your server, upload your logo, design license templates, configure channels and bot messages — total control." },
          { icon: Shield, title: "Police Panel", desc: "Approve registrations, issue fines, mark wanted, suspend licenses. Permissions live-synced with Discord roles." },
          { icon: Users, title: "Staff Panel", desc: "Moderate police and citizens. Audit log shows every action — owners see all, staff see the rest." },
          { icon: FileCheck, title: "Auto Licenses", desc: "On approval, the bot DMs the citizen a custom-generated license image and posts it in your police channel." },
          { icon: Bot, title: "Bot Sync", desc: "When members are kicked or banned in Discord, their license, role, and access are automatically removed from the website." },
          { icon: Zap, title: "Multi-Server", desc: "Run unlimited roleplay servers from one account. Switch in seconds, no friction, no interruption." },
        ].map((f, i) => (
          <div key={i} className="group rounded-2xl glass p-6 glow-on-hover animate-fade-up" style={{ animationDelay: `${0.1 * i}s` }}>
            <div className="size-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 shadow-elegant group-hover:scale-110 transition-transform">
              <f.icon className="size-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="container py-10 text-center text-sm text-muted-foreground border-t border-border/50">
        Built for premium Discord roleplay communities.
      </footer>
    </div>
  );
}
