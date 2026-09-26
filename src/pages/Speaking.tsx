import { useState } from "react";
import { Mic, Send, CheckCircle, Loader2, Phone } from "lucide-react";
import { speakingTopics } from "@/data/content";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

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
  const { isAuthenticated } = useAdminAuth();
  const pastorIntro = useSiteSettings(
    "pastor_intro",
    "A clear, Christ-centered ministry partner for revivals, leadership events, conferences, and church services.",
  );
  const statementFaith = useSiteSettings(
    "statement_of_faith",
    "We believe salvation is made possible through the death, burial, and resurrection of Jesus Christ. In obedience to the gospel as the church modeled in Acts 2, a person responds through repentance from sin and faith in Jesus Christ; water baptism by immersion in the name of Jesus Christ for the remission of sins; and receiving the gift of the Holy Spirit, with speaking in other tongues as the Spirit gives utterance.\n\nWe believe salvation is entirely dependent upon God’s grace and is received through obedient faith—not earned by human works.\n\nWe believe the Bible is the inspired, authoritative Word of God; in divine healing; in the gifts and work of the Holy Spirit; in the mission of the Church to make disciples of all nations; and in the personal return of Jesus Christ, the resurrection of the dead, and everlasting life with Him.",
  );
  const accountability = useSiteSettings(
    "ministry_accountability",
    "The Island of One Ministries welcomes questions from church leadership about doctrine, ministry experience, references, and event expectations before an invitation is confirmed.",
  );
  const pastoralReferences = useSiteSettings(
    "pastoral_references",
    "Pastoral references are available upon request. Verified endorsements may be added here from pastors who have personally heard Bryant preach or hosted the ministry.",
  );
  const speakerKitUrl = useSiteSettings("speaker_kit_url", "");
  const highlightVideoUrl = useSiteSettings("speaker_highlight_video_url", "");

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
          <img
            src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAA8KADAAQAAAABAAAA8AAAAAD/4QnSaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJYTVAgQ29yZSA2LjAuMCI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgcGhvdG9zaG9wOkluc3RydWN0aW9ucz0iRkJNRDBhMDAwYTA1MDIwMDAwNjUyMDAwMDA1NDMyMDAwMDYyMzIwMDAwNzAzMjAwMDAxZjM4MDAwMGU2NTAwMDAwODA1YjAwMDA4ZTViMDAwMDljNWIwMDAwMjM4NjAwMDAiLz4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8P3hwYWNrZXQgZW5kPSJ3Ij8+AP/tAK5QaG90b3Nob3AgMy4wADhCSU0EBAAAAAAAdhwBWgADGyVHHAIAAAIAAhwCKABiRkJNRDBhMDAwYTA1MDIwMDAwNjUyMDAwMDA1NDMyMDAwMDYyMzIwMDAwNzAzMjAwMDAxZjM4MDAwMGU2NTAwMDAwODA1YjAwMDA4ZTViMDAwMDljNWIwMDAwMjM4NjAwMDA4QklNBCUAAAAAABDCzAj5oO+1JTZRNWbTwZQ+/8IAEQgA8ADwAwEiAAIRAQMRAf/E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"
            alt="Bryant Clark, speaker and evangelist"
            className="mx-auto mb-7 h-48 w-48 sm:h-56 sm:w-56 rounded-full object-cover object-top shadow-2xl ring-4 ring-primary/20"
          />
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
          </div>{" "}
          {/* Pastor trust center */}
          <section className="mb-16 space-y-8" aria-labelledby="pastor-trust-heading">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-primary font-semibold tracking-widest text-xs uppercase mb-2">
                For Pastors & Church Leaders
              </p>
              <h2 id="pastor-trust-heading" className="font-display text-3xl font-bold mb-4">
                A ministry partner you can know before you invite
              </h2>
              <p className="text-muted-foreground leading-relaxed">{pastorIntro.value}</p>
            </div>

            {highlightVideoUrl.value && (
              <div className="rounded-2xl border border-border bg-card p-6 text-center">
                <h3 className="font-display text-xl font-bold mb-2">Watch a preaching highlight</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Hear the message and ministry heart before extending an invitation.
                </p>
                <a
                  href={highlightVideoUrl.value}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold"
                >
                  Watch Highlight Video
                </a>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-5">
              <article className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-display text-xl font-bold mb-3">Statement of Faith</h3>
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                  {statementFaith.value}
                </p>
              </article>
              <article className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-display text-xl font-bold mb-3">Ministry Accountability</h3>
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                  {accountability.value}
                </p>
              </article>
              <article className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-display text-xl font-bold mb-3">Pastoral References</h3>
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                  {pastoralReferences.value}
                </p>
              </article>
            </div>

            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8 flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
              <div>
                <h3 className="font-display text-2xl font-bold mb-2">Plan the invitation with confidence</h3>
                <p className="text-muted-foreground">
                  Request doctrine, references, travel expectations, technical needs, biography, and promotional
                  materials before confirming your date.
                </p>
              </div>
              {speakerKitUrl.value ? (
                <a
                  href={speakerKitUrl.value}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 inline-flex px-5 py-2.5 rounded-full border border-primary text-primary font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  Download Speaker Kit
                </a>
              ) : (
                <a
                  href="#speaker-request"
                  className="shrink-0 inline-flex px-5 py-2.5 rounded-full border border-primary text-primary font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  Request Ministry Details
                </a>
              )}
            </div>
          </section>
          {isAuthenticated && (
            <section
              className="mb-16 rounded-2xl border-2 border-dashed border-primary/40 bg-card p-6"
              aria-label="Pastor page editor"
            >
              <h2 className="font-display text-2xl font-bold mb-2">Edit Pastor Trust Sections</h2>
              <p className="text-muted-foreground text-sm mb-6">
                You are signed in as an administrator. Edit a field and click outside it to save.
              </p>
              <div className="grid gap-5">
                {[
                  ["Pastor introduction", pastorIntro],
                  ["Statement of faith", statementFaith],
                  ["Ministry accountability", accountability],
                  ["Pastoral references / endorsements", pastoralReferences],
                ].map(([label, setting]) => (
                  <label key={label as string} className="grid gap-2 text-sm font-semibold">
                    {label as string}
                    <textarea
                      defaultValue={(setting as typeof pastorIntro).value}
                      onBlur={(e) => (setting as typeof pastorIntro).updateValue(e.currentTarget.value)}
                      rows={4}
                      className="w-full rounded-lg border border-border bg-background p-3 font-normal"
                    />
                  </label>
                ))}
                <label className="grid gap-2 text-sm font-semibold">
                  Preaching highlight URL
                  <input
                    defaultValue={highlightVideoUrl.value}
                    onBlur={(e) => highlightVideoUrl.updateValue(e.currentTarget.value)}
                    className="rounded-lg border border-border bg-background p-3 font-normal"
                    placeholder="https://youtube.com/..."
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Speaker kit URL
                  <input
                    defaultValue={speakerKitUrl.value}
                    onBlur={(e) => speakerKitUrl.updateValue(e.currentTarget.value)}
                    className="rounded-lg border border-border bg-background p-3 font-normal"
                    placeholder="https://.../speaker-kit.pdf"
                  />
                </label>
              </div>
            </section>
          )}
          {/* Form */}
          <div id="speaker-request" className="rounded-2xl border border-border bg-card p-8 scroll-mt-24">
            <h2 className="font-display text-2xl font-bold mb-2">Request a Speaker</h2>
            <p className="text-muted-foreground text-sm mb-4">
              No fees or commitments — just fill out the form and we'll be in touch.
            </p>
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
                    <input
                      required
                      name="name"
                      type="text"
                      maxLength={100}
                      className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">Email *</label>
                    <input
                      required
                      name="email"
                      type="email"
                      maxLength={255}
                      className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">Organization</label>
                    <input
                      name="organization"
                      type="text"
                      maxLength={200}
                      className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">Phone</label>
                    <input
                      name="phone"
                      type="tel"
                      maxLength={30}
                      className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">Event Type</label>
                    <select
                      name="event_type"
                      className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option>Church Service</option>
                      <option>Conference</option>
                      <option>Leadership Summit</option>
                      <option>Men's / Women's Retreat</option>
                      <option>Youth Event</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">
                      Event Date (Approximate) *
                    </label>
                    <input
                      required
                      name="event_date"
                      type="date"
                      className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-foreground">Event Location</label>
                  <input
                    name="event_location"
                    type="text"
                    maxLength={300}
                    placeholder="City, State"
                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-foreground">Tell us about your event *</label>
                  <textarea
                    required
                    name="message"
                    rows={4}
                    maxLength={2000}
                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
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
