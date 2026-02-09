import { Facebook, Twitter, Linkedin, Link2, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SocialShareLinksProps {
  title: string;
  url?: string;
}

export default function SocialShareLinks({ title, url }: SocialShareLinksProps) {
  const { toast } = useToast();
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    {
      label: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: "X",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      label: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      label: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
  ];

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link copied", description: "Share link copied to clipboard." });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground mr-1">Share:</span>
      {links.map((link) => (
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
      ))}
      <button
        onClick={copyLink}
        title="Copy link"
        className="p-2 rounded-lg border border-border bg-card hover:border-primary/40 hover:text-primary transition-colors text-muted-foreground"
      >
        <Link2 className="h-4 w-4" />
      </button>
    </div>
  );
}
