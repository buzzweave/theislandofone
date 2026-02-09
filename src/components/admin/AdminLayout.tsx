import { useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Video,
  Mic,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
  LogOut,
  MessageSquare,
  ImageIcon,
} from "lucide-react";
import AISidebar from "./AISidebar";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/hero", label: "Hero Banners", icon: ImageIcon },
  { to: "/admin/books", label: "Books", icon: BookOpen },
  { to: "/admin/sermons", label: "Sermons", icon: FileText },
  { to: "/admin/videos", label: "Videos", icon: Video },
  { to: "/admin/speaking", label: "Speaking", icon: Mic },
  { to: "/admin/members", label: "Members", icon: Users },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/chatgpt", label: "ChatGPT", icon: MessageSquare },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAdminAuth();

  const isActive = (path: string, end?: boolean) => {
    if (end) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  // Determine content type for AI sidebar based on route
  const getContentType = (): "book" | "sermon" | "chapter" | "notes" => {
    if (location.pathname.includes("/sermons")) return "sermon";
    if (location.pathname.includes("/books")) return "book";
    return "sermon"; // default
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* ─── Left Navigation Sidebar ─── */}
      <aside
        className={`shrink-0 flex flex-col border-r border-border bg-card transition-all duration-200 ${
          sidebarCollapsed ? "w-16" : "w-56"
        }`}
      >
        {/* Brand */}
        <div className="h-14 flex items-center px-4 border-b border-border gap-2">
          <BookOpen className="h-5 w-5 text-primary shrink-0" />
          {!sidebarCollapsed && (
            <span className="font-display text-sm font-semibold truncate">Admin</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive(item.to, item.end)
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Bottom controls */}
        <div className="border-t border-border p-2 space-y-1">
          <button
            onClick={() => { logout(); navigate("/admin/login"); }}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full"
            title={sidebarCollapsed ? "Sign out" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-card">
          <h1 className="font-display text-base font-semibold truncate">
            {navItems.find((n) => isActive(n.to, n.end))?.label || "Admin"}
          </h1>
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
        </header>

        {/* Content + AI sidebar */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </div>

          {/* AI Sidebar */}
          {aiSidebarOpen && (
            <div className="w-80 shrink-0 overflow-hidden">
              <AISidebar contentType={getContentType()} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
