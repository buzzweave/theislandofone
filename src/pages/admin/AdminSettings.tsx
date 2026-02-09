import { useState } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Save, Globe, Bell, Shield, CreditCard, Database, MessageSquare, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const { toast } = useToast();
  const [siteName, setSiteName] = useState("The Island of One Ministries");
  const [siteDescription, setSiteDescription] = useState("Faith, Purpose, and Leadership resources by Bryant Clark");
  const [contactEmail, setContactEmail] = useState("support@buzzweave.com");
  const [notifyNewMembers, setNotifyNewMembers] = useState(true);
  const [notifySpeakingRequests, setNotifySpeakingRequests] = useState(true);
  const [notifyBookPurchases, setNotifyBookPurchases] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState(true);

  // API Keys state
  const [stripeKey, setStripeKey] = useState("");
  const [stripeKeySaved, setStripeKeySaved] = useState(false);
  const [showStripeKey, setShowStripeKey] = useState(false);

  const [storageKey, setStorageKey] = useState("");
  const [storageKeySaved, setStorageKeySaved] = useState(false);
  const [showStorageKey, setShowStorageKey] = useState(false);

  const [chatgptKey, setChatgptKey] = useState("");
  const [chatgptKeySaved, setChatgptKeySaved] = useState(false);
  const [showChatgptKey, setShowChatgptKey] = useState(false);

  const handleSave = () => {
    toast({ title: "Settings saved", description: "Your changes have been applied." });
  };

  const handleSaveApiKey = (type: "stripe" | "storage" | "chatgpt") => {
    if (type === "stripe" && stripeKey.trim()) {
      setStripeKeySaved(true);
      toast({ title: "Stripe API key saved", description: "Stripe payments are now enabled." });
    } else if (type === "storage" && storageKey.trim()) {
      setStorageKeySaved(true);
      toast({ title: "Storage API key saved", description: "External storage is now connected." });
    } else if (type === "chatgpt" && chatgptKey.trim()) {
      setChatgptKeySaved(true);
      toast({ title: "ChatGPT API key saved", description: "AI features are now enabled." });
    } else {
      toast({ title: "Error", description: "Please enter a valid API key.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-display text-2xl font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage site configuration & API integrations</p>
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
            <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Site Description</Label>
            <Textarea value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Contact Email</Label>
            <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
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
          <CardDescription>Choose what triggers email alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">New member signups</p>
              <p className="text-xs text-muted-foreground">Get notified when someone subscribes</p>
            </div>
            <Switch checked={notifyNewMembers} onCheckedChange={setNotifyNewMembers} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Speaking requests</p>
              <p className="text-xs text-muted-foreground">Alert on new speaking inquiries</p>
            </div>
            <Switch checked={notifySpeakingRequests} onCheckedChange={setNotifySpeakingRequests} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Book purchases</p>
              <p className="text-xs text-muted-foreground">Notification for each book sale</p>
            </div>
            <Switch checked={notifyBookPurchases} onCheckedChange={setNotifyBookPurchases} />
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
              <p className="text-xs text-muted-foreground">Show a maintenance page to visitors</p>
            </div>
            <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Allow new registrations</p>
              <p className="text-xs text-muted-foreground">Let new members sign up</p>
            </div>
            <Switch checked={allowRegistration} onCheckedChange={setAllowRegistration} />
          </div>
        </CardContent>
      </Card>

      {/* Stripe API */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Stripe API
            {stripeKeySaved && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
          </CardTitle>
          <CardDescription>Connect Stripe for book purchases and membership payments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Stripe Secret Key</Label>
            <div className="relative">
              <Input
                type={showStripeKey ? "text" : "password"}
                placeholder="sk_live_..."
                value={stripeKey}
                onChange={(e) => { setStripeKey(e.target.value); setStripeKeySaved(false); }}
              />
              <button
                type="button"
                onClick={() => setShowStripeKey(!showStripeKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showStripeKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Find your key at{" "}
              <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                dashboard.stripe.com/apikeys
              </a>
            </p>
          </div>
          <Button size="sm" onClick={() => handleSaveApiKey("stripe")} disabled={!stripeKey.trim()}>
            {stripeKeySaved ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Connected</> : <><Save className="h-4 w-4 mr-2" /> Save Key</>}
          </Button>
        </CardContent>
      </Card>

      {/* Storage API */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Storage API
            {storageKeySaved && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
          </CardTitle>
          <CardDescription>Connect external cloud storage for files and media</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Storage API Key</Label>
            <div className="relative">
              <Input
                type={showStorageKey ? "text" : "password"}
                placeholder="Enter your storage API key..."
                value={storageKey}
                onChange={(e) => { setStorageKey(e.target.value); setStorageKeySaved(false); }}
              />
              <button
                type="button"
                onClick={() => setShowStorageKey(!showStorageKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showStorageKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              API key for your cloud storage provider (AWS S3, Google Cloud, etc.)
            </p>
          </div>
          <Button size="sm" onClick={() => handleSaveApiKey("storage")} disabled={!storageKey.trim()}>
            {storageKeySaved ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Connected</> : <><Save className="h-4 w-4 mr-2" /> Save Key</>}
          </Button>
        </CardContent>
      </Card>

      {/* ChatGPT API */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            ChatGPT / OpenAI API
            {chatgptKeySaved && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
          </CardTitle>
          <CardDescription>Enable AI-powered writing assistance and content generation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>OpenAI API Key</Label>
            <div className="relative">
              <Input
                type={showChatgptKey ? "text" : "password"}
                placeholder="sk-..."
                value={chatgptKey}
                onChange={(e) => { setChatgptKey(e.target.value); setChatgptKeySaved(false); }}
              />
              <button
                type="button"
                onClick={() => setShowChatgptKey(!showChatgptKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showChatgptKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your key at{" "}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                platform.openai.com/api-keys
              </a>
            </p>
          </div>
          <Button size="sm" onClick={() => handleSaveApiKey("chatgpt")} disabled={!chatgptKey.trim()}>
            {chatgptKeySaved ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Connected</> : <><Save className="h-4 w-4 mr-2" /> Save Key</>}
          </Button>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full sm:w-auto">
        <Save className="h-4 w-4 mr-2" /> Save Settings
      </Button>
    </div>
  );
}
