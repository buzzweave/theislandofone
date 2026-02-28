import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Film, Loader2, Clock, Shield } from "lucide-react";

interface RenderControlsProps {
  onRender: () => void;
  disabled: boolean;
  isProcessing: boolean;
}

const COOLDOWN_SECONDS = 30;

export default function RenderControls({ onRender, disabled, isProcessing }: RenderControlsProps) {
  const [previewUsed, setPreviewUsed] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [creditUsed, setCreditUsed] = useState(false);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRender = useCallback(() => {
    if (cooldown > 0 || disabled || isProcessing) return;

    // First render is a preview (no credit)
    if (!previewUsed) {
      setPreviewUsed(true);
      setCooldown(COOLDOWN_SECONDS);
      onRender();
      return;
    }

    // Final export uses 1 credit
    setCreditUsed(true);
    setCooldown(COOLDOWN_SECONDS);
    onRender();
  }, [cooldown, disabled, isProcessing, previewUsed, onRender]);

  const buttonLabel = isProcessing
    ? "Processing…"
    : cooldown > 0
    ? `Cooldown ${cooldown}s`
    : !previewUsed
    ? "Preview Render"
    : "Final Export (1 Credit)";

  return (
    <div className="space-y-2">
      <Button
        className="w-full gap-2 h-12 text-base"
        size="lg"
        onClick={handleRender}
        disabled={disabled || isProcessing || cooldown > 0}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : cooldown > 0 ? (
          <Clock className="h-4 w-4" />
        ) : (
          <Film className="h-4 w-4" />
        )}
        {buttonLabel}
      </Button>

      <Card className="border-muted">
        <CardContent className="pt-3 pb-3">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Shield className="h-3 w-3 shrink-0" />
            <span>
              1 credit per final export only. Music changes, volume adjustments, and text toggles are free.
              {previewUsed && !creditUsed && (
                <Badge variant="outline" className="ml-1.5 text-[9px]">Preview used</Badge>
              )}
              {creditUsed && (
                <Badge variant="secondary" className="ml-1.5 text-[9px]">1 credit consumed</Badge>
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
