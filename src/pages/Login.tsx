import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Crown, Mail, Loader2, ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";

type Step = "email" | "code" | "paywall";

export default function Login() {
  const navigate = useNavigate();
  const { checkSubscription } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email."); return; }
    setError("");
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("request-login-code", {
        body: { email: email.trim() },
      });
      if (fnError) throw fnError;

      if (data?.error === "no_access") {
        setStep("paywall");
      } else if (data?.success) {
        setStep("code");
      } else {
        setError(data?.message || "Something went wrong.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { setError("Please enter the full 6-character code."); return; }
    setError("");
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("verify-login-code", {
        body: { email: email.trim(), code },
      });
      if (fnError) throw fnError;

      if (data?.error) {
        setError(data.message || "Invalid code.");
        setLoading(false);
        return;
      }

      if (data?.token_hash) {
        // Use Supabase to verify the token hash and establish session
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: "magiclink",
          token_hash: data.token_hash,
        });
        if (verifyError) throw verifyError;
      } else if (data?.action_link) {
        // Fallback: redirect to action link
        window.location.href = data.action_link;
        return;
      }

      await checkSubscription();
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err.message || "Failed to verify code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-20">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <Crown className="h-10 w-10 text-primary mx-auto mb-3" />
          <h1 className="font-display text-3xl font-bold">Sign In</h1>
          <p className="text-muted-foreground text-sm mt-1">
            The Island of One Ministries
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {step === "email" && (
              <form onSubmit={handleRequestCode} className="space-y-5">
                <CardDescription className="text-center">
                  Enter your email to receive a login code, or enter your lifetime access code below.
                </CardDescription>
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Send Login Code
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (!email.trim()) {
                        setError("Please enter your email first.");
                        return;
                      }
                      setError("");
                      setStep("code");
                    }}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Already have a code? Enter it here
                  </button>
                </div>
              </form>
            )}

            {step === "code" && (
              <form onSubmit={handleVerifyCode} className="space-y-5">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <KeyRound className="h-6 w-6 text-primary" />
                  </div>
                  <CardDescription>
                    Enter your 6-digit login code or lifetime access code.
                  </CardDescription>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code-email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="code-email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>6-Character Code</Label>
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={code} onChange={setCode} inputMode="text" pattern="^[a-zA-Z0-9]+$">
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
                {error && <p className="text-sm text-destructive text-center">{error}</p>}
                <Button type="submit" className="w-full" size="lg" disabled={loading || code.length !== 6 || !email.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                  Verify & Sign In
                </Button>
                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => { setStep("email"); setCode(""); setError(""); }}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestCode}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    disabled={loading || !email.trim()}
                  >
                    Send me a code
                  </button>
                </div>
              </form>
            )}

            {step === "paywall" && (
              <div className="space-y-5 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Crown className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="font-display text-xl font-semibold">Membership Required</h3>
                <p className="text-muted-foreground text-sm">
                  No active subscription found for <strong>{email}</strong>. Subscribe to access all content and features.
                </p>
                <Button asChild className="w-full" size="lg">
                  <Link to="/membership">View Membership Plans</Link>
                </Button>
                <div className="space-y-2">
                  <Link to="/redeem" className="block text-sm text-primary hover:text-primary/80 transition-colors font-medium">
                    Have a lifetime access code? Redeem it here
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setStep("email"); setError(""); }}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mx-auto"
                  >
                    <ArrowLeft className="h-3 w-3" /> Try different email
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
