import { useState } from "react";
import { Mic, Send, CheckCircle, Loader2, Phone } from "lucide-react";
import { speakingTopics } from "@/data/content";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const speakingRequestSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be under 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be under 255 characters"),
  organization: z.string().trim().max(200, "Organization must be under 200 characters").optional().nullable(),
  event_name: z.string().trim().min(1, "Event type is required").max(200, "Event type must be under 200 characters"),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  phone: z.string().trim().max(30).optional().nullable(),
  event_location: z.string().trim().max(300).optional().nullable(),
  message: z.string().trim().max(2000, "Message must be under 2000 characters").optional().nullable(),
});

export default function Speaking() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Honeypot check
    if (formData.get("website")) {
      setLoading(false);
      setSubmitted(true);
      return;
    }

    try {
      const validated = speakingRequestSchema.parse({
        name: formData.get("name"),
        email: formData.get("email"),
        organization: (formData.get("organization") as string) || null,
        event_name: (formData.get("event_type") as string) || "Event",
        event_date: formData.get("event_date"),
        phone: (formData.get("phone") as string) || null,
        event_location: (formData.get("event_location") as string) || null,
        message: (formData.get("message") as string) || null,
      });

      const { error } = await supabase.functions.invoke("send-notification", {
        body: {
          type: "speaker_request",
          data: validated,
        },
      });

      if (error) throw error;

      setLoading(false);
      setSubmitted(true);
    } catch (err) {
      setLoading(false);
      if (err instanceof z.ZodError) {
        toast({ title: "Validation Error", description: err.errors[0].message, variant: "destructive" });
        return;
      }
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" });
    }
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
                {/* Honeypot */}
                <div className="absolute -left-[9999px]" aria-hidden="true">
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">Your Name *</label>
                    <input required name="name" type="text" maxLength={100} className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">Email *</label>
                    <input required name="email" type="email" maxLength={255} className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">Organization</label>
                    <input name="organization" type="text" maxLength={200} className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">Phone</label>
                    <input name="phone" type="tel" maxLength={30} className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-foreground">Event Location</label>
                  <input name="event_location" type="text" maxLength={300} placeholder="City, State" className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-foreground">Tell us about your event *</label>
                  <textarea required name="message" rows={4} maxLength={2000} className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
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
