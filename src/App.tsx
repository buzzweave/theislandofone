import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import AdminLayout from "./components/admin/AdminLayout";
import Index from "./pages/Index";
import Books from "./pages/Books";
import Sermons from "./pages/Sermons";
import Videos from "./pages/Videos";
import About from "./pages/About";
import Speaking from "./pages/Speaking";
import Membership from "./pages/Membership";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPlaceholder from "./pages/admin/AdminPlaceholder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Layout><Index /></Layout>} />
          <Route path="/books" element={<Layout><Books /></Layout>} />
          <Route path="/sermons" element={<Layout><Sermons /></Layout>} />
          <Route path="/videos" element={<Layout><Videos /></Layout>} />
          <Route path="/about" element={<Layout><About /></Layout>} />
          <Route path="/speaking" element={<Layout><Speaking /></Layout>} />
          <Route path="/membership" element={<Layout><Membership /></Layout>} />

          {/* Admin routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="books" element={<AdminPlaceholder title="Books Manager" />} />
            <Route path="sermons" element={<AdminPlaceholder title="Sermon Editor" />} />
            <Route path="videos" element={<AdminPlaceholder title="Video Manager" />} />
            <Route path="speaking" element={<AdminPlaceholder title="Speaking Requests" />} />
            <Route path="members" element={<AdminPlaceholder title="Members" />} />
            <Route path="analytics" element={<AdminPlaceholder title="Analytics" />} />
            <Route path="settings" element={<AdminPlaceholder title="Settings" />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
