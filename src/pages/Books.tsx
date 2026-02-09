import { useState } from "react";
import { Link } from "react-router-dom";
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

  const filtered = activeCategory === "All" ? books : books.filter((b) => b.category === activeCategory);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="py-14 sm:py-20 bg-gradient-section">
        <div className="container mx-auto px-4 text-center">
          <p className="text-primary text-sm tracking-[0.2em] uppercase mb-3">Library</p>
          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold mb-4">Books</h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
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
              onClick={() => setActiveCategory(cat)}
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

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto pb-24">
          {filtered.map((book) => (
            <Link
              key={book.id}
              to={`/books/${book.id}`}
              className="group rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all duration-300 text-left hover:shadow-gold"
            >
              <div className="aspect-[2/3] overflow-hidden">
                <img
                  src={book.coverImage.startsWith("http") ? book.coverImage : bookCovers[book.coverImage]}
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
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
