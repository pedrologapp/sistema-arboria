import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ScrollToTop from "@/components/ScrollToTop";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import StudentProtectedRoute from "@/components/StudentProtectedRoute";
import ProfessorProtectedRoute from "@/components/ProfessorProtectedRoute";
import { AdminLayout } from "@/components/AdminLayout";
import StudentLayout from "@/layouts/StudentLayout";
import ProfessorLayout from "@/layouts/ProfessorLayout";

// Páginas essenciais (eager, sempre carregam)
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

/**
 * Shell ÚNICO das rotas do professor: guarda + layout + provider montados UMA
 * vez; as abas trocam só o <Outlet/>. Sem isso, cada navegação remontava o
 * ProfessorProvider (refetch completo) e pintava o spinner de tela cheia.
 */
const ProfessorShell = () => (
  <ProfessorProtectedRoute>
    <ProfessorLayout>
      <Outlet />
    </ProfessorLayout>
  </ProfessorProtectedRoute>
);

// Páginas comuns (lazy)
const Setup = lazy(() => import("./pages/Setup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AlterarSenha = lazy(() => import("./pages/AlterarSenha"));
const RecoverAdmin = lazy(() => import("./pages/RecoverAdmin"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const RecuperarAcesso = lazy(() => import("./pages/RecuperarAcesso"));

// Admin pages (lazy)
const MonitorPage = lazy(() => import("./pages/admin/MonitorPage"));
const PessoasPage = lazy(() => import("./pages/admin/PessoasPage"));
const PerfilAlunoAdminPage = lazy(() => import("./pages/admin/PerfilAlunoAdminPage"));
const PerfilProfessorAdminPage = lazy(() => import("./pages/admin/PerfilProfessorAdminPage"));
const CasasPage = lazy(() => import("./pages/admin/CasasPage"));
const FasesPage = lazy(() => import("./pages/admin/FasesPage"));
const FaseDetalhesPage = lazy(() => import("./pages/admin/FaseDetalhesPage"));
const FaseNovaPage = lazy(() => import("./pages/admin/FaseNovaPage"));
const RelatoriosPage = lazy(() => import("./pages/admin/RelatoriosPage"));
const ConfigPage = lazy(() => import("./pages/admin/ConfigPage"));
const ConteudoAdminPage = lazy(() => import("./pages/admin/ConteudoAdminPage"));
const ConteudoInteligenciaAdminPage = lazy(() => import("./pages/admin/ConteudoInteligenciaAdminPage"));
const AdminChatPage = lazy(() => import("./pages/admin/AdminChatPage"));
const AdminCanalChatPage = lazy(() => import("./pages/admin/AdminCanalChatPage"));
const AdminDmViewPage = lazy(() => import("./pages/admin/AdminDmViewPage"));
const AtividadesPage = lazy(() => import("./pages/admin/AtividadesPage"));
const DadosPage = lazy(() => import("./pages/admin/DadosPage"));
const ArboriaPage = lazy(() => import("./pages/admin/ArboriaPage"));
const RegistroVivoPage = lazy(() => import("./pages/admin/RegistroVivoPage"));

// Aluno pages (lazy)
const HomePage = lazy(() => import("./pages/aluno/HomePage"));
const MissoesPage = lazy(() => import("./pages/aluno/MissoesPage"));
const MissoesFasePage = lazy(() => import("./pages/aluno/MissoesFasePage"));
const MissoesSemanaPageAluno = lazy(() => import("./pages/aluno/MissoesSemanaPage"));
const MissoesCasaPage = lazy(() => import("./pages/aluno/MissoesCasaPage"));
const MissaoDetalhePage = lazy(() => import("./pages/aluno/MissaoDetalhePage"));
const CasaPage = lazy(() => import("./pages/aluno/CasaPage"));
const ChatPage = lazy(() => import("./pages/aluno/ChatPage"));
const CanalChatPage = lazy(() => import("./pages/aluno/CanalChatPage"));
const DmChatPage = lazy(() => import("./pages/aluno/DmChatPage"));
const MembrosPage = lazy(() => import("./pages/aluno/MembrosPage"));
const PerfilPage = lazy(() => import("./pages/aluno/PerfilPage"));
const ConfiguracoesPage = lazy(() => import("./pages/aluno/ConfiguracoesPage"));
const DashboardLiderPage = lazy(() => import("./pages/aluno/DashboardLiderPage"));
const ConquistasPage = lazy(() => import("./pages/aluno/ConquistasPage"));
const CapituloPage = lazy(() => import("./pages/aluno/CapituloPage"));

// Professor pages (lazy)
const ProfessorDashboardWrapper = lazy(() => import("./pages/professor/ProfessorDashboardWrapper"));
const MapaDesenvolvimentoPage = lazy(() => import("./pages/professor/MapaDesenvolvimentoPage"));
const ProfessorMissoesPage = lazy(() => import("./pages/professor/MissoesPage"));
const NovaMissaoPage = lazy(() => import("./pages/professor/NovaMissaoPage"));
const EditarMissaoPage = lazy(() => import("./pages/professor/EditarMissaoPage"));
const MissaoDetalhesPage = lazy(() => import("./pages/professor/MissaoDetalhesPage"));
const EntregasPage = lazy(() => import("./pages/professor/EntregasPage"));
const AvaliarEntregaPage = lazy(() => import("./pages/professor/AvaliarEntregaPage"));
const CirculoPage = lazy(() => import("./pages/professor/CirculoPage"));
const CirculoTurmaPage = lazy(() => import("./pages/professor/circulo/CirculoTurmaPage"));
const CirculoTurmaDirectPage = lazy(() => import("./pages/professor/circulo/CirculoTurmaDirectPage"));
const CirculoAlunosPage = lazy(() => import("./pages/professor/circulo/CirculoAlunosPage"));
const CirculoRegistrarPage = lazy(() => import("./pages/professor/circulo/CirculoRegistrarPage"));
const CirculoRegistrarMultiplosPage = lazy(() => import("./pages/professor/circulo/CirculoRegistrarMultiplosPage"));
const CirculoPessoalPage = lazy(() => import("./pages/professor/circulo/CirculoPessoalPage"));
const CirculoRelatoPage = lazy(() => import("./pages/professor/circulo/CirculoRelatoPage"));
const AlunosPageWrapper = lazy(() => import("./pages/professor/AlunosPageWrapper"));
const FasePageWrapper = lazy(() => import("./pages/professor/FasePageWrapper"));
const PerfilAlunoPageWrapper = lazy(() => import("./pages/professor/PerfilAlunoPageWrapper"));
const InfantilRajadaPage = lazy(() => import("./pages/professor/infantil/InfantilRajadaPage"));
const ProfessorConfiguracoesWrapper = lazy(() => import("./pages/professor/ProfessorConfiguracoesWrapper"));
const MissoesSeriePage = lazy(() => import("./pages/professor/MissoesSeriePage"));
const MissoesSemanaPage = lazy(() => import("./pages/professor/MissoesSemanaPage"));
const MissoesListaPage = lazy(() => import("./pages/professor/MissoesListaPage"));
const AlunosPorTipoPage = lazy(() => import("./pages/professor/AlunosPorTipoPage"));
const AlunoMissoesPage = lazy(() => import("./pages/professor/AlunoMissoesPage"));
const EntregasSeriePage = lazy(() => import("./pages/professor/EntregasSeriePage"));
const EntregasSemanaPage = lazy(() => import("./pages/professor/EntregasSemanaPage"));
const EntregasMissaoListaPage = lazy(() => import("./pages/professor/EntregasMissaoListaPage"));
const EntregasMissaoPage = lazy(() => import("./pages/professor/EntregasMissaoPage"));
const EntregasAlunoPage = lazy(() => import("./pages/professor/EntregasAlunoPage"));
const ProfessorChatPage = lazy(() => import("./pages/professor/ProfessorChatPage"));
const ProfessorCanalViewPage = lazy(() => import("./pages/professor/ProfessorCanalViewPage"));
const ProfessorDmPage = lazy(() => import("./pages/professor/ProfessorDmPage"));
const ConteudoPage = lazy(() => import("./pages/professor/ConteudoPage"));
const ConteudoGeralPage = lazy(() => import("./pages/professor/ConteudoGeralPage"));
const ConteudoInteligenciaPage = lazy(() => import("./pages/professor/ConteudoInteligenciaPage"));
const ReportesMentorPage = lazy(() => import("./pages/professor/ReportesMentorPage"));
const CapituloProfessorPage = lazy(() => import("./pages/professor/CapituloProfessorPage"));

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
          <ScrollToTop />
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/recuperar-admin" element={<RecoverAdmin />} />
            <Route path="/redefinir-senha" element={<ResetPassword />} />
            <Route path="/recuperar-acesso" element={<RecuperarAcesso />} />
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
            <Route path="/admin/dados" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <DadosPage />
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

            {/* Admin Atividades */}
            <Route path="/admin/atividades" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <AtividadesPage />
                </AdminLayout>
              </ProtectedRoute>
            } />

            {/* O Arboria */}
            <Route path="/admin/arboria" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <ArboriaPage />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/arboria/aluno/:id" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <RegistroVivoPage />
                </AdminLayout>
              </ProtectedRoute>
            } />

            {/* Admin Chat Routes */}
            <Route path="/admin/chat" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <AdminChatPage />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/chat/canal/:canalId" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <AdminCanalChatPage />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/chat/dm/:conversaId" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout>
                  <AdminDmViewPage />
                </AdminLayout>
              </ProtectedRoute>
            } />

            {/* Professor Routes: shell ÚNICO: layout + contexto persistem entre abas
                (antes, cada rota remontava o ProfessorProvider = refetch de tudo +
                tela de loading a cada clique) */}
            <Route element={<ProfessorShell />}>
            <Route path="/professor" element={<ProfessorDashboardWrapper />} />
            <Route path="/professor/mapa" element={<MapaDesenvolvimentoPage />} />
            {/* Aba "Fase" do Infantil (estudo/apoio): reforma 26/06 */}
            <Route path="/professor/fase" element={<FasePageWrapper />} />
            <Route path="/professor/missoes" element={<ProfessorMissoesPage />} />
            <Route path="/professor/missoes/nova" element={<NovaMissaoPage />} />
            <Route path="/professor/missoes/serie/:serie" element={<MissoesSeriePage />} />
            <Route path="/professor/missoes/serie/:serie/semana/:semana" element={<MissoesSemanaPage />} />
            <Route path="/professor/missoes/serie/:serie/semana/:semana/geral" element={<MissoesListaPage />} />
            <Route path="/professor/missoes/serie/:serie/semana/:semana/casa/:casaId" element={<MissoesListaPage />} />
            {/* Novo fluxo centrado no aluno */}
            <Route path="/professor/missoes/serie/:serie/semana/:semana/geral/alunos" element={<AlunosPorTipoPage />} />
            <Route path="/professor/missoes/serie/:serie/semana/:semana/casa/:casaId/alunos" element={<AlunosPorTipoPage />} />
            <Route path="/professor/missoes/serie/:serie/semana/:semana/aluno/:alunoId" element={<AlunoMissoesPage />} />
            <Route path="/professor/missoes/:id" element={<MissaoDetalhesPage />} />
            <Route path="/professor/missoes/:id/editar" element={<EditarMissaoPage />} />
            <Route path="/professor/entregas" element={<EntregasPage />} />
            <Route path="/professor/entregas/serie/:serie" element={<EntregasSeriePage />} />
            <Route path="/professor/entregas/serie/:serie/semana/:semana" element={<EntregasSemanaPage />} />
            <Route path="/professor/entregas/serie/:serie/semana/:semana/geral" element={<EntregasMissaoListaPage />} />
            <Route path="/professor/entregas/serie/:serie/semana/:semana/casa/:casaId" element={<EntregasMissaoListaPage />} />
            <Route path="/professor/entregas/missao/:missaoId" element={<EntregasMissaoPage />} />
            <Route path="/professor/entregas/aluno/:alunoId" element={<EntregasAlunoPage />} />
            <Route path="/professor/entregas/:id" element={<AvaliarEntregaPage />} />
            <Route path="/professor/circulo" element={<CirculoPage />} />
            <Route path="/professor/circulo/serie/:serie" element={<CirculoTurmaPage />} />
            <Route path="/professor/circulo/turma/:turmaId" element={<CirculoTurmaDirectPage />} />
            <Route path="/professor/circulo/serie/:serie/turma/:turma" element={<CirculoAlunosPage />} />
            <Route path="/professor/circulo/aluno/:alunoId" element={<CirculoRegistrarPage />} />
            <Route path="/professor/circulo/multiplos" element={<CirculoRegistrarMultiplosPage />} />
            <Route path="/professor/circulo/pessoal" element={<CirculoPessoalPage />} />
            <Route path="/professor/circulo/relato" element={<CirculoRelatoPage />} />
            <Route path="/professor/alunos" element={<AlunosPageWrapper />} />
            <Route path="/professor/aula" element={<InfantilRajadaPage />} />
            <Route path="/professor/alunos/:id" element={<PerfilAlunoPageWrapper />} />
            <Route path="/professor/configuracoes" element={<ProfessorConfiguracoesWrapper />} />
            <Route path="/professor/chat" element={<ProfessorChatPage />} />
            <Route path="/professor/chat/canal/:canalId" element={<ProfessorCanalViewPage />} />
            <Route path="/professor/chat/dm/:conversaId" element={<ProfessorDmPage />} />
            
            {/* Reportes dos alunos */}
            <Route path="/professor/reportes" element={<ReportesMentorPage />} />

            {/* O Capítulo - alocação de papéis */}
            <Route path="/professor/capitulo" element={<CapituloProfessorPage />} />

            {/* Conteúdo Routes (Infantil/F1) */}
            <Route path="/professor/conteudo" element={<ConteudoPage />} />
            <Route path="/professor/conteudo/geral" element={<ConteudoGeralPage />} />
            <Route path="/professor/conteudo/inteligencia/:inteligenciaId" element={<ConteudoInteligenciaPage />} />

            </Route>

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
            <Route path="/aluno/conquistas" element={
              <StudentProtectedRoute>
                <StudentLayout>
                  <ConquistasPage />
                </StudentLayout>
              </StudentProtectedRoute>
            } />
            <Route path="/aluno/dashboard" element={
              <StudentProtectedRoute>
                <StudentLayout>
                  <DashboardLiderPage />
                </StudentLayout>
              </StudentProtectedRoute>
            } />
            <Route path="/aluno/capitulo" element={
              <StudentProtectedRoute>
                <StudentLayout>
                  <CapituloPage />
                </StudentLayout>
              </StudentProtectedRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;