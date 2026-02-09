import { useState } from "react";
import { membershipPlans } from "@/data/content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Search, Mail } from "lucide-react";

interface Member {
  id: string;
  name: string;
  email: string;
  plan: string;
  joinedAt: string;
  status: "active" | "paused" | "cancelled";
}

const mockMembers: Member[] = [
  { id: "1", name: "Sarah Johnson", email: "sarah@example.com", plan: "Pastor", joinedAt: "2025-08-15", status: "active" },
  { id: "2", name: "Michael Brown", email: "michael@example.com", plan: "Inner Circle", joinedAt: "2025-09-01", status: "active" },
  { id: "3", name: "Emily Davis", email: "emily@example.com", plan: "Reader", joinedAt: "2025-10-12", status: "paused" },
  { id: "4", name: "James Wilson", email: "james@example.com", plan: "Reader", joinedAt: "2025-11-03", status: "active" },
  { id: "5", name: "Lisa Martinez", email: "lisa@example.com", plan: "Pastor", joinedAt: "2025-11-20", status: "cancelled" },
];

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-600 border-green-500/20",
  paused: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function AdminMembers() {
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");

  const filtered = mockMembers.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = filterPlan === "all" || m.plan === filterPlan;
    return matchesSearch && matchesPlan;
  });

  const planCounts = membershipPlans.map((p) => ({
    ...p,
    count: mockMembers.filter((m) => m.plan === p.name && m.status === "active").length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Members</h2>
        <p className="text-sm text-muted-foreground">Manage membership subscribers</p>
      </div>

      {/* Plan summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {planCounts.map((plan) => (
          <Card key={plan.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{plan.name}</p>
                  <p className="text-2xl font-bold">{plan.count}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">${plan.price}/mo per member</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterPlan} onValueChange={setFilterPlan}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            {membershipPlans.map((p) => (
              <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Members table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell className="text-muted-foreground">{member.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{member.plan}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[member.status]}>
                    {member.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon">
                    <Mail className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No members found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
