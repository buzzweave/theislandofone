import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Mic, Play, Users } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import bookCover1 from "@/assets/book-cover-1.jpg";
import bookCover2 from "@/assets/book-cover-2.jpg";
import bookCover3 from "@/assets/book-cover-3.jpg";
import { books, videos, membershipPlans } from "@/data/content";
import { useSermons } from "@/hooks/useSermons";

const bookCovers: Record<string, string> = {
  "book-cover-1": bookCover1,
  "book-cover-2": bookCover2,
  "book-cover-3": bookCover3,
};

export default function Index() {
  const { sermons } = useSermons();
  return (
    <div>
      {/* HERO */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="relative z-10 container mx-auto px-4 text-center animate-fade-up">
          <p className="text-primary font-body text-sm tracking-[0.3em] uppercase mb-6">
            Author · Speaker · Pastor
          </p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-tight mb-6">
            The Island<br />
            <span className="text-gradient-gold">of One</span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Empowering believers to stand firm in faith, discover purpose in solitude, and lead with unshakeable conviction.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/books"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-gold"
            >
              Explore Books <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/sermons"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full border border-primary/30 text-foreground font-semibold text-sm hover:bg-primary/10 transition-all"
            >
              Browse Sermons
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURED BOOKS */}
      <section className="bg-gradient-section py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-primary text-sm tracking-[0.2em] uppercase mb-3">Library</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold">Featured Books</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {books.map((book) => (
              <Link
                key={book.id}
                to={`/books`}
                className="group rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-gold"
              >
                <div className="aspect-[2/3] overflow-hidden">
                  <img
                    src={bookCovers[book.coverImage]}
                    alt={book.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg font-semibold mb-1">{book.title}</h3>
                  <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{book.subtitle}</p>
                  <span className="text-primary text-sm font-semibold">
                    {book.isFree ? "Free Download" : `$${book.price}`}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/books" className="text-primary text-sm font-semibold hover:underline inline-flex items-center gap-1">
              View All Books <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURED SERMONS */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-primary text-sm tracking-[0.2em] uppercase mb-3">For Pastors</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold">Latest Sermons</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {sermons.slice(0, 3).map((sermon) => (
              <Link
                key={sermon.id}
                to="/sermons"
                className="group p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">{sermon.category}</span>
                  {sermon.accessLevel !== "free" && (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {sermon.accessLevel}
                    </span>
                  )}
                </div>
                <h3 className="font-display text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{sermon.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{sermon.scripture}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{sermon.excerpt}</p>
              </Link>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/sermons" className="text-primary text-sm font-semibold hover:underline inline-flex items-center gap-1">
              Browse Sermon Library <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURED VIDEOS */}
      <section className="bg-gradient-section py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-primary text-sm tracking-[0.2em] uppercase mb-3">Watch</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold">Featured Videos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {videos.filter(v => v.featured).map((video) => (
              <div
                key={video.id}
                className="group rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all duration-300 cursor-pointer"
              >
                <div className="relative aspect-video overflow-hidden">
                  <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                      <Play className="h-6 w-6 text-primary-foreground ml-0.5" />
                    </div>
                  </div>
                  <span className="absolute bottom-2 right-2 text-xs bg-background/80 px-2 py-0.5 rounded text-foreground">{video.duration}</span>
                </div>
                <div className="p-4">
                  <p className="text-xs text-primary uppercase tracking-wider mb-1">{video.category}</p>
                  <h3 className="font-display text-sm font-semibold">{video.title}</h3>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/videos" className="text-primary text-sm font-semibold hover:underline inline-flex items-center gap-1">
              View All Videos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* MEMBERSHIP CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <p className="text-primary text-sm tracking-[0.2em] uppercase mb-3">Community</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">Join the Inner Circle</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-12 text-lg">
            Get exclusive access to sermons, books, live sessions, and a community of believers walking the same path.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {membershipPlans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-xl border p-6 text-left transition-all duration-300 ${
                  plan.id === "inner-circle"
                    ? "border-primary bg-primary/5 shadow-gold"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <h3 className="font-display text-xl font-semibold mb-1">{plan.name}</h3>
                <p className="text-3xl font-bold text-primary mb-4">
                  ${plan.price}<span className="text-sm text-muted-foreground font-normal">/mo</span>
                </p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/membership"
                  className={`block text-center py-2.5 rounded-full text-sm font-semibold transition-colors ${
                    plan.id === "inner-circle"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-primary/30 text-foreground hover:bg-primary/10"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SPEAKING CTA */}
      <section className="bg-gradient-section py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Mic className="h-10 w-10 text-primary mx-auto mb-6" />
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">Book Bryant Clark to Speak</h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Invite Bryant Clark to your church, conference, or event. Powerful messages on faith, leadership, and purpose.
            </p>
            <Link
              to="/speaking"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-gold"
            >
              Request a Speaker <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* EMAIL SIGNUP */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Stay Connected</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Get weekly devotionals, book updates, and exclusive content delivered to your inbox.
          </p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-5 py-3 rounded-full bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
