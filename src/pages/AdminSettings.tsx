import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NeonButton } from '@/components/ui/neon-button';
import { toast } from 'sonner';
import { User, Mail, Building2, Save, UserPlus, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AdminSettings = () => {
  const { user, session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [institutions, setInstitutions] = useState<{ id: string; name: string }[]>([]);

  // Form states for new user
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserInstitution, setNewUserInstitution] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');

  useEffect(() => {
    const fetchInstitutions = async () => {
      const { data, error } = await supabase.from('institutions').select('id, name');
      if (!error && data) {
        setInstitutions(data);
      }
    };
    fetchInstitutions();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    setTimeout(() => {
      toast.success('Configurações salvas com sucesso!');
      setIsLoading(false);
    }, 1000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserEmail || !newUserPassword || !newUserFullName) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (newUserPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsCreatingUser(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserEmail,
          password: newUserPassword,
          fullName: newUserFullName,
          institution: newUserInstitution || null,
          role: newUserRole
        }
      });

      if (error) {
        console.error('Error creating user:', error);
        toast.error(error.message || 'Erro ao criar usuário');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Usuário ${newUserEmail} criado com sucesso!`);
      
      // Reset form
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserFullName('');
      setNewUserInstitution('');
      setNewUserRole('user');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao criar usuário');
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Configurações</h1>
        <p className="text-white/60 mt-1">Gerencie as configurações do sistema</p>
      </div>

      {/* Create User Section */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-400" />
            Cadastrar Novo Usuário
          </CardTitle>
          <CardDescription className="text-white/60">
            Adicione novos usuários ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newUserFullName" className="text-white/80">Nome Completo *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="newUserFullName"
                    type="text"
                    value={newUserFullName}
                    onChange={(e) => setNewUserFullName(e.target.value)}
                    placeholder="Nome completo do usuário"
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newUserEmail" className="text-white/80">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="newUserEmail"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newUserPassword" className="text-white/80">Senha *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="newUserPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newUserInstitution" className="text-white/80">Instituição</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 z-10" />
                  <Select value={newUserInstitution} onValueChange={setNewUserInstitution}>
                    <SelectTrigger className="pl-10 bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Selecione uma instituição" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      {institutions.map((inst) => (
                        <SelectItem key={inst.id} value={inst.name} className="text-white hover:bg-white/10">
                          {inst.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newUserRole" className="text-white/80">Tipo de Usuário</Label>
                <Select value={newUserRole} onValueChange={(value: 'user' | 'admin') => setNewUserRole(value)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10">
                    <SelectItem value="user" className="text-white hover:bg-white/10">
                      Usuário
                    </SelectItem>
                    <SelectItem value="admin" className="text-white hover:bg-white/10">
                      Administrador
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <NeonButton type="submit" disabled={isCreatingUser} className="gap-2">
              <UserPlus className="w-4 h-4" />
              {isCreatingUser ? 'Cadastrando...' : 'Cadastrar Usuário'}
            </NeonButton>
          </form>
        </CardContent>
      </Card>

      {/* Profile Section */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-400" />
            Perfil do Administrador
          </CardTitle>
          <CardDescription className="text-white/60">
            Informações do seu perfil de administrador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/80">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="pl-10 bg-white/5 border-white/10 text-white/60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-white/80">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome"
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>
            </div>

            <NeonButton type="submit" disabled={isLoading} className="gap-2">
              <Save className="w-4 h-4" />
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </NeonButton>
          </form>
        </CardContent>
      </Card>

      {/* System Settings Section */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Configurações do Sistema
          </CardTitle>
          <CardDescription className="text-white/60">
            Configurações gerais da aplicação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-white/40 text-sm">
            Mais configurações serão adicionadas em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
