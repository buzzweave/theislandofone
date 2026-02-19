import { useState } from "react";
import { Link, useParams, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Pin, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useForumThread, useCreateReply, useDeletePost, useDeleteReply } from "@/hooks/useForum";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

export default function ForumThread() {
  const { slug, postId } = useParams<{ slug: string; postId: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { data, isLoading } = useForumThread(postId || "");
  const navigate = useNavigate();

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 md:px-8 py-10 max-w-3xl">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!data) return <div className="container mx-auto px-4 py-10">Thread not found.</div>;

  const { post, replies } = data;

  return (
    <div className="container mx-auto px-4 md:px-8 py-10 max-w-3xl">
      <Link to={`/community/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to threads
      </Link>

      {/* Original post */}
      <div className="p-5 rounded-lg border border-border bg-card mb-6">
        <div className="flex items-center gap-2 mb-2">
          {post.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
          {post.is_locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          <h1 className="text-xl font-display font-bold">{post.title}</h1>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          by {post.author_name} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </p>
        <div className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">{post.content}</div>
        {user?.id === post.user_id && (
          <DeletePostButton postId={post.id} slug={slug || ""} navigate={navigate} />
        )}
      </div>

      {/* Replies */}
      <h2 className="text-sm font-semibold text-muted-foreground mb-3">
        {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
      </h2>

      <div className="space-y-3 mb-8">
        {replies.map((reply) => (
          <div key={reply.id} className="p-4 rounded-lg border border-border bg-card">
            <p className="text-xs text-muted-foreground mb-2">
              {reply.author_name} · {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
            </p>
            <div className="text-sm whitespace-pre-wrap text-foreground">{reply.content}</div>
            {user?.id === reply.user_id && (
              <DeleteReplyButton replyId={reply.id} postId={post.id} />
            )}
          </div>
        ))}
      </div>

      {/* Reply form */}
      {post.is_locked ? (
        <p className="text-sm text-muted-foreground text-center py-4">This thread is locked.</p>
      ) : (
        <ReplyForm postId={post.id} />
      )}
    </div>
  );
}

function ReplyForm({ postId }: { postId: string }) {
  const { user } = useAuth();
  const createReply = useCreateReply();
  const [content, setContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      await createReply.mutateAsync({
        postId,
        content: content.trim(),
        authorName: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Anonymous",
      });
      setContent("");
      toast({ title: "Reply posted!" });
    } catch {
      toast({ title: "Failed to post reply", variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea placeholder="Write a reply..." value={content} onChange={(e) => setContent(e.target.value)} rows={3} required />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={createReply.isPending}>
          {createReply.isPending ? "Posting..." : "Reply"}
        </Button>
      </div>
    </form>
  );
}

function DeletePostButton({ postId, slug, navigate }: { postId: string; slug: string; navigate: any }) {
  const deletePost = useDeletePost();
  const handleDelete = async () => {
    if (!confirm("Delete this thread and all replies?")) return;
    try {
      await deletePost.mutateAsync(postId);
      toast({ title: "Thread deleted" });
      navigate(`/community/${slug}`);
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };
  return (
    <button onClick={handleDelete} className="mt-3 text-xs text-destructive hover:underline flex items-center gap-1">
      <Trash2 className="h-3 w-3" /> Delete
    </button>
  );
}

function DeleteReplyButton({ replyId, postId }: { replyId: string; postId: string }) {
  const deleteReply = useDeleteReply();
  const handleDelete = async () => {
    if (!confirm("Delete this reply?")) return;
    try {
      await deleteReply.mutateAsync({ replyId, postId });
      toast({ title: "Reply deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };
  return (
    <button onClick={handleDelete} className="mt-2 text-xs text-destructive hover:underline flex items-center gap-1">
      <Trash2 className="h-3 w-3" /> Delete
    </button>
  );
}
