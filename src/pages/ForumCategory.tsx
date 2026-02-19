import { useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Plus, Pin, MessageSquare, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useForumPosts, useCreatePost } from "@/hooks/useForum";
import { getTierByProductId, tierHasAccess } from "@/lib/stripe";
import TierGate from "@/components/forum/TierGate";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

export default function ForumCategory() {
  const { slug } = useParams<{ slug: string }>();
  const { user, isLoading: authLoading, subscription } = useAuth();
  const { data, isLoading } = useForumPosts(slug || "");
  const [showForm, setShowForm] = useState(false);

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  const userTier = getTierByProductId(subscription.product_id);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 md:px-8 py-10 max-w-3xl">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!data) return <div className="container mx-auto px-4 py-10">Category not found.</div>;

  const { posts, category } = data;
  const hasAccess = tierHasAccess(userTier, [category.tier_required]);

  return (
    <div className="container mx-auto px-4 md:px-8 py-10 max-w-3xl">
      <Link to="/community" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Community
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">{category.name}</h1>
          <p className="text-muted-foreground text-sm">{category.description}</p>
        </div>
        {hasAccess && (
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" /> New Thread
          </Button>
        )}
      </div>

      {!hasAccess ? (
        <TierGate requiredTier={category.tier_required}><div /></TierGate>
      ) : (
        <>
          {showForm && <NewPostForm categoryId={category.id} onDone={() => setShowForm(false)} />}

          {posts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No threads yet. Be the first to start a conversation!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/community/${slug}/${post.id}`}
                  className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {post.is_pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}
                      {post.is_locked && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      <h3 className="font-semibold text-foreground truncate">{post.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      by {post.author_name} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-medium">{post.reply_count ?? 0}</span>
                    <p className="text-xs text-muted-foreground">replies</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NewPostForm({ categoryId, onDone }: { categoryId: string; onDone: () => void }) {
  const { user } = useAuth();
  const createPost = useCreatePost();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      await createPost.mutateAsync({
        categoryId,
        title: title.trim(),
        content: content.trim(),
        authorName: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Anonymous",
      });
      toast({ title: "Thread created!" });
      setTitle("");
      setContent("");
      onDone();
    } catch {
      toast({ title: "Failed to create thread", variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-lg border border-border bg-card space-y-3">
      <Input placeholder="Thread title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <Textarea placeholder="What's on your mind?" value={content} onChange={(e) => setContent(e.target.value)} rows={4} required />
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
        <Button type="submit" size="sm" disabled={createPost.isPending}>
          {createPost.isPending ? "Posting..." : "Post Thread"}
        </Button>
      </div>
    </form>
  );
}
