import { useState, useEffect } from "react";
import { useBooks, useBook, Book } from "@/hooks/useBooks";
import { usePublishRecords, PublishRecord, useUpsertPublishRecord } from "@/hooks/usePublishRecords";
import { exportBookToEpub, exportSampleEpub, generateMarketingCover, checkCoverDimensions } from "@/lib/bookExport";
import { toast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen, Apple, ShoppingCart, Download, ExternalLink, CheckCircle2, Clock,
  AlertCircle, Send, Link as LinkIcon, Copy, Image,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: "Not Started", color: "bg-muted text-muted-foreground", icon: Clock },
  formatting: { label: "Formatting", color: "bg-yellow-500/15 text-yellow-600", icon: Clock },
  ready: { label: "Ready to Submit", color: "bg-blue-500/15 text-blue-600", icon: Download },
  submitted: { label: "Submitted", color: "bg-orange-500/15 text-orange-600", icon: Send },
  live: { label: "Published", color: "bg-green-500/15 text-green-600", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-destructive/15 text-destructive", icon: AlertCircle },
};

function CoverPreview({ book }: { book: Book }) {
  const [dims, setDims] = useState<{ width: number; height: number; appleOk: boolean; kdpOk: boolean } | null>(null);

  useEffect(() => {
    if (book.cover_image) {
      checkCoverDimensions(book.cover_image).then(setDims).catch(() => setDims(null));
    }
  }, [book.cover_image]);

  if (!book.cover_image) {
    return (
      <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-center">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
        <p className="text-sm font-medium text-destructive">No cover image</p>
        <p className="text-xs text-muted-foreground">Add a cover image in the Book Editor before publishing.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 items-start">
      <img src={book.cover_image} alt="Cover" className="w-24 h-36 object-cover rounded-lg border border-border shadow-md" />
      <div className="space-y-2">
        {dims && (
          <>
            <p className="text-xs text-muted-foreground">{dims.width} × {dims.height} px</p>
            <div className="flex gap-2">
              <Badge className={dims.appleOk ? "bg-green-500/15 text-green-600 border-0" : "bg-destructive/15 text-destructive border-0"}>
                Apple {dims.appleOk ? "✓" : "✗"}
              </Badge>
              <Badge className={dims.kdpOk ? "bg-green-500/15 text-green-600 border-0" : "bg-destructive/15 text-destructive border-0"}>
                KDP {dims.kdpOk ? "✓" : "✗"}
              </Badge>
            </div>
            {!dims.appleOk && <p className="text-[10px] text-destructive">Apple requires shortest side ≥ 1400px</p>}
            {!dims.kdpOk && <p className="text-[10px] text-destructive">KDP requires ≥ 625×1000px</p>}
          </>
        )}
        <Button size="sm" variant="outline" onClick={async () => {
          try {
            await generateMarketingCover(book.cover_image, book.title);
            toast({ title: "Marketing cover downloaded (1600×2560)" });
          } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
          }
        }}>
          <Image className="h-3.5 w-3.5 mr-1.5" /> Download Marketing Cover
        </Button>
      </div>
    </div>
  );
}

function MetadataPanel({ book }: { book: Book }) {
  const metadata = `Title: ${book.title}
Subtitle: ${book.subtitle || "N/A"}
Author: ${book.author}
Description: ${book.description?.replace(/<[^>]+>/g, "").substring(0, 500) || "N/A"}
Category: ${book.category}
Language: English
Chapters: ${book.chapters?.length || 0}
Price: ${book.is_free ? "Free" : `$${book.price}`}`;

  const copyMetadata = () => {
    navigator.clipboard.writeText(metadata);
    toast({ title: "Metadata copied to clipboard" });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          Book Metadata
          <Button size="sm" variant="outline" onClick={copyMetadata}>
            <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{metadata}</pre>
      </CardContent>
    </Card>
  );
}

function PlatformCard({
  platform, record, book, onUpdate, isPending,
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

  const handleGenerateEpub = async () => {
    try {
      await exportBookToEpub(book);
      toast({ title: "EPUB Generated", description: "Your store-ready EPUB with embedded cover has been downloaded." });
      if (status === "draft") {
        onUpdate({ book_id: book.id, platform, status: "formatting" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDownloadSample = async () => {
    try {
      await exportSampleEpub(book);
      toast({ title: "Sample EPUB Downloaded", description: "Your sample EPUB containing the Preface has been downloaded." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
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
            <h3 className="font-display font-semibold text-lg">{isApple ? "Apple Books" : "Amazon KDP"}</h3>
            <p className="text-xs text-muted-foreground">{isApple ? "iTunes Connect / Apple Books for Authors" : "Kindle Direct Publishing"}</p>
          </div>
        </div>
        <Badge className={`${statusCfg.color} border-0 gap-1`}>
          <StatusIcon className="h-3 w-3" /> {statusCfg.label}
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
          <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">Generate Store-Ready EPUB</p>
            <p className="text-xs text-muted-foreground mb-2">Downloads EPUB 3 with embedded cover (1600×2560), TOC, and all chapters.</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleGenerateEpub}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download EPUB
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownloadSample}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download Sample
              </Button>
              <Button size="sm" variant="outline" onClick={async () => {
                if (!book.cover_image) { toast({ title: "No cover image", variant: "destructive" }); return; }
                try { await generateMarketingCover(book.cover_image, book.title); toast({ title: "Cover downloaded" }); } catch {}
              }}>
                <Image className="h-3.5 w-3.5 mr-1.5" /> Download Cover
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
          <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">{isApple ? "Upload to Apple Books" : "Upload to Amazon KDP"}</p>
            <p className="text-xs text-muted-foreground mb-2">
              {isApple ? "Open Apple Books for Authors, upload EPUB + cover, set pricing." : "Open KDP, create eBook, upload EPUB + cover, fill details."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" asChild>
                <a href={isApple ? "https://authors.apple.com/epub-upload" : "https://kdp.amazon.com"} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> {isApple ? "Open Apple Books for Authors" : "Open Amazon KDP"}
                </a>
              </Button>
              {status !== "submitted" && status !== "live" && (
                <Button size="sm" variant="secondary" onClick={() => onUpdate({ book_id: book.id, platform, status: "submitted" })} disabled={isPending}>
                  <Send className="h-3.5 w-3.5 mr-1.5" /> Mark as Submitted
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
          <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">Confirm Published</p>
            <p className="text-xs text-muted-foreground mb-2">Once live, paste the store link below.</p>
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
                <Button size="sm" variant="outline" onClick={() => onUpdate({ book_id: book.id, platform, status: record?.status || "draft", store_url: storeUrl })} disabled={isPending}>
                  Save
                </Button>
              )}
              {status !== "live" && (
                <Button size="sm" onClick={() => {
                  if (!storeUrl.trim()) { toast({ title: "Store URL required", variant: "destructive" }); return; }
                  onUpdate({ book_id: book.id, platform, status: "live", store_url: storeUrl });
                }} disabled={isPending}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Mark Live
                </Button>
              )}
            </div>
            {record?.published_at && (
              <p className="text-xs text-green-600 mt-2">Published on {new Date(record.published_at).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Requirements Checklist</p>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-green-500" /> EPUB 3.0 with embedded cover</li>
          <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-green-500" /> Table of contents included</li>
          <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-green-500" /> Cover resized to 1600×2560</li>
          {isApple ? (
            <>
              <li className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-yellow-500" /> Apple ID with Books for Authors access</li>
              <li className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-yellow-500" /> Tax & banking info configured</li>
            </>
          ) : (
            <>
              <li className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-yellow-500" /> Amazon KDP account required</li>
              <li className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-yellow-500" /> Pricing & royalty selection</li>
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
  const { data: fullBook, isLoading: bookLoading } = useBook(selectedBookId || undefined);
  const selectedBook = fullBook || books.find((b) => b.id === selectedBookId);
  const { data: records = [], isLoading: recordsLoading } = usePublishRecords(selectedBookId || undefined);
  const upsert = useUpsertPublishRecord();

  const handleUpdate = (data: Partial<PublishRecord> & { platform: string; book_id: string }) => {
    upsert.mutate(
      { book_id: data.book_id, platform: data.platform, status: data.status || "draft", store_url: data.store_url, notes: data.notes },
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
        <p className="text-sm text-muted-foreground">Format and publish your books to Apple Books and Amazon Kindle.</p>
      </div>

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
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" /> {book.title}
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
          {/* Book info + cover preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              {selectedBook.cover_image && (
                <img src={selectedBook.cover_image} alt={selectedBook.title} className="w-16 h-24 object-cover rounded-lg shadow-md" />
              )}
              <div className="min-w-0">
                <h3 className="font-display font-semibold text-lg truncate">{selectedBook.title}</h3>
                {selectedBook.subtitle && <p className="text-sm text-muted-foreground truncate">{selectedBook.subtitle}</p>}
                <p className="text-xs text-muted-foreground mt-1">{selectedBook.chapters?.length || 0} chapters · {selectedBook.author}</p>
                {bookLoading && <p className="text-xs text-muted-foreground">Loading chapters...</p>}
              </div>
            </div>
            <CoverPreview book={selectedBook} />
          </div>

          <MetadataPanel book={selectedBook} />

          {recordsLoading ? (
            <p className="text-sm text-muted-foreground">Loading publish status...</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PlatformCard platform="apple_books" record={appleRecord} book={selectedBook} onUpdate={handleUpdate} isPending={upsert.isPending} />
              <PlatformCard platform="amazon_kdp" record={amazonRecord} book={selectedBook} onUpdate={handleUpdate} isPending={upsert.isPending} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
