import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, BookOpen } from "lucide-react";
import { useSiteLogo } from "@/hooks/useSiteLogo";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/books", label: "Books" },
  { to: "/sermons", label: "Sermons" },
  { to: "/videos", label: "Videos" },
  { to: "/graphics", label: "Graphics" },
  { to: "/speaking", label: "Speaking" },
  { to: "/about", label: "About" },
];

function SiteLogo({ className = "h-8 w-8" }: { className?: string }) {
  const { logoUrl } = useSiteLogo();

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="Site Logo"
        className={`${className} object-contain`}
      />
    );
  }

  return <BookOpen className={`${className} text-primary`} />;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <nav className="container mx-auto flex items-center justify-between h-14 sm:h-16 px-4 md:px-8">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <SiteLogo className="h-6 w-6 sm:h-7 sm:w-7 transition-transform group-hover:scale-110" />
            <span className="font-display text-base sm:text-lg font-semibold tracking-wide text-foreground hidden xs:inline">
              The Island of One
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
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
            className="lg:hidden text-foreground p-1"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-xl animate-fade-in">
            <div className="flex flex-col px-6 py-4 gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`text-base py-2.5 font-medium transition-colors rounded-md px-3 ${
                    location.pathname === link.to
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/membership"
                onClick={() => setMenuOpen(false)}
                className="mt-3 px-5 py-2.5 text-center text-sm font-semibold rounded-full bg-primary text-primary-foreground"
              >
                Join the Community
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 pt-14 sm:pt-16">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="container mx-auto px-4 md:px-8 py-10 sm:py-12">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <SiteLogo className="h-5 w-5" />
                <span className="font-display text-base sm:text-lg font-semibold">The Island of One Ministries</span>
              </div>
              <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
                Empowering believers to stand firm in faith, lead with purpose, and discover their God-given calling — even when they stand alone.
              </p>
            </div>
            <div>
              <h4 className="font-display text-sm font-semibold mb-3 sm:mb-4 text-primary">Explore</h4>
              <div className="flex flex-col gap-1.5 sm:gap-2">
                {navLinks.slice(1).map((link) => (
                  <Link key={link.to} to={link.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h4 className="font-display text-sm font-semibold mb-3 sm:mb-4 text-primary">Connect</h4>
                <div className="flex flex-col gap-1.5 sm:gap-2 text-sm text-muted-foreground">
                  <Link to="/membership" className="hover:text-foreground transition-colors">Membership</Link>
                  <Link to="/speaking" className="hover:text-foreground transition-colors">Book a Speaker</Link>
                </div>
              </div>
              <div>
                <h4 className="font-display text-sm font-semibold mb-3 sm:mb-4 text-primary">Legal</h4>
                <div className="flex flex-col gap-1.5 sm:gap-2 text-sm text-muted-foreground">
                  <Link to="/copyright" className="hover:text-foreground transition-colors">Copyright</Link>
                  <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
                  <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 sm:mt-10 pt-6 border-t border-border text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} The Island of One Ministries. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
