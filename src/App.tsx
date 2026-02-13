import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import AdminLayout from "./components/admin/AdminLayout";
import AdminGuard from "./components/admin/AdminGuard";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import Index from "./pages/Index";
import Books from "./pages/Books";
import BookDetail from "./pages/BookDetail";
import Sermons from "./pages/Sermons";
import Videos from "./pages/Videos";
import Graphics from "./pages/Graphics";
import About from "./pages/About";
import Speaking from "./pages/Speaking";
import Membership from "./pages/Membership";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPlaceholder from "./pages/admin/AdminPlaceholder";
import AdminSermonEditor from "./pages/admin/AdminSermonEditor";
import AdminBookEditor from "./pages/admin/AdminBookEditor";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminSpeakingRequests from "./pages/admin/AdminSpeakingRequests";
import AdminVideoManager from "./pages/admin/AdminVideoManager";
import AdminMembers from "./pages/admin/AdminMembers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminChatGPT from "./pages/admin/AdminChatGPT";
import AdminHeroBanners from "./pages/admin/AdminHeroBanners";
import AdminMembershipPlans from "./pages/admin/AdminMembershipPlans";
import AdminGraphics from "./pages/admin/AdminGraphics";
import AdminBlogManager from "./pages/admin/AdminBlogManager";
import AdminPublisher from "./pages/admin/AdminPublisher";
import AdminAudiobooks from "./pages/admin/AdminAudiobooks";
import SermonDetail from "./pages/SermonDetail";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import Copyright from "./pages/Copyright";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AdminNotifications from "./pages/admin/AdminNotifications";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AdminAuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Layout><Index /></Layout>} />
            <Route path="/books" element={<Layout><Books /></Layout>} />
            <Route path="/books/:id" element={<Layout><BookDetail /></Layout>} />
            <Route path="/sermons" element={<Layout><Sermons /></Layout>} />
            <Route path="/sermons/:id" element={<Layout><SermonDetail /></Layout>} />
            <Route path="/videos" element={<Layout><Videos /></Layout>} />
            <Route path="/graphics" element={<Layout><Graphics /></Layout>} />
            <Route path="/blog" element={<Layout><Blog /></Layout>} />
            <Route path="/blog/:slug" element={<Layout><BlogPost /></Layout>} />
            <Route path="/about" element={<Layout><About /></Layout>} />
            <Route path="/speaking" element={<Layout><Speaking /></Layout>} />
            <Route path="/membership" element={<Layout><Membership /></Layout>} />
            <Route path="/contact" element={<Layout><Contact /></Layout>} />
            <Route path="/copyright" element={<Layout><Copyright /></Layout>} />
            <Route path="/terms" element={<Layout><TermsOfService /></Layout>} />
            <Route path="/privacy" element={<Layout><PrivacyPolicy /></Layout>} />

            {/* Admin login (public) */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Protected admin routes */}
            <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
              <Route index element={<AdminDashboard />} />
              <Route path="books" element={<AdminBookEditor />} />
              <Route path="hero" element={<AdminHeroBanners />} />
              <Route path="sermons" element={<AdminSermonEditor />} />
              <Route path="videos" element={<AdminVideoManager />} />
              <Route path="speaking" element={<AdminSpeakingRequests />} />
              <Route path="members" element={<AdminMembers />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="chatgpt" element={<AdminChatGPT />} />
              <Route path="plans" element={<AdminMembershipPlans />} />
              <Route path="graphics" element={<AdminGraphics />} />
              <Route path="audiobooks" element={<AdminAudiobooks />} />
              <Route path="blog" element={<AdminBlogManager />} />
              <Route path="publisher" element={<AdminPublisher />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AdminAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
