import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NeonButton } from '@/components/ui/neon-button';
import { toast } from 'sonner';
import { User, Mail, Building2, Save, UserPlus, Lock, Eye, EyeOff, Trash2, Pencil, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface Institution {
  id: string;
  name: string;
}

interface AdminProfile {
  full_name: string | null;
  institution_id: string | null;
}

const AdminSettings = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  // Admin profile state
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [adminName, setAdminName] = useState('');
  const [adminInstitutionId, setAdminInstitutionId] = useState('');

  // Form states for new user
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserInstitutionId, setNewUserInstitutionId] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');

  // Institution management
  const [newInstitutionName, setNewInstitutionName] = useState('');
  const [isCreatingInstitution, setIsCreatingInstitution] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [editInstitutionName, setEditInstitutionName] = useState('');

  // Fetch institutions
  const fetchInstitutions = async () => {
    const { data, error } = await supabase.from('institutions').select('id, name').order('name');
    if (!error && data) {
      setInstitutions(data);
    }
  };

  // Fetch admin profile
  const fetchAdminProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, institution_id')
      .eq('id', user.id)
      .maybeSingle();
    
    if (!error && data) {
      setAdminProfile(data);
      setAdminName(data.full_name || '');
      setAdminInstitutionId(data.institution_id || '');
    }
  };

  useEffect(() => {
    fetchInstitutions();
    fetchAdminProfile();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: adminName,
          institution_id: adminInstitutionId || null
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setIsLoading(false);
    }
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
          institutionId: newUserInstitutionId || null,
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
      setNewUserInstitutionId('');
      setNewUserRole('user');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao criar usuário');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Institution CRUD operations
  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstitutionName.trim()) {
      toast.error('Digite o nome da instituição');
      return;
    }

    setIsCreatingInstitution(true);
    try {
      const { error } = await supabase
        .from('institutions')
        .insert({ name: newInstitutionName.trim(), created_by: user?.id });

      if (error) throw error;
      
      toast.success('Instituição criada com sucesso!');
      setNewInstitutionName('');
      fetchInstitutions();
    } catch (error) {
      console.error('Error creating institution:', error);
      toast.error('Erro ao criar instituição');
    } finally {
      setIsCreatingInstitution(false);
    }
  };

  const handleUpdateInstitution = async () => {
    if (!editingInstitution || !editInstitutionName.trim()) return;

    try {
      const { error } = await supabase
        .from('institutions')
        .update({ name: editInstitutionName.trim() })
        .eq('id', editingInstitution.id);

      if (error) throw error;
      
      toast.success('Instituição atualizada!');
      setEditingInstitution(null);
      setEditInstitutionName('');
      fetchInstitutions();
    } catch (error) {
      console.error('Error updating institution:', error);
      toast.error('Erro ao atualizar instituição');
    }
  };

  const handleDeleteInstitution = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta instituição?')) return;

    try {
      const { error } = await supabase
        .from('institutions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Instituição excluída!');
      fetchInstitutions();
    } catch (error) {
      console.error('Error deleting institution:', error);
      toast.error('Erro ao excluir instituição');
    }
  };

  const startEditInstitution = (inst: Institution) => {
    setEditingInstitution(inst);
    setEditInstitutionName(inst.name);
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
                  <Select value={newUserInstitutionId} onValueChange={setNewUserInstitutionId}>
                    <SelectTrigger className="pl-10 bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Selecione uma instituição" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      {institutions.map((inst) => (
                        <SelectItem key={inst.id} value={inst.id} className="text-white hover:bg-white/10">
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

      {/* Institution Management Section */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Gerenciar Instituições
          </CardTitle>
          <CardDescription className="text-white/60">
            Crie, edite ou exclua instituições do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create new institution */}
          <form onSubmit={handleCreateInstitution} className="flex gap-2">
            <Input
              type="text"
              value={newInstitutionName}
              onChange={(e) => setNewInstitutionName(e.target.value)}
              placeholder="Nome da nova instituição"
              className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
            <NeonButton type="submit" disabled={isCreatingInstitution} className="gap-2">
              <Plus className="w-4 h-4" />
              {isCreatingInstitution ? 'Criando...' : 'Criar'}
            </NeonButton>
          </form>

          {/* List of institutions */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {institutions.length === 0 ? (
              <p className="text-white/40 text-sm">Nenhuma instituição cadastrada</p>
            ) : (
              institutions.map((inst) => (
                <div key={inst.id} className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
                  {editingInstitution?.id === inst.id ? (
                    <>
                      <Input
                        type="text"
                        value={editInstitutionName}
                        onChange={(e) => setEditInstitutionName(e.target.value)}
                        className="flex-1 bg-white/10 border-white/20 text-white"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={handleUpdateInstitution}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingInstitution(null)}
                        className="text-white/60 hover:text-white"
                      >
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Building2 className="w-4 h-4 text-indigo-400" />
                      <span className="flex-1 text-white">{inst.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditInstitution(inst)}
                        className="text-white/60 hover:text-white"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteInstitution(inst.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Profile Section */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-400" />
            Meu Perfil
          </CardTitle>
          <CardDescription className="text-white/60">
            Atualize suas informações pessoais
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
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Seu nome"
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminInstitution" className="text-white/80">Instituição</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 z-10" />
                  <Select value={adminInstitutionId} onValueChange={setAdminInstitutionId}>
                    <SelectTrigger className="pl-10 bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Selecione uma instituição" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      {institutions.map((inst) => (
                        <SelectItem key={inst.id} value={inst.id} className="text-white hover:bg-white/10">
                          {inst.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
    </div>
  );
};

export default AdminSettings;
