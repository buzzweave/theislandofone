import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, BookOpen } from "lucide-react";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/books", label: "Books" },
  { to: "/sermons", label: "Sermons" },
  { to: "/videos", label: "Videos" },
  { to: "/speaking", label: "Speaking" },
  { to: "/about", label: "About" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <nav className="container mx-auto flex items-center justify-between h-16 px-4 md:px-8">
          <Link to="/" className="flex items-center gap-2 group">
            <BookOpen className="h-6 w-6 text-primary transition-transform group-hover:scale-110" />
            <span className="font-display text-lg font-semibold tracking-wide text-foreground">
              The Island of One
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium tracking-wide transition-colors hover:text-primary ${
                  location.pathname === link.to ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/membership"
              className="px-5 py-2 text-sm font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Join
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-foreground"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl animate-fade-in">
            <div className="flex flex-col px-6 py-4 gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`text-base py-2 font-medium transition-colors ${
                    location.pathname === link.to ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/membership"
                onClick={() => setMenuOpen(false)}
                className="mt-2 px-5 py-2.5 text-center text-sm font-semibold rounded-full bg-primary text-primary-foreground"
              >
                Join the Community
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 pt-16">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="container mx-auto px-4 md:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="font-display text-lg font-semibold">The Island of One Ministries</span>
              </div>
              <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
                Empowering believers to stand firm in faith, lead with purpose, and discover their God-given calling — even when they stand alone.
              </p>
            </div>
            <div>
              <h4 className="font-display text-sm font-semibold mb-4 text-primary">Explore</h4>
              <div className="flex flex-col gap-2">
                {navLinks.slice(1).map((link) => (
                  <Link key={link.to} to={link.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-display text-sm font-semibold mb-4 text-primary">Connect</h4>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <Link to="/membership" className="hover:text-foreground transition-colors">Membership</Link>
                <Link to="/speaking" className="hover:text-foreground transition-colors">Book a Speaker</Link>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} The Island of One Ministries. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
