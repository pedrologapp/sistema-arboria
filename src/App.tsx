import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import StudentProtectedRoute from "@/components/StudentProtectedRoute";
import ProfessorProtectedRoute from "@/components/ProfessorProtectedRoute";
import { AdminLayout } from "@/components/AdminLayout";
import StudentLayout from "@/layouts/StudentLayout";
import ProfessorLayout from "@/layouts/ProfessorLayout";
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
import CanalChatPage from "./pages/aluno/CanalChatPage";
import DmChatPage from "./pages/aluno/DmChatPage";
import MembrosPage from "./pages/aluno/MembrosPage";
import PerfilPage from "./pages/aluno/PerfilPage";
import ConfiguracoesPage from "./pages/aluno/ConfiguracoesPage";

// Professor pages
import ProfessorDashboard from "./pages/professor/ProfessorDashboard";
import ProfessorMissoesPage from "./pages/professor/MissoesPage";
import NovaMissaoPage from "./pages/professor/NovaMissaoPage";
import EditarMissaoPage from "./pages/professor/EditarMissaoPage";
import MissaoDetalhesPage from "./pages/professor/MissaoDetalhesPage";
import EntregasPage from "./pages/professor/EntregasPage";
import AvaliarEntregaPage from "./pages/professor/AvaliarEntregaPage";
import CirculoPage from "./pages/professor/CirculoPage";
import AlunosPage from "./pages/professor/AlunosPage";
import PerfilAlunoPage from "./pages/professor/PerfilAlunoPage";
import ProfessorConfiguracoesPage from "./pages/professor/ProfessorConfiguracoesPage";
import MissoesSeriePage from "./pages/professor/MissoesSeriePage";
import MissoesSemanaPage from "./pages/professor/MissoesSemanaPage";
import MissoesListaPage from "./pages/professor/MissoesListaPage";
import EntregasSeriePage from "./pages/professor/EntregasSeriePage";
import EntregasSemanaPage from "./pages/professor/EntregasSemanaPage";
import EntregasMissaoListaPage from "./pages/professor/EntregasMissaoListaPage";
import EntregasMissaoPage from "./pages/professor/EntregasMissaoPage";

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

            {/* Professor Routes */}
            <Route path="/professor" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <ProfessorDashboard />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/missoes" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <ProfessorMissoesPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/missoes/nova" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <NovaMissaoPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/missoes/serie/:serie" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <MissoesSeriePage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/missoes/serie/:serie/semana/:semana" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <MissoesSemanaPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/missoes/serie/:serie/semana/:semana/geral" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <MissoesListaPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/missoes/serie/:serie/semana/:semana/casa/:casaId" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <MissoesListaPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/missoes/:id" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <MissaoDetalhesPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/missoes/:id/editar" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <EditarMissaoPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/entregas" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <EntregasPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/entregas/serie/:serie" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <EntregasSeriePage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/entregas/serie/:serie/semana/:semana" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <EntregasSemanaPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/entregas/serie/:serie/semana/:semana/geral" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <EntregasMissaoListaPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/entregas/serie/:serie/semana/:semana/casa/:casaId" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <EntregasMissaoListaPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/entregas/missao/:missaoId" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <EntregasMissaoPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/entregas/:id" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <AvaliarEntregaPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/circulo" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <CirculoPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/alunos" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <AlunosPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/alunos/:id" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <PerfilAlunoPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/configuracoes" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <ProfessorConfiguracoesPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
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
            <Route path="/aluno/chat/canal/:canalId" element={
              <StudentProtectedRoute>
                <StudentLayout>
                  <CanalChatPage />
                </StudentLayout>
              </StudentProtectedRoute>
            } />
            <Route path="/aluno/chat/dm/:conversaId" element={
              <StudentProtectedRoute>
                <StudentLayout>
                  <DmChatPage />
                </StudentLayout>
              </StudentProtectedRoute>
            } />
            <Route path="/aluno/chat/membros" element={
              <StudentProtectedRoute>
                <StudentLayout>
                  <MembrosPage />
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