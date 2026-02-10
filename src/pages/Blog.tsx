import { Link } from "react-router-dom";
import { ArrowRight, PenLine } from "lucide-react";

export default function Blog() {
  return (
    <div className="min-h-screen">
      <section className="py-14 sm:py-20 bg-gradient-section">
        <div className="container mx-auto px-4 text-center">
          <p className="text-primary text-sm tracking-[0.2em] uppercase mb-3">Insights</p>
          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold mb-4">Blog</h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            Thoughts on faith, leadership, ministry, and the journey of standing alone with God.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <PenLine className="h-12 w-12 text-primary mx-auto mb-6" />
          <h2 className="font-display text-2xl font-bold mb-4">Coming Soon</h2>
          <p className="text-muted-foreground mb-8">
            Blog posts are on the way. Stay tuned for devotionals, ministry insights, and behind-the-scenes stories.
          </p>
          <Link
            to="/sermons"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Browse Sermons <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
