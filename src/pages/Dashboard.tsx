import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SparklesCore } from '@/components/ui/sparkles';
import { NeonButton } from '@/components/ui/neon-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Home, User } from 'lucide-react';

interface Profile {
  full_name: string | null;
  institution: string | null;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, institution')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-full bg-black relative">
      {/* Background sparkles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <SparklesCore
          background="transparent"
          minSize={0.2}
          maxSize={0.6}
          particleDensity={50}
          className="w-full h-full"
          particleColor="#FFFFFF"
        />
      </div>

      <div className="relative z-10 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Bem-vindo, {profile?.full_name || 'Usuário'}!
            </h1>
            <p className="text-white/60 mt-1">{profile?.institution || 'Sua casa te espera'}</p>
          </div>
          <NeonButton onClick={handleSignOut} variant="ghost" className="gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </NeonButton>
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
                {profile?.full_name || 'Sem nome'}
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
