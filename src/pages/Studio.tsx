import { Link } from "react-router-dom";
import { BookOpen, Layers, PenLine, Library, GraduationCap, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: BookOpen, title: "Book Project Manager", desc: "Organize multiple books and writing projects." },
  { icon: Layers, title: "Chapter & Outline Builder", desc: "Structure your chapters and story flow." },
  { icon: PenLine, title: "Writing Workspace", desc: "A distraction-free environment for writing your book." },
  { icon: Library, title: "Research Library", desc: "Store notes, ideas, and references." },
  { icon: GraduationCap, title: "Teaching & Training Materials", desc: "Create structured lessons or educational content." },
  { icon: CheckCircle, title: "Publishing Preparation", desc: "Track progress toward publishing your book." },
];

const reasons = [
  "Simple organized writing system",
  "All your writing projects in one place",
  "Designed for authors and teachers",
  "Plan, write, and publish faster",
];

const steps = [
  { num: "1", title: "Create your writing studio." },
  { num: "2", title: "Start a book project and organize your chapters." },
  { num: "3", title: "Write, refine, and prepare your book for publishing." },
];

const included = [
  "Unlimited book projects",
  "Full writing studio",
  "Teaching & training materials",
  "Research library",
  "Private workspace",
  "White label branding",
];

export default function Studio() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/" className="font-bold text-lg text-primary">Island of One</Link>
          <div className="flex items-center gap-4">
            <Link to="/studio/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Log In</Link>
            <Link to="/studio/auth?mode=signup">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Start Writing
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-primary font-medium text-sm tracking-widest uppercase mb-4">A Book Writer Studio</p>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            Your Personal Book Writing Studio
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Plan, write, organize, and publish your books in one powerful workspace.
          </p>
          <Link to="/studio/auth?mode=signup">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6">
              Start Writing Today <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="text-muted-foreground text-sm mt-4">$39.99/month · Cancel anytime</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Everything You Need to Write Your Book</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            Island of One is a complete writing studio for authors who want to organize ideas, write books faster, and prepare their work for publishing.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="bg-card border border-border rounded-xl p-6 hover:border-primary/40 transition-colors">
                <f.icon className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Writers Love It */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-10">Why Writers Love It</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {reasons.map((r) => (
              <div key={r} className="flex items-center gap-3 bg-card border border-border rounded-lg p-4">
                <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm">{r}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-card/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {s.num}
                </div>
                <p className="text-sm text-muted-foreground">{s.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-md mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Simple Pricing</h2>
          <div className="bg-card border-2 border-primary rounded-2xl p-8 text-center">
            <h3 className="text-xl font-bold mb-2">Island of One Studio</h3>
            <div className="text-4xl font-bold text-primary mb-1">$39.99</div>
            <p className="text-muted-foreground text-sm mb-6">per month</p>
            <ul className="space-y-3 text-left mb-8">
              {included.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/studio/auth?mode=signup">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-lg py-6">
                Start Your Writing Studio
              </Button>
            </Link>
          </div>
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
