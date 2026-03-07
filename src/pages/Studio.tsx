import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen, Layers, PenLine, Library, GraduationCap, CheckCircle, ArrowRight,
  Palette, Globe, Bot, Headphones, FileText, Mail, Video, Bell, CreditCard,
  Star, Zap, Shield, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";
import studioLogo from "@/assets/studio-logo.jpeg";

const features = [
  { icon: BookOpen, title: "Book Projects", desc: "Organize multiple books and writing projects in one workspace." },
  { icon: Layers, title: "Chapter Outlines", desc: "Structure your chapters and plan your story flow before you write." },
  { icon: PenLine, title: "Writing Workspace", desc: "A focused, distraction-free environment built for deep writing." },
  { icon: Library, title: "Research Library", desc: "Store notes, ideas, references, and inspiration in one place." },
  { icon: GraduationCap, title: "Teaching & Training Material", desc: "Create and organize lessons, courses, and educational content." },
  { icon: CheckCircle, title: "Publishing Checklist", desc: "Track your book from first draft to published with step-by-step checklists." },
  { icon: Palette, title: "Branding / White Label", desc: "Customize your studio with your own branding, colors, and author identity." },
  { icon: Globe, title: "Studio Landing Page", desc: "Turn your writing studio into a public-facing author platform." },
  { icon: Bot, title: "AI Writing Assistant", desc: "Generate ideas, summaries, outlines, and writing support powered by AI." },
  { icon: Headphones, title: "Audiobook Management", desc: "Manage audio versions of your books and teaching materials." },
  { icon: FileText, title: "Blog & Content", desc: "Publish articles, updates, and grow your audience as an author." },
  { icon: Mail, title: "Email CRM", desc: "Build your reader list and communicate with your audience directly." },
  { icon: Video, title: "Video Studio", desc: "Create video content around your books, teaching, and brand." },
  { icon: Bell, title: "Notifications", desc: "Stay updated on activity, signups, and milestones inside your studio." },
];

const steps = [
  { num: "1", title: "Create Your Studio", desc: "Sign up and your private writing workspace is instantly provisioned." },
  { num: "2", title: "Start Your Writing Project", desc: "Add your first book, organize chapters, and start writing immediately." },
  { num: "3", title: "Organize, Write & Publish", desc: "Use the full suite of tools to take your book from idea to published." },
];

const reasons = [
  "All-in-one writing system — no scattered tools",
  "Built specifically for books and teaching material",
  "Helps writers actually finish and publish",
  "Private workspace with your own branding",
  "AI-powered writing assistance built in",
  "Launch your author platform in minutes",
];

const faqs = [
  { q: "What's included in the $19.95/month plan?", a: "Everything. Book projects, chapter outlines, writing workspace, research library, teaching materials, publishing checklists, branding, AI assistant, blog, email CRM, video studio, and notifications. No hidden tiers." },
  { q: "Can I customize the branding?", a: "Yes. You get full white-label branding — your name, your colors, your logo. It's your studio." },
  { q: "Do I get my own private workspace?", a: "Yes. Each studio is a completely isolated workspace with its own data, projects, and settings. Your content is private to you." },
  { q: "Can I cancel anytime?", a: "Yes. No contracts, no commitments. Cancel anytime from your account settings." },
  { q: "Is there a free trial?", a: "Yes! Every new studio comes with a 7-day free trial. You won't be charged until after your trial ends. Cancel anytime during the trial and pay nothing." },
];

const stackComparison = [
  { name: "Scrivener", price: "$59 one-time" },
  { name: "Notion", price: "$10/mo" },
  { name: "Email platform", price: "$20/mo" },
  { name: "Publishing tools", price: "$15/mo" },
];

export default function Studio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleCheckout = async () => {
    if (!user) {
      navigate("/studio/auth?mode=signup");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { type: "subscription", planSlug: "studio" },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  const CTAButton = ({ className = "", size = "lg" as const }) => (
    <Button
      size={size}
      onClick={handleCheckout}
      disabled={loading}
      className={`bg-primary text-primary-foreground hover:bg-primary/90 ${className}`}
    >
      {loading ? "Loading…" : "Start Your Writing Studio"} <ArrowRight className="ml-2 h-5 w-5" />
    </Button>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src={studioLogo} alt="Island of One" className="h-10 w-10 rounded-full object-cover" />
            <span className="font-bold text-lg text-primary">Island of One</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/studio/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Log In</Link>
            <Button size="sm" onClick={handleCheckout} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Start Writing
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-widest uppercase mb-6 border border-primary/20">
            A Book Writer Studio
          </span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            Everything You Need to <span className="text-primary">Write and Publish</span> Your Books
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Plan, organize, write, and publish your books in one powerful writing studio built for authors, teachers, and creators.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <CTAButton className="text-lg px-10 py-7" />
          </div>
          <p className="text-muted-foreground text-sm mt-5">
            <span className="font-semibold text-foreground">7-day free trial</span> · Then $19.95/month · Cancel anytime
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-card/50 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-primary text-sm tracking-widest uppercase mb-3 font-semibold">Complete Writer Toolkit</p>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything Inside Your Studio</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              One platform. Every tool you need. No scattered subscriptions.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-card border border-border rounded-xl p-6 hover:border-primary/40 hover:shadow-lg transition-all group">
                <f.icon className="h-9 w-9 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-primary text-sm tracking-widest uppercase mb-3 font-semibold">Simple Setup</p>
          <h2 className="text-3xl md:text-5xl font-bold mb-16">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-10">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-5">
                  {s.num}
                </div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Writers Love It */}
      <section className="py-24 px-6 bg-card/50 border-y border-border">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-primary text-sm tracking-widest uppercase mb-3 font-semibold">Built for Writers</p>
          <h2 className="text-3xl md:text-5xl font-bold mb-12">Why Writers Love It</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {reasons.map((r) => (
              <div key={r} className="flex items-center gap-3 bg-card border border-border rounded-lg p-5 text-left">
                <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm font-medium">{r}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Writers use Island of One to... */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-12">Writers Use Island of One to…</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
            {[
              "Organize their book ideas",
              "Write faster without distractions",
              "Structure chapters and outlines",
              "Build teaching & training material",
              "Publish blogs and content",
              "Launch their author platform",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card">
                <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6 bg-card/50 border-y border-border" id="pricing">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-primary text-sm tracking-widest uppercase mb-3 font-semibold">Pricing</p>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple, Affordable Pricing</h2>
          </div>

          {/* Comparison */}
          <div className="max-w-xl mx-auto mb-10">
            <p className="text-sm text-muted-foreground text-center mb-4 font-medium">Writing software stack most authors use:</p>
            <div className="space-y-2 mb-4">
              {stackComparison.map((item) => (
                <div key={item.name} className="flex justify-between items-center px-4 py-2 bg-muted/50 rounded-lg text-sm">
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="text-muted-foreground line-through">{item.price}</span>
                </div>
              ))}
              <div className="flex justify-between items-center px-4 py-2 bg-muted rounded-lg text-sm font-semibold border border-border">
                <span>Typical total</span>
                <span className="text-muted-foreground">$45–$80/month</span>
              </div>
            </div>
          </div>

          {/* Price Card */}
          <div className="max-w-md mx-auto">
            <div className="relative bg-card border-2 border-primary rounded-2xl p-8 text-center shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider">
                  <Star className="h-3 w-3" /> Most Affordable Writer Studio
                </span>
              </div>
              <h3 className="text-xl font-bold mb-2 mt-2">Island of One Writer Studio</h3>
              <div className="text-5xl font-bold text-primary mb-1">$19.95</div>
              <p className="text-muted-foreground text-sm mb-2">per month</p>
              <p className="text-xs text-muted-foreground mb-2">7-day free trial · Then less than $0.66 per day.</p>
              <ul className="space-y-3 text-left mb-8">
                {[
                  "Unlimited book projects",
                  "Full writing studio",
                  "AI writing assistant",
                  "Teaching & training materials",
                  "Research library",
                  "Private workspace",
                  "White label branding",
                  "Blog & email CRM",
                  "Video studio",
                  "Publishing checklists",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <CTAButton className="w-full text-lg py-6" />
              <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
                <Shield className="h-3 w-3" /> Cancel anytime. No contracts.
              </p>
              <p className="text-xs text-muted-foreground mt-1">Launch your studio in under 60 seconds.</p>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-6">
              "Launch your personal writing studio for less than the cost of a notebook."
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-primary text-sm tracking-widest uppercase mb-3 font-semibold">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
                >
                  <span className="text-sm font-semibold pr-4">{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-primary/5 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Write Your Book?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Everything you need to write, organize, and publish your books — in one place.
          </p>
          <CTAButton className="text-lg px-10 py-7" />
          <p className="text-muted-foreground text-sm mt-4">7-day free trial · $19.95/month · Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Island of One. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}