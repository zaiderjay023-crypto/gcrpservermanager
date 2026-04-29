import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { discordApi } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Connecting your Discord account…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const code = params.get("code");
    if (!code) { navigate("/"); return; }
    (async () => {
      try {
        const result = await discordApi.login(code, `${window.location.origin}/auth/callback`);
        if (result?.session) {
          await supabase.auth.setSession({ access_token: result.session.access_token, refresh_token: result.session.refresh_token });
          setMsg("Loading your servers…");
          navigate("/servers", { replace: true });
        } else throw new Error("No session returned");
      } catch (e: any) {
        console.error(e);
        toast.error("Login failed: " + e.message);
        navigate("/", { replace: true });
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="size-10 animate-spin text-primary" />
      <p className="text-muted-foreground">{msg}</p>
    </div>
  );
}
