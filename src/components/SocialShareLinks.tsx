import { Facebook, Twitter, Linkedin, Link2, MessageCircle, Instagram, Youtube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { shareCleanLink } from "@/lib/shareCleanLink";

interface SocialShareLinksProps {
  title: string;
  /** Edge-function URL with OG tags for social-crawler share dialogs */
  url?: string;
  /** Human-friendly canonical page URL */
  pageUrl?: string;
  /** Plain-text description / excerpt for native share sheet */
  description?: string;
}

export default function SocialShareLinks({ title, url, pageUrl, description }: SocialShareLinksProps) {
  const { toast } = useToast();

  // Crawler URL (edge function) for social share dialogs that scrape OG tags
  const crawlerUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  // Clean canonical URL for humans (iMessage, SMS, clipboard)
  const humanUrl = pageUrl || (typeof window !== "undefined" ? window.location.href : "");

  const encodedCrawlerUrl = encodeURIComponent(crawlerUrl);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    {
      label: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedCrawlerUrl}`,
    },
    {
      label: "X",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${encodedCrawlerUrl}&text=${encodedTitle}`,
    },
    {
      label: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedCrawlerUrl}`,
    },
    {
      label: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodedTitle}%20${encodedCrawlerUrl}`,
    },
    {
      label: "Instagram",
      icon: Instagram,
      href: null,
      action: "copy",
    },
    {
      label: "TikTok",
      icon: () => (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.51a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.72a8.2 8.2 0 0 0 4.76 1.52V6.79a4.83 4.83 0 0 1-1-.1z" />
        </svg>
      ),
      href: null,
      action: "copy",
    },
    {
      label: "YouTube",
      icon: Youtube,
      href: "https://www.youtube.com",
      action: "open",
    },
  ];

  // Use the crawler URL (edge function) for ALL share/copy so iMessage gets OG tags
  const shareUrl = crawlerUrl;

  /** Use Web Share API (iOS share sheet), fallback to clipboard */
  const handleNativeShare = async () => {
    const result = await shareCleanLink({
      title,
      description: description || "",
      url: shareUrl,
    });
    if (result.shared) {
      toast({ title: "Shared successfully" });
    } else if (result.copied) {
      toast({ title: "Link copied", description: "Share link copied to clipboard." });
    }
  };

  /** Simple clipboard copy for platforms like Instagram/TikTok */
  const copyOnly = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied", description: "Paste it in the app to share." });
    } catch {
      prompt("Copy this link:", shareUrl);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground mr-1">Share:</span>
      {links.map((link) => {
        if (link.action === "copy" || !link.href) {
          return (
            <button
              key={link.label}
              onClick={async () => {
                await copyOnly();
                toast({ title: `Link copied for ${link.label}`, description: "Paste it in the app to share." });
              }}
              title={`Copy link for ${link.label}`}
              className="p-2 rounded-lg border border-border bg-card hover:border-primary/40 hover:text-primary transition-colors text-muted-foreground"
            >
              <link.icon className="h-4 w-4" />
            </button>
          );
        }
        return (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            title={`Share on ${link.label}`}
            className="p-2 rounded-lg border border-border bg-card hover:border-primary/40 hover:text-primary transition-colors text-muted-foreground"
          >
            <link.icon className="h-4 w-4" />
          </a>
        );
      })}
      <button
        onClick={handleNativeShare}
        title="Share or copy link"
        className="p-2 rounded-lg border border-border bg-card hover:border-primary/40 hover:text-primary transition-colors text-muted-foreground"
      >
        <Link2 className="h-4 w-4" />
      </button>
    </div>
  );
}
