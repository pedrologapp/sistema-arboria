import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Home, User, Loader2 } from 'lucide-react';

interface Profile {
  full_name: string | null;
  nome: string | null;
  sobrenome: string | null;
  institution: string | null;
  must_change_password: boolean | null;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isCheckingPassword, setIsCheckingPassword] = useState(true);

  useEffect(() => {
    const checkRoleAndRedirect = async () => {
      if (!user) {
        setIsCheckingPassword(false);
        return;
      }

      // Fetch profile first
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, nome, sobrenome, institution, must_change_password')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        
        // Redirect to password change if required
        if (profileData.must_change_password) {
          navigate('/alterar-senha', { replace: true });
          return;
        }
      }

      // Check professor role
      const { data: professorRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'professor')
        .maybeSingle();

      if (professorRole) {
        navigate('/professor', { replace: true });
        return;
      }

      // Check student role
      const { data: studentRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'user')
        .maybeSingle();

      if (studentRole) {
        navigate('/aluno/missoes', { replace: true });
        return;
      }

      setIsCheckingPassword(false);
    };

    checkRoleAndRedirect();
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Show loading while checking password requirement
  if (isCheckingPassword) {
    return (
      <div className="min-h-screen w-full bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  const displayName = profile?.full_name || 
    (profile?.nome && profile?.sobrenome ? `${profile.nome} ${profile.sobrenome}` : 'Usuário');

  return (
    <div className="min-h-screen w-full bg-black relative">
      <div className="relative z-10 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Bem-vindo, {displayName}!
            </h1>
            <p className="text-white/60 mt-1">{profile?.institution || 'Sua casa te espera'}</p>
          </div>
          <Button 
            onClick={handleSignOut} 
            variant="outline" 
            className="gap-2 bg-black border-white/20 text-white hover:bg-gray-900 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/60">
                Meu Perfil
              </CardTitle>
              <User className="w-4 h-4 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium text-white">
                {displayName}
              </div>
              <p className="text-white/60 text-sm">{user?.email}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/60">
                Minha Instituição
              </CardTitle>
              <Home className="w-4 h-4 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium text-white">
                {profile?.institution || 'Não definida'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Placeholder for future content */}
        <div className="mt-8">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-12 text-center">
              <Home className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Sua casa te espera!
              </h3>
              <p className="text-white/60">
                Em breve você terá acesso a todas as funcionalidades do sistema.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;