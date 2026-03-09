import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KeyRound, Plus, Copy, Check, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function AdminAccessCodes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New code form
  const [planType, setPlanType] = useState("reader");
  const [notes, setNotes] = useState("");
  const [isSingleUse, setIsSingleUse] = useState(true);

  const invokeAdmin = async (body: any) => {
    const adminToken = localStorage.getItem("admin_token");
    const { data, error } = await supabase.functions.invoke("access-codes-admin", {
      body,
      headers: adminToken ? { "x-admin-token": adminToken } : {},
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["admin-access-codes"],
    queryFn: () => invokeAdmin({ action: "list" }),
  });

  const createCode = useMutation({
    mutationFn: () => invokeAdmin({
      action: "create",
      plan_type: planType,
      notes,
      is_single_use: isSingleUse,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-access-codes"] });
      setNotes("");
      toast({ title: "Access code created" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteCode = useMutation({
    mutationFn: (id: string) => invokeAdmin({ action: "delete", id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-access-codes"] });
      toast({ title: "Code deleted" });
    },
  });

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <KeyRound className="h-6 w-6" /> Lifetime Access Codes
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generate codes that grant free lifetime access to specific membership tiers.
        </p>
      </div>

      {/* Create Code */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generate New Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Plan Type</Label>
              <Select value={planType} onValueChange={setPlanType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reader">Reader</SelectItem>
                  <SelectItem value="pastor">Pastor</SelectItem>
                  <SelectItem value="inner-circle">Inner Circle</SelectItem>
                  <SelectItem value="full">Full Access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. For John Doe"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Switch checked={isSingleUse} onCheckedChange={setIsSingleUse} />
              <Label className="text-sm">Single-use</Label>
            </div>
            <Button onClick={() => createCode.mutate()} disabled={createCode.isPending}>
              {createCode.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Generate Code
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Codes List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Codes</CardTitle>
          <CardDescription>{codes.length} code{codes.length !== 1 ? "s" : ""} total</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : codes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No access codes yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                            {c.code}
                          </code>
                          <button
                            onClick={() => copyCode(c.code, c.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copiedId === c.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{c.plan_type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.is_single_use ? "Single-use" : "Multi-use"}
                      </TableCell>
                      <TableCell>
                        {c.redeemed_by_user_id ? (
                          <Badge variant="secondary">
                            Redeemed {c.redeemed_at ? format(new Date(c.redeemed_at), "MMM d, yyyy") : ""}
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500/10 text-green-600 border-green-200">Available</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                        {c.notes || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(c.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCode.mutate(c.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
