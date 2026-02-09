import { useState } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Save, Globe, Bell, Shield, Palette } from "lucide-react";
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

  const handleSave = () => {
    toast({ title: "Settings saved", description: "Your changes have been applied." });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-display text-2xl font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage site configuration</p>
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

      <Button onClick={handleSave} className="w-full sm:w-auto">
        <Save className="h-4 w-4 mr-2" /> Save Settings
      </Button>
    </div>
  );
}
