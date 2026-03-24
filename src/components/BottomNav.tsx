import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingBag, BookOpen, Mic, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSermonsEnabled } from "@/hooks/useSermonsEnabled";

const allTabs = [
  { to: "/books", label: "Store", icon: ShoppingBag },
  { to: "/blog", label: "Devotion", icon: BookOpen },
  { to: "/", label: "Home", icon: Home },
  { to: "/sermons", label: "Sermons", icon: Mic },
  { to: "/donate", label: "Donate", icon: Heart },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  const { enabled: sermonsEnabled } = useSermonsEnabled();
  const tabs = useMemo(
    () => sermonsEnabled ? allTabs : allTabs.filter(t => t.to !== "/sermons"),
    [sermonsEnabled]
  );
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border/60 bg-card/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-stretch justify-around h-14">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]")} strokeWidth={active ? 2.5 : 2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
