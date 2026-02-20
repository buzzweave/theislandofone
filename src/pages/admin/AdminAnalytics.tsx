import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FileText, Video, Users, TrendingUp, Eye, DollarSign, Mail, MessageSquare, Mic } from "lucide-react";
import { useBooks } from "@/hooks/useBooks";
import { useSermons } from "@/hooks/useSermons";
import { useVideos } from "@/hooks/useVideos";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembershipPlans } from "@/hooks/useMembershipPlans";
import { useBlogPosts } from "@/hooks/useBlogPosts";

export default function AdminAnalytics() {
  const { data: books = [] } = useBooks();
  const { data: sermons = [] } = useSermons();
  const { data: videos = [] } = useVideos();
  const { plans = [] } = useMembershipPlans();
  const { data: blogPosts = [] } = useBlogPosts();

  const { data: memberCount = 0 } = useQuery({
    queryKey: ["admin-member-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      if (error) return 0;
      return count || 0;
    },
  });

  const { data: subscriberCount = 0 } = useQuery({
    queryKey: ["admin-subscriber-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("subscribers")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      if (error) return 0;
      return count || 0;
    },
  });

  const { data: speakingCount = 0 } = useQuery({
    queryKey: ["admin-speaking-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("speaking_requests")
        .select("*", { count: "exact", head: true });
      if (error) return 0;
      return count || 0;
    },
  });

  const { data: contactCount = 0 } = useQuery({
    queryKey: ["admin-contact-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contact_submissions")
        .select("*", { count: "exact", head: true });
      if (error) return 0;
      return count || 0;
    },
  });

  const { data: membersByPlan = [] } = useQuery({
    queryKey: ["admin-members-by-plan"],
    queryFn: async () => {
      const { data, error } = await supabase.from("members").select("plan").eq("status", "active");
      if (error) return [];
      return data || [];
    },
  });

  const stats = [
    { label: "Total Books", value: books.length, icon: BookOpen },
    { label: "Total Sermons", value: sermons.length, icon: FileText },
    { label: "Total Videos", value: videos.length, icon: Video },
    { label: "Active Members", value: memberCount, icon: Users },
    { label: "Subscribers", value: subscriberCount, icon: Mail },
    { label: "Blog Posts", value: blogPosts.length, icon: FileText },
    { label: "Speaking Requests", value: speakingCount, icon: Mic },
    { label: "Contact Messages", value: contactCount, icon: MessageSquare },
  ];

  const planCounts = plans.map((plan) => {
    const count = membersByPlan.filter((m) => m.plan?.toLowerCase() === plan.name?.toLowerCase()).length;
    return { ...plan, count };
  });
  const totalMembers = memberCount || 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Analytics</h2>
        <p className="text-sm text-muted-foreground">Live ministry performance overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Content Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Books", count: books.length, icon: BookOpen },
                { label: "Sermons", count: sermons.length, icon: FileText },
                { label: "Videos", count: videos.length, icon: Video },
                { label: "Blog Posts", count: blogPosts.length, icon: FileText },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Featured content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Featured Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {books.filter((b) => b.featured).map((b, i) => (
                <div key={b.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{b.title}</p>
                      <p className="text-xs text-muted-foreground">Book</p>
                    </div>
                  </div>
                  <span className="text-xs text-primary">{b.is_free ? "Free" : `$${b.price}`}</span>
                </div>
              ))}
              {sermons.filter((s) => s.featured).map((s, i) => (
                <div key={s.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-4">{books.filter((b) => b.featured).length + i + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground">Sermon</p>
                    </div>
                  </div>
                  <span className="text-xs text-primary">{s.is_free ? "Free" : `$${s.price}`}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Membership breakdown */}
      {plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Membership Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {planCounts.map((plan) => (
                <div key={plan.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{plan.name}</span>
                    <span className="text-sm text-muted-foreground">{plan.count} members</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(plan.count / totalMembers) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">${(plan.count * plan.price).toFixed(0)}/mo est. revenue</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
