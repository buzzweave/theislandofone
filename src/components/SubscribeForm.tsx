import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("subscribers" as any).insert({ email: email.trim() } as any);
      if (error) {
        if (error.code === "23505") {
          toast.success("You're already subscribed!");
        } else {
          throw error;
        }
      } else {
        toast.success("Subscribed! You'll hear from us soon.");
      }
      setEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to subscribe");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto px-2 sm:px-0"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="flex-1 px-5 py-3 rounded-full bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <button
        type="submit"
        disabled={submitting}
        className="px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {submitting ? "Subscribing…" : "Subscribe"}
      </button>
    </form>
  );
}
