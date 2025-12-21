import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SparklesCore } from '@/components/ui/sparkles';
import { NeonButton } from '@/components/ui/neon-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Users, Building2, Plus, LogOut, Mail, Lock, User } from 'lucide-react';

interface UserProfile {
  id: string;
  full_name: string | null;
  institution: string | null;
  created_at: string;
}

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserInstitution, setNewUserInstitution] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } else {
      setUsers(data || []);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: newUserFullName,
            institution: newUserInstitution,
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast.error('Este email já está cadastrado');
        } else {
          toast.error(authError.message);
        }
        return;
      }

      if (authData.user) {
        // Add user role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'user',
          });

        if (roleError) {
          console.error('Error adding role:', roleError);
        }

        toast.success('Usuário criado com sucesso!');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserFullName('');
        setNewUserInstitution('');
        setIsCreatingUser(false);
        fetchUsers();
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Erro ao criar usuário');
    } finally {
      setIsLoading(false);
    }
  };

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
            <h1 className="text-3xl font-bold text-white">Painel do Administrador</h1>
            <p className="text-white/60 mt-1">Bem-vindo, {user?.email}</p>
          </div>
          <NeonButton onClick={handleSignOut} variant="ghost" className="gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </NeonButton>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/60">
                Total de Usuários
              </CardTitle>
              <Users className="w-4 h-4 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{users.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/60">
                Instituições
              </CardTitle>
              <Building2 className="w-4 h-4 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {new Set(users.map(u => u.institution).filter(Boolean)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create User Section */}
        <Card className="bg-white/5 border-white/10 mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Criar Novo Usuário</CardTitle>
            <NeonButton
              onClick={() => setIsCreatingUser(!isCreatingUser)}
              size="sm"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              {isCreatingUser ? 'Cancelar' : 'Novo Usuário'}
            </NeonButton>
          </CardHeader>
          {isCreatingUser && (
            <CardContent>
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/80">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@exemplo.com"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      required
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/80">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Senha segura"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-white/80">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Nome do usuário"
                      value={newUserFullName}
                      onChange={(e) => setNewUserFullName(e.target.value)}
                      required
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="institution" className="text-white/80">Instituição</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      id="institution"
                      type="text"
                      placeholder="Nome da instituição"
                      value={newUserInstitution}
                      onChange={(e) => setNewUserInstitution(e.target.value)}
                      required
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <NeonButton type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Criando...' : 'Criar Usuário'}
                  </NeonButton>
                </div>
              </form>
            </CardContent>
          )}
        </Card>

        {/* Users List */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Usuários Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-white/60 text-center py-8">Nenhum usuário cadastrado ainda.</p>
            ) : (
              <div className="space-y-4">
                {users.map((userProfile) => (
                  <div
                    key={userProfile.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div>
                      <p className="text-white font-medium">
                        {userProfile.full_name || 'Sem nome'}
                      </p>
                      <p className="text-white/60 text-sm">
                        {userProfile.institution || 'Sem instituição'}
                      </p>
                    </div>
                    <div className="text-white/40 text-sm">
                      {new Date(userProfile.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
