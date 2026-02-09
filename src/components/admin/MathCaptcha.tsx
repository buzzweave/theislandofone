import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShieldCheck } from "lucide-react";

interface MathCaptchaProps {
  onVerified: (verified: boolean) => void;
}

function generateChallenge() {
  const ops = ["+", "−", "×"] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  switch (op) {
    case "+":
      a = Math.floor(Math.random() * 50) + 1;
      b = Math.floor(Math.random() * 50) + 1;
      answer = a + b;
      break;
    case "−":
      a = Math.floor(Math.random() * 50) + 10;
      b = Math.floor(Math.random() * a);
      answer = a - b;
      break;
    case "×":
      a = Math.floor(Math.random() * 12) + 1;
      b = Math.floor(Math.random() * 12) + 1;
      answer = a * b;
      break;
  }

  return { question: `${a} ${op} ${b}`, answer: answer! };
}

export default function MathCaptcha({ onVerified }: MathCaptchaProps) {
  const [challenge, setChallenge] = useState(generateChallenge);
  const [userAnswer, setUserAnswer] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(() => {
    setChallenge(generateChallenge());
    setUserAnswer("");
    setVerified(false);
    setError(false);
    onVerified(false);
  }, [onVerified]);

  useEffect(() => {
    onVerified(verified);
  }, [verified, onVerified]);

  const handleVerify = () => {
    const parsed = parseInt(userAnswer, 10);
    if (parsed === challenge.answer) {
      setVerified(true);
      setError(false);
    } else {
      setError(true);
      setVerified(false);
      // Generate new challenge after failed attempt
      setTimeout(() => {
        refresh();
      }, 1200);
    }
  };

  if (verified) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
        <ShieldCheck className="h-4 w-4" />
        Verified
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">
        Security Check — Solve to continue
      </label>
      <div className="flex items-center gap-2">
        <span className="rounded bg-secondary px-3 py-2 font-mono text-sm text-foreground tracking-wider select-none">
          {challenge.question} = ?
        </span>
        <Input
          type="number"
          value={userAnswer}
          onChange={(e) => {
            setUserAnswer(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          className="w-24"
          placeholder="Answer"
        />
        <Button type="button" variant="outline" size="icon" onClick={refresh} title="New challenge">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={handleVerify}>
          Check
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive">Incorrect answer. Generating new challenge…</p>
      )}
    </div>
  );
}
