import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { User, Mail, Building2, Save, Trash2, Pencil, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  // Admin profile state
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [adminName, setAdminName] = useState('');
  const [adminInstitutionId, setAdminInstitutionId] = useState('');

  // Institution management
  const [newInstitutionName, setNewInstitutionName] = useState('');
  const [isCreatingInstitution, setIsCreatingInstitution] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [editInstitutionName, setEditInstitutionName] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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

  // Institution CRUD operations
  const handleCreateInstitutionClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstitutionName.trim()) {
      toast.error('Digite o nome da instituição');
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmCreateInstitution = async () => {
    setShowConfirmDialog(false);
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
          <form onSubmit={handleCreateInstitutionClick} className="flex gap-2">
            <Input
              type="text"
              value={newInstitutionName}
              onChange={(e) => setNewInstitutionName(e.target.value)}
              placeholder="Nome da nova instituição"
              className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
            <Button type="submit" disabled={isCreatingInstitution} className="gap-2">
              <Plus className="w-4 h-4" />
              {isCreatingInstitution ? 'Criando...' : 'Criar'}
            </Button>
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

            <Button type="submit" disabled={isLoading} className="gap-2">
              <Save className="w-4 h-4" />
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Institution Creation */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-gray-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar Criação</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Deseja criar a instituição "{newInstitutionName}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCreateInstitution}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminSettings;
