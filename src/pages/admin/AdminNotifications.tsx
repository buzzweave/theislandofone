import { useState } from "react";
import { Bell, Mail, Mic, Settings, Check, CheckCheck, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

type Filter = "all" | "unread" | "contact" | "speaker_request";

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case "contact": return <Mail className="h-4 w-4 text-primary" />;
    case "speaker_request": return <Mic className="h-4 w-4 text-primary" />;
    case "smtp_test": return <Settings className="h-4 w-4 text-primary" />;
    default: return <Bell className="h-4 w-4 text-primary" />;
  }
}

function TypeBadge({ type }: { type: string }) {
  if (type === "contact") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">Contact</span>;
  if (type === "speaker_request") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-medium">Speaker</span>;
  return null;
}

const CONTACT_FIELDS: [string, string][] = [
  ["name", "Name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["message", "Message"],
  ["page_url", "Page URL"],
];

const SPEAKER_FIELDS: [string, string][] = [
  ["name", "Name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["organization", "Organization"],
  ["event_name", "Event Name"],
  ["event_date", "Event Date"],
  ["event_location", "Location"],
  ["topic", "Topic"],
  ["message", "Message"],
];

function NotificationDetails({ data, type }: { data: any; type: string }) {
  if (!data || typeof data !== "object") return null;
  const fields = type === "speaker_request" ? SPEAKER_FIELDS : CONTACT_FIELDS;

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-1.5">
      {fields.map(([key, label]) => {
        const value = data[key];
        if (!value) return null;
        return (
          <div key={key} className="flex gap-2 text-xs">
            <span className="text-muted-foreground font-medium min-w-[80px] shrink-0">{label}:</span>
            <span className="text-foreground break-all">{value}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminNotifications() {
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const { notifications, unreadCount, markRead, markAllRead, deleteNotification } = useNotifications();

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "contact") return n.type === "contact";
    if (filter === "speaker_request") return n.type === "speaker_request";
    return true;
  });

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: `Unread (${unreadCount})` },
    { key: "contact", label: "Contacts" },
    { key: "speaker_request", label: "Speaker" },
  ];

  const toggleExpand = (id: string) => {
    setExpanded(expanded === id ? null : id);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Notifications</h2>
          <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllRead()}>
            <CheckCheck className="h-4 w-4 mr-1" /> Mark All Read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No notifications match this filter</p>
          </div>
        ) : (
          filtered.map((n) => {
            const isExpanded = expanded === n.id;
            const hasData = n.data && typeof n.data === "object" && Object.keys(n.data).length > 0;

            return (
              <div
                key={n.id}
                className={`rounded-lg border transition-colors ${
                  n.is_read ? "bg-card opacity-70" : "bg-primary/5 border-primary/20"
                } ${isExpanded ? "border-primary/30" : "border-border"}`}
              >
                <div
                  className={`flex items-start gap-3 p-4 ${hasData ? "cursor-pointer" : ""}`}
                  onClick={() => hasData && toggleExpand(n.id)}
                >
                  <div className="mt-0.5 shrink-0">
                    <NotificationIcon type={n.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      <TypeBadge type={n.type} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.preview}</p>
                    {n.email_queued && (
                      <p className="text-[10px] text-destructive mt-1 font-medium">⚠ Email queued (SMTP not configured)</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {hasData && (
                      isExpanded
                        ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    {!n.is_read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                        className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-muted"
                        title="Mark as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                      className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-muted"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {isExpanded && hasData && (
                  <div className="px-4 pb-4 ml-7">
                    <NotificationDetails data={n.data} type={n.type} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
