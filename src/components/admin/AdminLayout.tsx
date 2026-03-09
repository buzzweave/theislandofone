import { useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { AdminErrorBoundary } from "./AdminErrorBoundary";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { AIContentProvider } from "@/contexts/AIContentContext";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Video,
  Mic,
  Users,
  BarChart3,
  Settings,
  PanelRightClose,
  PanelRightOpen,
  LogOut,
  MessageSquare,
  ImageIcon,
  Crown,
  Image,
  PenLine,
  Menu,
  BookUp,
  Headphones,
  Bell as BellIcon,
  Bot,
  Search,
  ClipboardList,
  ScrollText,
  Upload,
  Globe,
  History,
  Mail,
  Palette,
  UserCheck,
  CreditCard,
  KeyRound,
} from "lucide-react";
import AISidebar from "./AISidebar";
import NotificationBell from "./NotificationBell";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/hero", label: "Hero Banners", icon: ImageIcon },
  { to: "/admin/books", label: "Books", icon: BookOpen },
  { to: "/admin/sermons", label: "Sermons", icon: FileText },
  { to: "/admin/videos", label: "Videos", icon: Video },
  { to: "/admin/speaking", label: "Speaking", icon: Mic },
  { to: "/admin/members", label: "Members", icon: Users },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/ai-chat", label: "AI Chat", icon: MessageSquare },
  { to: "/admin/ai-studio", label: "OpenAI Studio", icon: Bot },
  { to: "/admin/categories", label: "Categories", icon: ClipboardList },
  { to: "/admin/plans", label: "Plans", icon: Crown },
  { to: "/admin/graphics", label: "Graphics", icon: Image },
  { to: "/admin/audiobooks", label: "Audiobooks", icon: Headphones },
  { to: "/admin/blog", label: "Blog", icon: PenLine },
  { to: "/admin/publisher", label: "Publisher", icon: BookUp },
  { to: "/admin/crm", label: "Email CRM", icon: Mail },
  { to: "/admin/video-studio", label: "Video Studio", icon: Video },
  { to: "/admin/notifications", label: "Notifications", icon: BellIcon },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

const studioNavItems = [
  { to: "/admin/studio", label: "Studio Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/studio/chapters", label: "Chapter Outlines", icon: FileText },
  { to: "/admin/studio/workspace", label: "Writing Workspace", icon: PenLine },
  { to: "/admin/studio/research", label: "Research Library", icon: Search },
  { to: "/admin/studio/training", label: "Teaching & Training", icon: ScrollText },
  { to: "/admin/studio/publishing", label: "Publishing Checklist", icon: ClipboardList },
  { to: "/admin/studio/landing", label: "Studio Landing Page", icon: Globe },
  { to: "/admin/studio/branding", label: "Branding", icon: Palette },
  { to: "/admin/studio/settings", label: "Settings", icon: Settings },
];

const aiDevNavItems = [
  { to: "/admin/ai-developer", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/ai-developer/console", label: "AI Console", icon: MessageSquare },
  { to: "/admin/ai-developer/scan", label: "Site Scan", icon: Search },
  { to: "/admin/ai-developer/plans", label: "Plans", icon: ClipboardList },
  { to: "/admin/ai-developer/deploy/staging", label: "Staging Deploy", icon: Upload },
  { to: "/admin/ai-developer/deploy/live", label: "Live Deploy", icon: Globe },
  { to: "/admin/ai-developer/deploy/history", label: "Deploy History", icon: History },
  { to: "/admin/ai-developer/settings", label: "Settings", icon: Settings },
  { to: "/admin/ai-developer/audit", label: "Audit Log", icon: ScrollText },
];

export default function AdminLayout() {
  const [aiSidebarOpen, setAiSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAdminAuth();
  const isMobile = useIsMobile();

  const isActive = (path: string, end?: boolean) => {
    if (end) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const getContentType = (): "book" | "sermon" | "chapter" | "notes" => {
    if (location.pathname.includes("/sermons")) return "sermon";
    if (location.pathname.includes("/books")) return "book";
    return "sermon";
  };

  const renderNavLinks = (items: typeof navItems) =>
    items.map((item) => (
      <Link
        key={item.to}
        to={item.to}
        onClick={() => setMobileNavOpen(false)}
        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
          isActive(item.to, (item as any).end)
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span>{item.label}</span>
      </Link>
    ));

  const NavContent = () => (
    <div className="flex flex-col h-full min-h-0">
      <nav className="flex-1 min-h-0 overflow-y-auto py-3 px-2 space-y-0.5">
        {renderNavLinks(navItems)}

        <div className="my-3 border-t border-border" />
        <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Bot className="h-3.5 w-3.5" /> AI Developer
        </div>
        {renderNavLinks(aiDevNavItems)}
      </nav>
      <div className="shrink-0 border-t border-border p-2">
        <button
          onClick={() => { logout(); navigate("/admin/login"); setMobileNavOpen(false); }}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <AIContentProvider>
      <div className="min-h-screen flex bg-background">
        {/* Desktop sidebar */}
        {!isMobile && (
          <aside className="shrink-0 flex flex-col border-r border-border bg-card w-56 h-screen sticky top-0">
            <div className="h-14 shrink-0 flex items-center px-4 border-b border-border gap-2">
              <BookOpen className="h-5 w-5 text-primary shrink-0" />
              <span className="font-display text-sm font-semibold truncate">Admin</span>
            </div>
            <NavContent />
          </aside>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0 bg-card gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {isMobile && (
                <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                   <SheetContent side="left" className="p-0 w-64 flex flex-col h-full overflow-hidden">
                    <div className="h-14 shrink-0 flex items-center px-4 border-b border-border gap-2">
                      <BookOpen className="h-5 w-5 text-primary shrink-0" />
                      <span className="font-display text-sm font-semibold">Admin</span>
                    </div>
                    <NavContent />
                  </SheetContent>
                </Sheet>
              )}
              <h1 className="font-display text-base font-semibold truncate">
                {navItems.find((n) => isActive(n.to, n.end))?.label || "Admin"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              {!isMobile && (
                <button
                  onClick={() => setAiSidebarOpen(!aiSidebarOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border"
                >
                  {aiSidebarOpen ? (
                    <>
                      <PanelRightClose className="h-3.5 w-3.5" /> Hide AI
                    </>
                  ) : (
                    <>
                      <PanelRightOpen className="h-3.5 w-3.5" /> Show AI
                    </>
                  )}
                </button>
              )}
            </div>
          </header>

          {/* Content + AI sidebar */}
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <AdminErrorBoundary>
                <Outlet />
              </AdminErrorBoundary>
            </div>

            {/* AI Sidebar - desktop only */}
            {!isMobile && aiSidebarOpen && (
              <div className="w-80 shrink-0 overflow-hidden">
                <AISidebar contentType={getContentType()} />
              </div>
            )}
          </div>
        </div>
      </div>
    </AIContentProvider>
  );
}
