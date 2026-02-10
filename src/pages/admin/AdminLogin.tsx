import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import MathCaptcha from "@/components/admin/MathCaptcha";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

export default function AdminLogin() {
  const { login, isAuthenticated, isLoading, failedAttempts, isLocked, lockoutEnd } = useAdminAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [error, setError] = useState("");
  const [lockCountdown, setLockCountdown] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already authed
  useEffect(() => {
    if (isAuthenticated) navigate("/admin", { replace: true });
  }, [isAuthenticated, navigate]);

  // Lockout countdown timer
  useEffect(() => {
    if (!isLocked || !lockoutEnd) return;
    const interval = setInterval(() => {
      const remaining = lockoutEnd - Date.now();
      if (remaining <= 0) {
        setLockCountdown("");
        clearInterval(interval);
        window.location.reload();
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setLockCountdown(`${mins}:${secs.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLocked, lockoutEnd]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("All fields are required.");
      return;
    }

    if (!captchaVerified) {
      setError("Please complete the security check.");
      return;
    }

    setSubmitting(true);
    const success = await login(email.trim(), password);
    setSubmitting(false);

    if (success) {
      navigate("/admin", { replace: true });
    } else {
      setError("Invalid credentials or insufficient permissions.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border shadow-gold">
        <CardHeader className="text-center space-y-1">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-display text-2xl">Admin Sign In</CardTitle>
          <CardDescription>The Island of One Ministries</CardDescription>
        </CardHeader>

        <CardContent>
          {isLocked ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <ShieldAlert className="h-7 w-7 text-destructive" />
              </div>
              <p className="text-sm text-destructive font-medium">
                Too many failed attempts. Account locked.
              </p>
              <p className="text-xs text-muted-foreground">
                Try again in{" "}
                <span className="font-mono text-foreground">{lockCountdown || "..."}</span>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter admin email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* CAPTCHA */}
              <MathCaptcha onVerified={setCaptchaVerified} />

              {error && (
                <p className="text-sm text-destructive flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {error}
                  {failedAttempts > 0 && failedAttempts < 5 && (
                    <span className="text-muted-foreground ml-auto text-xs">
                      {5 - failedAttempts} attempts left
                    </span>
                  )}
                </p>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Sign In
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
