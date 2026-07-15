import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, HeartHandshake, Check } from "lucide-react";
import { toast } from "sonner";
import {
  usePrayerRequests, useUpdatePrayerRequest, type PrayerRequest,
} from "@/hooks/usePrayerRequests";

const STATUS = ["new", "praying", "answered", "closed"] as const;

export default function PrayerWallPanel({ experienceId }: { experienceId?: string }) {
  const { data = [], isLoading } = usePrayerRequests({ experienceId });
  const update = useUpdatePrayerRequest();
  const [openId, setOpenId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  if (isLoading) {
    return <Card className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></Card>;
  }

  const changeStatus = async (r: PrayerRequest, status: string) => {
    try { await update.mutateAsync({ id: r.id, status }); toast.success("Updated"); }
    catch (e: any) { toast.error(e.message); }
  };

  const saveNotes = async (r: PrayerRequest) => {
    try { await update.mutateAsync({ id: r.id, private_notes: notes }); toast.success("Notes saved"); setOpenId(null); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <HeartHandshake className="h-4 w-4" />
        {data.length} prayer request{data.length === 1 ? "" : "s"}
      </div>
      {data.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">No prayer requests yet.</Card>
      ) : data.map((r) => (
        <Card key={r.id} className="p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant={r.status === "new" ? "default" : r.status === "answered" ? "outline" : "secondary"}>
                {r.status}
              </Badge>
              {r.urgency === "urgent" && <Badge variant="destructive">Urgent</Badge>}
              <Badge variant="outline">{r.visibility}</Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString()}
              </span>
            </div>
            <div className="flex gap-2">
              <Select value={r.status} onValueChange={(v) => changeStatus(r, v)}>
                <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-sm">
            <div className="font-medium">{r.name || "Anonymous"}{r.contact ? ` · ${r.contact}` : ""}</div>
            <p className="whitespace-pre-wrap mt-1">{r.message}</p>
          </div>
          {openId === r.id ? (
            <div className="space-y-2">
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Private team notes…" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveNotes(r)}><Check className="h-4 w-4 mr-1" />Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setOpenId(null)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              {r.private_notes && <p className="text-xs text-muted-foreground italic">Notes: {r.private_notes}</p>}
              <Button size="sm" variant="ghost"
                onClick={() => { setOpenId(r.id); setNotes(r.private_notes ?? ""); }}>
                {r.private_notes ? "Edit notes" : "Add notes"}
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
