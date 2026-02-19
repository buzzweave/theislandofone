import { Link, Navigate } from "react-router-dom";
import { MessageSquare, Lock, Users, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useForumCategories } from "@/hooks/useForum";
import { getTierByProductId, tierHasAccess } from "@/lib/stripe";
import { formatDistanceToNow } from "date-fns";

export default function Community() {
  const { user, isLoading, subscription } = useAuth();
  const { data: categories, isLoading: catsLoading } = useForumCategories();

  if (!isLoading && !user) return <Navigate to="/auth" replace />;

  const userTier = getTierByProductId(subscription.product_id);
  const readerCats = categories?.filter((c) => c.tier_required === "reader") || [];
  const pastorCats = categories?.filter((c) => c.tier_required === "pastor") || [];

  return (
    <div className="container mx-auto px-4 md:px-8 py-10 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">Community</h1>
        <p className="text-muted-foreground">
          Connect with fellow believers. Share, discuss, and grow together.
        </p>
      </div>

      {catsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <Section
            title="Community Forum"
            icon={<Users className="h-5 w-5 text-primary" />}
            subtitle="Open to all members"
            categories={readerCats}
            userTier={userTier}
          />
          <Section
            title="Ministry Support Group"
            icon={<ShieldCheck className="h-5 w-5 text-primary" />}
            subtitle="Pastor tier and above"
            categories={pastorCats}
            userTier={userTier}
            className="mt-10"
          />
        </>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  subtitle,
  categories,
  userTier,
  className = "",
}: {
  title: string;
  icon: React.ReactNode;
  subtitle: string;
  categories: ReturnType<typeof useForumCategories>["data"] & any[];
  userTier: ReturnType<typeof getTierByProductId>;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h2 className="text-lg font-display font-semibold">{title}</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>
      <div className="space-y-3">
        {categories.map((cat: any) => {
          const locked = !tierHasAccess(userTier, [cat.tier_required]);
          return (
            <CategoryCard key={cat.id} category={cat} locked={locked} />
          );
        })}
      </div>
    </section>
  );
}

function CategoryCard({ category, locked }: { category: any; locked: boolean }) {
  const inner = (
    <div
      className={`flex items-start gap-4 p-4 rounded-lg border border-border transition-colors ${
        locked ? "opacity-60 bg-muted/40" : "hover:bg-muted/50 bg-card"
      }`}
    >
      <div className="mt-1">
        {locked ? (
          <Lock className="h-5 w-5 text-muted-foreground" />
        ) : (
          <MessageSquare className="h-5 w-5 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground">{category.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-1">{category.description}</p>
        {category.latest_post && !locked && (
          <p className="text-xs text-muted-foreground mt-1.5">
            Latest: <span className="text-foreground">{category.latest_post.title}</span>{" "}
            by {category.latest_post.author_name}{" "}
            · {formatDistanceToNow(new Date(category.latest_post.created_at), { addSuffix: true })}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <span className="text-sm font-medium text-foreground">{category.post_count ?? 0}</span>
        <p className="text-xs text-muted-foreground">threads</p>
      </div>
    </div>
  );

  if (locked) {
    return (
      <Link to="/membership" className="block">
        {inner}
      </Link>
    );
  }

  return (
    <Link to={`/community/${category.slug}`} className="block">
      {inner}
    </Link>
  );
}
