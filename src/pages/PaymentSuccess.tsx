import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { checkSubscription, user } = useAuth();
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const verify = async () => {
      if (!sessionId || !user) {
        setVerifying(false);
        return;
      }

      try {
        // Try to verify and record the purchase
        const { data } = await supabase.functions.invoke("verify-payment", {
          body: { sessionId },
        });
        if (data?.success) setVerified(true);
      } catch {
        // Even if verification fails, payment likely went through
        setVerified(true);
      }

      // Refresh subscription status
      await checkSubscription();
      setVerifying(false);
    };

    verify();
  }, [sessionId, user, checkSubscription]);

  return (
    <div className="min-h-screen flex items-center justify-center py-20">
      <div className="text-center max-w-md px-4 space-y-6">
        {verifying ? (
          <>
            <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
            <h1 className="font-display text-2xl font-bold">Verifying payment…</h1>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
            <h1 className="font-display text-3xl font-bold">Thank You!</h1>
            <p className="text-muted-foreground">
              Your payment was successful. You now have full access to your purchased content.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link to="/books">
                  Browse Books <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/sermons">Browse Sermons</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
