/**
 * Cinematic Engine — Intelligence layer for Video Studio
 * Handles: story processing, scene detection, voice matching,
 * B-roll keywords, export presets, YouTube optimization, and viral hooks.
 */

/* ─── CINEMATIC STORY ENGINE ─── */

interface ProcessedScript {
  slides: SceneSlide[];
  hookIntro: string;
  totalScenes: number;
}

export interface SceneSlide {
  text: string;
  bg: string;
  image?: string;
  holdDuration?: number; // ms override
  zoomIntensity?: number; // 0-1
  musicDip?: boolean; // duck music here
  isPause?: boolean; // cinematic pause
  emotion?: "neutral" | "revelation" | "story" | "punch" | "reflective" | "climax";
  brollKeyword?: string;
}

const EMOTION_KEYWORDS: Record<string, string[]> = {
  revelation: ["reveal", "truth", "suddenly", "realize", "behold", "unveil", "mystery", "secret", "kingdom", "glory", "revelation"],
  story: ["remember", "once", "journey", "walked", "child", "father", "mother", "story", "told", "years", "began"],
  punch: ["but", "however", "yet", "never", "always", "enough", "stop", "rise", "fight", "stand", "power"],
  reflective: ["peace", "still", "quiet", "gentle", "rest", "heal", "grace", "mercy", "love", "hope", "wait"],
  climax: ["god", "jesus", "lord", "spirit", "holy", "heaven", "eternal", "salvation", "cross", "blood", "risen"],
};

const BROLL_KEYWORDS: Record<string, string> = {
  pressure: "storm-clouds",
  storm: "storm-clouds",
  struggle: "storm-clouds",
  pain: "storm-clouds",
  grace: "warm-sunlight",
  light: "warm-sunlight",
  hope: "warm-sunlight",
  joy: "warm-sunlight",
  blessing: "warm-sunlight",
  calling: "mountains",
  purpose: "mountains",
  destiny: "mountains",
  vision: "mountains",
  height: "mountains",
  waiting: "ocean-horizons",
  patience: "ocean-horizons",
  still: "ocean-horizons",
  peace: "ocean-horizons",
  ocean: "ocean-horizons",
  fire: "fire-embers",
  passion: "fire-embers",
  spirit: "fire-embers",
  power: "fire-embers",
  cross: "golden-cross",
  jesus: "golden-cross",
  sacrifice: "golden-cross",
  salvation: "golden-cross",
  forest: "forest-path",
  walk: "forest-path",
  journey: "forest-path",
  path: "forest-path",
  night: "starry-night",
  dark: "starry-night",
  alone: "starry-night",
  star: "starry-night",
};

// B-roll gradient fallbacks when no images uploaded
const BROLL_GRADIENTS: Record<string, string> = {
  "storm-clouds": "linear-gradient(135deg, #1a1a2e 0%, #2d3436 40%, #636e72 100%)",
  "warm-sunlight": "linear-gradient(135deg, #f6d365 0%, #fda085 50%, #e17055 100%)",
  "mountains": "linear-gradient(135deg, #2c3e50 0%, #4ca1af 50%, #c9d6df 100%)",
  "ocean-horizons": "linear-gradient(135deg, #0c3547 0%, #1e6fa0 50%, #6fb3d2 100%)",
  "fire-embers": "linear-gradient(135deg, #3d0000 0%, #b71c1c 50%, #ff6f00 100%)",
  "golden-cross": "linear-gradient(135deg, #2c1810 0%, #c9a227 50%, #f0d78c 100%)",
  "forest-path": "linear-gradient(135deg, #0b3d0b 0%, #1b5e20 50%, #4caf50 100%)",
  "starry-night": "linear-gradient(135deg, #0d0d2b 0%, #1a1a4e 50%, #2c2c7a 100%)",
};

function detectEmotion(text: string): SceneSlide["emotion"] {
  const lower = text.toLowerCase();
  let best: SceneSlide["emotion"] = "neutral";
  let bestScore = 0;
  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    const score = keywords.filter((k) => lower.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      best = emotion as SceneSlide["emotion"];
    }
  }
  return best;
}

function detectBrollKeyword(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const [keyword, broll] of Object.entries(BROLL_KEYWORDS)) {
    if (lower.includes(keyword)) return broll;
  }
  return undefined;
}

function getHoldDuration(emotion: SceneSlide["emotion"], viralMode: boolean): number {
  const base = viralMode ? 3000 : 5000;
  switch (emotion) {
    case "revelation": return base * 1.4;
    case "story": return base * 1.2;
    case "punch": return base * 0.8;
    case "reflective": return base * 1.3;
    case "climax": return base * 1.5;
    default: return base;
  }
}

function getZoomIntensity(emotion: SceneSlide["emotion"]): number {
  switch (emotion) {
    case "revelation": return 0.08;
    case "story": return 0.03;
    case "punch": return 0.06;
    case "climax": return 0.1;
    case "reflective": return 0.02;
    default: return 0.05;
  }
}

/**
 * Generate a cinematic hook intro from content text.
 */
function generateHook(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 10);
  if (sentences.length < 3) return sentences[0] || text.slice(0, 120);

  // Find the most emotionally charged sentence for the hook
  let hookIdx = 0;
  let hookScore = 0;
  sentences.slice(0, Math.min(10, sentences.length)).forEach((s, i) => {
    const emotion = detectEmotion(s);
    const score = emotion === "punch" ? 5 : emotion === "climax" ? 4 : emotion === "revelation" ? 3 : 1;
    if (score > hookScore) {
      hookScore = score;
      hookIdx = i;
    }
  });

  return sentences[hookIdx].slice(0, 150);
}

/**
 * Process text into cinematic scenes with emotional intelligence.
 */
export function processCinematicScript(
  text: string,
  options: {
    viralMode: boolean;
    cinematicStoryMode: boolean;
    customImages?: string[];
  }
): ProcessedScript {
  const { viralMode, cinematicStoryMode, customImages = [] } = options;

  let sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 10);

  // Cinematic story mode: rewrite opening for retention
  const hookIntro = cinematicStoryMode ? generateHook(text) : "";

  if (cinematicStoryMode) {
    // Split very long sentences at commas for better visual pacing, but keep all content
    const expanded: string[] = [];
    for (const s of sentences) {
      if (s.length > 200) {
        const parts = s.split(/,\s*/).filter((p) => p.trim().length > 5);
        if (parts.length > 1) {
          expanded.push(...parts.map((p, i) => i < parts.length - 1 ? p + "," : p));
        } else {
          expanded.push(s);
        }
      } else {
        expanded.push(s);
      }
    }
    sentences = expanded;
  }

  const colors = [
    "linear-gradient(135deg, hsl(220 30% 12%), hsl(240 20% 18%))",
    "linear-gradient(135deg, hsl(35 80% 15%), hsl(15 70% 12%))",
    "linear-gradient(135deg, hsl(200 50% 12%), hsl(260 40% 15%))",
    "linear-gradient(135deg, hsl(340 40% 14%), hsl(280 30% 12%))",
    "linear-gradient(135deg, hsl(180 30% 10%), hsl(210 40% 16%))",
  ];

  const chunkSize = viralMode ? 1 : 2;
  const slides: SceneSlide[] = [];

  // If cinematic story mode, insert hook as first slide
  if (cinematicStoryMode && hookIntro) {
    slides.push({
      text: hookIntro,
      bg: "linear-gradient(135deg, #0a0a0a 0%, #c9a227 100%)",
      emotion: "punch",
      holdDuration: viralMode ? 4000 : 6000,
      zoomIntensity: 0.08,
      musicDip: false,
      brollKeyword: "golden-cross",
    });
  }

  for (let i = 0; i < sentences.length; i += chunkSize) {
    const chunk = sentences.slice(i, i + chunkSize).join(" ");
    if (chunk.length <= 15) continue;

    const emotion = detectEmotion(chunk);
    const brollKeyword = detectBrollKeyword(chunk);
    const slideIdx = slides.length;

    // Determine background
    let bg = colors[slideIdx % colors.length];
    if (!customImages[slideIdx] && brollKeyword && BROLL_GRADIENTS[brollKeyword]) {
      bg = BROLL_GRADIENTS[brollKeyword];
    }

    const slide: SceneSlide = {
      text: chunk,
      bg,
      image: customImages[slideIdx] || undefined,
      emotion,
      holdDuration: getHoldDuration(emotion, viralMode),
      zoomIntensity: getZoomIntensity(emotion),
      musicDip: emotion === "punch" || emotion === "revelation",
      brollKeyword,
    };

    slides.push(slide);

    // Insert cinematic pause after climax/revelation scenes
    if (cinematicStoryMode && (emotion === "climax" || emotion === "revelation") && i < sentences.length - chunkSize) {
      slides.push({
        text: "",
        bg: "linear-gradient(135deg, #0a0a0a, #1a1a1a)",
        isPause: true,
        holdDuration: 1500,
        zoomIntensity: 0,
        emotion: "neutral",
      });
    }
  }

  return {
    slides,
    hookIntro,
    totalScenes: slides.length,
  };
}

/* ─── NARRATOR INTELLIGENCE ─── */

interface VoiceMatch {
  provider: "openai" | "elevenlabs";
  voiceId: string;
  label: string;
}

const VOICE_MAP: Record<string, VoiceMatch> = {
  preaching: { provider: "openai", voiceId: "onyx", label: "Onyx — Deep, authoritative" },
  devotional: { provider: "openai", voiceId: "nova", label: "Nova — Friendly, warm" },
  cinematic: { provider: "elevenlabs", voiceId: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam — Cinematic" },
  documentary: { provider: "elevenlabs", voiceId: "onwK4e9ZLuTAKqWW03F9", label: "Daniel — Deep narrator" },
  "gentle-female": { provider: "elevenlabs", voiceId: "pFZP5JQG7iQjIQuC4Bku", label: "Lily — Gentle, warm" },
};

export function autoMatchVoice(tone: string): VoiceMatch {
  return VOICE_MAP[tone] || VOICE_MAP["cinematic"];
}

/* ─── VIRAL HOOK BOOST ─── */

export function applyViralHookBoost(slides: SceneSlide[]): SceneSlide[] {
  if (slides.length < 3) return slides;

  // Rewrite opening slides for retention
  const boosted = [...slides];

  // First slide: shorter hold, punchier
  if (boosted[0]) {
    boosted[0] = {
      ...boosted[0],
      holdDuration: 3500,
      zoomIntensity: 0.1,
      emotion: "punch",
    };
  }

  // Second slide: quick cut
  if (boosted[1]) {
    boosted[1] = {
      ...boosted[1],
      holdDuration: 2500,
      zoomIntensity: 0.07,
    };
  }

  // Increase scene cuts slightly throughout
  return boosted.map((s, i) => ({
    ...s,
    holdDuration: s.isPause ? s.holdDuration : Math.round((s.holdDuration || 5000) * 0.85),
  }));
}

/* ─── CINEMATIC EXPORT PRESETS ─── */

export interface ExportPreset {
  id: string;
  label: string;
  description: string;
  effects: string[];
  transition: string;
  viralMode: boolean;
  musicIntensity: number; // 0-1
  grainAmount: number; // 0-1
  voiceWarmth: number; // 0-1 (applied as slight gain boost on lower frequencies)
}

export const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: "youtube-documentary",
    label: "🎬 YouTube Documentary",
    description: "Cinematic pacing, film grain, deep narration",
    effects: ["vignette", "grain", "letterbox"],
    transition: "fade",
    viralMode: false,
    musicIntensity: 0.6,
    grainAmount: 0.7,
    voiceWarmth: 0.5,
  },
  {
    id: "devotional-reel",
    label: "🕊️ Devotional Reel",
    description: "Soft glow, gentle pacing, warm tones",
    effects: ["glow", "bokeh"],
    transition: "fade",
    viralMode: false,
    musicIntensity: 0.4,
    grainAmount: 0.2,
    voiceWarmth: 0.8,
  },
  {
    id: "preaching-clip",
    label: "🔥 Preaching Clip",
    description: "Bold typography, quick cuts, high energy",
    effects: ["vignette", "particles"],
    transition: "zoom",
    viralMode: true,
    musicIntensity: 0.7,
    grainAmount: 0.3,
    voiceWarmth: 0.3,
  },
  {
    id: "audiobook-style",
    label: "📖 Audiobook Style",
    description: "Minimal visuals, word-sync text, ambient",
    effects: ["vignette"],
    transition: "fade",
    viralMode: false,
    musicIntensity: 0.2,
    grainAmount: 0.1,
    voiceWarmth: 0.6,
  },
  {
    id: "island-cinematic",
    label: "🏝️ Island Cinematic Look",
    description: "Gold overlay, serif titles, signature glow vignette",
    effects: ["vignette", "glow", "grain", "bokeh"],
    transition: "fade",
    viralMode: false,
    musicIntensity: 0.5,
    grainAmount: 0.4,
    voiceWarmth: 0.7,
  },
  {
    id: "gentle-narrator",
    label: "🌸 Gentle Woman Narrator",
    description: "Soft pacing, devotional warmth, emotional lift",
    effects: ["glow", "bokeh", "vignette"],
    transition: "fade",
    viralMode: false,
    musicIntensity: 0.35,
    grainAmount: 0.15,
    voiceWarmth: 0.9,
  },
];

/* ─── YOUTUBE OPTIMIZER ─── */

export interface YouTubeMetadata {
  titles: string[];
  description: string;
  tags: string[];
  thumbnailIdeas: string[];
}

export function generateYouTubeMetadata(contentTitle: string, contentText: string, tone: string): YouTubeMetadata {
  const words = contentText.split(/\s+/).slice(0, 50);
  const keyPhrases = extractKeyPhrases(contentText);

  const toneEmoji = tone === "preaching" ? "🔥" : tone === "devotional" ? "🕊️" : tone === "documentary" ? "📽️" : "🎬";

  const titles = [
    `${toneEmoji} ${contentTitle} | The Island of One`,
    `"${keyPhrases[0] || contentTitle}" — A Cinematic Word ${toneEmoji}`,
    `${contentTitle} | Faith, Healing & Belonging`,
  ];

  const description = `${contentTitle}\n\n${contentText.slice(0, 300)}...\n\n🏝️ The Island of One — Faith, healing, and belonging for the ones who felt alone.\n\n#TheIslandOfOne #Faith #Healing #${tone.charAt(0).toUpperCase() + tone.slice(1)}`;

  const tags = [
    "The Island of One",
    "faith",
    "healing",
    "belonging",
    contentTitle,
    tone,
    "cinematic",
    "narration",
    ...keyPhrases.slice(0, 5),
  ];

  const thumbnailIdeas = [
    `Bold text: "${keyPhrases[0] || contentTitle}" on dark cinematic background`,
    `Silhouette with golden light rays, text overlay: "${contentTitle}"`,
    `Close-up emotional portrait with serif text overlay`,
  ];

  return { titles, description, tags, thumbnailIdeas };
}

function extractKeyPhrases(text: string): string[] {
  const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 10);
  // Pick short, punchy phrases
  return sentences
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length <= 8 && s.split(/\s+/).length >= 3)
    .slice(0, 5);
}

/* ─── MUSIC DUCKING PARAMETERS ─── */

export interface DuckingParams {
  duckVolume: number; // volume during narration (0-1)
  normalVolume: number; // volume during pauses (0-1)
  duckRampTime: number; // seconds to ramp down
  swellAtTransitions: boolean;
  fadeIntelligence: boolean; // smart fade at ending
}

export function getMusicDuckingParams(preset?: string): DuckingParams {
  switch (preset) {
    case "youtube-documentary":
      return { duckVolume: 0.08, normalVolume: 0.25, duckRampTime: 0.5, swellAtTransitions: true, fadeIntelligence: true };
    case "devotional-reel":
      return { duckVolume: 0.1, normalVolume: 0.2, duckRampTime: 0.8, swellAtTransitions: false, fadeIntelligence: true };
    case "preaching-clip":
      return { duckVolume: 0.05, normalVolume: 0.3, duckRampTime: 0.3, swellAtTransitions: true, fadeIntelligence: true };
    case "gentle-narrator":
      return { duckVolume: 0.1, normalVolume: 0.18, duckRampTime: 1.0, swellAtTransitions: false, fadeIntelligence: true };
    default:
      return { duckVolume: 0.08, normalVolume: 0.2, duckRampTime: 0.5, swellAtTransitions: true, fadeIntelligence: true };
  }
}

/* ─── SHORTS GENERATOR ─── */

export interface ShortClip {
  startSlide: number;
  endSlide: number;
  text: string;
  hookText: string;
}

export function generateShortsFromSlides(slides: SceneSlide[]): ShortClip[] {
  if (slides.length < 5) return [];

  const clips: ShortClip[] = [];
  // Find emotionally strong segments
  const strongIndices = slides
    .map((s, i) => ({ idx: i, emotion: s.emotion, text: s.text }))
    .filter((s) => s.emotion === "punch" || s.emotion === "climax" || s.emotion === "revelation");

  // Generate 3-5 clips centered around strong moments
  for (const strong of strongIndices.slice(0, 5)) {
    const start = Math.max(0, strong.idx - 1);
    const end = Math.min(slides.length - 1, strong.idx + 2);
    clips.push({
      startSlide: start,
      endSlide: end,
      text: slides.slice(start, end + 1).map((s) => s.text).join(" "),
      hookText: strong.text,
    });
  }

  // Ensure at least 3 clips
  if (clips.length < 3) {
    const segmentSize = Math.floor(slides.length / 3);
    for (let i = 0; i < 3 && clips.length < 3; i++) {
      const start = i * segmentSize;
      const end = Math.min(start + segmentSize - 1, slides.length - 1);
      clips.push({
        startSlide: start,
        endSlide: end,
        text: slides.slice(start, end + 1).map((s) => s.text).join(" "),
        hookText: slides[start]?.text || "",
      });
    }
  }

  return clips.slice(0, 5);
}
