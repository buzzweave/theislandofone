import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sermons, videos, membershipPlans } from "@/data/content";
import { BarChart3, BookOpen, FileText, Video, Users, TrendingUp, Eye, DollarSign } from "lucide-react";
import { useBooks } from "@/hooks/useBooks";

const staticStats = [
  { label: "Total Sermons", value: sermons.length, icon: FileText, change: "+3 this month" },
  { label: "Total Videos", value: videos.length, icon: Video, change: "+1 this month" },
  { label: "Active Members", value: 127, icon: Users, change: "+12 this month" },
];

const topContent = [
  { title: "The Power of One", type: "Sermon", views: 1245, trend: "up" },
  { title: "Finding Your Island", type: "Book", views: 892, trend: "up" },
  { title: "Ministry Vision", type: "Video", views: 756, trend: "up" },
  { title: "Wilderness Worship", type: "Sermon", views: 634, trend: "down" },
  { title: "Standing Alone", type: "Book", views: 521, trend: "up" },
];

const revenueData = [
  { month: "Sep", amount: 1240 },
  { month: "Oct", amount: 1580 },
  { month: "Nov", amount: 1890 },
  { month: "Dec", amount: 2340 },
  { month: "Jan", amount: 2120 },
  { month: "Feb", amount: 2680 },
];

export default function AdminAnalytics() {
  const { data: books = [] } = useBooks();
  const maxRevenue = Math.max(...revenueData.map((d) => d.amount));

  const stats = [
    { label: "Total Books", value: books.length, icon: BookOpen, change: "+2 this month" },
    ...staticStats,
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Analytics</h2>
        <p className="text-sm text-muted-foreground">Ministry performance overview</p>
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
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Revenue (6 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {revenueData.map((d) => (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">${d.amount}</span>
                  <div
                    className="w-full bg-primary/80 rounded-t-sm transition-all"
                    style={{ height: `${(d.amount / maxRevenue) * 100}%` }}
                  />
                  <span className="text-xs text-muted-foreground">{d.month}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Top Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topContent.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.views.toLocaleString()}</span>
                    <TrendingUp className={`h-3 w-3 ${item.trend === "up" ? "text-green-500" : "text-destructive rotate-180"}`} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Membership breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Membership Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {membershipPlans.map((plan) => {
              const count = plan.id === "reader" ? 78 : plan.id === "pastor" ? 34 : 15;
              const total = 127;
              return (
                <div key={plan.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{plan.name}</span>
                    <span className="text-sm text-muted-foreground">{count} members</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(count / total) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">${(count * plan.price).toFixed(0)}/mo revenue</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
