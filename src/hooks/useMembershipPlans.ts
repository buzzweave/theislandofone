import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

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
    queryFn: () => api.get<MembershipPlan[]>("/api/membership-plans"),
  });
  return { plans, isLoading };
}
