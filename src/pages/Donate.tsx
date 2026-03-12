import { useState } from "react";
import { Heart, Plus, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { useNavigate } from "react-router-dom";

const FREQUENCIES = [
  { value: "one-time", label: "One-Time" },
  { value: "monthly", label: "Monthly" },
  { value: "bi-weekly", label: "Bi-Weekly" },
  { value: "weekly", label: "Weekly" },
];

const FUNDS = [
  "General Support",
  "Books / Media",
  "Other",
];

const PRESET_AMOUNTS = [25, 50, 100, 250, 500, 1000];

interface DonationRow {
  id: number;
  fund: string;
  amount: string;
}

let rowId = 1;

export default function Donate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [frequency, setFrequency] = useState("one-time");
  const [rows, setRows] = useState<DonationRow[]>([{ id: rowId++, fund: FUNDS[0], amount: "" }]);
  const [loading, setLoading] = useState(false);
  const [customMode, setCustomMode] = useState(false);

  const updateRow = (id: number, field: keyof DonationRow, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { id: rowId++, fund: FUNDS[0], amount: "" }]);
  };

  const removeRow = (id: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const selectPreset = (rowId: number, amount: number) => {
    setCustomMode(false);
    updateRow(rowId, "amount", amount.toString());
  };

  const totalAmount = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  const handleSubmit = async () => {
    if (totalAmount <= 0) {
      toast.error("Please enter a donation amount.");
      return;
    }

    setLoading(true);
    try {
      const designations = rows
        .filter((r) => parseFloat(r.amount) > 0)
        .map((r) => ({ fund: r.fund, amount: parseFloat(r.amount) }));

      const { data, error } = await supabase.functions.invoke("create-donation-checkout", {
        body: { frequency, designations, totalAmount },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start donation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 max-w-lg pb-28">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
            <Heart className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Make A Difference Through Your Giving
          </h1>
          <p className="text-muted-foreground text-sm mt-3 max-w-sm mx-auto leading-relaxed">
            Your generosity helps spread the Gospel, support evangelism, publish biblical resources, and bring hope to people around the world.
          </p>
        </div>

        {/* Frequency */}
        <div className="mb-6">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
            How Often Would You Like To Give?
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {FREQUENCIES.map((f) => (
              <button
                key={f.value}
                onClick={() => setFrequency(f.value)}
                className={`rounded-full py-2.5 px-1 text-xs font-semibold transition-all border ${
                  frequency === f.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Donation rows */}
        <div className="space-y-4 mb-4">
          {rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-border bg-card p-4 space-y-4">
              {/* Fund */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Give To</Label>
                <select
                  value={row.fund}
                  onChange={(e) => updateRow(row.id, "fund", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/40 outline-none"
                >
                  {FUNDS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* Preset Amounts */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Select Amount</Label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => selectPreset(row.id, amt)}
                      className={`rounded-full py-2 text-sm font-semibold transition-all border ${
                        !customMode && row.amount === amt.toString()
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { setCustomMode(true); updateRow(row.id, "amount", ""); }}
                  className={`rounded-full py-2 px-4 text-sm font-semibold transition-all border w-full ${
                    customMode
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  Custom
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Amount (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={row.amount}
                    onChange={(e) => { setCustomMode(true); updateRow(row.id, "amount", e.target.value); }}
                    className="pl-7 text-lg font-semibold"
                  />
                </div>
              </div>

              {rows.length > 1 && (
                <button
                  onClick={() => removeRow(row.id)}
                  className="text-xs text-destructive hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add row */}
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors mb-6"
        >
          <Plus className="h-4 w-4" /> Add Another Donation
        </button>

        {/* Total */}
        {totalAmount > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 mb-6">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-lg font-bold text-foreground">${totalAmount.toFixed(2)}</span>
          </div>
        )}

        {/* CTA */}
        <Button
          onClick={handleSubmit}
          disabled={loading || totalAmount <= 0}
          className="w-full h-12 rounded-full text-base font-semibold"
          size="lg"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Continue To Secure Donation"
          )}
        </Button>

        {/* Secure badge */}
        <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          <span>Secure donation powered by Stripe</span>
        </div>
      </div>
    </div>
  );
}
