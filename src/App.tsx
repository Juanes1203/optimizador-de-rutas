import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Get base path from import.meta.env (set by Vite)
const basename = import.meta.env.BASE_URL || "/";

// Component to handle GitHub Pages 404.html redirects
const RedirectHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Handle redirects from 404.html script (format: /?/path)
    // The script creates URLs like: base/?/path, so location.search is "?/path"
    if (location.search.startsWith("?/")) {
      // Extract the path from the query string (remove the "?/" prefix)
      let path = location.search.slice(2); // Remove "?/"
      
      // Decode the path (replace ~and~ with &)
      path = path.replace(/~and~/g, "&");
      
      // Navigate to the actual path
      navigate(path, { replace: true });
    }
  }, [location.search, navigate]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={basename}>
        <RedirectHandler />
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
