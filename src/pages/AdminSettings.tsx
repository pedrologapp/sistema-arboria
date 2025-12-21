import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NeonButton } from '@/components/ui/neon-button';
import { toast } from 'sonner';
import { User, Mail, Building2, Save } from 'lucide-react';

const AdminSettings = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Placeholder for future implementation
    setTimeout(() => {
      toast.success('Configurações salvas com sucesso!');
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Configurações</h1>
        <p className="text-white/60 mt-1">Gerencie as configurações do sistema</p>
      </div>

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
