import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAIDev } from "@/hooks/useAIDev";

export default function AIDevAuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const { getAudit, loading } = useAIDev();

  const load = async (s?: string) => {
    const data = await getAudit(s || undefined);
    if (data) setLogs(data);
  };

  useEffect(() => { load(); }, []);

  const handleSearch = () => load(search);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold">Audit Log</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Search actions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Plan ID</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    {loading ? "Loading…" : "No audit entries."}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.action.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.plan_id?.slice(0, 8) || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{JSON.stringify(l.details)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
