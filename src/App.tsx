import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import StudentProtectedRoute from "@/components/StudentProtectedRoute";
import { AdminLayout } from "@/components/AdminLayout";
import StudentLayout from "@/layouts/StudentLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import AlterarSenha from "./pages/AlterarSenha";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminSettings from "./pages/AdminSettings";
import RecoverAdmin from "./pages/RecoverAdmin";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// Aluno pages
import MissoesPage from "./pages/aluno/MissoesPage";
import MissaoDetalhePage from "./pages/aluno/MissaoDetalhePage";
import CasaPage from "./pages/aluno/CasaPage";
import ChatPage from "./pages/aluno/ChatPage";
import PerfilPage from "./pages/aluno/PerfilPage";
import ConfiguracoesPage from "./pages/aluno/ConfiguracoesPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/recuperar-admin" element={<RecoverAdmin />} />
            <Route path="/redefinir-senha" element={<ResetPassword />} />
            <Route path="/alterar-senha" element={
              <ProtectedRoute>
                <AlterarSenha />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            {/* Admin Routes with Layout */}
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/usuarios" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <AdminUsers />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/configuracoes" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <AdminSettings />
                </AdminLayout>
              </ProtectedRoute>
            } />

            {/* Aluno Routes */}
            <Route path="/aluno" element={<Navigate to="/aluno/missoes" replace />} />
            <Route path="/aluno/missoes" element={
              <StudentProtectedRoute>
                <StudentLayout>
                  <MissoesPage />
                </StudentLayout>
              </StudentProtectedRoute>
            } />
            <Route path="/aluno/missoes/:id" element={
              <StudentProtectedRoute>
                <StudentLayout>
                  <MissaoDetalhePage />
                </StudentLayout>
              </StudentProtectedRoute>
            } />
            <Route path="/aluno/casa" element={
              <StudentProtectedRoute>
                <StudentLayout>
                  <CasaPage />
                </StudentLayout>
              </StudentProtectedRoute>
            } />
            <Route path="/aluno/chat" element={
              <StudentProtectedRoute>
                <StudentLayout>
                  <ChatPage />
                </StudentLayout>
              </StudentProtectedRoute>
            } />
            <Route path="/aluno/perfil" element={
              <StudentProtectedRoute>
                <StudentLayout>
                  <PerfilPage />
                </StudentLayout>
              </StudentProtectedRoute>
            } />
            <Route path="/aluno/configuracoes" element={
              <StudentProtectedRoute>
                <StudentLayout>
                  <ConfiguracoesPage />
                </StudentLayout>
              </StudentProtectedRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;