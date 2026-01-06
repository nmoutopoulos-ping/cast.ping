import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/layout/AuthGuard";
import SavedQueries from "@/pages/SavedQueries";
import SavedSearchDetail from "@/pages/SavedSearchDetail";
import Entities from "@/pages/Entities";
import Settings from "@/pages/Settings";
import QueryResults from "@/pages/QueryResults";
import ApiConnections from "@/pages/ApiConnections";
import SandboxViewer from "@/pages/SandboxViewer";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            element={
              <AuthGuard>
                <MainLayout />
              </AuthGuard>
            }
          >
            <Route path="/" element={<QueryResults />} />
            <Route path="/queries" element={<SavedQueries />} />
            <Route path="/queries/:id" element={<SavedSearchDetail />} />
            <Route path="/entities" element={<Entities />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/api-connections" element={<ApiConnections />} />
            <Route path="/sandbox" element={<SandboxViewer />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
