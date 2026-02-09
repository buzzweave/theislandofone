import { useState } from "react";
import { Mic, Send, CheckCircle } from "lucide-react";
import { speakingTopics } from "@/data/content";

export default function Speaking() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen">
      <section className="py-20 bg-gradient-section">
        <div className="container mx-auto px-4 text-center">
          <Mic className="h-10 w-10 text-primary mx-auto mb-4" />
          <h1 className="font-display text-5xl md:text-6xl font-bold mb-4">Speaking Engagements</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
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
            <p className="text-muted-foreground text-sm mb-8">No fees or commitments — just fill out the form and we'll be in touch.</p>

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
                    <input required type="text" className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">Email *</label>
                    <input required type="email" className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">Organization</label>
                    <input type="text" className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">Phone</label>
                    <input type="tel" className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-foreground">Event Type</label>
                  <select className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option>Church Service</option>
                    <option>Conference</option>
                    <option>Leadership Summit</option>
                    <option>Men's / Women's Retreat</option>
                    <option>Youth Event</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-foreground">Event Date (Approximate)</label>
                  <input type="date" className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-foreground">Tell us about your event *</label>
                  <textarea required rows={4} className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-gold"
                >
                  <Send className="h-4 w-4" /> Submit Request
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
