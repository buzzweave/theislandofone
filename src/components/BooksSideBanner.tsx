import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function BooksSideBanner() {
  const { data: settings } = useQuery({
    queryKey: ["site_settings", "books_side_banner"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["books_banner_enabled", "books_banner_text", "books_banner_button_label", "books_banner_button_link"]);
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { map[r.key] = r.value; });
      return map;
    },
  });

  if (!settings || settings.books_banner_enabled !== "true" || !settings.books_banner_text) return null;

  return (
    <>
      {/* Desktop: vertical side banner */}
      <div className="hidden lg:flex fixed right-0 top-1/4 z-30 w-14 flex-col items-center gap-3 px-2 py-6 rounded-l-xl bg-primary text-primary-foreground shadow-lg">
        <p className="text-xs font-semibold [writing-mode:vertical-lr] rotate-180 whitespace-pre-line text-center leading-tight">
          {settings.books_banner_text}
        </p>
        {settings.books_banner_button_label && settings.books_banner_button_link && (
          <a href={settings.books_banner_button_link} className="text-[10px] font-bold underline [writing-mode:vertical-lr] rotate-180">
            {settings.books_banner_button_label}
          </a>
        )}
      </div>

      {/* Mobile: top banner */}
      <div className="lg:hidden bg-primary text-primary-foreground px-4 py-3 text-center">
        <p className="text-sm font-medium whitespace-pre-line">{settings.books_banner_text}</p>
        {settings.books_banner_button_label && settings.books_banner_button_link && (
          <a href={settings.books_banner_button_link}>
            <Button size="sm" variant="secondary" className="mt-2 text-xs">
              {settings.books_banner_button_label}
            </Button>
          </a>
        )}
      </div>
    </>
  );
}
