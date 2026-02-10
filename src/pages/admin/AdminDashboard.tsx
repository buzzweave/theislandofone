import { BookOpen, FileText, Video, Mic, Users, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useBooks } from "@/hooks/useBooks";
import { useSermons } from "@/hooks/useSermons";
import { useVideos } from "@/hooks/useVideos";

export default function AdminDashboard() {
  const { data: books = [] } = useBooks();
  const { data: sermons = [] } = useSermons();
  const { data: videos = [] } = useVideos();

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
        </div>
      </div>
    </div>
  );
}
