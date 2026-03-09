import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, FileText, Loader2, Save, Wand2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const DEFAULT_BOOK_PROMPT = `You are a Christian book author assistant. Generate a complete book outline with chapters. Return a JSON object with: title, subtitle, author (use "Bryant Clark"), description, and chapters (array of {title, content}). Each chapter should have substantial content (at least 500 words). Write in an engaging, faith-driven style.`;

const DEFAULT_SERMON_PROMPT = `You are a sermon writing assistant for a Christian ministry. Generate a complete sermon manuscript. Return a JSON object with: title, scripture, excerpt (2-3 sentence summary), manuscript (full sermon text with rich formatting), category (one of: Faith, Worship, Calling, Leadership, Deliverance, Prayer, Family). Write with passion and biblical depth.`;

export default function AdminOpenAIStudio() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [bookPrompt, setBookPrompt] = useState(DEFAULT_BOOK_PROMPT);
  const [sermonPrompt, setSermonPrompt] = useState(DEFAULT_SERMON_PROMPT);
  const [bookTopic, setBookTopic] = useState("");
  const [sermonTopic, setSermonTopic] = useState("");
  const [generating, setGenerating] = useState<"book" | "sermon" | null>(null);
  const [savedPrompts, setSavedPrompts] = useState(false);
  const [lastGeneratedSermonId, setLastGeneratedSermonId] = useState<string | null>(null);
  const [lastGeneratedBookId, setLastGeneratedBookId] = useState<string | null>(null);
  const [generationFailed, setGenerationFailed] = useState<{ type: string; topic: string } | null>(null);

  // Load saved prompts from site_settings
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["ai_book_prompt", "ai_sermon_prompt"]);
      if (data) {
        for (const row of data) {
          if (row.key === "ai_book_prompt" && row.value) setBookPrompt(row.value);
          if (row.key === "ai_sermon_prompt" && row.value) setSermonPrompt(row.value);
        }
      }
    })();
  }, []);

  const savePrompts = async () => {
    try {
      await supabase.from("site_settings").upsert([
        { key: "ai_book_prompt", value: bookPrompt },
        { key: "ai_sermon_prompt", value: sermonPrompt },
      ], { onConflict: "key" });
      setSavedPrompts(true);
      setTimeout(() => setSavedPrompts(false), 2000);
      toast({ title: "Prompts saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

  const generateDraft = async (type: "book" | "sermon") => {
    const topic = type === "book" ? bookTopic : sermonTopic;
    if (!topic.trim()) {
      toast({ title: "Enter a topic", variant: "destructive" });
      return;
    }

    setGenerating(type);
    setGenerationFailed(null);
    setLastGeneratedSermonId(null);
    setLastGeneratedBookId(null);
    const systemPrompt = type === "book" ? bookPrompt : sermonPrompt;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action: "generate_draft",
          draftType: type,
          systemPrompt,
          userPrompt: topic,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Generation failed");
      }

      const result = await resp.json();
      if (result.success) {
        // Invalidate caches so lists update immediately
        if (type === "sermon") {
          queryClient.invalidateQueries({ queryKey: ["sermons"] });
          setLastGeneratedSermonId(result.id);
        } else {
          queryClient.invalidateQueries({ queryKey: ["books"] });
          setLastGeneratedBookId(result.id);
        }

        toast({
          title: `${type === "book" ? "Book" : "Sermon"} draft created!`,
          description: `"${result.title}" has been saved as a draft and added to ${type === "book" ? "Books" : "Sermons"}.`,
        });

        if (type === "book") setBookTopic("");
        else setSermonTopic("");
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (err: any) {
      setGenerationFailed({ type, topic });
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold mb-1">OpenAI Studio</h2>
        <p className="text-sm text-muted-foreground">Configure AI prompts and generate book/sermon drafts.</p>
      </div>

      <Tabs defaultValue="generate" className="max-w-3xl">
        <TabsList>
          <TabsTrigger value="generate">Generate Drafts</TabsTrigger>
          <TabsTrigger value="prompts">System Prompts</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-4 space-y-6">
          {/* Book generation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Generate Book Draft
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Topic / Description</Label>
                <Textarea
                  value={bookTopic}
                  onChange={(e) => setBookTopic(e.target.value)}
                  placeholder="E.g., A devotional book about finding purpose through faith, 5 chapters covering identity, calling, perseverance, community, and legacy."
                  rows={3}
                />
              </div>
              <Button onClick={() => generateDraft("book")} disabled={generating !== null}>
                {generating === "book" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                Generate Book Draft
              </Button>
              <p className="text-xs text-muted-foreground">This will create a new unpublished book with AI-generated chapters.</p>
            </CardContent>
          </Card>

          {/* Sermon generation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" /> Generate Sermon Draft
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Topic / Scripture</Label>
                <Textarea
                  value={sermonTopic}
                  onChange={(e) => setSermonTopic(e.target.value)}
                  placeholder="E.g., A sermon on Romans 8:28 about God working all things for good, focusing on perseverance during trials."
                  rows={3}
                />
              </div>
              <Button onClick={() => generateDraft("sermon")} disabled={generating !== null}>
                {generating === "sermon" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                Generate Sermon Draft
              </Button>
              <p className="text-xs text-muted-foreground">This will create a new sermon draft with AI-generated manuscript.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts" className="mt-4 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Book Generation System Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea value={bookPrompt} onChange={(e) => setBookPrompt(e.target.value)} rows={6} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Sermon Generation System Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea value={sermonPrompt} onChange={(e) => setSermonPrompt(e.target.value)} rows={6} />
            </CardContent>
          </Card>

          <Button onClick={savePrompts}>
            <Save className="h-4 w-4 mr-2" /> {savedPrompts ? "Saved!" : "Save Prompts"}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
