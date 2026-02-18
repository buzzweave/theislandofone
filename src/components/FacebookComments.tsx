import { useEffect, useRef } from "react";

declare global {
  interface Window {
    FB?: {
      XFBML: {
        parse: (element?: HTMLElement) => void;
      };
    };
  }
}

interface FacebookCommentsProps {
  slug: string;
  siteUrl?: string;
  numPosts?: number;
}

export default function FacebookComments({
  slug,
  siteUrl = "https://theislandofone.lovable.app",
  numPosts = 5,
}: FacebookCommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageUrl = `${siteUrl}/blog/${slug}`;

  useEffect(() => {
    if (window.FB && containerRef.current) {
      window.FB.XFBML.parse(containerRef.current);
    }
  }, [slug]);

  return (
    <div ref={containerRef} className="mt-8">
      <h3 className="text-lg font-semibold mb-4">Comments</h3>
      <div
        className="fb-comments"
        data-href={pageUrl}
        data-width="100%"
        data-numposts={numPosts}
        data-colorscheme="dark"
      />
    </div>
  );
}
