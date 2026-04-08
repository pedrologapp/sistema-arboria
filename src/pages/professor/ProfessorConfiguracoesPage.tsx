import { ArrowLeft, Lock, Bell, Palette, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { CasaBrasao } from '@/components/CasaBrasao';
import { toast } from 'sonner';
import AvatarUpload from '@/components/aluno/AvatarUpload';

const ProfessorConfiguracoesPage = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { profile, casaMentor, casaColor, refreshData } = useProfessor();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logout realizado com sucesso!');
      navigate('/login');
    } catch (error) {
      toast.error('Erro ao fazer logout');
    }
  };

  const fullName = profile?.full_name || `${profile?.nome || ''} ${profile?.sobrenome || ''}`.trim() || 'Professor';
  const initials = fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="space-y-6 pt-4">
      {/* Header com botão voltar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/professor')}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">Configurações</h1>
      </div>

      {/* Seção Meu Perfil */}
      <div className="space-y-3">
        <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider">
          Meu Perfil
        </h2>
        
        <div 
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: casaColor ? `${casaColor}10` : 'rgba(255,255,255,0.05)',
            borderColor: casaColor ? `${casaColor}30` : 'rgba(255,255,255,0.1)'
          }}
        >
          <div className="flex flex-col items-center gap-4">
            {user?.id && (
              <AvatarUpload
                userId={user.id}
                currentAvatarUrl={profile?.avatar_url || null}
                casaColor={casaColor}
                onUploadSuccess={refreshData}
              />
            )}
            
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white">{fullName}</h3>
              {casaMentor && (
                <p className="text-sm inline-flex items-center justify-center gap-1" style={{ color: casaColor }}>
                  <CasaBrasao 
                    brasaoUrl={casaMentor.brasao_url} 
                    emoji={casaMentor.emoji} 
                    nome={casaMentor.nome}
                    size="mini"
                  />
                  Mentor - Casa {casaMentor.nome}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Seção Segurança */}
      <div className="space-y-3">
        <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider">
          Segurança
        </h2>
        
        <button
          onClick={() => navigate('/alterar-senha')}
          className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-violet-500/10 hover:bg-white/10 transition-all text-left group"
        >
          <div className="p-3 rounded-lg bg-amber-500/20 text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="text-white font-medium block">Alterar Senha</span>
            <span className="text-white/40 text-sm">Atualize sua senha de acesso</span>
          </div>
          <span className="text-white/30 group-hover:text-white/60 transition-colors">→</span>
        </button>
      </div>

      {/* Seção Notificações - Placeholder */}
      <div className="space-y-3">
        <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider">
          Notificações
        </h2>
        
        <div className="p-4 rounded-xl bg-white/5 border border-violet-500/10 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-500/20 text-blue-400">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="text-white/50 font-medium block">Em breve</span>
            <span className="text-white/30 text-sm">Configurações de notificações</span>
          </div>
        </div>
      </div>

      {/* Seção Aparência - Placeholder */}
      <div className="space-y-3">
        <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider">
          Aparência
        </h2>
        
        <div className="p-4 rounded-xl bg-white/5 border border-violet-500/10 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400">
            <Palette className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="text-white/50 font-medium block">Em breve</span>
            <span className="text-white/30 text-sm">Personalização visual</span>
          </div>
        </div>
      </div>

      {/* Botão Logout */}
      <div className="pt-4">
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full bg-transparent border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair da conta
        </Button>
      </div>

      {/* Versão */}
      <div className="text-center pt-4 pb-8">
        <p className="text-xs text-white/30">v1.0.0 • Projeto Arboria</p>
      </div>
    </div>
  );
};

export default ProfessorConfiguracoesPage;
