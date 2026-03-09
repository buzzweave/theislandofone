import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { AuthProvider } from "./contexts/AuthContext";


// Critical path — loaded eagerly
import Index from "./pages/Index";

// Lazy-loaded public pages
const Books = lazy(() => import("./pages/Books"));
const BookDetail = lazy(() => import("./pages/BookDetail"));
const Sermons = lazy(() => import("./pages/Sermons"));
const SermonDetail = lazy(() => import("./pages/SermonDetail"));
const Videos = lazy(() => import("./pages/Videos"));
const Graphics = lazy(() => import("./pages/Graphics"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const About = lazy(() => import("./pages/About"));
const Speaking = lazy(() => import("./pages/Speaking"));
const Membership = lazy(() => import("./pages/Membership"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const Contact = lazy(() => import("./pages/Contact"));
const Copyright = lazy(() => import("./pages/Copyright"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Community = lazy(() => import("./pages/Community"));
const ForumCategory = lazy(() => import("./pages/ForumCategory"));
const ForumThread = lazy(() => import("./pages/ForumThread"));
const InviteRedirect = lazy(() => import("./pages/InviteRedirect"));
const Login = lazy(() => import("./pages/Login"));
const RedeemCode = lazy(() => import("./pages/RedeemCode"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Lazy-loaded admin pages
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminGuard = lazy(() => import("./components/admin/AdminGuard"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminBookEditor = lazy(() => import("./pages/admin/AdminBookEditor"));
const AdminHeroBanners = lazy(() => import("./pages/admin/AdminHeroBanners"));
const AdminSermonEditor = lazy(() => import("./pages/admin/AdminSermonEditor"));
const AdminVideoManager = lazy(() => import("./pages/admin/AdminVideoManager"));
const AdminSpeakingRequests = lazy(() => import("./pages/admin/AdminSpeakingRequests"));
const AdminMembers = lazy(() => import("./pages/admin/AdminMembers"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminAIChat = lazy(() => import("./pages/admin/AdminAIChat"));
const AdminOpenAIStudio = lazy(() => import("./pages/admin/AdminOpenAIStudio"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminMembershipPlans = lazy(() => import("./pages/admin/AdminMembershipPlans"));
const AdminGraphics = lazy(() => import("./pages/admin/AdminGraphics"));
const AdminAudiobooks = lazy(() => import("./pages/admin/AdminAudiobooks"));
const AdminBlogManager = lazy(() => import("./pages/admin/AdminBlogManager"));
const AdminPublisher = lazy(() => import("./pages/admin/AdminPublisher"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminAccessCodes = lazy(() => import("./pages/admin/AdminAccessCodes"));
const AdminUserAccess = lazy(() => import("./pages/admin/AdminUserAccess"));
const AdminCRM = lazy(() => import("./pages/admin/AdminCRM"));
const AdminPlaceholder = lazy(() => import("./pages/admin/AdminPlaceholder"));

const VideoStudio = lazy(() => import("./pages/admin/VideoStudio"));
const VideoLibrary = lazy(() => import("./pages/admin/VideoLibrary"));
const AIDevDashboard = lazy(() => import("./pages/admin/ai-developer/AIDevDashboard"));
const AIDevConsole = lazy(() => import("./pages/admin/ai-developer/AIDevConsole"));
const AIDevSiteScan = lazy(() => import("./pages/admin/ai-developer/AIDevSiteScan"));
const AIDevPlans = lazy(() => import("./pages/admin/ai-developer/AIDevPlans"));
const AIDevPlanDetail = lazy(() => import("./pages/admin/ai-developer/AIDevPlanDetail"));
const AIDevDeployStaging = lazy(() => import("./pages/admin/ai-developer/AIDevDeployStaging"));
const AIDevDeployLive = lazy(() => import("./pages/admin/ai-developer/AIDevDeployLive"));
const AIDevDeployHistory = lazy(() => import("./pages/admin/ai-developer/AIDevDeployHistory"));
const AIDevSettings = lazy(() => import("./pages/admin/ai-developer/AIDevSettings"));
const AIDevAuditLog = lazy(() => import("./pages/admin/ai-developer/AIDevAuditLog"));

function GlobalCopyProtection({ children }: { children: any }) {
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = (el.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return true;
      if ((el as any).isContentEditable === true) return true;
      const role = (el.getAttribute?.("role") || "").toLowerCase();
      if (role === "textbox") return true;
      return false;
    };

    const preventIfNotEditable = (e: Event) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const key = (e.key || "").toLowerCase();
      const isModifier = e.ctrlKey || e.metaKey;
      if (!isModifier) return;
      const blocked = key === "c" || key === "x" || key === "a";
      if (!blocked) return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    };

    document.addEventListener("contextmenu", preventIfNotEditable, { capture: true });
    document.addEventListener("copy", preventIfNotEditable, { capture: true });
    document.addEventListener("cut", preventIfNotEditable, { capture: true });
    document.addEventListener("selectstart", preventIfNotEditable, { capture: true });
    document.addEventListener("keydown", onKeyDown, { capture: true });

    return () => {
      document.removeEventListener("contextmenu", preventIfNotEditable, true as any);
      document.removeEventListener("copy", preventIfNotEditable, true as any);
      document.removeEventListener("cut", preventIfNotEditable, true as any);
      document.removeEventListener("selectstart", preventIfNotEditable, true as any);
      document.removeEventListener("keydown", onKeyDown, true as any);
    };
  }, []);

  return children;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

/** Minimal loading fallback for lazy routes */
function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground text-sm">Loading…</div>
    </div>
  );
}

function LazyLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout>
      <Suspense fallback={<PageFallback />}>{children}</Suspense>
    </Layout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <WorkspaceProvider>
        <AdminAuthProvider>
          <GlobalCopyProtection>
            <BrowserRouter>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  {/* Homepage — eagerly loaded */}
                  <Route path="/" element={<Layout><Index /></Layout>} />

                  {/* Public routes — lazy */}
                  <Route path="/books" element={<LazyLayout><Books /></LazyLayout>} />
                  <Route path="/books/:id" element={<LazyLayout><BookDetail /></LazyLayout>} />
                  <Route path="/sermons" element={<LazyLayout><Sermons /></LazyLayout>} />
                  <Route path="/sermons/:id" element={<LazyLayout><SermonDetail /></LazyLayout>} />
                  <Route path="/videos" element={<LazyLayout><Videos /></LazyLayout>} />
                  <Route path="/graphics" element={<LazyLayout><Graphics /></LazyLayout>} />
                  <Route path="/blog" element={<LazyLayout><Blog /></LazyLayout>} />
                  <Route path="/blog/:slug" element={<LazyLayout><BlogPost /></LazyLayout>} />
                  <Route path="/about" element={<LazyLayout><About /></LazyLayout>} />
                  <Route path="/speaking" element={<LazyLayout><Speaking /></LazyLayout>} />
                  <Route path="/membership" element={<LazyLayout><Membership /></LazyLayout>} />
                  <Route path="/auth" element={<LazyLayout><Auth /></LazyLayout>} />
                  <Route path="/reset-password" element={<LazyLayout><ResetPassword /></LazyLayout>} />
                  <Route path="/payment-success" element={<LazyLayout><PaymentSuccess /></LazyLayout>} />
                  <Route path="/contact" element={<LazyLayout><Contact /></LazyLayout>} />
                  <Route path="/copyright" element={<LazyLayout><Copyright /></LazyLayout>} />
                  <Route path="/terms" element={<LazyLayout><TermsOfService /></LazyLayout>} />
                  <Route path="/privacy" element={<LazyLayout><PrivacyPolicy /></LazyLayout>} />
                  <Route path="/community" element={<LazyLayout><Community /></LazyLayout>} />
                  <Route path="/community/:slug" element={<LazyLayout><ForumCategory /></LazyLayout>} />
                  <Route path="/community/:slug/:postId" element={<LazyLayout><ForumThread /></LazyLayout>} />
                  <Route path="/i/:code" element={<LazyLayout><InviteRedirect /></LazyLayout>} />
                  <Route path="/login" element={<LazyLayout><Login /></LazyLayout>} />
                  <Route path="/redeem" element={<LazyLayout><RedeemCode /></LazyLayout>} />

                  {/* Admin */}
                  <Route path="/admin/login" element={<Suspense fallback={<PageFallback />}><AdminLogin /></Suspense>} />
                  <Route
                    path="/admin"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <AdminGuard>
                          <AdminLayout />
                        </AdminGuard>
                      </Suspense>
                    }
                  >
                    <Route index element={<AdminDashboard />} />
                    <Route path="books" element={<AdminBookEditor />} />
                    <Route path="hero" element={<AdminHeroBanners />} />
                    <Route path="sermons" element={<AdminSermonEditor />} />
                    <Route path="videos" element={<AdminVideoManager />} />
                    <Route path="speaking" element={<AdminSpeakingRequests />} />
                    <Route path="members" element={<AdminMembers />} />
                    <Route path="analytics" element={<AdminAnalytics />} />
                    <Route path="ai-chat" element={<AdminAIChat />} />
                    <Route path="ai-studio" element={<AdminOpenAIStudio />} />
                    <Route path="categories" element={<AdminCategories />} />
                    <Route path="plans" element={<AdminMembershipPlans />} />
                    <Route path="graphics" element={<AdminGraphics />} />
                    <Route path="audiobooks" element={<AdminAudiobooks />} />
                    <Route path="blog" element={<AdminBlogManager />} />
                    <Route path="publisher" element={<AdminPublisher />} />
                    <Route path="notifications" element={<AdminNotifications />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="access-codes" element={<AdminAccessCodes />} />
                    <Route path="user-access" element={<AdminUserAccess />} />
                    <Route path="crm" element={<AdminCRM />} />
                    <Route path="video-studio" element={<VideoStudio />} />
                    <Route path="video-library" element={<VideoLibrary />} />
                    <Route path="ai-developer" element={<AIDevDashboard />} />
                    <Route path="ai-developer/console" element={<AIDevConsole />} />
                    <Route path="ai-developer/scan" element={<AIDevSiteScan />} />
                    <Route path="ai-developer/plans" element={<AIDevPlans />} />
                    <Route path="ai-developer/plans/:id" element={<AIDevPlanDetail />} />
                    <Route path="ai-developer/deploy/staging" element={<AIDevDeployStaging />} />
                    <Route path="ai-developer/deploy/live" element={<AIDevDeployLive />} />
                    <Route path="ai-developer/deploy/history" element={<AIDevDeployHistory />} />
                    <Route path="ai-developer/settings" element={<AIDevSettings />} />
                    <Route path="ai-developer/audit" element={<AIDevAuditLog />} />
                  </Route>

                  <Route path="*" element={<Suspense fallback={<PageFallback />}><NotFound /></Suspense>} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </GlobalCopyProtection>
        </AdminAuthProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
