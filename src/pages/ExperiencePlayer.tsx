import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Loader2, ChevronLeft, ChevronRight, Volume2, VolumeX, X, Play, Pause, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
// document title handled via effect below
import { useExperienceBySlug } from "@/hooks/useExperiences";
import { useScenes } from "@/hooks/useExperienceScenes";
import { useInteractions, type ExperienceInteraction } from "@/hooks/useExperienceInteractions";
import { useCreatePrayerRequest } from "@/hooks/usePrayerRequests";
import { logExperienceEvent, upsertViewProgress } from "@/lib/experienceAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ExperiencePlayer() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: experience, isLoading } = useExperienceBySlug(slug);
  const { data: scenes = [] } = useScenes(experience?.id);
  const { data: interactions = [] } = useInteractions(experience?.id);

  const activeScenes = useMemo(() => scenes.filter((s) => s.enabled), [scenes]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedAt = useRef<number>(Date.now());
  const lastLogged = useRef<Record<string, boolean>>({});

  const scene = activeScenes[idx];
  const total = activeScenes.length;

  const next = useCallback(() => setIdx((i) => Math.min(total - 1, i + 1)), [total]);
  const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);

  // View start
  // Document title
  useEffect(() => {
    if (!experience) return;
    const prev = document.title;
    document.title = `${experience.title} · Immersive`;
    return () => { document.title = prev; };
  }, [experience?.title]);

  useEffect(() => {
    if (!experience) return;
    startedAt.current = Date.now();
    logExperienceEvent({ experienceId: experience.id, kind: "view_start" });
    return () => {
      if (experience) {
        upsertViewProgress({
          experienceId: experience.id,
          positionSeconds: Math.round((Date.now() - startedAt.current) / 1000),
          completed: idx >= total - 1,
        });
        logExperienceEvent({
          experienceId: experience.id,
          kind: "view_end",
          payload: { seconds: Math.round((Date.now() - startedAt.current) / 1000), completed: idx >= total - 1 },
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experience?.id]);

  // Log scene views
  useEffect(() => {
    if (!experience || !scene) return;
    if (!lastLogged.current[scene.id]) {
      lastLogged.current[scene.id] = true;
      logExperienceEvent({
        experienceId: experience.id,
        kind: "scene_view",
        payload: { scene_id: scene.id, index: idx },
      });
    }
    if (idx === total - 1 && total > 0) {
      logExperienceEvent({ experienceId: experience.id, kind: "complete" });
    }
  }, [scene?.id, experience?.id, idx, total]);

  // Elapsed timer
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [playing]);

  // Save progress periodically
  useEffect(() => {
    if (!experience) return;
    const t = setInterval(() => {
      upsertViewProgress({
        experienceId: experience.id,
        positionSeconds: Math.round((Date.now() - startedAt.current) / 1000),
      });
    }, 15000);
    return () => clearInterval(t);
  }, [experience?.id]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
      else if (e.key === "Escape") navigate("/");
      else if (e.key.toLowerCase() === "m") setMuted((m) => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, navigate]);

  // Ambient audio control
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = muted;
    if (playing) a.play().catch(() => {});
    else a.pause();
  }, [playing, muted, scene?.ambient_audio_url]);

  const sceneInteractions = useMemo(
    () => interactions.filter((i) => i.scene_id === scene?.id || i.scene_id == null),
    [interactions, scene?.id]
  );

  const [prayerFor, setPrayerFor] = useState<ExperienceInteraction | null>(null);
  const [prayerName, setPrayerName] = useState("");
  const [prayerContact, setPrayerContact] = useState("");
  const [prayerMsg, setPrayerMsg] = useState("");
  const [prayerShare, setPrayerShare] = useState(false);
  const createPrayer = useCreatePrayerRequest();

  const logResponse = async (interactionId: string, kind: string, payload: Record<string, unknown> = {}) => {
    if (!experience) return;
    try {
      const { data: sess } = await supabase.auth.getSession();
      const inserted = await (supabase as any).from("experience_responses").insert({
        experience_id: experience.id,
        interaction_id: interactionId,
        user_id: sess.session?.user?.id ?? null,
        anon_id: sess.session?.user?.id ? null : (await import("@/lib/experienceAnalytics")).getAnonId(),
        kind,
        payload,
      }).select("*").single();
      // Notify staff for decision-style responses
      if (["decision", "salvation", "commitment", "response"].includes(kind)) {
        try {
          await (supabase as any).functions.invoke("notify-response", {
            body: { type: "response", record: inserted.data },
          });
        } catch {}
      }
    } catch {}
  };

  const handleInteraction = async (i: ExperienceInteraction) => {
    if (!experience) return;
    await logExperienceEvent({
      experienceId: experience.id,
      kind: "interaction_click",
      payload: { interaction_id: i.id, kind: i.kind },
    });
    // Prayer opens a dialog instead of instantly logging
    if (i.kind === "prayer") {
      setPrayerName(""); setPrayerContact(""); setPrayerMsg(""); setPrayerShare(false);
      setPrayerFor(i);
      return;
    }
    await logResponse(i.id, i.kind, {});
    if (i.destination) {
      if (i.destination.startsWith("http")) window.open(i.destination, "_blank");
      else navigate(i.destination);
    } else {
      toast.success(i.confirmation || "Thank you");
    }
  };

  const submitPrayer = async () => {
    if (!prayerFor || !experience) return;
    if (!prayerMsg.trim()) { toast.error("Please share your request"); return; }
    try {
      await createPrayer.mutateAsync({
        experience_id: experience.id,
        name: prayerName.trim() || null,
        contact: prayerContact.trim() || null,
        message: prayerMsg.trim(),
        visibility: prayerShare ? "public" : "private",
        urgency: "normal",
      });
      await logResponse(prayerFor.id, "prayer", { shared: prayerShare });
      toast.success(prayerFor.confirmation || "We're praying with you.");
      setPrayerFor(null);
    } catch (e: any) {
      toast.error(e.message || "Could not submit");
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/70" />
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center gap-4">
        <p>Experience not found.</p>
        <Button asChild variant="outline"><Link to="/">Go home</Link></Button>
      </div>
    );
  }

  if (experience.status !== "published") {
    return (
      <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center gap-4">
        <p className="text-lg">This experience isn't available yet.</p>
        <Button asChild variant="outline"><Link to="/">Go home</Link></Button>
      </div>
    );
  }

  const bg = scene?.background_url || experience.cinematic_bg || experience.featured_image;
  const bgKind = scene?.background_kind ?? (bg && /\.(mp4|webm|mov)$/i.test(bg) ? "video" : "image");
  const ambient = scene?.ambient_audio_url || experience.ambient_audio_url;

  return (
    <>
      <div className="fixed inset-0 bg-black text-white overflow-hidden">
        {/* Background */}
        {bg && bgKind === "video" ? (
          <video key={bg} src={bg} autoPlay muted={muted} loop playsInline
            className="absolute inset-0 h-full w-full object-cover" />
        ) : bg ? (
          <img key={bg} src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{ background: `rgba(0,0,0,${scene?.overlay_opacity ?? 0.45})` }}
        />
        {ambient && (
          <audio ref={audioRef} src={ambient} loop autoPlay />
        )}

        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4 md:p-6">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => navigate(-1)}>
            <X className="h-4 w-4 mr-1" /> Exit
          </Button>
          <div className="text-xs md:text-sm opacity-80">
            {total > 0 && `${idx + 1} / ${total}`}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setMuted((m) => !m)}>
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setPlaying((p) => !p)}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div
          key={scene?.id}
          className={`relative z-10 h-full w-full flex flex-col items-${scene?.text_align === "left" ? "start" : scene?.text_align === "right" ? "end" : "center"} justify-center px-6 md:px-16 text-${scene?.text_align ?? "center"} animate-fade-in`}
        >
          {total === 0 ? (
            <div className="max-w-3xl">
              <h1 className="font-display text-4xl md:text-6xl font-semibold mb-4">{experience.title}</h1>
              {experience.short_description && <p className="text-lg opacity-90">{experience.short_description}</p>}
            </div>
          ) : (
            <div className="max-w-3xl space-y-5">
              {scene?.heading && (
                <h2 className="font-display text-3xl md:text-6xl font-semibold leading-tight">{scene.heading}</h2>
              )}
              {scene?.scripture && (
                <blockquote className="text-xl md:text-2xl italic opacity-95">
                  "{scene.scripture}"
                </blockquote>
              )}
              {scene?.scripture_ref && (
                <div className="text-sm md:text-base opacity-70">— {scene.scripture_ref}</div>
              )}
              {scene?.quote && <p className="text-xl italic opacity-95">{scene.quote}</p>}
              {scene?.body && <p className="text-base md:text-lg opacity-90 leading-relaxed">{scene.body}</p>}

              {/* Interactions for this scene */}
              {sceneInteractions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-4 justify-center">
                  {sceneInteractions.map((i) => (
                    <Button
                      key={i.id}
                      variant="secondary"
                      className="bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur"
                      onClick={() => handleInteraction(i)}
                    >
                      {i.button_label || i.heading || "Continue"}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nav controls */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              disabled={idx === 0}
              className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 backdrop-blur"
              aria-label="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={next}
              disabled={idx === total - 1}
              className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 backdrop-blur"
              aria-label="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Progress dots */}
        {total > 1 && (
          <div className="absolute bottom-6 inset-x-0 z-20 flex justify-center gap-1.5">
            {activeScenes.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all ${i === idx ? "w-8 bg-white" : "w-3 bg-white/40 hover:bg-white/70"}`}
                aria-label={`Go to scene ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Subtle elapsed */}
        <div className="absolute bottom-2 right-4 z-20 text-[10px] opacity-40 tabular-nums">
          {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, "0")}
        </div>
      </div>

      <Dialog open={!!prayerFor} onOpenChange={(o) => !o && setPrayerFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-primary" />
              {prayerFor?.heading || "Share Your Prayer Request"}
            </DialogTitle>
            <DialogDescription>
              {prayerFor?.body || "Our team will pray over your request."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name (optional)</Label>
                <Input value={prayerName} onChange={(e) => setPrayerName(e.target.value)} placeholder="Anonymous" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contact (optional)</Label>
                <Input value={prayerContact} onChange={(e) => setPrayerContact(e.target.value)} placeholder="email or phone" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Your prayer request</Label>
              <Textarea rows={4} value={prayerMsg} onChange={(e) => setPrayerMsg(e.target.value)}
                placeholder="Share what's on your heart…" maxLength={2000} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={prayerShare} onCheckedChange={setPrayerShare} />
              Share anonymously on the Prayer Wall
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPrayerFor(null)}>Cancel</Button>
            <Button onClick={submitPrayer} disabled={createPrayer.isPending}>
              {createPrayer.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
