import { useEffect, useRef, useState, useCallback } from "react";
import { Star, MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// FB SDK type - extended version (FacebookComments.tsx has a simpler one)
type FBSdk = {
  XFBML: { parse: (el?: HTMLElement) => void };
  login: (cb: (response: any) => void, options?: object) => void;
  getLoginStatus: (cb: (response: any) => void) => void;
  api: (path: string, cb: (response: any) => void) => void;
};

const getFB = (): FBSdk | undefined => (window as any).FB;

interface Props {
  contentType: "book" | "blog" | "sermon";
  contentId: string;
  slug?: string;
  siteUrl?: string;
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

export default function FacebookCommentsWithRating({
  contentType,
  contentId,
  slug,
  siteUrl = "https://theislandofone.lovable.app",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [fbUser, setFbUser] = useState<{ id: string; name: string; picture?: string } | null>(null);
  const [fbLoading, setFbLoading] = useState(false);
  const { toast } = useToast();

  // Load reviews
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

  // Subscribe to realtime
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
        () => {
          loadReviews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contentType, contentId, loadReviews]);

  // Check FB login status on mount
  useEffect(() => {
    const checkFB = () => {
      const fb = getFB();
      if (fb) {
        fb.getLoginStatus((response) => {
          if (response.status === "connected") {
            fetchFBProfile();
          }
        });
      }
    };
    const timer = setTimeout(checkFB, 1500);
    return () => clearTimeout(timer);
  }, []);

  const fetchFBProfile = () => {
    const fb = getFB();
    if (!fb) return;
    fb.api("/me?fields=id,name,picture.width(80).height(80)", (response: any) => {
      if (response && !response.error) {
        setFbUser({
          id: response.id,
          name: response.name,
          picture: response.picture?.data?.url,
        });
      }
    });
  };

  const handleFBLogin = () => {
    const fb = getFB();
    if (!fb) {
      toast({ title: "Facebook SDK not loaded", description: "Please refresh and try again.", variant: "destructive" });
      return;
    }
    setFbLoading(true);
    fb.login(
      (response) => {
        if (response.authResponse) {
          fetchFBProfile();
        }
        setFbLoading(false);
      },
      { scope: "public_profile" }
    );
  };

  const handleSubmit = async () => {
    if (!fbUser) {
      handleFBLogin();
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

    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("content_reviews").insert({
        content_type: contentType,
        content_id: contentId,
        user_name: fbUser.name,
        user_avatar: fbUser.picture || "",
        rating,
        comment: comment.trim(),
        fb_user_id: fbUser.id,
      });
      if (error) throw new Error(error.message);
      setComment("");
      setRating(0);
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

  const alreadyReviewed = fbUser ? reviews.some((r) => r.fb_user_id === fbUser.id) : false;

  // Also render FB native comments below
  const pageUrl = `${siteUrl}/${contentType === "blog" ? "blog" : contentType === "book" ? "books" : "sermons"}/${slug || contentId}`;

  useEffect(() => {
    const fb = getFB();
    if (fb && containerRef.current) {
      fb.XFBML.parse(containerRef.current);
    }
  }, [slug, contentId]);

  return (
    <div className="space-y-8">
      {/* Star Rating Summary */}
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
        {!alreadyReviewed && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            {!fbUser ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">Login with Facebook to leave a review</p>
                <button
                  onClick={handleFBLogin}
                  disabled={fbLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1877F2] text-white text-sm font-semibold hover:bg-[#166FE5] transition-colors disabled:opacity-50"
                >
                  {fbLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  )}
                  Continue with Facebook
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  {fbUser.picture && (
                    <img src={fbUser.picture} alt={fbUser.name} className="h-8 w-8 rounded-full" />
                  )}
                  <span className="text-sm font-medium">{fbUser.name}</span>
                </div>

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

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                  Post Review
                </button>
              </>
            )}
          </div>
        )}

        {alreadyReviewed && (
          <p className="text-xs text-muted-foreground italic">You've already left a review. Thank you!</p>
        )}
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-4">Loading reviews…</div>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-3">
                {review.user_avatar && (
                  <img src={review.user_avatar} alt={review.user_name} className="h-8 w-8 rounded-full" />
                )}
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

      {/* Facebook Comments Plugin (existing) */}
      <div ref={containerRef}>
        <h3 className="text-lg font-semibold mb-4">Facebook Comments</h3>
        <div
          className="fb-comments"
          data-href={pageUrl}
          data-width="100%"
          data-numposts={5}
          data-colorscheme="dark"
        />
      </div>
    </div>
  );
}
