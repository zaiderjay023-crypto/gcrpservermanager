import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ServerProvider } from "@/contexts/ServerContext";
import Landing from "./pages/Landing";
import AuthCallback from "./pages/AuthCallback";
import ServerPicker from "./pages/ServerPicker";
import ServerLayout from "./components/ServerLayout";
import ServerHome from "./pages/server/Home";
import Register from "./pages/server/Register";
import Police from "./pages/server/Police";
import Owner from "./pages/server/Owner";
import Staff from "./pages/server/Staff";
import Audit from "./pages/server/Audit";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/servers" element={<ServerPicker />} />
            <Route path="/s/:slug" element={<ServerProvider><ServerLayout /></ServerProvider>}>
              <Route index element={<ServerHome />} />
              <Route path="register" element={<Register />} />
              <Route path="police" element={<Police />} />
              <Route path="owner" element={<Owner />} />
              <Route path="staff" element={<Staff />} />
              <Route path="audit" element={<Audit />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
