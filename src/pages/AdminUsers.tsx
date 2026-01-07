import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Mail, User, Building2, GraduationCap, Users, Home, Search, FileDown, Pencil, X, Upload, HelpCircle, Download, AlertTriangle, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface UserProfile {
  id: string;
  full_name: string | null;
  nome: string | null;
  sobrenome: string | null;
  institution: string | null;
  institution_id: string | null;
  serie: string | null;
  turma: string | null;
  casa: string | null;
  created_at: string;
  email?: string;
  must_change_password?: boolean;
}

interface Institution {
  id: string;
  name: string;
}

interface ImportUser {
  email: string;
  nome: string;
  sobrenome: string;
  instituicao: string;
  serie?: string;
  turma?: string;
  casa?: string;
}

// Normalize surname to create password preview
function normalizeSobrenome(sobrenome: string): string {
  return sobrenome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .trim();
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
  const [newUserNome, setNewUserNome] = useState('');
  const [newUserSobrenome, setNewUserSobrenome] = useState('');
  const [newUserInstitutionId, setNewUserInstitutionId] = useState('');
  const [newUserSerie, setNewUserSerie] = useState('');
  const [newUserTurma, setNewUserTurma] = useState('');
  const [newUserCasa, setNewUserCasa] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordPreview, setShowPasswordPreview] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSerie, setFilterSerie] = useState('');
  const [filterTurma, setFilterTurma] = useState('');
  const [filterCasa, setFilterCasa] = useState('');
  const [filterInstitution, setFilterInstitution] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Edit user states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editNome, setEditNome] = useState('');
  const [editSobrenome, setEditSobrenome] = useState('');
  const [editInstitutionId, setEditInstitutionId] = useState('');
  const [editSerie, setEditSerie] = useState('');
  const [editTurma, setEditTurma] = useState('');
  const [editCasa, setEditCasa] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentEmail, setCurrentEmail] = useState('');
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

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
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');
    
    const adminIds = adminRoles?.map(r => r.user_id) || [];
    
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (adminIds.length > 0) {
      query = query.not('id', 'in', `(${adminIds.join(',')})`);
    }

    const { data, error } = await query;

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

  // Preview password based on surname
  const previewPassword = useMemo(() => {
    if (!newUserSobrenome) return '';
    return normalizeSobrenome(newUserSobrenome) + '123';
  }, [newUserSobrenome]);

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(u =>
        u.full_name?.toLowerCase().includes(lowerSearch) ||
        u.nome?.toLowerCase().includes(lowerSearch) ||
        u.sobrenome?.toLowerCase().includes(lowerSearch) ||
        u.institution?.toLowerCase().includes(lowerSearch)
      );
    }

    if (filterInstitution && filterInstitution !== 'all') {
      result = result.filter(u => u.institution === filterInstitution);
    }

    if (filterSerie && filterSerie !== 'all') {
      result = result.filter(u => u.serie === filterSerie);
    }
    if (filterTurma && filterTurma !== 'all') {
      result = result.filter(u => u.turma === filterTurma);
    }
    if (filterCasa && filterCasa !== 'all') {
      result = result.filter(u => u.casa === filterCasa);
    }

    result.sort((a, b) => {
      const serieOrderA = serieOptions.indexOf(a.serie || '');
      const serieOrderB = serieOptions.indexOf(b.serie || '');
      if (serieOrderA !== serieOrderB) return serieOrderA - serieOrderB;

      const turmaOrder = (a.turma || '').localeCompare(b.turma || '');
      if (turmaOrder !== 0) return turmaOrder;

      const casaOrder = (a.casa || '').localeCompare(b.casa || '');
      if (casaOrder !== 0) return casaOrder;

      const nameA = a.full_name || `${a.nome || ''} ${a.sobrenome || ''}`;
      const nameB = b.full_name || `${b.nome || ''} ${b.sobrenome || ''}`;
      return nameA.localeCompare(nameB);
    });

    return result;
  }, [users, searchTerm, filterSerie, filterTurma, filterCasa, filterInstitution]);

  // Export to PDF with emails
  const exportToPDF = async () => {
    toast.info('Carregando dados para exportação...');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('get-users-with-emails', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });

      if (error || !data?.users) {
        console.error('Error fetching users with emails:', error);
        toast.error('Erro ao carregar dados para exportação');
        return;
      }

      const usersWithEmails = data.users as UserProfile[];
      
      // Apply current filters
      let filtered = usersWithEmails;
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        filtered = filtered.filter(u =>
          u.full_name?.toLowerCase().includes(lowerSearch) ||
          u.nome?.toLowerCase().includes(lowerSearch) ||
          u.sobrenome?.toLowerCase().includes(lowerSearch)
        );
      }
      if (filterInstitution && filterInstitution !== 'all') {
        filtered = filtered.filter(u => u.institution === filterInstitution);
      }
      if (filterSerie && filterSerie !== 'all') {
        filtered = filtered.filter(u => u.serie === filterSerie);
      }
      if (filterTurma && filterTurma !== 'all') {
        filtered = filtered.filter(u => u.turma === filterTurma);
      }
      if (filterCasa && filterCasa !== 'all') {
        filtered = filtered.filter(u => u.casa === filterCasa);
      }

      const doc = new jsPDF({ orientation: 'landscape' });

      doc.setFontSize(18);
      doc.text('Relatório de Usuários', 14, 22);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 30);
      doc.text(`Total: ${filtered.length} usuários`, 14, 36);

      const tableData = filtered.map(user => {
        const name = user.full_name || `${user.nome || ''} ${user.sobrenome || ''}`.trim() || 'Sem nome';
        const senhaRef = user.sobrenome ? normalizeSobrenome(user.sobrenome) + '123' : 'N/A';
        const status = user.must_change_password === false ? 'Trocou senha' : 'Senha padrão';
        return [
          name,
          user.email || '-',
          user.serie || '-',
          user.turma || '-',
          user.casa || '-',
          user.institution || '-',
          senhaRef,
          status
        ];
      });

      autoTable(doc, {
        head: [['Nome', 'Email', 'Série', 'Turma', 'Casa', 'Instituição', 'Senha Ref', 'Status']],
        body: tableData,
        startY: 42,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] }
      });

      doc.save('usuarios.pdf');
      toast.success('PDF exportado com sucesso!');
    } catch (err) {
      console.error('Error exporting PDF:', err);
      toast.error('Erro ao exportar PDF');
    }
  };

  // Helper function to get missing fields
  const getMissingFields = (user: UserProfile): string[] => {
    const missing: string[] = [];
    if (!user.full_name && !user.nome && !user.sobrenome) missing.push('Nome');
    if (!user.institution) missing.push('Instituição');
    if (!user.serie) missing.push('Série');
    if (!user.turma) missing.push('Turma');
    if (!user.casa) missing.push('Casa');
    return missing;
  };

  // Get display name
  const getDisplayName = (user: UserProfile): string => {
    if (user.full_name) return user.full_name;
    if (user.nome && user.sobrenome) return `${user.nome} ${user.sobrenome}`;
    if (user.nome) return user.nome;
    if (user.sobrenome) return user.sobrenome;
    return 'Sem nome';
  };

  // Open edit dialog and fetch current email
  const openEditDialog = async (user: UserProfile) => {
    setEditingUser(user);
    setEditEmail('');
    setEditNome(user.nome || '');
    setEditSobrenome(user.sobrenome || '');
    setEditInstitutionId(user.institution_id || '');
    setEditSerie(user.serie || '');
    setEditTurma(user.turma || '');
    setEditCasa(user.casa || '');
    setShowEmailChange(false);
    setCurrentEmail('');
    setIsEditDialogOpen(true);
    
    setIsLoadingEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('get-user-email', {
        body: { userId: user.id },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });
      
      if (!error && data?.email) {
        setCurrentEmail(data.email);
      } else {
        setCurrentEmail('Email não disponível');
      }
    } catch (error) {
      console.error('Error fetching email:', error);
      setCurrentEmail('Erro ao carregar email');
    } finally {
      setIsLoadingEmail(false);
    }
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
          nome: editNome,
          sobrenome: editSobrenome,
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

  // Handle reset password
  const handleResetPassword = async () => {
    if (!editingUser) return;

    setIsResettingPassword(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId: editingUser.id },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) {
        console.error('Error resetting password:', error);
        toast.error(error.message || 'Erro ao resetar senha');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Senha resetada para: ${data.newPassword}`, {
        duration: 10000,
        description: 'O usuário precisará trocar a senha no próximo login.'
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Erro ao resetar senha');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterSerie('');
    setFilterTurma('');
    setFilterCasa('');
    setFilterInstitution('');
  };

  // Handle suggestion click
  const handleSuggestionClick = (user: UserProfile) => {
    setSearchTerm(getDisplayName(user));
    setShowSuggestions(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

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
    if (!newUserNome.trim()) {
      toast.error('Por favor, informe o nome');
      return;
    }
    if (!newUserSobrenome.trim()) {
      toast.error('Por favor, informe o sobrenome');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserEmail,
          nome: newUserNome.trim(),
          sobrenome: newUserSobrenome.trim(),
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

      toast.success(`Usuário criado! Senha: ${data.generatedPassword}`, {
        duration: 10000,
        description: 'O usuário precisará trocar a senha no primeiro login.'
      });
      setNewUserEmail('');
      setNewUserNome('');
      setNewUserSobrenome('');
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

    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';
    
    console.log('CSV separator detected:', separator);
    console.log('First line:', firstLine);

    const headers = firstLine
      .replace(/^\uFEFF/, '')
      .split(separator)
      .map(h => h.trim().toLowerCase().replace(/[\r\n]/g, '').replace(/"/g, ''));
    
    console.log('Headers found:', headers);

    const requiredHeaders = ['email', 'nome', 'sobrenome', 'instituicao'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      toast.error(`Colunas obrigatórias não encontradas: ${missingHeaders.join(', ')}. Verifique se o arquivo está no formato correto.`);
      return [];
    }

    const users = lines.slice(1)
      .filter(line => line.trim())
      .map((line, index) => {
        const values = line
          .split(separator)
          .map(v => v.trim().replace(/[\r\n]/g, '').replace(/"/g, ''));
        
        const user: ImportUser = {
          email: values[headers.indexOf('email')] || '',
          nome: values[headers.indexOf('nome')] || '',
          sobrenome: values[headers.indexOf('sobrenome')] || '',
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
    const template = `email,nome,sobrenome,instituicao,serie,turma,casa
exemplo@email.com,João,Silva,Nome da Instituição,6º ano,A,Linguística
aluno2@email.com,Maria,Santos,Nome da Instituição,7º ano,B,Musical`;
    
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
                <Label htmlFor="nome" className="text-white/80">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="nome"
                    type="text"
                    placeholder="Nome"
                    value={newUserNome}
                    onChange={(e) => setNewUserNome(e.target.value)}
                    required
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sobrenome" className="text-white/80">Sobrenome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="sobrenome"
                    type="text"
                    placeholder="Sobrenome"
                    value={newUserSobrenome}
                    onChange={(e) => setNewUserSobrenome(e.target.value)}
                    required
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>

              {/* Password Preview */}
              {newUserSobrenome && (
                <div className="md:col-span-2 lg:col-span-3">
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                    <span className="text-green-300 text-sm">Senha gerada automaticamente:</span>
                    <code className="px-2 py-1 bg-black/30 rounded text-green-400 font-mono">
                      {showPasswordPreview ? previewPassword : '••••••••'}
                    </code>
                    <button
                      type="button"
                      onClick={() => setShowPasswordPreview(!showPasswordPreview)}
                      className="text-green-400 hover:text-green-300"
                    >
                      {showPasswordPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

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
          {/* Search Field */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              placeholder="Pesquisar por nome ou instituição..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
              onFocus={() => setShowSuggestions(searchTerm.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="pl-12 py-3 h-12 text-base bg-white/5 border-white/10 text-white placeholder:text-white/40 w-full"
            />
            
            {showSuggestions && searchTerm && filteredAndSortedUsers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-white/10 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                {filteredAndSortedUsers.slice(0, 8).map(user => (
                  <button
                    key={user.id}
                    className="w-full px-4 py-3 text-left text-white hover:bg-white/10 flex items-center gap-3 border-b border-white/5 last:border-b-0"
                    onMouseDown={() => handleSuggestionClick(user)}
                  >
                    <User className="w-5 h-5 text-white/40 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{getDisplayName(user)}</p>
                      <p className="text-xs text-white/40 truncate">
                        {user.institution || 'Sem instituição'} • {user.serie || '-'} • Turma {user.turma || '-'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Select value={filterInstitution} onValueChange={setFilterInstitution}>
              <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Instituição" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10">
                <SelectItem value="all" className="text-white hover:bg-white/10">Todas</SelectItem>
                {institutions.map((inst) => (
                  <SelectItem key={inst.id} value={inst.name} className="text-white hover:bg-white/10">
                    {inst.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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

            {(searchTerm || filterSerie || filterTurma || filterCasa || filterInstitution) && (
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
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap gap-2 mb-6">
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
              {filteredAndSortedUsers.map((userProfile) => {
                const missingFields = getMissingFields(userProfile);
                return (
                  <div
                    key={userProfile.id}
                    className={`flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/5 rounded-lg border gap-3 ${
                      missingFields.length > 0 ? 'border-amber-500/50' : 'border-white/10'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">
                          {getDisplayName(userProfile)}
                        </p>
                        {missingFields.length > 0 && (
                          <div 
                            className="flex items-center gap-1 text-amber-400"
                            title={`Campos incompletos: ${missingFields.join(', ')}`}
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <p className="text-white/60 text-sm">
                        {userProfile.institution || 'Sem instituição'}
                      </p>
                      {missingFields.length > 0 && (
                        <p className="text-amber-400/80 text-xs mt-1">
                          Incompleto: {missingFields.join(', ')}
                        </p>
                      )}
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
                );
              })}
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
            {/* Current Email Display */}
            <div className="space-y-2">
              <Label className="text-white/80">Email Atual</Label>
              <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
                <Mail className="w-4 h-4 text-white/40" />
                {isLoadingEmail ? (
                  <span className="text-white/50 italic">Carregando...</span>
                ) : (
                  <span className="text-white/70">{currentEmail}</span>
                )}
              </div>
              
              {!showEmailChange ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEmailChange(true)}
                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 text-sm gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  Alterar email
                </Button>
              ) : (
                <div className="space-y-2 mt-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <Label htmlFor="editEmail" className="text-blue-300 text-sm">Novo Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400/60" />
                    <Input
                      id="editEmail"
                      type="email"
                      placeholder="Digite o novo email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="pl-10 bg-white/5 border-blue-500/30 text-white placeholder:text-white/30"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowEmailChange(false); setEditEmail(''); }}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancelar alteração
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editNome" className="text-white/80">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="editNome"
                    type="text"
                    placeholder="Nome"
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editSobrenome" className="text-white/80">Sobrenome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="editSobrenome"
                    type="text"
                    placeholder="Sobrenome"
                    value={editSobrenome}
                    onChange={(e) => setEditSobrenome(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
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

            {/* Reset Password Button */}
            <div className="pt-2 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                onClick={handleResetPassword}
                disabled={isResettingPassword}
                className="w-full gap-2 border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
              >
                <RotateCcw className="w-4 h-4" />
                {isResettingPassword ? 'Resetando...' : 'Resetar Senha (sobrenome+123)'}
              </Button>
              <p className="text-white/40 text-xs mt-2 text-center">
                A senha será redefinida para o sobrenome do usuário + "123"
              </p>
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
                O arquivo deve conter as seguintes colunas separadas por vírgula ou ponto e vírgula:
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
                      <td className="py-2 px-3 font-mono text-blue-300">nome</td>
                      <td className="py-2 px-3 text-center text-green-400">✓ Sim</td>
                      <td className="py-2 px-3">Primeiro nome do usuário</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-2 px-3 font-mono text-blue-300">sobrenome</td>
                      <td className="py-2 px-3 text-center text-green-400">✓ Sim</td>
                      <td className="py-2 px-3">Sobrenome (usado para gerar senha)</td>
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

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <h4 className="text-green-300 font-semibold mb-2">🔐 Senha Automática:</h4>
              <p className="text-green-200/80 text-sm">
                A senha é gerada automaticamente a partir do <strong>sobrenome</strong> do usuário + "123".
                <br />
                Exemplo: Sobrenome "Silva" → Senha: <code className="px-1 bg-black/30 rounded">silva123</code>
                <br />
                Acentos e caracteres especiais são removidos automaticamente.
              </p>
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
{`email,nome,sobrenome,instituicao,serie,turma,casa
joao@email.com,João,Silva,Escola Municipal ABC,6º ano,A,Linguística
maria@email.com,Maria,Santos,Escola Municipal ABC,7º ano,B,Musical
pedro@email.com,Pedro,Oliveira,Escola Municipal ABC,8º ano,C,Naturalista`}
              </pre>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <h4 className="text-yellow-300 font-semibold mb-2">⚠️ Importante:</h4>
              <ul className="text-yellow-200/80 text-sm space-y-1 list-disc list-inside">
                <li>O nome da instituição deve ser exatamente igual ao cadastrado no sistema</li>
                <li>Os usuários precisarão trocar a senha no primeiro acesso</li>
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