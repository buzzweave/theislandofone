import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudioPaymentSuccess() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [provisioning, setProvisioning] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    provisionWorkspace();
  }, [user]);

  const provisionWorkspace = async () => {
    const studioName = searchParams.get("studio_name") || "My Writing Studio";
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("provision-workspace", {
        body: { studioName },
      });
      if (fnErr) throw new Error(fnErr.message);
      setProvisioning(false);
      // Auto-redirect after 2s
      setTimeout(() => navigate("/studio/dashboard"), 2000);
    } catch (e: any) {
      setError(e.message);
      setProvisioning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        {provisioning ? (
          <>
            <div className="animate-pulse text-primary text-lg mb-4">Setting up your studio…</div>
            <p className="text-muted-foreground text-sm">Creating your workspace, seeding sample content, and preparing your writing environment.</p>
          </>
        ) : error ? (
          <>
            <p className="text-destructive font-semibold mb-4">Something went wrong</p>
            <p className="text-muted-foreground text-sm mb-6">{error}</p>
            <Link to="/studio/dashboard"><Button className="bg-primary text-primary-foreground">Go to Dashboard</Button></Link>
          </>
        ) : (
          <>
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Your Studio is Ready!</h2>
            <p className="text-muted-foreground mb-6">Redirecting to your writing dashboard…</p>
            <Link to="/studio/dashboard"><Button className="bg-primary text-primary-foreground">Go to Dashboard</Button></Link>
          </>
        )}
      </div>
    </div>
  );
}
