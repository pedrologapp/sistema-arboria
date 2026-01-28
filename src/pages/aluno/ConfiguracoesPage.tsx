import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  KeyRound, 
  LogOut, 
  Bell, 
  Palette,
  Shield,
  ChevronRight,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useStudent } from '@/contexts/StudentContext';
import AvatarUpload from '@/components/aluno/AvatarUpload';
const ConfiguracoesPage = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { profile, casa, casaColor, refreshData } = useStudent();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleChangePassword = () => {
    navigate('/alterar-senha');
  };

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <button 
          onClick={() => navigate('/aluno/perfil')}
          className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Configurações</h1>
      </motion.div>

      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <h2 className="text-sm font-semibold text-white/60 flex items-center gap-2 mb-3">
          <User className="w-4 h-4" />
          MEU PERFIL
        </h2>
        
        <div 
          className="rounded-xl border p-6"
          style={{ 
            borderColor: `${casaColor}30`,
            background: `linear-gradient(135deg, ${casaColor}10 0%, transparent 100%)`
          }}
        >
          <div className="flex flex-col items-center">
            {user?.id && (
              <AvatarUpload
                userId={user.id}
                currentAvatarUrl={profile?.avatar_url || null}
                casaColor={casaColor}
                onUploadSuccess={refreshData}
              />
            )}
            
            <div className="text-center mt-4">
              <p className="font-medium text-lg">
                {profile?.full_name || `${profile?.nome || ''} ${profile?.sobrenome || ''}`.trim() || 'Aluno'}
              </p>
              {casa && (
                <p className="text-sm" style={{ color: casaColor }}>
                  {casa.emoji} {casa.nome}
                </p>
              )}
              <p className="text-xs text-white/50 mt-1">
                {profile?.serie} {profile?.turma ? `• Turma ${profile.turma}` : ''}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Security Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-sm font-semibold text-white/60 flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4" />
          SEGURANÇA
        </h2>
        
        <Button
          variant="outline"
          className="w-full justify-between h-14 border-white/10 bg-white/5 hover:bg-white/10"
          onClick={handleChangePassword}
        >
          <div className="flex items-center gap-3">
            <KeyRound className="w-5 h-5" style={{ color: casaColor }} />
            <span>Alterar Senha</span>
          </div>
          <ChevronRight className="w-5 h-5 text-white/40" />
        </Button>
      </motion.div>

      {/* Notifications Section (Future) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-sm font-semibold text-white/60 flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4" />
          NOTIFICAÇÕES
        </h2>
        
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4 opacity-50">
          <div className="flex items-center justify-between">
            <span className="text-sm">Novas missões</span>
            <span className="text-xs text-white/40 bg-white/10 px-2 py-1 rounded">em breve</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Feedback do professor</span>
            <span className="text-xs text-white/40 bg-white/10 px-2 py-1 rounded">em breve</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Ranking da casa</span>
            <span className="text-xs text-white/40 bg-white/10 px-2 py-1 rounded">em breve</span>
          </div>
        </div>
      </motion.div>

      {/* Appearance Section (Future) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-sm font-semibold text-white/60 flex items-center gap-2 mb-3">
          <Palette className="w-4 h-4" />
          APARÊNCIA
        </h2>
        
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 opacity-50">
          <div className="flex items-center justify-between">
            <span className="text-sm">Tema</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/60">Escuro</span>
              <span className="text-xs text-white/40 bg-white/10 px-2 py-1 rounded">em breve</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="pt-4"
      >
        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-14 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          Sair da conta
        </Button>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center pt-8"
      >
        <p className="text-xs text-white/30">
          v1.0.0 • Arboria
        </p>
      </motion.div>
    </div>
  );
};

export default ConfiguracoesPage;
