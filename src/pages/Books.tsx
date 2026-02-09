import { useState } from "react";
import { Download, ShoppingCart } from "lucide-react";
import bookCover1 from "@/assets/book-cover-1.jpg";
import bookCover2 from "@/assets/book-cover-2.jpg";
import bookCover3 from "@/assets/book-cover-3.jpg";
import { useBooks } from "@/hooks/useBooks";

const bookCovers: Record<string, string> = {
  "book-cover-1": bookCover1,
  "book-cover-2": bookCover2,
  "book-cover-3": bookCover3,
};

export default function Books() {
  const { books } = useBooks();
  const categories = ["All", ...Array.from(new Set(books.map((b) => b.category)))];
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedBook, setSelectedBook] = useState<string | null>(null);

  const filtered = activeCategory === "All" ? books : books.filter((b) => b.category === activeCategory);
  const detail = books.find((b) => b.id === selectedBook);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="py-20 bg-gradient-section">
        <div className="container mx-auto px-4 text-center">
          <p className="text-primary text-sm tracking-[0.2em] uppercase mb-3">Library</p>
          <h1 className="font-display text-5xl md:text-6xl font-bold mb-4">Books</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Faith-driven books for believers, leaders, and anyone seeking purpose.
          </p>
        </div>
      </section>

      {/* Filters */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 justify-center mb-12">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setSelectedBook(null); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Book Detail Modal */}
        {detail && (
          <div className="max-w-4xl mx-auto mb-16 animate-fade-up">
            <div className="rounded-2xl border border-border bg-card overflow-hidden md:flex">
              <div className="md:w-1/3">
                <img src={bookCovers[detail.coverImage]} alt={detail.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-8 md:w-2/3 flex flex-col justify-center">
                <span className="text-xs text-primary uppercase tracking-wider mb-2">{detail.category}</span>
                <h2 className="font-display text-3xl font-bold mb-2">{detail.title}</h2>
                <p className="text-muted-foreground text-sm mb-1">{detail.subtitle}</p>
                <p className="text-muted-foreground text-xs mb-6">by {detail.author}</p>
                <p className="text-secondary-foreground leading-relaxed mb-8">{detail.description}</p>
                <div className="flex items-center gap-4">
                  <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-gold">
                    {detail.isFree ? (
                      <><Download className="h-4 w-4" /> Free Download</>
                    ) : (
                      <><ShoppingCart className="h-4 w-4" /> Buy — ${detail.price}</>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedBook(null)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Back to list
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto pb-24">
          {filtered.map((book) => (
            <button
              key={book.id}
              onClick={() => setSelectedBook(book.id)}
              className="group rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all duration-300 text-left hover:shadow-gold"
            >
              <div className="aspect-[2/3] overflow-hidden">
                <img
                  src={bookCovers[book.coverImage]}
                  alt={book.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <span className="text-xs text-primary uppercase tracking-wider">{book.category}</span>
                <h3 className="font-display text-lg font-semibold mt-1 mb-1 group-hover:text-primary transition-colors">{book.title}</h3>
                <p className="text-muted-foreground text-sm line-clamp-2 mb-3">{book.subtitle}</p>
                <span className="text-primary text-sm font-semibold">
                  {book.isFree ? "Free" : `$${book.price}`}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
