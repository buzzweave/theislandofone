import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function AdminUserAccess() {
  // Fetch members with their access info
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["admin-user-access"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch redeemed access codes
  const { data: redeemedCodes = [] } = useQuery({
    queryKey: ["admin-redeemed-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_codes")
        .select("*")
        .not("redeemed_by_user_id", "is", null);
      if (error) throw error;
      return data;
    },
  });

  const codesByUserId = new Map<string, any>();
  redeemedCodes.forEach((c: any) => {
    if (c.redeemed_by_user_id) codesByUserId.set(c.redeemed_by_user_id, c);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> User Access Records
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Inspect user subscription status, plan type, and lifetime access.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Members</CardTitle>
          <CardDescription>{members.length} member{members.length !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : members.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No members found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lifetime Code</TableHead>
                    <TableHead>Access Active</TableHead>
                    <TableHead>Since</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m: any) => {
                    const hasCode = m.user_id ? codesByUserId.has(m.user_id) : false;
                    const isActive = m.status === "active" && m.plan !== "Free";
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell className="text-sm">{m.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{m.plan}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={m.status === "active" ? "default" : "secondary"}>
                            {m.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {hasCode ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-200">Yes</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">No</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isActive ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-200">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(m.created_at), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
