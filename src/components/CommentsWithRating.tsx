import { useState, useEffect, useCallback } from "react";
import { Star, MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import MathCaptcha from "@/components/admin/MathCaptcha";

interface Props {
  contentType: "book" | "blog" | "sermon";
  contentId: string;
}

interface ReviewData {
  id: string;
  content_type: string;
  content_id: string;
  user_name: string;
  user_avatar: string;
  rating: number;
  comment: string;
  created_at: string;
  fb_user_id: string;
}

export default function CommentsWithRating({ contentType, contentId }: Props) {
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [fullName, setFullName] = useState("");
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const { toast } = useToast();

  const loadReviews = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("content_reviews")
        .select("*")
        .eq("content_type", contentType)
        .eq("content_id", contentId)
        .order("created_at", { ascending: false });
      if (!error && data) setReviews(data as ReviewData[]);
    } catch {}
    setLoading(false);
  }, [contentType, contentId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`reviews-${contentType}-${contentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "content_reviews",
          filter: `content_id=eq.${contentId}`,
        },
        () => loadReviews()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [contentType, contentId, loadReviews]);

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      toast({ title: "Please enter your full name", variant: "destructive" });
      return;
    }
    if (rating === 0) {
      toast({ title: "Please select a star rating", variant: "destructive" });
      return;
    }
    if (!comment.trim()) {
      toast({ title: "Please write a comment", variant: "destructive" });
      return;
    }
    if (!captchaVerified) {
      toast({ title: "Please solve the math captcha", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("content_reviews").insert({
        content_type: contentType,
        content_id: contentId,
        user_name: fullName.trim(),
        user_avatar: "",
        rating,
        comment: comment.trim(),
        fb_user_id: "anonymous",
      });
      if (error) throw new Error(error.message);
      setComment("");
      setRating(0);
      setFullName("");
      setCaptchaVerified(false);
      toast({ title: "Review posted!" });
      loadReviews();
    } catch (err: any) {
      toast({ title: "Failed to post review", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <div className="space-y-8">
      {/* Rating Summary */}
      <div>
        <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Reviews & Ratings
        </h3>

        {reviews.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-5 w-5 ${s <= Math.round(avgRating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`}
                />
              ))}
            </div>
            <span className="text-sm font-semibold">{avgRating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
          </div>
        )}

        {/* Submit Review Form */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full Name *"
            className="w-full rounded-lg bg-background border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          />

          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-2">Your rating:</span>
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setRating(s)}
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-0.5"
              >
                <Star
                  className={`h-6 w-6 transition-colors ${
                    s <= (hoverRating || rating)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts…"
            rows={3}
            className="w-full rounded-lg bg-background border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 resize-none"
          />

          <MathCaptcha onVerified={setCaptchaVerified} />

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            Post Review
          </button>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-4">Loading reviews…</div>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  {review.user_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{review.user_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-3.5 w-3.5 ${s <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-foreground/90">{review.comment}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No reviews yet. Be the first to leave one!</p>
      )}
    </div>
  );
}
