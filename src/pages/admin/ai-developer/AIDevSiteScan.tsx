import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAIDev } from "@/hooks/useAIDev";
import { Loader2, Search } from "lucide-react";

export default function AIDevSiteScan() {
  const [scanResult, setScanResult] = useState<any>(null);
  const { runScan, loading } = useAIDev();

  const handleScan = async () => {
    const data = await runScan("full");
    if (data) setScanResult(data);
  };

  const findings = scanResult?.results?.findings || [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold">Site Scan</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run a Scan</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleScan} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning…</> : <><Search className="h-4 w-4 mr-2" /> Run Scan</>}
          </Button>
        </CardContent>
      </Card>

      {scanResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Pages scanned: {scanResult.results?.pages_scanned}</span>
              <span>Issues: {scanResult.results?.issues_found}</span>
            </div>
            {findings.map((f: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-md border">
                <Badge variant={f.severity === "warning" ? "destructive" : "secondary"} className="shrink-0 mt-0.5">
                  {f.severity}
                </Badge>
                <div>
                  <p className="text-sm font-medium">{f.area}</p>
                  <p className="text-sm text-muted-foreground">{f.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
