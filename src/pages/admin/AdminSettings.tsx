import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Save,
  Globe,
  Bell,
  Shield,
  CheckCircle2,
  Cloud,
  Bot,
  Headphones,
  Trash2,
  Mail,
  Loader2,
  AlertCircle,
  PenLine,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";

export default function AdminSettings() {
  const { toast } = useToast();

  const siteName = useSiteSettings("site_name", "The Island of One Ministries");
  const siteDescription = useSiteSettings(
    "site_description",
    "Faith, Purpose, and Leadership resources by Bryant Clark"
  );
  const contactEmail = useSiteSettings("contact_email", "support@buzzweave.com");
  const notifyNewMembers = useSiteSettings("notify_new_members", "true");
  const notifySpeakingRequests = useSiteSettings(
    "notify_speaking_requests",
    "true"
  );
  const notifyBookPurchases = useSiteSettings("notify_book_purchases", "false");
  const maintenanceMode = useSiteSettings("maintenance_mode", "false");
  const allowRegistration = useSiteSettings("allow_registration", "true");
  const studioLanding = useSiteSettings("studio_landing_enabled", "false");

  const chatgptApiKey = useSiteSettings("chatgpt_api_key", "");
  const elevenlabsApiKey = useSiteSettings("elevenlabs_api_key", "");

  const [localName, setLocalName] = useState("");
  const [localDesc, setLocalDesc] = useState("");
  const [localEmail, setLocalEmail] = useState("");
  const [localChatgptKey, setLocalChatgptKey] = useState("");
  const [localElevenlabsKey, setLocalElevenlabsKey] = useState("");

  const [emailSettings, setEmailSettings] = useState({
    from_name: "",
    from_email: "",
    reply_to: "",
  });
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailTestLoading, setEmailTestLoading] = useState(false);
  const [emailLoaded, setEmailLoaded] = useState(false);

  const getInvokeErrorMessage = (err: any, data: any) => {
    const base =
      err?.message ||
      err?.details ||
      err?.context ||
      (typeof err === "string" ? err : "");

    const fromData =
      data && typeof data === "object" && data !== null
        ? (data.message || data.error || data.details || "")
        : "";

    return String(fromData || base || "Email test failed.");
  };

  useEffect(() => {
    async function loadEmailSettings() {
      const { data } = await supabase
        .from("smtp_settings")
        .select("*")
        .limit(1)
        .single();

      if (data) {
        setEmailSettings({
          from_name: data.from_name || "",
          from_email: data.from_email || "",
          reply_to: data.reply_to || "",
        });
        setEmailVerified(data.is_verified || false);
      }
      setEmailLoaded(true);
    }

    loadEmailSettings();
  }, []);

  useEffect(() => {
    if (!siteName.isLoading) setLocalName(siteName.value);
  }, [siteName.value, siteName.isLoading]);

  useEffect(() => {
    if (!siteDescription.isLoading) setLocalDesc(siteDescription.value);
  }, [siteDescription.value, siteDescription.isLoading]);

  useEffect(() => {
    if (!contactEmail.isLoading) setLocalEmail(contactEmail.value);
  }, [contactEmail.value, contactEmail.isLoading]);

  useEffect(() => {
    if (!chatgptApiKey.isLoading) setLocalChatgptKey(chatgptApiKey.value);
  }, [chatgptApiKey.value, chatgptApiKey.isLoading]);

  useEffect(() => {
    if (!elevenlabsApiKey.isLoading) setLocalElevenlabsKey(elevenlabsApiKey.value);
  }, [elevenlabsApiKey.value, elevenlabsApiKey.isLoading]);

  const handleSaveEmail = async () => {
    setEmailSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-notification",
        {
          body: {
            action: "save_smtp",
            data: {
              from_name: emailSettings.from_name,
              from_email: emailSettings.from_email,
              reply_to: emailSettings.reply_to,
            },
          },
        }
      );

      if (error) throw error;

      if (data && typeof data === "object" && data !== null && (data as any).ok === false) {
        throw new Error(
          String((data as any).message || (data as any).error || "Failed to save email settings.")
        );
      }

      toast({ title: "Email settings saved" });
    } catch (e: any) {
      toast({
        title: "Failed to save email settings",
        description: e?.message || "Please check your email provider configuration.",
        variant: "destructive",
      });
    } finally {
      setEmailSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setEmailTestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-notification",
        {
          body: { action: "test_smtp", data: {} },
        }
      );

      if (error) {
        console.log("send-notification test_smtp invoke error:", error, "data:", data);
        throw new Error(getInvokeErrorMessage(error, data));
      }

      if (data && typeof data === "object" && data !== null && (data as any).ok === false) {
        console.log("send-notification returned ok:false:", data);
        throw new Error(getInvokeErrorMessage(null, data));
      }

      setEmailVerified(true);
      toast({
        title: "Test email sent!",
        description: `Check your inbox at ${localEmail || "support@buzzweave.com"}`,
      });
    } catch (e: any) {
      setEmailVerified(false);
      toast({
        title: "Email test failed",
        description: e?.message || "Open the console for details.",
        variant: "destructive",
      });
    } finally {
      setEmailTestLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await Promise.all([
        siteName.updateValue(localName),
        siteDescription.updateValue(localDesc),
        contactEmail.updateValue(localEmail),
        chatgptApiKey.updateValue(localChatgptKey),
        elevenlabsApiKey.updateValue(localElevenlabsKey),
      ]);
      toast({ title: "Settings saved", description: "Your changes have been applied." });
    } catch {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    }
  };

  const toggleSetting = async (
    setting: ReturnType<typeof useSiteSettings>,
    checked: boolean
  ) => {
    try {
      await setting.updateValue(checked ? "true" : "false");
    } catch {
      toast({ title: "Error", description: "Failed to update setting.", variant: "destructive" });
    }
  };

  const isLoading =
    siteName.isLoading || siteDescription.isLoading || contactEmail.isLoading;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-display text-2xl font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage site configuration & integrations
        </p>
      </div>

      {/* General */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            General
          </CardTitle>
          <CardDescription>Basic site information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Site Name</Label>
            <Input
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Site Description</Label>
            <Textarea
              value={localDesc}
              onChange={(e) => setLocalDesc(e.target.value)}
              rows={2}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Contact Email</Label>
            <Input
              value={localEmail}
              onChange={(e) => setLocalEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Notifications
          </CardTitle>
          <CardDescription>Choose what triggers dashboard alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">New member signups</p>
              <p className="text-xs text-muted-foreground">
                Get notified when someone subscribes
              </p>
            </div>
            <Switch
              checked={notifyNewMembers.value === "true"}
              onCheckedChange={(checked) => toggleSetting(notifyNewMembers, checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Speaking requests</p>
              <p className="text-xs text-muted-foreground">
                Alert on new speaking inquiries
              </p>
            </div>
            <Switch
              checked={notifySpeakingRequests.value === "true"}
              onCheckedChange={(checked) =>
                toggleSetting(notifySpeakingRequests, checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Book purchases</p>
              <p className="text-xs text-muted-foreground">
                Notification for each book sale
              </p>
            </div>
            <Switch
              checked={notifyBookPurchases.value === "true"}
              onCheckedChange={(checked) =>
                toggleSetting(notifyBookPurchases, checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Security & Access
          </CardTitle>
          <CardDescription>Control site access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Maintenance mode</p>
              <p className="text-xs text-muted-foreground">
                Show a maintenance page to visitors
              </p>
            </div>
            <Switch
              checked={maintenanceMode.value === "true"}
              onCheckedChange={(checked) => toggleSetting(maintenanceMode, checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Allow new registrations</p>
              <p className="text-xs text-muted-foreground">
                Let new members sign up
              </p>
            </div>
            <Switch
              checked={allowRegistration.value === "true"}
              onCheckedChange={(checked) => toggleSetting(allowRegistration, checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="h-4 w-4 text-primary" />
            Integrations
          </CardTitle>
          <CardDescription>Connected services and their status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cloud className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Cloud Storage</p>
                <p className="text-xs text-muted-foreground">
                  File storage for images, audio, and media
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-primary">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium">Active</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">ChatGPT / OpenAI</p>
                <p className="text-xs text-muted-foreground">
                  AI-powered content generation
                </p>
              </div>
            </div>

            <div className="space-y-2 pl-8">
              <Label>API Key</Label>
              <Input
                type="password"
                value={localChatgptKey}
                onChange={(e) => setLocalChatgptKey(e.target.value)}
                placeholder="sk-..."
                disabled={isLoading}
              />
              <div className="flex items-center gap-1.5">
                {localChatgptKey ? (
                  <span className="text-xs text-primary flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Configured
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Not configured
                  </span>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Headphones className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">ElevenLabs</p>
                <p className="text-xs text-muted-foreground">
                  Text-to-Speech audio generation
                </p>
              </div>
            </div>

            <div className="space-y-2 pl-8">
              <Label>API Key</Label>
              <Input
                type="password"
                value={localElevenlabsKey}
                onChange={(e) => setLocalElevenlabsKey(e.target.value)}
                placeholder="xi-..."
                disabled={isLoading}
              />
              <div className="flex items-center gap-1.5">
                {localElevenlabsKey ? (
                  <span className="text-xs text-primary flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Configured
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Not configured
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email / Resend Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            Email Settings (Resend)
          </CardTitle>
          <CardDescription>Configure outgoing email via Resend</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailLoaded && (
            <>
              <div className="flex items-center gap-2 mb-2">
                {emailVerified ? (
                  <span className="text-xs text-primary flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Connected & Verified
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> Not verified — send
                    a test email
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Name</Label>
                  <Input
                    value={emailSettings.from_name}
                    onChange={(e) =>
                      setEmailSettings((s) => ({
                        ...s,
                        from_name: e.target.value,
                      }))
                    }
                    placeholder="The Island of One"
                  />
                </div>

                <div className="space-y-2">
                  <Label>From Email</Label>
                  <Input
                    value={emailSettings.from_email}
                    onChange={(e) =>
                      setEmailSettings((s) => ({
                        ...s,
                        from_email: e.target.value,
                      }))
                    }
                    placeholder="noreply@theislandofone.com"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Reply-To Email</Label>
                  <Input
                    value={emailSettings.reply_to}
                    onChange={(e) =>
                      setEmailSettings((s) => ({
                        ...s,
                        reply_to: e.target.value,
                      }))
                    }
                    placeholder="support@buzzweave.com"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Your verified Resend domain is <code className="text-xs">theislandofone.com</code>.
                The From Email must use this domain (e.g. <code className="text-xs">noreply@theislandofone.com</code>).
              </p>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSaveEmail} disabled={emailSaving} size="sm">
                  {emailSaving ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Save Email Settings
                </Button>

                <Button
                  onClick={handleTestEmail}
                  disabled={emailTestLoading}
                  variant="outline"
                  size="sm"
                >
                  {emailTestLoading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-1" />
                  )}
                  Send Test Email
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cache */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-primary" />
            Cache
          </CardTitle>
          <CardDescription>Clear browser cache and stored data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If you're experiencing loading issues, stale data, or a stuck spinner,
            clearing the cache can help resolve them.
          </p>

          <Button
            variant="destructive"
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              toast({
                title: "Cache cleared",
                description: "Local storage and session data have been wiped. Reloading…",
              });
              setTimeout(() => window.location.reload(), 1500);
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Clear Cache & Reload
          </Button>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        className="w-full sm:w-auto"
        disabled={isLoading}
      >
        <Save className="h-4 w-4 mr-2" /> Save Settings
      </Button>
    </div>
  );
}
