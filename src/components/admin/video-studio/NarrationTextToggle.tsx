import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Type, EyeOff } from "lucide-react";

interface NarrationTextToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export default function NarrationTextToggle({ enabled, onChange }: NarrationTextToggleProps) {
  return (
    <Card className="border-blue-500/30">
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {enabled ? <Type className="h-4 w-4 text-blue-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
            <Label className="font-medium text-sm">Display On-Screen Narration Text</Label>
          </div>
          <Switch checked={enabled} onCheckedChange={onChange} />
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          {enabled
            ? "Cinematic animated text overlays will be synced with narration."
            : "Video will render with visuals + narration + music only. No captions, subtitles, or on-screen text."}
        </p>
      </CardContent>
    </Card>
  );
}
