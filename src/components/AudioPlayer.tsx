import { Headphones, Download } from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
}

export default function AudioPlayer({ audioUrl, title }: AudioPlayerProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Headphones className="h-5 w-5 text-primary" />
        <span className="font-display text-sm font-semibold">Audio Version</span>
      </div>
      <audio controls className="w-full h-10" src={audioUrl}>
        Your browser does not support the audio element.
      </audio>
      <a
        href={audioUrl}
        download={`${title.replace(/\s+/g, "-").toLowerCase()}.mp3`}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors"
      >
        <Download className="h-3.5 w-3.5" /> Download Audiobook
      </a>
    </div>
  );
}
