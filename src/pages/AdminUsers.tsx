import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Mail, Lock, User, Building2, GraduationCap, Users, Home, Search, FileDown, Pencil, X, Upload, HelpCircle, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface UserProfile {
  id: string;
  full_name: string | null;
  institution: string | null;
  institution_id: string | null;
  serie: string | null;
  turma: string | null;
  casa: string | null;
  created_at: string;
  email?: string;
}

interface Institution {
  id: string;
  name: string;
}

interface ImportUser {
  email: string;
  senha: string;
  nome_completo: string;
  instituicao: string;
  serie?: string;
  turma?: string;
  casa?: string;
}

const serieOptions = ['6º ano', '7º ano', '8º ano', '9º ano'];
const turmaOptions = ['A', 'B', 'C', 'D'];
const casaOptions = [
  'Linguística',
  'Lógico-matemática',
  'Musical',
  'Espacial',
  'Corporal-cinestésica',
  'Interpessoal',
  'Intrapessoal',
  'Naturalista'
];

const AdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserInstitutionId, setNewUserInstitutionId] = useState('');
  const [newUserSerie, setNewUserSerie] = useState('');
  const [newUserTurma, setNewUserTurma] = useState('');
  const [newUserCasa, setNewUserCasa] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSerie, setFilterSerie] = useState('');
  const [filterTurma, setFilterTurma] = useState('');
  const [filterCasa, setFilterCasa] = useState('');

  // Edit user states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editInstitutionId, setEditInstitutionId] = useState('');
  const [editSerie, setEditSerie] = useState('');
  const [editTurma, setEditTurma] = useState('');
  const [editCasa, setEditCasa] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Import states
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  useEffect(() => {
    fetchUsers();
    fetchInstitutions();
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

  const fetchInstitutions = async () => {
    const { data, error } = await supabase
      .from('institutions')
      .select('id, name')
      .order('name');

    if (!error && data) {
      setInstitutions(data);
    }
  };

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users];

    // Apply search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(u =>
        u.full_name?.toLowerCase().includes(lowerSearch) ||
        u.institution?.toLowerCase().includes(lowerSearch)
      );
    }

    // Apply filters
    if (filterSerie) {
      result = result.filter(u => u.serie === filterSerie);
    }
    if (filterTurma) {
      result = result.filter(u => u.turma === filterTurma);
    }
    if (filterCasa) {
      result = result.filter(u => u.casa === filterCasa);
    }

    // Sort by serie, turma, casa, then name
    result.sort((a, b) => {
      const serieOrderA = serieOptions.indexOf(a.serie || '');
      const serieOrderB = serieOptions.indexOf(b.serie || '');
      if (serieOrderA !== serieOrderB) return serieOrderA - serieOrderB;

      const turmaOrder = (a.turma || '').localeCompare(b.turma || '');
      if (turmaOrder !== 0) return turmaOrder;

      const casaOrder = (a.casa || '').localeCompare(b.casa || '');
      if (casaOrder !== 0) return casaOrder;

      return (a.full_name || '').localeCompare(b.full_name || '');
    });

    return result;
  }, [users, searchTerm, filterSerie, filterTurma, filterCasa]);

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Relatório de Usuários', 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 30);
    doc.text(`Total: ${filteredAndSortedUsers.length} usuários`, 14, 36);

    const tableData = filteredAndSortedUsers.map(user => [
      user.full_name || 'Sem nome',
      user.serie || '-',
      user.turma || '-',
      user.casa || '-',
      user.institution || '-'
    ]);

    autoTable(doc, {
      head: [['Nome', 'Série', 'Turma', 'Casa', 'Instituição']],
      body: tableData,
      startY: 42,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save('usuarios.pdf');
    toast.success('PDF exportado com sucesso!');
  };

  // Open edit dialog
  const openEditDialog = (user: UserProfile) => {
    setEditingUser(user);
    setEditEmail('');
    setEditFullName(user.full_name || '');
    setEditInstitutionId(user.institution_id || '');
    setEditSerie(user.serie || '');
    setEditTurma(user.turma || '');
    setEditCasa(user.casa || '');
    setIsEditDialogOpen(true);
  };

  // Handle update user
  const handleUpdateUser = async () => {
    if (!editingUser) return;

    setIsUpdating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('update-user', {
        body: {
          userId: editingUser.id,
          email: editEmail || undefined,
          fullName: editFullName,
          institutionId: editInstitutionId,
          serie: editSerie,
          turma: editTurma,
          casa: editCasa,
        },
      });

      if (error) {
        console.error('Error updating user:', error);
        toast.error(error.message || 'Erro ao atualizar usuário');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Usuário atualizado com sucesso!');
      setIsEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Erro ao atualizar usuário');
    } finally {
      setIsUpdating(false);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterSerie('');
    setFilterTurma('');
    setFilterCasa('');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!newUserInstitutionId) {
      toast.error('Por favor, selecione uma instituição');
      return;
    }
    if (!newUserSerie) {
      toast.error('Por favor, selecione a série');
      return;
    }
    if (!newUserTurma) {
      toast.error('Por favor, selecione a turma');
      return;
    }
    if (!newUserCasa) {
      toast.error('Por favor, selecione a casa');
      return;
    }

    setIsLoading(true);

    try {
      // Use edge function to create user without affecting admin session
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserEmail,
          password: newUserPassword,
          fullName: newUserFullName,
          institutionId: newUserInstitutionId,
          role: 'user',
          serie: newUserSerie,
          turma: newUserTurma,
          casa: newUserCasa,
        },
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

      toast.success('Usuário criado com sucesso!');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserFullName('');
      setNewUserInstitutionId('');
      setNewUserSerie('');
      setNewUserTurma('');
      setNewUserCasa('');
      setIsCreatingUser(false);
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Erro ao criar usuário');
    } finally {
      setIsLoading(false);
    }
  };

  // Parse CSV file with auto-detection of separator (, or ;)
  const parseCSV = (text: string): ImportUser[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast.error('Arquivo CSV vazio ou com apenas cabeçalho');
      return [];
    }

    // Auto-detect separator - Brazilian Excel uses semicolon
    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';
    
    console.log('CSV separator detected:', separator);
    console.log('First line:', firstLine);

    // Parse headers - remove quotes, BOM, and normalize
    const headers = firstLine
      .replace(/^\uFEFF/, '') // Remove BOM
      .split(separator)
      .map(h => h.trim().toLowerCase().replace(/[\r\n]/g, '').replace(/"/g, ''));
    
    console.log('Headers found:', headers);

    // Validate required headers
    const requiredHeaders = ['email', 'senha', 'nome_completo', 'instituicao'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      toast.error(`Colunas obrigatórias não encontradas: ${missingHeaders.join(', ')}. Verifique se o arquivo está no formato correto.`);
      return [];
    }

    const users = lines.slice(1)
      .filter(line => line.trim())
      .map((line, index) => {
        // Handle quoted values that may contain the separator
        const values = line
          .split(separator)
          .map(v => v.trim().replace(/[\r\n]/g, '').replace(/"/g, ''));
        
        const user: ImportUser = {
          email: values[headers.indexOf('email')] || '',
          senha: values[headers.indexOf('senha')] || '',
          nome_completo: values[headers.indexOf('nome_completo')] || '',
          instituicao: values[headers.indexOf('instituicao')] || '',
          serie: values[headers.indexOf('serie')] || undefined,
          turma: values[headers.indexOf('turma')] || undefined,
          casa: values[headers.indexOf('casa')] || undefined,
        };

        console.log(`Row ${index + 1}:`, user);
        return user;
      });

    return users;
  };

  // Handle import
  const handleImport = async () => {
    if (!importFile) {
      toast.error('Por favor, selecione um arquivo CSV');
      return;
    }

    setIsImporting(true);
    setImportProgress(10);

    try {
      const text = await importFile.text();
      const users = parseCSV(text);

      if (users.length === 0) {
        toast.error('Nenhum usuário encontrado no arquivo CSV');
        setIsImporting(false);
        return;
      }

      setImportProgress(30);

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('import-users', {
        body: { users },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      setImportProgress(90);

      if (response.error) {
        console.error('Import error:', response.error);
        toast.error(response.error.message || 'Erro ao importar usuários');
        return;
      }

      const result = response.data;

      if (result.successCount > 0) {
        toast.success(`${result.successCount} usuário(s) importado(s) com sucesso!`);
      }

      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.slice(0, 5).map((e: { line: number; email: string; error: string }) => 
          `Linha ${e.line} (${e.email}): ${e.error}`
        ).join('\n');
        
        toast.error(`${result.errors.length} erro(s) encontrado(s):\n${errorMessages}`, {
          duration: 10000
        });
      }

      setImportProgress(100);
      fetchUsers();
      setIsImportDialogOpen(false);
      setImportFile(null);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erro ao importar usuários');
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  // Download CSV template
  const downloadTemplate = () => {
    const template = `email,senha,nome_completo,instituicao,serie,turma,casa
exemplo@email.com,Senha123,Nome Completo do Aluno,Nome da Instituição,6º ano,A,Linguística
aluno2@email.com,Senha456,Outro Aluno,Nome da Instituição,7º ano,B,Musical`;
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_importacao_usuarios.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Modelo CSV baixado!');
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Usuários</h1>
        <p className="text-white/60 mt-1">Gerencie os usuários do sistema</p>
      </div>

      {/* Create User Section */}
      <Card className="bg-white/5 border-white/10 mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Criar Novo Usuário</CardTitle>
          <Button
            onClick={() => setIsCreatingUser(!isCreatingUser)}
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            {isCreatingUser ? 'Cancelar' : 'Novo Usuário'}
          </Button>
        </CardHeader>
        {isCreatingUser && (
          <CardContent>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <Label htmlFor="serie" className="text-white/80">Série</Label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 z-10" />
                  <Select value={newUserSerie} onValueChange={setNewUserSerie}>
                    <SelectTrigger className="pl-10 bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Selecione a série" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      {serieOptions.map((serie) => (
                        <SelectItem key={serie} value={serie} className="text-white hover:bg-white/10">
                          {serie}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="turma" className="text-white/80">Turma</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 z-10" />
                  <Select value={newUserTurma} onValueChange={setNewUserTurma}>
                    <SelectTrigger className="pl-10 bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      {turmaOptions.map((turma) => (
                        <SelectItem key={turma} value={turma} className="text-white hover:bg-white/10">
                          {turma}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2 lg:col-span-1">
                <Label htmlFor="casa" className="text-white/80">Casa (Inteligência)</Label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 z-10" />
                  <Select value={newUserCasa} onValueChange={setNewUserCasa}>
                    <SelectTrigger className="pl-10 bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Selecione a casa" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      {casaOptions.map((casa) => (
                        <SelectItem key={casa} value={casa} className="text-white hover:bg-white/10">
                          {casa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Criando...' : 'Criar Usuário'}
                </Button>
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
          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* Search Field */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Pesquisar por nome ou instituição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={filterSerie} onValueChange={setFilterSerie}>
                <SelectTrigger className="w-[130px] bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Série" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  <SelectItem value="all" className="text-white hover:bg-white/10">Todas</SelectItem>
                  {serieOptions.map((serie) => (
                    <SelectItem key={serie} value={serie} className="text-white hover:bg-white/10">
                      {serie}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterTurma} onValueChange={setFilterTurma}>
                <SelectTrigger className="w-[130px] bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Turma" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  <SelectItem value="all" className="text-white hover:bg-white/10">Todas</SelectItem>
                  {turmaOptions.map((turma) => (
                    <SelectItem key={turma} value={turma} className="text-white hover:bg-white/10">
                      Turma {turma}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterCasa} onValueChange={setFilterCasa}>
                <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Casa" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  <SelectItem value="all" className="text-white hover:bg-white/10">Todas</SelectItem>
                  {casaOptions.map((casa) => (
                    <SelectItem key={casa} value={casa} className="text-white hover:bg-white/10">
                      {casa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(searchTerm || filterSerie || filterTurma || filterCasa) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearFilters}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                  title="Limpar filtros"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}

              <Button
                onClick={() => setIsHelpDialogOpen(true)}
                variant="outline"
                className="gap-2 bg-black border-white/20 text-white hover:bg-gray-900"
              >
                <HelpCircle className="w-4 h-4" />
                Instruções CSV
              </Button>

              <Button
                onClick={() => setIsImportDialogOpen(true)}
                variant="outline"
                className="gap-2 bg-black border-white/20 text-white hover:bg-gray-900"
              >
                <Upload className="w-4 h-4" />
                Importar CSV
              </Button>

              <Button
                onClick={exportToPDF}
                variant="outline"
                className="gap-2 bg-black border-white/20 text-white hover:bg-gray-900"
              >
                <FileDown className="w-4 h-4" />
                Exportar PDF
              </Button>
            </div>
          </div>

          {/* Results count */}
          <p className="text-white/40 text-sm mb-4">
            {filteredAndSortedUsers.length} usuário(s) encontrado(s)
          </p>

          {filteredAndSortedUsers.length === 0 ? (
            <p className="text-white/60 text-center py-8">
              {users.length === 0 ? 'Nenhum usuário cadastrado ainda.' : 'Nenhum usuário encontrado com os filtros aplicados.'}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedUsers.map((userProfile) => (
                <div
                  key={userProfile.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 gap-3"
                >
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      {userProfile.full_name || 'Sem nome'}
                    </p>
                    <p className="text-white/60 text-sm">
                      {userProfile.institution || 'Sem instituição'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {userProfile.serie && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                        {userProfile.serie}
                      </span>
                    )}
                    {userProfile.turma && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full">
                        Turma {userProfile.turma}
                      </span>
                    )}
                    {userProfile.casa && (
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                        {userProfile.casa}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-white/40 text-sm">
                      {new Date(userProfile.created_at).toLocaleDateString('pt-BR')}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(userProfile)}
                      className="text-white/60 hover:text-white hover:bg-white/10"
                      title="Editar usuário"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Usuário</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editEmail" className="text-white/80">Novo Email (opcional)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  id="editEmail"
                  type="email"
                  placeholder="Deixe em branco para manter o atual"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editFullName" className="text-white/80">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  id="editFullName"
                  type="text"
                  placeholder="Nome do usuário"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editInstitution" className="text-white/80">Instituição</Label>
              <Select value={editInstitutionId} onValueChange={setEditInstitutionId}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editSerie" className="text-white/80">Série</Label>
                <Select value={editSerie} onValueChange={setEditSerie}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Série" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10">
                    {serieOptions.map((serie) => (
                      <SelectItem key={serie} value={serie} className="text-white hover:bg-white/10">
                        {serie}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editTurma" className="text-white/80">Turma</Label>
                <Select value={editTurma} onValueChange={setEditTurma}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Turma" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10">
                    {turmaOptions.map((turma) => (
                      <SelectItem key={turma} value={turma} className="text-white hover:bg-white/10">
                        {turma}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editCasa" className="text-white/80">Casa (Inteligência)</Label>
              <Select value={editCasa} onValueChange={setEditCasa}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Selecione a casa" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  {casaOptions.map((casa) => (
                    <SelectItem key={casa} value={casa} className="text-white hover:bg-white/10">
                      {casa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser} disabled={isUpdating}>
              {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Help Dialog - CSV Instructions */}
      <Dialog open={isHelpDialogOpen} onOpenChange={setIsHelpDialogOpen}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Instruções para Importação em Massa
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div>
              <h4 className="text-white font-semibold mb-2">Formato do Arquivo CSV:</h4>
              <p className="text-white/70 text-sm mb-3">
                O arquivo deve conter as seguintes colunas separadas por vírgula:
              </p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-2 px-3 text-white">Coluna</th>
                      <th className="text-center py-2 px-3 text-white">Obrigatório</th>
                      <th className="text-left py-2 px-3 text-white">Valores Aceitos</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/70">
                    <tr className="border-b border-white/10">
                      <td className="py-2 px-3 font-mono text-blue-300">email</td>
                      <td className="py-2 px-3 text-center text-green-400">✓ Sim</td>
                      <td className="py-2 px-3">Email válido</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-2 px-3 font-mono text-blue-300">senha</td>
                      <td className="py-2 px-3 text-center text-green-400">✓ Sim</td>
                      <td className="py-2 px-3">Mínimo 6 caracteres</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-2 px-3 font-mono text-blue-300">nome_completo</td>
                      <td className="py-2 px-3 text-center text-green-400">✓ Sim</td>
                      <td className="py-2 px-3">Nome do usuário</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-2 px-3 font-mono text-blue-300">instituicao</td>
                      <td className="py-2 px-3 text-center text-green-400">✓ Sim</td>
                      <td className="py-2 px-3">Nome exato da instituição cadastrada</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-2 px-3 font-mono text-blue-300">serie</td>
                      <td className="py-2 px-3 text-center text-yellow-400">Não</td>
                      <td className="py-2 px-3">6º ano, 7º ano, 8º ano, 9º ano</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-2 px-3 font-mono text-blue-300">turma</td>
                      <td className="py-2 px-3 text-center text-yellow-400">Não</td>
                      <td className="py-2 px-3">A, B, C, D</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono text-blue-300">casa</td>
                      <td className="py-2 px-3 text-center text-yellow-400">Não</td>
                      <td className="py-2 px-3">Linguística, Lógico-matemática, Musical, etc.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2">Casas (Inteligências) Disponíveis:</h4>
              <div className="flex flex-wrap gap-2">
                {casaOptions.map(casa => (
                  <span key={casa} className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                    {casa}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2">Exemplo de CSV:</h4>
              <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-x-auto text-green-300 font-mono">
{`email,senha,nome_completo,instituicao,serie,turma,casa
joao@email.com,Senha123,João Silva,Escola Municipal ABC,6º ano,A,Linguística
maria@email.com,Senha456,Maria Santos,Escola Municipal ABC,7º ano,B,Musical
pedro@email.com,Senha789,Pedro Oliveira,Escola Municipal ABC,8º ano,C,Naturalista`}
              </pre>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <h4 className="text-yellow-300 font-semibold mb-2">⚠️ Importante:</h4>
              <ul className="text-yellow-200/80 text-sm space-y-1 list-disc list-inside">
                <li>O nome da instituição deve ser exatamente igual ao cadastrado no sistema</li>
                <li>Cada usuário receberá um email com suas credenciais de acesso</li>
                <li>Senhas devem ter no mínimo 6 caracteres</li>
                <li>Use UTF-8 para caracteres especiais (acentos)</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={downloadTemplate}
              variant="outline"
              className="gap-2 border-white/20 text-white hover:bg-white/10"
            >
              <Download className="w-4 h-4" />
              Baixar Modelo CSV
            </Button>
            <Button onClick={() => setIsHelpDialogOpen(false)}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Importar Usuários via CSV
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white/80">Selecione o arquivo CSV</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="bg-white/5 border-white/10 text-white file:bg-white/10 file:text-white file:border-0 file:mr-4 file:px-4 file:py-2 file:rounded cursor-pointer"
                disabled={isImporting}
              />
              {importFile && (
                <p className="text-white/60 text-sm">
                  Arquivo selecionado: {importFile.name}
                </p>
              )}
            </div>

            {isImporting && (
              <div className="space-y-2">
                <p className="text-white/60 text-sm">Importando usuários...</p>
                <Progress value={importProgress} className="h-2" />
              </div>
            )}

            <p className="text-white/50 text-xs">
              Não sabe o formato? Clique em "Instruções CSV" para ver o modelo.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsImportDialogOpen(false);
                setImportFile(null);
              }}
              className="border-white/20 text-white hover:bg-white/10"
              disabled={isImporting}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!importFile || isImporting}
              className="gap-2"
            >
              {isImporting ? 'Importando...' : 'Importar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
