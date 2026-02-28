import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, Loader2, CheckCircle2, AlertCircle, Mail, Lock, User } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function InviteRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, signIn, signUp, checkSubscription } = useAuth();

  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "accepted" | "already">("loading");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");

  // Set OG meta tags via useEffect
  useEffect(() => {
    document.title = "You're Invited to Join The Island of One!";
    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        if (property.startsWith("og:") || property.startsWith("fb:")) {
          el.setAttribute("property", property);
        } else {
          el.setAttribute("name", property);
        }
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const siteUrl = "https://theislandofone.lovable.app";
    setMeta("og:title", "You're Invited to Join The Island of One!");
    setMeta("og:description", "You've been personally invited to join with a FREE lifetime Inner Circle membership. Get full access to all books, sermons, videos, and exclusive content.");
    setMeta("og:image", `${siteUrl}/invite-og.jpg`);
    setMeta("og:url", `${siteUrl}/i/${code}`);
    setMeta("og:type", "website");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", "You're Invited to Join The Island of One!");
    setMeta("twitter:description", "You've been personally invited to join with a FREE lifetime Inner Circle membership.");
    setMeta("twitter:image", `${siteUrl}/invite-og.jpg`);
  }, [code]);

  // Validate invite code
  useEffect(() => {
    if (!code) {
      setStatus("invalid");
      return;
    }

    // Use the share-invite function to validate (it checks DB)
    const validate = async () => {
      try {
        const { data, error } = await supabase
          .from("invitations" as any)
          .select("email, status")
          .eq("invite_code", code)
          .maybeSingle();

        if (error || !data) {
          setStatus("invalid");
          return;
        }

        if ((data as any).status === "accepted") {
          setStatus("already");
          return;
        }

        setInviteEmail((data as any).email || "");
        setStatus("valid");
      } catch {
        setStatus("invalid");
      }
    };

    validate();
  }, [code]);

  // Auto-redeem if user is already logged in
  useEffect(() => {
    if (user && status === "valid" && code && !isRedeeming) {
      redeemInvite();
    }
  }, [user, status, code]);

  const redeemInvite = async () => {
    if (!code) return;
    setIsRedeeming(true);
    try {
      const { data, error } = await supabase.functions.invoke("redeem-invite", {
        body: { invite_code: code },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success("🎉 Welcome! You now have a free lifetime Inner Circle membership!");
      await checkSubscription();
      setStatus("accepted");
      setTimeout(() => navigate("/", { replace: true }), 2000);
    } catch (err: any) {
      toast.error(err.message || "Could not redeem invitation.");
      setStatus("invalid");
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Welcome back!");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    setIsSubmitting(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Check your email to confirm your account, then come back to this link.");
    }
  };

  if (status === "loading" || isRedeeming) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{isRedeeming ? "Activating your membership..." : "Verifying invitation..."}</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Invalid Invitation</h1>
          <p className="text-muted-foreground mb-6">This invitation link is invalid or has expired.</p>
          <Button onClick={() => navigate("/")}>Go to Homepage</Button>
        </div>
      </div>
    );
  }

  if (status === "already" || status === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">
            {status === "accepted" ? "Welcome to the Inner Circle!" : "Invitation Already Used"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {status === "accepted"
              ? "Your free lifetime membership is active. Enjoy full access to all content!"
              : "This invitation has already been accepted."}
          </p>
          <Button onClick={() => navigate("/")}>Continue to The Island of One</Button>
        </div>
      </div>
    );
  }

  // status === "valid" and user is not logged in
  return (
    <div className="min-h-screen flex items-center justify-center py-20 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Gift className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="font-display text-3xl font-bold">You're Invited!</h1>
          <p className="text-muted-foreground mt-2">
            Sign up or sign in to claim your <strong>free lifetime Inner Circle membership</strong>.
          </p>
          {inviteEmail && (
            <p className="text-xs text-muted-foreground mt-2">
              This invitation was sent to <strong>{inviteEmail}</strong>
            </p>
          )}
        </div>

        <Card>
          <Tabs defaultValue="signup">
            <CardHeader className="pb-2">
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="flex-1">Create Account</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="invite-login-email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-login-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="invite-login-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Signing in…" : "Sign In & Claim Access"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-signup-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="invite-signup-name"
                        type="text"
                        placeholder="Your name"
                        className="pl-10"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="invite-signup-email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10"
                        value={signupEmail || inviteEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="invite-signup-password"
                        type="password"
                        placeholder="At least 6 characters"
                        className="pl-10"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Creating account…" : "Create Account"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    You'll receive an email to confirm your account. Return to this link after confirming.
                  </p>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to The Island of One
          </a>
        </div>
      </div>
    </div>
  );
}
