import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Calendar, Mail, Building2, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SpeakingRequest {
  id: string;
  name: string;
  email: string;
  organization: string | null;
  event_name: string;
  event_date: string;
  event_location: string | null;
  topic: string | null;
  message: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  { value: "scheduled", label: "Scheduled", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  { value: "completed", label: "Completed", color: "bg-muted text-muted-foreground border-border" },
  { value: "declined", label: "Declined", color: "bg-red-500/10 text-red-600 border-red-500/20" },
];

function statusBadge(status: string) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${opt.color}`}>{opt.label}</span>;
}

export default function AdminSpeakingRequests() {
  const [requests, setRequests] = useState<SpeakingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = requests.find((r) => r.id === selectedId) ?? null;

  const fetchRequests = async () => {
    try {
      const data = await api.get<SpeakingRequest[]>("/api/speaking-requests");
      setRequests(data ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateRequest = async (id: string, fields: Partial<SpeakingRequest>) => {
    try {
      await api.put(`/api/speaking-requests/${id}`, fields);
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...fields } : r)));
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const deleteRequest = async (id: string) => {
    try {
      await api.delete(`/api/speaking-requests/${id}`);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch { /* ignore */ }
  };

  const newCount = requests.filter((r) => r.status === "new").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* List */}
      <div className="w-72 shrink-0 flex flex-col border border-border rounded-lg bg-card overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold flex items-center gap-2">
            <Mic className="h-4 w-4" /> Requests
          </span>
          {newCount > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              {newCount} new
            </Badge>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {requests.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No requests yet.</p>
          )}
          {requests.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`w-full text-left px-3 py-3 text-sm border-b border-border transition-colors ${
                r.id === selectedId
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-foreground">{r.name}</span>
                {statusBadge(r.status)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.event_name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(r.event_date).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      {selected ? (
        <div className="flex-1 overflow-y-auto space-y-5 pr-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">{selected.name}</h2>
            {statusBadge(selected.status)}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" /> {selected.email}
                </div>
                {selected.organization && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" /> {selected.organization}
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" /> {new Date(selected.event_date).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 space-y-2 text-sm">
                <p className="font-medium">{selected.event_name}</p>
                {selected.event_location && (
                  <p className="text-muted-foreground">{selected.event_location}</p>
                )}
                {selected.topic && (
                  <p className="text-muted-foreground">Topic: {selected.topic}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {selected.message && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.message}</p>
              </CardContent>
            </Card>
          )}

          {/* Status update */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={selected.status}
                onValueChange={(v) => updateRequest(selected.id, { status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div>
                <label className="text-sm font-medium mb-1 block">Admin Notes</label>
                <Textarea
                  value={selected.admin_notes ?? ""}
                  onChange={(e) =>
                    setRequests((prev) =>
                      prev.map((r) =>
                        r.id === selected.id ? { ...r, admin_notes: e.target.value } : r,
                      ),
                    )
                  }
                  onBlur={() =>
                    updateRequest(selected.id, { admin_notes: selected.admin_notes ?? "" })
                  }
                  rows={3}
                  placeholder="Internal notes about this request..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 pb-8">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteRequest(selected.id)}
            >
              Delete Request
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p>Select a request to view details.</p>
        </div>
      )}
    </div>
  );
}
