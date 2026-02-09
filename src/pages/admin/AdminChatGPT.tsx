import { useEffect } from "react";
import { ExternalLink } from "lucide-react";

export default function AdminChatGPT() {
  useEffect(() => {
    window.open("https://chat.openai.com", "_blank");
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <ExternalLink className="h-7 w-7 text-primary" />
        </div>
        <h2 className="font-display text-xl font-bold">ChatGPT</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          ChatGPT opens in a new tab. If it didn't open, click the button below.
        </p>
        <a
          href="https://chat.openai.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          Open ChatGPT
        </a>
      </div>
    </div>
  );
}
