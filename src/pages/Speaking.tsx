import { useState } from "react";
import { Mic, Send, CheckCircle, Loader2, Phone } from "lucide-react";
import { speakingTopics } from "@/data/content";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function Speaking() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const { error } = await supabase.from("speaking_requests").insert({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      organization: (formData.get("organization") as string) || null,
      event_name: (formData.get("event_type") as string) || "Event",
      event_date: (formData.get("event_date") as string) || new Date().toISOString().split("T")[0],
      message: (formData.get("message") as string) || null,
    });

    setLoading(false);

    if (error) {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" });
      return;
    }

    setSubmitted(true);
  };

  return (
    <div className="min-h-screen">
      <section className="py-14 sm:py-20 bg-gradient-section">
        <div className="container mx-auto px-4 text-center">
          <Mic className="h-8 sm:h-10 w-8 sm:w-10 text-primary mx-auto mb-4" />
          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold mb-4">Speaking Engagements</h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            Invite Bryant Clark to bring a powerful, faith-filled message to your event.
          </p>
        </div>
      </section>

      {/* Topics */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="font-display text-2xl font-bold mb-8 text-center">Speaking Topics</h2>
          <div className="space-y-3 mb-16">
            {speakingTopics.map((topic, i) => (
              <div key={i} className="p-4 rounded-lg border border-border bg-card flex items-center gap-3">
                <span className="text-primary font-display font-bold text-lg">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-secondary-foreground">{topic}</span>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-border bg-card p-8">
            <h2 className="font-display text-2xl font-bold mb-2">Request a Speaker</h2>
            <p className="text-muted-foreground text-sm mb-4">No fees or commitments — just fill out the form and we'll be in touch.</p>
            <a
              href="tel:9362380102"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-gold mb-8"
            >
              <Phone className="h-4 w-4" />
              Call Us: (936) 238-0102
            </a>

            {submitted ? (
              <div className="text-center py-12 animate-fade-up">
                <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-display text-2xl font-bold mb-2">Request Received</h3>
                <p className="text-muted-foreground">Thank you! We'll reach out soon to discuss your event.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">Your Name *</label>
                    <input required name="name" type="text" className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">Email *</label>
                    <input required name="email" type="email" className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">Organization</label>
                    <input name="organization" type="text" className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">Phone</label>
                    <input type="tel" className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-foreground">Event Type</label>
                  <select name="event_type" className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option>Church Service</option>
                    <option>Conference</option>
                    <option>Leadership Summit</option>
                    <option>Men's / Women's Retreat</option>
                    <option>Youth Event</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-foreground">Event Date (Approximate) *</label>
                  <input required name="event_date" type="date" className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-foreground">Tell us about your event *</label>
                  <textarea required name="message" rows={4} className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-gold disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {loading ? "Submitting..." : "Submit Request"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
