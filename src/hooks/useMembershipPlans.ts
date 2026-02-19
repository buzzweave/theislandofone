import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MembershipPlan {
  id: string;
  slug: string;
  name: string;
  price: number;
  features: string[];
  is_featured: boolean;
  sort_order: number;
}

export function useMembershipPlans() {
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["membership-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_plans")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as MembershipPlan[];
    },
  });
  return { plans, isLoading };
}
