import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image, Loader2, Wand2, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORIES = [
  "General",
  "Sermon Graphics",
  "Event Flyers",
  "Social Media",
  "Teaching Slides",
  "Kids Ministry",
  "AI Generated",
];

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-graphic`;

export default function AIGraphicGenerator() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("AI Generated");
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<{ id: string; title: string; preview_url: string } | null>(null);
  const [failedPrompt, setFailedPrompt] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Enter a prompt", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setLastGenerated(null);
    setFailedPrompt(null);

    try {
      const resp = await fetch(GENERATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ prompt, category }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Generation failed (${resp.status})`);
      }

      const result = await resp.json();
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["graphics"] });
        setLastGenerated({ id: result.id, title: result.title, preview_url: result.preview_url });
        setPrompt("");
        toast({
          title: "Graphic draft created and added to Graphics.",
          description: `"${result.title}" saved as a draft.`,
        });
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (err: any) {
      setFailedPrompt(prompt);
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Image className="h-4 w-4" /> Generate Graphic Draft
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Prompt / Description</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='E.g., a bold sermon series graphic about faith over fear with dark gold tones, cinematic clouds, and strong typography.'
            rows={3}
          />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
            {generating ? "Generating graphic draft…" : "Generate Graphic Draft"}
          </Button>
          {lastGenerated && (
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/graphics")}>
              <ExternalLink className="h-3 w-3 mr-1.5" /> Open in Graphics
            </Button>
          )}
          {failedPrompt && !generating && (
            <Button variant="destructive" size="sm" onClick={() => { setPrompt(failedPrompt); setFailedPrompt(null); handleGenerate(); }}>
              Retry
            </Button>
          )}
        </div>

        {lastGenerated && (
          <div className="mt-3 rounded-lg border border-border overflow-hidden">
            <img src={lastGenerated.preview_url} alt={lastGenerated.title} className="w-full max-h-64 object-contain bg-muted" />
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Saved as draft: <span className="font-medium text-foreground">{lastGenerated.title}</span>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">This will create a new draft graphic with AI-generated artwork and save it to Graphics.</p>
      </CardContent>
    </Card>
  );
}
