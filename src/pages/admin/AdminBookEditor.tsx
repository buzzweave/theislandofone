import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Save,
  Trash2,
  Star,
  DollarSign,
  BookOpen,
  Image,
} from "lucide-react";
import { type Book, type BookChapter } from "@/data/content";
import { useBooks } from "@/hooks/useBooks";
import SortableChapterList from "@/components/admin/SortableChapterList";

const CATEGORIES = ["Devotional", "Faith", "Leadership", "Ministry", "Prayer", "Family"];

export default function AdminBookEditor() {
  const { books: bookList, setBooks: setBookList } = useBooks();
  const [activeId, setActiveId] = useState<string | null>(bookList[0]?.id ?? null);
  const [saved, setSaved] = useState(false);
  

  const active = bookList.find((b) => b.id === activeId) ?? null;

  const update = (fields: Partial<Book>) => {
    if (!activeId) return;
    setBookList((prev) =>
      prev.map((b) => (b.id === activeId ? { ...b, ...fields } : b)),
    );
    setSaved(false);
  };

  const addNew = () => {
    const newBook: Book = {
      id: crypto.randomUUID(),
      title: "Untitled Book",
      subtitle: "",
      author: "Bryant Clark",
      description: "",
      price: 0,
      isFree: true,
      category: "Faith",
      coverImage: "",
      chapters: [],
      featured: false,
    };
    setBookList((prev) => [newBook, ...prev]);
    setActiveId(newBook.id);
    setSaved(false);
  };

  const deleteBook = (id: string) => {
    setBookList((prev) => prev.filter((b) => b.id !== id));
    if (activeId === id) setActiveId(bookList.find((b) => b.id !== id)?.id ?? null);
  };

  const addChapter = () => {
    if (!active) return;
    const newChapter: BookChapter = {
      id: crypto.randomUUID(),
      title: `Chapter ${active.chapters.length + 1}`,
      content: "",
    };
    update({ chapters: [...active.chapters, newChapter] });
  };

  const updateChapter = (chapterId: string, fields: Partial<BookChapter>) => {
    if (!active) return;
    update({
      chapters: active.chapters.map((ch) =>
        ch.id === chapterId ? { ...ch, ...fields } : ch,
      ),
    });
  };

  const deleteChapter = (chapterId: string) => {
    if (!active) return;
    update({ chapters: active.chapters.filter((ch) => ch.id !== chapterId) });
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Book list sidebar */}
      <div className="w-64 shrink-0 flex flex-col border border-border rounded-lg bg-card overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold">Books</span>
          <Button size="icon" variant="ghost" onClick={addNew} title="New book">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {bookList.map((b) => (
            <button
              key={b.id}
              onClick={() => setActiveId(b.id)}
              className={`w-full text-left px-3 py-2.5 text-sm border-b border-border transition-colors ${
                b.id === activeId
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-2">
                {b.featured && <Star className="h-3 w-3 text-primary shrink-0" />}
                <span className="truncate font-medium">{b.title}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{b.category}</span>
                <span className="text-[10px] text-muted-foreground">
                  {b.chapters.length} ch.
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      {active ? (
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Title & meta */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Title</Label>
              <Input
                value={active.title}
                onChange={(e) => update({ title: e.target.value })}
                className="text-lg font-display"
              />
            </div>
            <div className="col-span-2">
              <Label>Subtitle</Label>
              <Input
                value={active.subtitle}
                onChange={(e) => update({ subtitle: e.target.value })}
              />
            </div>
            <div>
              <Label>Author</Label>
              <Input
                value={active.author}
                onChange={(e) => update({ author: e.target.value })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={active.category} onValueChange={(v) => update({ category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cover Image */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Image className="h-4 w-4" /> Cover Image
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Cover Image Key or URL</Label>
                <Input
                  value={active.coverImage}
                  onChange={(e) => update({ coverImage: e.target.value })}
                  placeholder="e.g. book-cover-1 or https://..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use an existing key (book-cover-1, book-cover-2, book-cover-3) or paste an image URL.
                </p>
              </div>
              {active.coverImage && (
                <div className="w-32 aspect-[2/3] rounded-lg border border-border overflow-hidden bg-muted">
                  {active.coverImage.startsWith("http") ? (
                    <img src={active.coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      {active.coverImage}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              value={active.description}
              onChange={(e) => update({ description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Chapters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Chapters ({active.chapters.length})
                </span>
                <Button size="sm" variant="outline" onClick={addChapter}>
                  <Plus className="h-3 w-3 mr-1" /> Add Chapter
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SortableChapterList
                chapters={active.chapters}
                onReorder={(reordered) => update({ chapters: reordered })}
                onUpdateChapter={updateChapter}
                onDeleteChapter={deleteChapter}
              />
            </CardContent>
          </Card>

          {/* Publishing controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Publishing Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Featured toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Feature on Front Page</p>
                  <p className="text-xs text-muted-foreground">
                    Show this book in the featured section on the homepage.
                  </p>
                </div>
                <Switch
                  checked={active.featured}
                  onCheckedChange={(v) => update({ featured: v })}
                />
              </div>

              {/* Pricing toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" /> Charge for This Book
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Toggle to set a price or make it a free download.
                  </p>
                </div>
                <Switch
                  checked={!active.isFree}
                  onCheckedChange={(v) =>
                    update({ isFree: !v, price: v ? active.price || 14.99 : 0 })
                  }
                />
              </div>

              {/* Price input */}
              {!active.isFree && (
                <div className="pl-4 border-l-2 border-primary/20">
                  <Label>Price ($)</Label>
                  <Input
                    type="number"
                    min={0.99}
                    step={0.01}
                    value={active.price}
                    onChange={(e) =>
                      update({ price: parseFloat(e.target.value) || 0 })
                    }
                    className="w-32"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3 pb-8">
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              {saved ? "Saved!" : "Save Book"}
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => deleteBook(active.id)}
              title="Delete book"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p>Select a book or create a new one.</p>
        </div>
      )}
    </div>
  );
}
