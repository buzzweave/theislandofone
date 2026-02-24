import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Mail,
  Plus,
  Trash2,
  Send,
  Download,
  Search,
  UserPlus,
  FileText,
  Eye,
  Loader2,
  MessageSquare,
  Phone,
} from "lucide-react";

interface Subscriber {
  id: string;
  email: string;
  name: string;
  source: string;
  is_active: boolean;
  subscribed_at: string;
  created_at: string;
}

interface Campaign {
  id: string;
  subject: string;
  content: string;
  status: string;
  sent_at: string | null;
  sent_count: number;
  created_at: string;
}

function useSubscribers() {
  return useQuery({
    queryKey: ["subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscribers" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []) as unknown as Subscriber[];
    },
  });
}

function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_campaigns" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []) as unknown as Campaign[];
    },
  });
}

export default function AdminCRM() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: subscribers = [], isLoading: loadingSubs } = useSubscribers();
  const { data: campaigns = [], isLoading: loadingCampaigns } = useCampaigns();

  const [search, setSearch] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");

  // Campaign editor state
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignContent, setCampaignContent] = useState("");
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const activeCount = subscribers.filter((s) => s.is_active).length;
  const filtered = subscribers.filter(
    (s) =>
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddSubscriber = async () => {
    if (!addEmail.trim()) return;
    try {
      const { error } = await supabase.from("subscribers" as any).insert({
        email: addEmail.trim(),
        name: addName.trim(),
        source: "admin",
      } as any);
      if (error) throw error;
      toast({ title: "Subscriber added" });
      setAddEmail("");
      setAddName("");
      qc.invalidateQueries({ queryKey: ["subscribers"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const toggleActive = async (id: string, currentlyActive: boolean) => {
    try {
      const updates: any = { is_active: !currentlyActive };
      if (currentlyActive) updates.unsubscribed_at = new Date().toISOString();
      else updates.unsubscribed_at = null;
      const { error } = await supabase.from("subscribers" as any).update(updates).eq("id", id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["subscribers"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const deleteSubscriber = async (id: string) => {
    if (!confirm("Remove this subscriber?")) return;
    try {
      const { error } = await supabase.from("subscribers" as any).delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Subscriber removed" });
      qc.invalidateQueries({ queryKey: ["subscribers"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const exportCSV = () => {
    const active = subscribers.filter((s) => s.is_active);
    const csv = ["Email,Name,Subscribed Date,Source"]
      .concat(
        active.map(
          (s) =>
            `"${s.email}","${s.name}","${new Date(s.subscribed_at).toLocaleDateString()}","${s.source}"`
        )
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveCampaign = async () => {
    if (!campaignSubject.trim()) return;
    setSaving(true);
    try {
      if (editingCampaignId) {
        const { error } = await supabase
          .from("email_campaigns" as any)
          .update({ subject: campaignSubject, content: campaignContent } as any)
          .eq("id", editingCampaignId);
        if (error) throw error;
        toast({ title: "Campaign saved" });
      } else {
        const { error } = await supabase.from("email_campaigns" as any).insert({
          subject: campaignSubject,
          content: campaignContent,
        } as any);
        if (error) throw error;
        toast({ title: "Campaign created" });
      }
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      setCampaignSubject("");
      setCampaignContent("");
      setEditingCampaignId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const sendCampaign = async (campaignId: string) => {
    if (!confirm(`Send this email to all ${activeCount} active subscribers?`)) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-campaign", {
        body: { campaignId },
      });
      if (error) throw error;
      toast({ title: "Campaign sent!" });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const editCampaign = (c: Campaign) => {
    setEditingCampaignId(c.id);
    setCampaignSubject(c.subject);
    setCampaignContent(c.content);
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    try {
      const { error } = await supabase.from("email_campaigns" as any).delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Campaign deleted" });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 text-center">
            <Users className="h-6 w-6 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{subscribers.length}</div>
            <p className="text-xs text-muted-foreground">Total Subscribers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <Mail className="h-6 w-6 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <FileText className="h-6 w-6 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-muted-foreground">Campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <Send className="h-6 w-6 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">
              {campaigns.filter((c) => c.status === "sent").length}
            </div>
            <p className="text-xs text-muted-foreground">Sent</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subscribers">
        <TabsList>
          <TabsTrigger value="subscribers" className="gap-2">
            <Users className="h-4 w-4" /> Subscribers
          </TabsTrigger>
          <TabsTrigger value="compose" className="gap-2">
            <Mail className="h-4 w-4" /> Compose
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2">
            <FileText className="h-4 w-4" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-2">
            <Phone className="h-4 w-4" /> SMS
          </TabsTrigger>
        </TabsList>

        {/* SUBSCRIBERS TAB */}
        <TabsContent value="subscribers" className="space-y-4 mt-4">
          {/* Add subscriber */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4" /> Add Subscriber
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Email *"
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                />
                <Input
                  placeholder="Name (optional)"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                />
                <Button onClick={handleAddSubscriber} className="shrink-0">
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Search + Export */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subscribers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>

          {/* List */}
          {loadingSubs ? (
            <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-2.5 font-medium">Email</th>
                      <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Name</th>
                      <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Source</th>
                      <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Date</th>
                      <th className="text-center px-4 py-2.5 font-medium">Status</th>
                      <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2.5">{s.email}</td>
                        <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground">
                          {s.name || "—"}
                        </td>
                        <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground capitalize">
                          {s.source}
                        </td>
                        <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">
                          {new Date(s.subscribed_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => toggleActive(s.id, s.is_active)}
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              s.is_active
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {s.is_active ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => deleteSubscriber(s.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground">
                          No subscribers found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* COMPOSE TAB */}
        <TabsContent value="compose" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {editingCampaignId ? "Edit Campaign" : "New Campaign"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Subject Line</Label>
                <Input
                  value={campaignSubject}
                  onChange={(e) => setCampaignSubject(e.target.value)}
                  placeholder="Enter email subject..."
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Email Body</Label>
                <RichTextEditor
                  content={campaignContent}
                  onChange={setCampaignContent}
                  placeholder="Write your email content here..."
                  minHeight="250px"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveCampaign} disabled={saving || !campaignSubject.trim()}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-1" />
                  )}
                  {editingCampaignId ? "Update Draft" : "Save Draft"}
                </Button>
                {editingCampaignId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingCampaignId(null);
                      setCampaignSubject("");
                      setCampaignContent("");
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CAMPAIGNS TAB */}
        <TabsContent value="campaigns" className="space-y-4 mt-4">
          {loadingCampaigns ? (
            <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
          ) : campaigns.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
              No campaigns yet. Go to Compose to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <Card key={c.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              c.status === "sent"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {c.status}
                          </span>
                          {c.sent_at && (
                            <span className="text-xs text-muted-foreground">
                              Sent {new Date(c.sent_at).toLocaleDateString()} · {c.sent_count} recipients
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium truncate">{c.subject}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Created {new Date(c.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {c.status === "draft" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => editCampaign(c)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => sendCampaign(c.id)}
                              disabled={sending}
                            >
                              {sending ? (
                                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5 mr-1" />
                              )}
                              Send
                            </Button>
                          </>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => deleteCampaign(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* SMS TAB */}
        <TabsContent value="sms" className="space-y-4 mt-4">
          <SMSComposer subscribers={subscribers} toast={toast} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SMSComposer({ subscribers, toast }: { subscribers: any[]; toast: any }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  const smsEligible = subscribers.filter(
    (s: any) => s.sms_opt_in && !s.sms_opt_out && s.phone_number
  );

  const handleSend = async () => {
    if (!message.trim()) return;
    if (!confirm(`Send SMS to ${smsEligible.length} eligible contacts?`)) return;
    setSending(true);
    setResult(null);
    try {
      const res = await supabase.functions.invoke("send-sms", {
        body: { message },
      });
      if (res.error) throw res.error;
      setResult(res.data);
      toast({ title: "SMS sent", description: `${res.data.sent} sent, ${res.data.failed} failed.` });
    } catch (err: any) {
      const errMsg = typeof err === "string" ? err : err?.message || JSON.stringify(err);
      toast({ title: "SMS failed", description: errMsg, variant: "destructive" });
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="h-4 w-4" /> Mass SMS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="text-2xl font-bold">{smsEligible.length}</div>
              <p className="text-xs text-muted-foreground">Opted-In Contacts</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="text-2xl font-bold">{subscribers.filter((s: any) => s.phone_number).length}</div>
              <p className="text-xs text-muted-foreground">With Phone Numbers</p>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi {name}, ..."
              rows={4}
              maxLength={1600}
            />
            <p className="text-xs text-muted-foreground mt-1">{message.length}/1600 characters. Use {"{name}"} for personalization.</p>
          </div>

          <div className="flex gap-2 items-center">
            <Button onClick={handleSend} disabled={sending || !message.trim() || smsEligible.length === 0}>
              {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              {sending ? "Sending…" : `Send to ${smsEligible.length} contacts`}
            </Button>
          </div>

          {result && (
            <div className="text-sm p-3 rounded-lg bg-muted">
              ✅ Sent: {result.sent} | ❌ Failed: {result.failed} | Total: {result.total}
            </div>
          )}

          <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Important Notes:</p>
            <p>• SMS requires Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER) configured as backend secrets.</p>
            <p>• Only contacts with sms_opt_in=true and sms_opt_out=false will receive messages.</p>
            <p>• Quiet hours enforced: 10 PM – 8 AM EST.</p>
            <p>• STOP/UNSUBSCRIBE replies auto-opt-out contacts.</p>
            <p>• Using a personal phone number requires A2P/10DLC registration. A dedicated business number is recommended.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
