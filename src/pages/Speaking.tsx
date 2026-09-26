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
