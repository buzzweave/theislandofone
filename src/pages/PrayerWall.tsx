import { useEffect, useState } from "react";
import { HeartHandshake, Loader2, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { usePrayerRequests, useCreatePrayerRequest } from "@/hooks/usePrayerRequests";

export default function PrayerWall() {
  const { data: publicRequests = [], isLoading } = usePrayerRequests({ publicOnly: true });
  const create = useCreatePrayerRequest();

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [shareWithWall, setShareWithWall] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) { toast.error("Please share your prayer request"); return; }
    try {
      await create.mutateAsync({
        name: name.trim() || null,
        contact: contact.trim() || null,
        message: message.trim(),
        urgency,
        visibility: shareWithWall ? "public" : "private",
      });
      toast.success("We're praying with you.");
      setName(""); setContact(""); setMessage(""); setUrgency("normal"); setShareWithWall(false);
    } catch (e: any) {
      toast.error(e.message || "Could not submit");
    }
  };

  useEffect(() => {
    const prev = document.title;
    document.title = "Prayer Wall · The Island of One";
    return () => { document.title = prev; };
  }, []);

  return (
    <>
      {/* metadata handled via effect */}
      <div className="container mx-auto max-w-4xl px-4 py-10 space-y-10">
        <header className="text-center space-y-3">
          <HeartHandshake className="h-10 w-10 mx-auto text-primary" />
          <h1 className="font-display text-4xl md:text-5xl font-semibold">Prayer Wall</h1>
          <p className="text-muted-foreground">You are not alone. Share what's on your heart — our team prays over every request.</p>
        </header>

        <Card className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name (optional)</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Anonymous" />
              </div>
              <div className="space-y-2">
                <Label>Contact (optional)</Label>
                <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="email or phone" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Prayer Request</Label>
              <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Share what you'd like prayer for…" maxLength={2000} required />
            </div>
            <div className="grid gap-4 md:grid-cols-2 items-end">
              <div className="space-y-2">
                <Label>Urgency</Label>
                <Select value={urgency} onValueChange={setUrgency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={shareWithWall} onCheckedChange={setShareWithWall} />
                Share anonymously on the wall
              </label>
            </div>
            <Button type="submit" disabled={create.isPending} className="w-full md:w-auto">
              {create.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Submit Prayer Request
            </Button>
          </form>
        </Card>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-semibold">Prayers being lifted</h2>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
          ) : publicRequests.length === 0 ? (
            <p className="text-muted-foreground text-sm">No public requests yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {publicRequests.map((r) => (
                <Card key={r.id} className="p-4 space-y-2">
                  <div className="text-xs text-muted-foreground">
                    {r.name || "Anonymous"} · {new Date(r.created_at).toLocaleDateString()}
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{r.message}</p>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
