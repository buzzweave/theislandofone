import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { KeyRound, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function RedeemCode() {
  const { user, checkSubscription } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [error, setError] = useState("");

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center py-20">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <KeyRound className="h-10 w-10 text-primary mx-auto" />
            <h2 className="font-display text-xl font-semibold">Sign In Required</h2>
            <p className="text-muted-foreground text-sm">
              Please sign in first, then redeem your access code.
            </p>
            <Button asChild className="w-full">
              <Link to="/auth" state={{ from: "/redeem" }}>Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { setError("Please enter an access code."); return; }
    setError("");
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("redeem-access-code", {
        body: { code: code.trim() },
      });
      if (fnError) throw fnError;
      if (data?.error) { setError(data.error); setLoading(false); return; }

      setRedeemed(true);
      await checkSubscription();
      toast.success("Access code redeemed! You now have lifetime access.");
    } catch (err: any) {
      setError(err.message || "Failed to redeem code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-20">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <KeyRound className="h-10 w-10 text-primary mx-auto mb-3" />
          <h1 className="font-display text-3xl font-bold">Redeem Access Code</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enter your lifetime access code to unlock your membership.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {redeemed ? (
              <div className="text-center space-y-4 py-4">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                <h3 className="font-display text-xl font-semibold">Code Redeemed!</h3>
                <p className="text-muted-foreground text-sm">
                  Your lifetime access has been activated. Enjoy your membership!
                </p>
                <Button onClick={() => navigate("/")} className="w-full">
                  Go to Home
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRedeem} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="access-code">Access Code</Label>
                  <Input
                    id="access-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter your access code"
                    autoFocus
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Redeem Code
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
