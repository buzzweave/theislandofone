import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getTierByProductId, tierHasAccess } from "@/lib/stripe";
import type { ReactNode } from "react";

interface TierGateProps {
  requiredTier: string;
  children: ReactNode;
}

export default function TierGate({ requiredTier, children }: TierGateProps) {
  const { subscription } = useAuth();
  const userTier = getTierByProductId(subscription.product_id);
  const hasAccess = tierHasAccess(userTier, [requiredTier]);

  if (hasAccess) return <>{children}</>;

  const tierLabel = requiredTier === "pastor" ? "Pastor" : "Reader";

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-display font-semibold mb-2">
        {tierLabel} Tier Required
      </h3>
      <p className="text-muted-foreground max-w-md mb-6">
        This section is exclusively available to {tierLabel} tier members and above.
        Upgrade your membership to join the conversation.
      </p>
      <Link
        to="/membership"
        className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
      >
        Upgrade Membership
      </Link>
    </div>
  );
}
