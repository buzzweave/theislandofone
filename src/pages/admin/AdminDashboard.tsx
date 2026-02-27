import { useState } from "react";
import { BookOpen, FileText, Video, Mic, Users, BarChart3, Gift, Copy, Check, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useBooks } from "@/hooks/useBooks";
import { useSermons } from "@/hooks/useSermons";
import { useVideos } from "@/hooks/useVideos";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { data: books = [] } = useBooks();
  const { data: sermons = [] } = useSermons();
  const { data: videos = [] } = useVideos();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreateInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast.error("Enter a valid email address.");
      return;
    }
    setIsCreating(true);
    setInviteLink("");
    try {
      const { data, error } = await supabase.functions.invoke("create-invite", {
        body: { email: inviteEmail.trim() },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setInviteLink(data.share_url);
      toast.success("Invite link created!");
    } catch (err: any) {
      toast.error(err.message || "Failed to create invite");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = [
    { label: "Books", value: String(books.length), icon: BookOpen, to: "/admin/books" },
    { label: "Sermons", value: String(sermons.length), icon: FileText, to: "/admin/sermons" },
    { label: "Videos", value: String(videos.length), icon: Video, to: "/admin/videos" },
    { label: "Speaking Requests", value: "—", icon: Mic, to: "/admin/speaking" },
    { label: "Members", value: "—", icon: Users, to: "/admin/members" },
    { label: "Page Views (7d)", value: "—", icon: BarChart3, to: "/admin/analytics" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-bold mb-1">Welcome back, Bryant</h2>
        <p className="text-sm text-muted-foreground">Here's what's happening with your ministry platform.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.to}
            className="p-5 rounded-xl border border-border bg-card hover:border-primary/30 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <stat.icon className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">{stat.value}</span>
            </div>
            <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/admin/sermons"
            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/30 transition-colors"
          >
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Create New Sermon</p>
              <p className="text-xs text-muted-foreground">Start writing with AI assistance</p>
            </div>
          </Link>
          <Link
            to="/admin/books"
            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/30 transition-colors"
          >
            <BookOpen className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Create New Book</p>
              <p className="text-xs text-muted-foreground">AI-assisted book builder</p>
            </div>
          </Link>
          <Link
            to="/admin/videos"
            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/30 transition-colors"
          >
            <Video className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Add Video</p>
              <p className="text-xs text-muted-foreground">Upload or embed new content</p>
            </div>
          </Link>
          <Link
            to="/admin/speaking"
            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/30 transition-colors"
          >
            <Mic className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Review Requests</p>
              <p className="text-xs text-muted-foreground">2 pending speaking requests</p>
            </div>
          </Link>

          {/* Invite a Friend */}
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setInviteLink(""); setInviteEmail(""); } }}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/30 transition-colors text-left w-full">
                <Gift className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Invite a Friend</p>
                  <p className="text-xs text-muted-foreground">Send a free lifetime Inner Circle invite</p>
                </div>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  Invite a Friend
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter your friend's email. They'll get a shareable link that grants them a <strong>free lifetime Inner Circle membership</strong> when they sign up.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="friend@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={isCreating}
                  />
                  <Button onClick={handleCreateInvite} disabled={isCreating || !inviteEmail}>
                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                  </Button>
                </div>
                {inviteLink && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Share this link:</p>
                    <div className="flex gap-2">
                      <Input value={inviteLink} readOnly className="text-xs" />
                      <Button variant="outline" size="icon" onClick={handleCopy}>
                        {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This link only works for <strong>{inviteEmail}</strong>. When shared on social media, it shows a branded preview with your logo.
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
