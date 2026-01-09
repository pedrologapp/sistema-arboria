import { useNavigate } from 'react-router-dom';
import { User, Mail, GraduationCap, Home, KeyRound, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStudent } from '@/contexts/StudentContext';
import { useAuth } from '@/contexts/AuthContext';
import { CasaBrasao } from '@/components/CasaBrasao';

const PerfilPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, casa, casaColor, isLoading } = useStudent();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleChangePassword = () => {
    navigate('/alterar-senha');
  };

  if (isLoading) {
    return (
      <div className="py-6 space-y-6">
        <div className="h-32 bg-white/10 rounded-xl animate-pulse" />
        <div className="h-48 bg-white/10 rounded-xl animate-pulse" />
        <div className="h-24 bg-white/10 rounded-xl animate-pulse" />
      </div>
    );
  }

  const fullName = profile?.full_name || `${profile?.nome || ''} ${profile?.sobrenome || ''}`.trim() || 'Aluno';

  return (
    <div className="py-6 space-y-6">
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: `${casaColor}20` }}
        >
          <User className="w-10 h-10" style={{ color: casaColor }} />
        </div>
        <h1 className="text-xl font-bold">{fullName}</h1>
        <p className="text-white/60">{user?.email}</p>
      </div>

      {/* Profile Info */}
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider">
            Informações
          </h2>
        </div>

        <div className="divide-y divide-white/5">
          <div className="flex items-center gap-3 p-4">
            <Mail className="w-5 h-5 text-white/40" />
            <div>
              <p className="text-sm text-white/40">E-mail</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4">
            <GraduationCap className="w-5 h-5 text-white/40" />
            <div>
              <p className="text-sm text-white/40">Série / Turma</p>
              <p className="font-medium">
                {profile?.serie || '-'} {profile?.turma ? `/ Turma ${profile.turma}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4">
            <Home className="w-5 h-5 text-white/40" />
            <div>
              <p className="text-sm text-white/40">Casa</p>
              <p className="font-medium flex items-center gap-2">
                {casa ? (
                  <>
                    <CasaBrasao
                      brasaoUrl={casa.brasao_url}
                      emoji={casa.emoji}
                      nome={casa.nome}
                      size="medium"
                    />
                    <span style={{ color: casaColor }}>{casa.nome}</span>
                  </>
                ) : (
                  <span className="text-white/60">Não atribuída</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-12 border-white/10 bg-transparent hover:bg-white/5"
          onClick={handleChangePassword}
        >
          <KeyRound className="w-5 h-5" />
          Alterar Senha
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-12 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          Sair
        </Button>
      </div>
    </div>
  );
};

export default PerfilPage;
