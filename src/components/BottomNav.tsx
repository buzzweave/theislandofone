import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingBag, BookOpen, PlayCircle, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSermonsEnabled } from "@/hooks/useSermonsEnabled";
import { useIsFullscreen } from "@/hooks/useIsFullscreen";
import { supabase } from "@/integrations/supabase/client";

const NEW_CONTENT_KEY = "watch:lastSeenAt";

type Tab = {
  to: string;
  label: string;
  icon: any;
  matchPaths?: string[];
  showBadge?: boolean;
};

const allTabs: Tab[] = [
  { to: "/books", label: "Store", icon: ShoppingBag },
  { to: "/blog", label: "Devotion", icon: BookOpen },
  { to: "/", label: "Home", icon: Home },
  {
    to: "/watch",
    label: "Watch",
    icon: PlayCircle,
    matchPaths: ["/watch", "/experiences", "/series", "/sermons"],
    showBadge: true,
  },
  { to: "/donate", label: "Donate", icon: Heart },
];

function useWatchBadge(active: boolean) {
  const [hasBadge, setHasBadge] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const lastSeen = localStorage.getItem(NEW_CONTENT_KEY);
      const since = lastSeen ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await (supabase as any)
        .from("immersive_experiences")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .gt("published_at", since);
      if (cancelled) return;
      if ((count ?? 0) > 0) {
        setHasBadge(true);
        return;
      }
      // In-progress viewing for signed-in users
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { count: inProgress } = await (supabase as any)
        .from("experience_view_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userData.user.id)
        .eq("completed", false);
      if (!cancelled && (inProgress ?? 0) > 0) setHasBadge(true);
    }
    check().catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (active && hasBadge) {
      localStorage.setItem(NEW_CONTENT_KEY, new Date().toISOString());
      setHasBadge(false);
    }
  }, [active, hasBadge]);

  return hasBadge;
}

export default function BottomNav() {
  const { pathname } = useLocation();
  const { enabled: sermonsEnabled } = useSermonsEnabled();
  const fullscreen = useIsFullscreen();

  const tabs = useMemo(
    () => (sermonsEnabled ? allTabs : allTabs.filter((t) => t.to !== "/watch")),
    [sermonsEnabled]
  );

  const watchActive = pathname.startsWith("/watch") || pathname.startsWith("/experiences") || pathname.startsWith("/series");
  const watchBadge = useWatchBadge(watchActive);

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border/60 bg-card/95 backdrop-blur-xl",
        "transition-transform duration-300 ease-out",
        fullscreen && "translate-y-full pointer-events-none"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-stretch justify-around h-14">
        {tabs.map(({ to, label, icon: Icon, matchPaths, showBadge }) => {
          const active =
            to === "/"
              ? pathname === "/"
              : (matchPaths ?? [to]).some((p) => pathname === p || pathname.startsWith(p + "/"));
          const badge = showBadge && !active && watchBadge;
          return (
            <Link
              key={to}
              to={to}
              title={label}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  active && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]"
                )}
                strokeWidth={active ? 2.5 : 2}
              />
              {badge && (
                <span
                  aria-hidden
                  className="absolute top-1.5 right-[calc(50%-14px)] h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]"
                />
              )}
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
