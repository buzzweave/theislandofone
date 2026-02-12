import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import * as pdfjsLib from "pdfjs-dist";

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PdfUploadButtonProps {
  mode: "book" | "sermon";
  onBookParsed?: (data: { title: string; subtitle: string; chapters: { title: string; content: string }[] }) => void;
  onSermonParsed?: (data: { title: string; scripture: string; excerpt: string; manuscript: string }) => void;
  disabled?: boolean;
}

async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    pages.push(pageText);
  }

  return pages.join("\n\n");
}

export default function PdfUploadButton({ mode, onBookParsed, onSermonParsed, disabled }: PdfUploadButtonProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast({ title: "Please select a PDF file", variant: "destructive" });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large (max 20MB)", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      setStatus("Extracting text from PDF…");
      const text = await extractTextFromPdf(file);

      if (!text.trim()) {
        toast({ title: "Could not extract text from PDF", description: "The PDF may be image-based or empty.", variant: "destructive" });
        return;
      }

      setStatus("AI is detecting chapters and formatting…");
      const data = await api.post("/api/parse-pdf", { text, mode });

      if (mode === "book" && onBookParsed) {
        onBookParsed(data);
        toast({ title: "PDF imported!", description: `Detected ${data.chapters?.length ?? 0} chapters.` });
      } else if (mode === "sermon" && onSermonParsed) {
        onSermonParsed(data);
        toast({ title: "PDF imported!", description: "Sermon content loaded." });
      }
    } catch (err: any) {
      console.error("PDF import error:", err);
      toast({ title: "PDF import failed", description: err.message || "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
      setStatus("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
        disabled={disabled || loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            {status || "Processing…"}
          </>
        ) : (
          <>
            <FileUp className="h-4 w-4 mr-1.5" />
            Import PDF
          </>
        )}
      </Button>
    </>
  );
}
