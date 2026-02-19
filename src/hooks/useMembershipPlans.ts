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
    queryFn: async () => {
      const raw = await api.get<any[]>("/api/plans");
      return raw.map((p: any) => ({
        ...p,
        price: Number(p.price) || 0,
        is_featured: p.is_featured === 1 || p.is_featured === true,
        features: Array.isArray(p.features)
          ? p.features
          : typeof p.features === "string"
          ? JSON.parse(p.features)
          : [],
      })) as MembershipPlan[];
    },
  });
  return { plans, isLoading };
}
