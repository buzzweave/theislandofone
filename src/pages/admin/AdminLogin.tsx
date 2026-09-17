import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Lock, Eye, EyeOff, Loader2, ArrowLeft, Mail, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

function generateCaptcha() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return {
    question: `${a} + ${b} = ?`,
    answer: a + b,
  };
}

export default function AdminLogin() {
  const { login, forgotPassword, isAuthenticated, isLoading, failedAttempts, isLocked, lockoutEnd } = useAdminAuth();

  const navigate = useNavigate();
  const { toast } = useToast();

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [lockCountdown, setLockCountdown] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Password reset state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // CAPTCHA
  const [captcha, setCaptcha] = useState(() => generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");

  // Redirect authenticated admin
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/admin", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Lockout countdown
  useEffect(() => {
    if (!isLocked || !lockoutEnd) return;

    const updateCountdown = () => {
      const remaining = lockoutEnd - Date.now();

      if (remaining <= 0) {
        setLockCountdown("");
        window.location.reload();
        return;
      }

      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);

      setLockCountdown(`${mins}:${secs.toString().padStart(2, "0")}`);
    };

    updateCountdown();

    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [isLocked, lockoutEnd]);

  // Normal admin login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("All fields are required.");
      return;
    }

    if (parseInt(captchaInput, 10) !== captcha.answer) {
      setError("Incorrect security answer. Please try again.");
      setCaptcha(generateCaptcha());
      setCaptchaInput("");
      return;
    }

    setSubmitting(true);

    try {
      const success = await login(email.trim(), password);

      if (success) {
        navigate("/admin", { replace: true });
        return;
      }

      setError("Invalid credentials or insufficient permissions.");
      setCaptcha(generateCaptcha());
      setCaptchaInput("");
    } catch (err) {
      console.error("Admin login failed:", err);
      setError("Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Send six-digit password reset code
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = resetEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    setError("");
    setResetSending(true);

    try {
      const success = await forgotPassword(cleanEmail);

      if (!success) {
        setError("Failed to send verification code. Please try again.");
        return;
      }

      // IMPORTANT:
      // Immediately switch to the code-entry screen.
      setResetEmail(cleanEmail);
      setResetCode("");
      setNewPassword("");
      setConfirmPassword("");
      setResetSent(true);
      setError("");

      toast({
        title: "Verification code sent",
        description: `Enter the six-digit code sent to ${cleanEmail}.`,
      });
    } catch (err) {
      console.error("Password reset request failed:", err);

      setError("Failed to send verification code. Please try again.");
    } finally {
      setResetSending(false);
    }
  };

  // Verify six-digit recovery code and change password
  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = resetEmail.trim().toLowerCase();
    const cleanCode = resetCode.trim();

    if (!cleanEmail) {
      setError("Email address is missing. Request a new code.");
      return;
    }

    if (!/^\d{6}$/.test(cleanCode)) {
      setError("Enter the six-digit code from your email.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least six characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setResetSending(true);

    try {
      // Verify Supabase recovery OTP
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: "recovery",
      });

      if (verifyError) {
        console.error("Recovery code verification failed:", verifyError);

        setError(verifyError.message || "The code is invalid or expired. Request a new code.");

        return;
      }

      if (!data.session) {
        setError("Verification succeeded but no recovery session was created. Please request a new code.");
        return;
      }

      // Recovery OTP creates an authenticated recovery session.
      // Use that session to update the password.
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error("Admin password update failed:", updateError);

        setError(updateError.message || "Unable to update the password.");

        return;
      }

      // End recovery session so user signs in normally.
      await supabase.auth.signOut();

      setResetCode("");
      setNewPassword("");
      setConfirmPassword("");
      setResetSent(false);
      setShowForgotPassword(false);
      setPassword("");
      setEmail(cleanEmail);
      setError("");

      toast({
        title: "Password updated",
        description: "Your admin password has been changed. Sign in with your new password.",
      });
    } catch (err: any) {
      console.error("Password reset verification failed:", err);

      setError(err?.message || "Unable to verify the code. Please try again.");
    } finally {
      setResetSending(false);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border shadow-gold">
        <CardHeader className="text-center space-y-1">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {showForgotPassword ? (
              resetSent ? (
                <KeyRound className="h-6 w-6 text-primary" />
              ) : (
                <Mail className="h-6 w-6 text-primary" />
              )
            ) : (
              <Lock className="h-6 w-6 text-primary" />
            )}
          </div>

          <CardTitle className="font-display text-2xl">
            {showForgotPassword ? (resetSent ? "Enter Verification Code" : "Reset Password") : "Admin Sign In"}
          </CardTitle>

          <CardDescription>The Island of One Ministries</CardDescription>
        </CardHeader>

        <CardContent>
          {isLocked ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <ShieldAlert className="h-7 w-7 text-destructive" />
              </div>

              <p className="text-sm text-destructive font-medium">Too many failed attempts. Account locked.</p>

              <p className="text-xs text-muted-foreground">
                Try again in <span className="font-mono text-foreground">{lockCountdown || "..."}</span>
              </p>
            </div>
          ) : showForgotPassword ? (
            resetSent ? (
              // SIX-DIGIT CODE SCREEN
              <form onSubmit={handleVerifyReset} className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4 text-center">
                  <p className="text-sm font-medium">Verification code sent</p>

                  <p className="mt-1 text-xs text-muted-foreground">We sent a six-digit code to</p>

                  <p className="mt-1 text-sm font-semibold break-all">{resetEmail}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset-code">Six-Digit Verification Code</Label>

                  <Input
                    id="reset-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    autoFocus
                  />

                  <p className="text-xs text-muted-foreground text-center">Enter the six digits from your email.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-admin-password">New Admin Password</Label>

                  <Input
                    id="new-admin-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-admin-password">Confirm New Password</Label>

                  <Input
                    id="confirm-admin-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive flex items-start gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={
                    resetSending || resetCode.length !== 6 || newPassword.length < 6 || confirmPassword.length < 6
                  }
                >
                  {resetSending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <KeyRound className="h-4 w-4 mr-2" />
                  )}
                  Verify Code & Update Password
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={resetSending}
                  onClick={() => {
                    setResetSent(false);
                    setResetCode("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setError("");
                  }}
                >
                  Request a New Code
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => {
                    setResetSent(false);
                    setShowForgotPassword(false);
                    setResetCode("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setError("");
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </form>
            ) : (
              // REQUEST RESET CODE SCREEN
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter your admin email and we'll send you a six-digit verification code.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="reset-email">Admin Email</Label>

                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter admin email"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive flex items-start gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </p>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={resetSending || !resetEmail.trim()}>
                  {resetSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Send Verification Code
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (!resetEmail.trim()) {
                      setError("Enter the email address that received the code.");
                      return;
                    }

                    setError("");
                    setResetSent(true);
                  }}
                >
                  I Already Have a Code
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSent(false);
                    setResetCode("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setError("");
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </form>
            )
          ) : (
            // NORMAL ADMIN LOGIN
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
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="captcha">Security Check: {captcha.question}</Label>

                <Input
                  id="captcha"
                  type="text"
                  inputMode="numeric"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  placeholder="Enter your answer"
                  autoComplete="off"
                />
              </div>

              {error && (
                <div className="flex items-start gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />

                  <p className="text-sm text-destructive flex-1">{error}</p>

                  {failedAttempts > 0 && failedAttempts < 5 && (
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      {5 - failedAttempts} attempts left
                    </span>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Sign In
              </Button>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  setResetSent(false);
                  setError("");
                  setResetEmail(email.trim());
                  setResetCode("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Forgot your password?
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
