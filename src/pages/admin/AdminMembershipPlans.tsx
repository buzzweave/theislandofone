import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMembershipPlans, MembershipPlan } from "@/hooks/useMembershipPlans";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Save, Plus, Trash2, X } from "lucide-react";

export default function AdminMembershipPlans() {
  const { plans, isLoading } = useMembershipPlans();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [newFeature, setNewFeature] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["membership-plans"] });

  const updatePlan = async (id: string, updates: Partial<MembershipPlan>) => {
    try {
      const { error } = await supabase
        .from("membership_plans")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Plan updated" });
      invalidate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const addFeature = () => {
    if (!editingPlan || !newFeature.trim()) return;
    const updated = { ...editingPlan, features: [...editingPlan.features, newFeature.trim()] };
    setEditingPlan(updated);
    setNewFeature("");
  };

  const removeFeature = (index: number) => {
    if (!editingPlan) return;
    const updated = { ...editingPlan, features: editingPlan.features.filter((_, i) => i !== index) };
    setEditingPlan(updated);
  };

  const savePlan = async () => {
    if (!editingPlan) return;
    await updatePlan(editingPlan.id, {
      name: editingPlan.name,
      price: editingPlan.price,
      features: editingPlan.features,
      is_featured: editingPlan.is_featured,
    });
    setEditingPlan(null);
  };

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-display text-2xl font-bold">Membership Plans</h2>
        <p className="text-sm text-muted-foreground">Edit plan names, pricing, and features</p>
      </div>

      {editingPlan ? (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">Editing: {editingPlan.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Plan Name</Label>
              <Input
                value={editingPlan.name}
                onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={editingPlan.price}
                onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Featured plan</p>
                <p className="text-xs text-muted-foreground">Highlighted on the pricing page</p>
              </div>
              <Switch
                checked={editingPlan.is_featured}
                onCheckedChange={(v) => setEditingPlan({ ...editingPlan, is_featured: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>Features</Label>
              <div className="space-y-2">
                {editingPlan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={feature}
                      onChange={(e) => {
                        const features = [...editingPlan.features];
                        features[i] = e.target.value;
                        setEditingPlan({ ...editingPlan, features });
                      }}
                    />
                    <button
                      onClick={() => removeFeature(i)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a feature…"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addFeature()}
                />
                <Button variant="outline" size="sm" onClick={addFeature}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={savePlan}>
                <Save className="h-4 w-4 mr-2" /> Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditingPlan(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`cursor-pointer hover:border-primary/30 transition-colors ${plan.is_featured ? "border-primary/30" : ""}`}
              onClick={() => setEditingPlan({ ...plan })}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
                  <span className="text-xl font-bold text-primary">${plan.price}/mo</span>
                </div>
                {plan.is_featured && (
                  <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">Featured</span>
                )}
                <ul className="mt-3 space-y-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {f}</li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground mt-3">Click to edit</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
