import { Check, Crown } from "lucide-react";
import { useMembershipPlans } from "@/hooks/useMembershipPlans";

export default function Membership() {
  const { plans, isLoading } = useMembershipPlans();

  return (
    <div className="min-h-screen">
      <section className="py-20 bg-gradient-section">
        <div className="container mx-auto px-4 text-center">
          <Crown className="h-10 w-10 text-primary mx-auto mb-4" />
          <h1 className="font-display text-5xl md:text-6xl font-bold mb-4">Membership</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Join a community of believers. Unlock exclusive content, sermons, and direct access to the ministry.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground">Loading plans…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-2xl border p-8 flex flex-col transition-all duration-300 ${
                    plan.is_featured
                      ? "border-primary bg-primary/5 shadow-gold scale-105"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  {plan.is_featured && (
                    <span className="text-[10px] uppercase tracking-widest text-primary font-semibold mb-4">Most Popular</span>
                  )}
                  <h2 className="font-display text-2xl font-bold mb-2">{plan.name}</h2>
                  <p className="text-4xl font-bold text-primary mb-1">
                    ${plan.price}
                  </p>
                  <p className="text-sm text-muted-foreground mb-8">per month · cancel anytime</p>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-secondary-foreground">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`w-full py-3 rounded-full text-sm font-semibold transition-colors ${
                      plan.is_featured
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold"
                        : "border border-primary/30 text-foreground hover:bg-primary/10"
                    }`}
                  >
                    Get Started
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground mt-12 max-w-lg mx-auto">
            All plans include a 7-day free trial. Payments processed securely via Stripe. Cancel anytime from your dashboard.
          </p>
        </div>
      </section>
    </div>
  );
}
