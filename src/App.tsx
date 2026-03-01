import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ScrollToTop from "@/components/ScrollToTop";
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
import RecoverAdmin from "./pages/RecoverAdmin";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// Admin pages
import MonitorPage from "./pages/admin/MonitorPage";
import PessoasPage from "./pages/admin/PessoasPage";
import PerfilAlunoAdminPage from "./pages/admin/PerfilAlunoAdminPage";
import PerfilProfessorAdminPage from "./pages/admin/PerfilProfessorAdminPage";
import CasasPage from "./pages/admin/CasasPage";
import FasesPage from "./pages/admin/FasesPage";
import FaseDetalhesPage from "./pages/admin/FaseDetalhesPage";
import FaseNovaPage from "./pages/admin/FaseNovaPage";
import RelatoriosPage from "./pages/admin/RelatoriosPage";
import ConfigPage from "./pages/admin/ConfigPage";
import ConteudoAdminPage from "./pages/admin/ConteudoAdminPage";
import ConteudoInteligenciaAdminPage from "./pages/admin/ConteudoInteligenciaAdminPage";

// Aluno pages
import HomePage from "./pages/aluno/HomePage";
import MissoesPage from "./pages/aluno/MissoesPage";
import MissoesFasePage from "./pages/aluno/MissoesFasePage";
import MissoesSemanaPageAluno from "./pages/aluno/MissoesSemanaPage";
import MissoesCasaPage from "./pages/aluno/MissoesCasaPage";
import MissaoDetalhePage from "./pages/aluno/MissaoDetalhePage";
import CasaPage from "./pages/aluno/CasaPage";
import ChatPage from "./pages/aluno/ChatPage";
import CanalChatPage from "./pages/aluno/CanalChatPage";
import DmChatPage from "./pages/aluno/DmChatPage";
import MembrosPage from "./pages/aluno/MembrosPage";
import PerfilPage from "./pages/aluno/PerfilPage";
import ConfiguracoesPage from "./pages/aluno/ConfiguracoesPage";

// Professor pages
import ProfessorDashboardWrapper from "./pages/professor/ProfessorDashboardWrapper";
import MapaDesenvolvimentoPage from "./pages/professor/MapaDesenvolvimentoPage";
import ProfessorMissoesPage from "./pages/professor/MissoesPage";
import NovaMissaoPage from "./pages/professor/NovaMissaoPage";
import EditarMissaoPage from "./pages/professor/EditarMissaoPage";
import MissaoDetalhesPage from "./pages/professor/MissaoDetalhesPage";
import EntregasPage from "./pages/professor/EntregasPage";
import AvaliarEntregaPage from "./pages/professor/AvaliarEntregaPage";
import CirculoPage from "./pages/professor/CirculoPage";
import CirculoTurmaPage from "./pages/professor/circulo/CirculoTurmaPage";
import CirculoTurmaDirectPage from "./pages/professor/circulo/CirculoTurmaDirectPage";
import CirculoAlunosPage from "./pages/professor/circulo/CirculoAlunosPage";
import CirculoRegistrarPage from "./pages/professor/circulo/CirculoRegistrarPage";
import CirculoRegistrarMultiplosPage from "./pages/professor/circulo/CirculoRegistrarMultiplosPage";
import AlunosPageWrapper from "./pages/professor/AlunosPageWrapper";
import PerfilAlunoPageWrapper from "./pages/professor/PerfilAlunoPageWrapper";
import ProfessorConfiguracoesPage from "./pages/professor/ProfessorConfiguracoesPage";
import MissoesSeriePage from "./pages/professor/MissoesSeriePage";
import MissoesSemanaPage from "./pages/professor/MissoesSemanaPage";
import MissoesListaPage from "./pages/professor/MissoesListaPage";
import AlunosPorTipoPage from "./pages/professor/AlunosPorTipoPage";
import AlunoMissoesPage from "./pages/professor/AlunoMissoesPage";
import EntregasSeriePage from "./pages/professor/EntregasSeriePage";
import EntregasSemanaPage from "./pages/professor/EntregasSemanaPage";
import EntregasMissaoListaPage from "./pages/professor/EntregasMissaoListaPage";
import EntregasMissaoPage from "./pages/professor/EntregasMissaoPage";
import EntregasAlunoPage from "./pages/professor/EntregasAlunoPage";
import ProfessorChatPage from "./pages/professor/ProfessorChatPage";
import ProfessorCanalViewPage from "./pages/professor/ProfessorCanalViewPage";
import ProfessorDmPage from "./pages/professor/ProfessorDmPage";
import ConteudoPage from "./pages/professor/ConteudoPage";
import ConteudoGeralPage from "./pages/professor/ConteudoGeralPage";
import ConteudoInteligenciaPage from "./pages/professor/ConteudoInteligenciaPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
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
            <Route path="/admin" element={<Navigate to="/admin/monitor" replace />} />
            <Route path="/admin/monitor" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <MonitorPage />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/pessoas" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <PessoasPage />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/pessoas/aluno/:id" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <PerfilAlunoAdminPage />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/pessoas/professor/:id" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <PerfilProfessorAdminPage />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/casas" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <CasasPage />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/fases" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <FasesPage />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/fases/nova" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <FaseNovaPage />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/fases/:id" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <FaseDetalhesPage />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/relatorios" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <RelatoriosPage />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/config" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <ConfigPage />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/conteudo" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <ConteudoAdminPage />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/conteudo/inteligencia/:id" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <ConteudoInteligenciaAdminPage />
                </AdminLayout>
              </ProtectedRoute>
            } />

            {/* Professor Routes */}
            <Route path="/professor" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <ProfessorDashboardWrapper />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/mapa" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <MapaDesenvolvimentoPage />
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
            {/* Novo fluxo centrado no aluno */}
            <Route path="/professor/missoes/serie/:serie/semana/:semana/geral/alunos" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <AlunosPorTipoPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/missoes/serie/:serie/semana/:semana/casa/:casaId/alunos" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <AlunosPorTipoPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/missoes/serie/:serie/semana/:semana/aluno/:alunoId" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <AlunoMissoesPage />
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
            <Route path="/professor/entregas/aluno/:alunoId" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <EntregasAlunoPage />
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
            <Route path="/professor/circulo/serie/:serie" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <CirculoTurmaPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/circulo/turma/:turmaId" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <CirculoTurmaDirectPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/circulo/serie/:serie/turma/:turma" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <CirculoAlunosPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/circulo/aluno/:alunoId" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <CirculoRegistrarPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/circulo/multiplos" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <CirculoRegistrarMultiplosPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/alunos" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <AlunosPageWrapper />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/alunos/:id" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <PerfilAlunoPageWrapper />
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
            <Route path="/professor/chat" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <ProfessorChatPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/chat/canal/:canalId" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <ProfessorCanalViewPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/chat/dm/:conversaId" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <ProfessorDmPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            
            {/* Conteúdo Routes (Infantil/F1) */}
            <Route path="/professor/conteudo" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <ConteudoPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/conteudo/geral" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <ConteudoGeralPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />
            <Route path="/professor/conteudo/inteligencia/:inteligenciaId" element={
              <ProfessorProtectedRoute>
                <ProfessorLayout>
                  <ConteudoInteligenciaPage />
                </ProfessorLayout>
              </ProfessorProtectedRoute>
            } />

            {/* Aluno Routes */}
            <Route path="/aluno" element={<Navigate to="/aluno/home" replace />} />
            <Route path="/aluno/home" element={
              <StudentProtectedRoute>
                <StudentLayout>
                  <HomePage />
                </StudentLayout>
              </StudentProtectedRoute>
            } />
            <Route path="/aluno/missoes" element={
              <StudentProtectedRoute>
                <StudentLayout>
                  <MissoesPage />
                </StudentLayout>
              </StudentProtectedRoute>
            } />
            <Route path="/aluno/missoes/fase/:faseId" element={
              <StudentProtectedRoute>
                <StudentLayout>
                  <MissoesFasePage />
                </StudentLayout>
              </StudentProtectedRoute>
            } />
            <Route path="/aluno/missoes/fase/:faseId/semana/:semana" element={
              <StudentProtectedRoute>
                <StudentLayout>
                  <MissoesSemanaPageAluno />
                </StudentLayout>
              </StudentProtectedRoute>
            } />
            <Route path="/aluno/missoes/fase/:faseId/semana/:semana/casa/:casaId" element={
              <StudentProtectedRoute>
                <StudentLayout>
                  <MissoesCasaPage />
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