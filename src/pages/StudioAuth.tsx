import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import studioLogo from "@/assets/studio-logo.jpeg";

export default function StudioAuth() {
  const [searchParams] = useSearchParams();
  const isSignup = searchParams.get("mode") === "signup";
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "signup">(isSignup ? "signup" : "login");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [studioName, setStudioName] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      return;
    }
    navigate("/studio/dashboard");
  };

  const handleSignup = async () => {
    if (!fullName.trim() || !studioName.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/studio/dashboard`,
        data: { full_name: fullName },
      },
    });
    if (error) {
      setLoading(false);
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      return;
    }

    // Provision workspace immediately (free signup) then redirect to dashboard
    try {
      const { data: provData, error: provErr } = await supabase.functions.invoke("provision-workspace", {
        body: { studioName },
      });
      if (provErr) throw new Error(provErr.message);
      setLoading(false);
      navigate("/studio/dashboard");
      return;
    } catch (e: any) {
      toast({ title: "Setup failed", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") handleLogin();
    else handleSignup();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/studio" className="inline-flex flex-col items-center gap-2">
            <img src={studioLogo} alt="Island of One" className="h-16 w-16 rounded-full object-cover" />
          </Link>
          <p className="text-muted-foreground text-sm mt-1">A Book Writer Studio</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8">
          <h2 className="text-xl font-bold mb-6 text-center">
            {mode === "login" ? "Log in to your studio" : "Create your writing studio"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="studioName">Studio Name</Label>
                  <Input id="studioName" placeholder="e.g. John Smith Studio" value={studioName} onChange={(e) => setStudioName(e.target.value)} required />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground" disabled={loading}>
              {loading ? "Please wait…" : mode === "login" ? "Log In" : "Start Your Free Studio"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {mode === "login" ? (
              <>Don't have a studio? <button onClick={() => setMode("signup")} className="text-primary hover:underline">Sign up</button></>
            ) : (
              <>Already have a studio? <button onClick={() => setMode("login")} className="text-primary hover:underline">Log in</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
