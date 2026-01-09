import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  KeyRound, 
  LogOut, 
  Bell, 
  Palette,
  Shield,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useStudent } from '@/contexts/StudentContext';

const ConfiguracoesPage = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { casaColor } = useStudent();

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
          v1.0.0 • Arbória
        </p>
      </motion.div>
    </div>
  );
};

export default ConfiguracoesPage;
