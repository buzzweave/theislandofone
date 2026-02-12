import { useState } from "react";
import { useBooks, Book } from "@/hooks/useBooks";
import { usePublishRecords, PublishRecord, useUpsertPublishRecord } from "@/hooks/usePublishRecords";
import { exportBookToEpub } from "@/lib/bookExport";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Apple,
  ShoppingCart,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  Link as LinkIcon,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: "Not Started", color: "bg-muted text-muted-foreground", icon: Clock },
  formatting: { label: "Formatting", color: "bg-yellow-500/15 text-yellow-600", icon: Clock },
  ready: { label: "Ready to Submit", color: "bg-blue-500/15 text-blue-600", icon: Download },
  submitted: { label: "Submitted", color: "bg-orange-500/15 text-orange-600", icon: Send },
  live: { label: "Published", color: "bg-green-500/15 text-green-600", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-destructive/15 text-destructive", icon: AlertCircle },
};

function PlatformCard({
  platform,
  record,
  book,
  onUpdate,
  isPending,
}: {
  platform: "apple_books" | "amazon_kdp";
  record: PublishRecord | undefined;
  book: Book;
  onUpdate: (data: Partial<PublishRecord> & { platform: string; book_id: string }) => void;
  isPending: boolean;
}) {
  const [storeUrl, setStoreUrl] = useState(record?.store_url || "");
  const isApple = platform === "apple_books";
  const status = record?.status || "draft";
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const StatusIcon = statusCfg.icon;

  const handleGenerateEpub = () => {
    try {
      exportBookToEpub(book);
      toast({ title: "EPUB Generated", description: "Your store-ready EPUB has been downloaded." });
      if (status === "draft") {
        onUpdate({ book_id: book.id, platform, status: "formatting" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to generate EPUB.", variant: "destructive" });
    }
  };

  const handleMarkSubmitted = () => {
    onUpdate({ book_id: book.id, platform, status: "submitted" });
  };

  const handleMarkLive = () => {
    if (!storeUrl.trim()) {
      toast({ title: "Store URL required", description: "Please paste the store link first.", variant: "destructive" });
      return;
    }
    onUpdate({ book_id: book.id, platform, status: "live", store_url: storeUrl });
  };

  const handleSaveUrl = () => {
    onUpdate({ book_id: book.id, platform, status: record?.status || "draft", store_url: storeUrl });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {isApple ? (
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-pink-500/10 to-purple-500/10">
              <Apple className="h-6 w-6 text-pink-500" />
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500/10 to-yellow-500/10">
              <ShoppingCart className="h-6 w-6 text-orange-500" />
            </div>
          )}
          <div>
            <h3 className="font-display font-semibold text-lg">
              {isApple ? "Apple Books" : "Amazon KDP"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isApple ? "iTunes Connect / Apple Books for Authors" : "Kindle Direct Publishing"}
            </p>
          </div>
        </div>
        <Badge className={`${statusCfg.color} border-0 gap-1`}>
          <StatusIcon className="h-3 w-3" />
          {statusCfg.label}
        </Badge>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {/* Step 1: Generate EPUB */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
          <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">Generate Store-Ready EPUB</p>
            <p className="text-xs text-muted-foreground mb-2">
              Downloads a formatted EPUB with cover metadata, table of contents, and all chapters.
            </p>
            <Button size="sm" variant="outline" onClick={handleGenerateEpub}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Download EPUB
            </Button>
          </div>
        </div>

        {/* Step 2: Connect / Upload */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
          <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">
              {isApple ? "Connect to Apple Books" : "Connect to Amazon KDP"}
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              {isApple
                ? "Open Apple Books for Authors, upload your EPUB, add cover image, set pricing & publish."
                : "Open KDP dashboard, create a new Kindle eBook, upload your EPUB & cover, fill out details & publish."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" asChild>
                <a
                  href={isApple ? "https://authors.apple.com" : "https://kdp.amazon.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  {isApple ? "Open Apple Books for Authors" : "Open Amazon KDP"}
                </a>
              </Button>
              {status !== "submitted" && status !== "live" && (
                <Button size="sm" variant="secondary" onClick={handleMarkSubmitted} disabled={isPending}>
                  <Send className="h-3.5 w-3.5 mr-1.5" /> Mark as Submitted
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Track */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
          <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">Confirm Published</p>
            <p className="text-xs text-muted-foreground mb-2">
              Once live, paste the store link below to track it here.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={isApple ? "https://books.apple.com/..." : "https://amazon.com/dp/..."}
                  className="pl-8 text-sm h-9"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                />
              </div>
              {storeUrl !== (record?.store_url || "") && (
                <Button size="sm" variant="outline" onClick={handleSaveUrl} disabled={isPending}>
                  Save
                </Button>
              )}
              {status !== "live" && (
                <Button size="sm" onClick={handleMarkLive} disabled={isPending}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Mark Live
                </Button>
              )}
            </div>
            {record?.published_at && (
              <p className="text-xs text-green-600 mt-2">
                Published on {new Date(record.published_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="mt-5 pt-4 border-t border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Requirements Checklist</p>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          {isApple ? (
            <>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-green-500" /> EPUB 3.0 format (auto-generated)</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-green-500" /> Table of contents included</li>
              <li className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-yellow-500" /> Cover image (1400×1873 min, upload separately)</li>
              <li className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-yellow-500" /> Apple ID with Books for Authors access</li>
              <li className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-yellow-500" /> Tax & banking info configured</li>
            </>
          ) : (
            <>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-green-500" /> Kindle-compatible EPUB (auto-generated)</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-green-500" /> Table of contents included</li>
              <li className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-yellow-500" /> Cover image (2560×1600 ideal, upload separately)</li>
              <li className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-yellow-500" /> Amazon KDP account required</li>
              <li className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-yellow-500" /> Book description & categories</li>
              <li className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-yellow-500" /> Pricing & royalty selection (35% or 70%)</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}

export default function AdminPublisher() {
  const { data: books = [], isLoading: booksLoading } = useBooks();
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const selectedBook = books.find((b) => b.id === selectedBookId);
  const { data: records = [], isLoading: recordsLoading } = usePublishRecords(selectedBookId || undefined);
  const upsert = useUpsertPublishRecord();

  const handleUpdate = (data: Partial<PublishRecord> & { platform: string; book_id: string }) => {
    upsert.mutate(
      {
        book_id: data.book_id,
        platform: data.platform,
        status: data.status || "draft",
        store_url: data.store_url,
        notes: data.notes,
      },
      {
        onSuccess: () => toast({ title: "Status updated" }),
        onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const appleRecord = records.find((r) => r.platform === "apple_books");
  const amazonRecord = records.find((r) => r.platform === "amazon_kdp");

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold mb-1">Publisher</h2>
        <p className="text-sm text-muted-foreground">
          Format and publish your books to Apple Books and Amazon Kindle.
        </p>
      </div>

      {/* Book selector */}
      <div className="mb-8 max-w-md">
        <label className="text-sm font-medium mb-2 block">Select a Book to Publish</label>
        <Select value={selectedBookId} onValueChange={setSelectedBookId}>
          <SelectTrigger>
            <SelectValue placeholder={booksLoading ? "Loading books..." : "Choose a book"} />
          </SelectTrigger>
          <SelectContent>
            {books.map((book) => (
              <SelectItem key={book.id} value={book.id}>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  {book.title}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedBook && (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a book above to begin publishing.</p>
        </div>
      )}

      {selectedBook && (
        <div className="space-y-6">
          {/* Book info */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
            {selectedBook.cover_image && (
              <img
                src={selectedBook.cover_image}
                alt={selectedBook.title}
                className="w-16 h-24 object-cover rounded-lg shadow-md"
              />
            )}
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-lg truncate">{selectedBook.title}</h3>
              {selectedBook.subtitle && (
                <p className="text-sm text-muted-foreground truncate">{selectedBook.subtitle}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {selectedBook.chapters?.length || 0} chapters · {selectedBook.author}
              </p>
            </div>
          </div>

          {/* Platform cards */}
          {recordsLoading ? (
            <p className="text-sm text-muted-foreground">Loading publish status...</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PlatformCard
                platform="apple_books"
                record={appleRecord}
                book={selectedBook}
                onUpdate={handleUpdate}
                isPending={upsert.isPending}
              />
              <PlatformCard
                platform="amazon_kdp"
                record={amazonRecord}
                book={selectedBook}
                onUpdate={handleUpdate}
                isPending={upsert.isPending}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
