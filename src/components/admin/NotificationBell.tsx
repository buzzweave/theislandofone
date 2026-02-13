import { useState, useRef, useEffect } from "react";
import { Bell, Mail, Mic, Settings, Check, ExternalLink } from "lucide-react";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case "contact": return <Mail className="h-4 w-4 text-primary" />;
    case "speaker_request": return <Mic className="h-4 w-4 text-primary" />;
    case "smtp_test": return <Settings className="h-4 w-4 text-primary" />;
    default: return <Bell className="h-4 w-4 text-primary" />;
  }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, emailQueuedCount, markRead, markAllRead } = useNotifications();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const latest = notifications.slice(0, 10);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {(unreadCount > 0 || emailQueuedCount > 0) && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 rounded-lg border border-border bg-card shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {emailQueuedCount > 0 && (
            <div className="px-4 py-2 bg-destructive/10 border-b border-border">
              <p className="text-xs text-destructive font-medium">
                ⚠ {emailQueuedCount} email(s) queued — SMTP not configured
              </p>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto">
            {latest.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              latest.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors ${
                    n.is_read ? "opacity-60" : "bg-primary/5"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    <NotificationIcon type={n.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                      {n.type === "contact" && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium shrink-0">Contact</span>
                      )}
                      {n.type === "speaker_request" && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-400 font-medium shrink-0">Speaker</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{n.preview}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="shrink-0 mt-0.5 text-muted-foreground hover:text-primary"
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border px-4 py-2">
            <Link
              to="/admin/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
