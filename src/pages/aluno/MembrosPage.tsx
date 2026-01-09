import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { MembroCard } from '@/components/chat/MembroCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getStatusOnline } from '@/utils/statusOnline';
import { toast } from 'sonner';

const CARGO_ORDER = ['lider', 'vice', 'coordenador', 'embaixador'];

const MembrosPage = () => {
  const navigate = useNavigate();
  const { profile, casa, casaColor } = useStudent();
  const [searchTerm, setSearchTerm] = useState('');

  // Query: Buscar membros da casa com cargos
  const { data: membrosCasa = [], isLoading } = useQuery({
    queryKey: ['membros-casa-completo', casa?.id, profile?.institution_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          nome,
          sobrenome,
          full_name,
          avatar_url,
          ultima_atividade,
          cargos_casa!left(cargo, ativo)
        `)
        .eq('casa_id', casa!.id)
        .eq('institution_id', profile!.institution_id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!casa?.id && !!profile?.institution_id,
  });

  // Calcular membros online
  const membrosOnline = useMemo(() => {
    return membrosCasa.filter(m => getStatusOnline(m.ultima_atividade).label === 'Online').length;
  }, [membrosCasa]);

  // Agrupar membros: Liderança vs Membros comuns
  const { lideranca, membrosComuns } = useMemo(() => {
    const lideranca = membrosCasa
      .filter(m => m.cargos_casa?.some(c => c.ativo && CARGO_ORDER.includes(c.cargo)))
      .sort((a, b) => {
        const cargoA = a.cargos_casa?.find(c => c.ativo)?.cargo || '';
        const cargoB = b.cargos_casa?.find(c => c.ativo)?.cargo || '';
        return CARGO_ORDER.indexOf(cargoA) - CARGO_ORDER.indexOf(cargoB);
      });

    const membrosComuns = membrosCasa
      .filter(m => !m.cargos_casa?.some(c => c.ativo && CARGO_ORDER.includes(c.cargo)))
      .sort((a, b) => {
        const nomeA = a.nome || a.full_name || '';
        const nomeB = b.nome || b.full_name || '';
        return nomeA.localeCompare(nomeB);
      });

    return { lideranca, membrosComuns };
  }, [membrosCasa]);

  // Filtrar por busca (nome e cargo)
  const liderancaFiltrada = useMemo(() => {
    if (!searchTerm) return lideranca;
    const termo = searchTerm.toLowerCase();
    return lideranca.filter(m => {
      const nome = (m.nome || m.full_name || '').toLowerCase();
      const sobrenome = (m.sobrenome || '').toLowerCase();
      const cargo = m.cargos_casa?.find(c => c.ativo)?.cargo || '';
      return nome.includes(termo) || sobrenome.includes(termo) || cargo.includes(termo);
    });
  }, [lideranca, searchTerm]);

  const membrosComunsFiltrados = useMemo(() => {
    if (!searchTerm) return membrosComuns;
    const termo = searchTerm.toLowerCase();
    return membrosComuns.filter(m => {
      const nome = (m.nome || m.full_name || '').toLowerCase();
      const sobrenome = (m.sobrenome || '').toLowerCase();
      return nome.includes(termo) || sobrenome.includes(termo);
    });
  }, [membrosComuns, searchTerm]);

  // Função para iniciar conversa privada
  const iniciarConversa = async (outroUsuarioId: string) => {
    if (!profile?.id || !profile?.institution_id) return;

    try {
      // 1. Buscar conversas do usuário atual
      const { data: minhasConversas } = await supabase
        .from('conversa_participantes')
        .select('conversa_id')
        .eq('usuario_id', profile.id);

      if (minhasConversas?.length) {
        // 2. Verificar se o outro usuário está em alguma dessas conversas
        const { data: conversaComum } = await supabase
          .from('conversa_participantes')
          .select('conversa_id')
          .eq('usuario_id', outroUsuarioId)
          .in('conversa_id', minhasConversas.map(c => c.conversa_id));

        if (conversaComum?.length) {
          navigate(`/aluno/chat/dm/${conversaComum[0].conversa_id}`);
          return;
        }
      }

      // 3. Criar nova conversa
      const { data: novaConversa, error: erroConversa } = await supabase
        .from('conversas_privadas')
        .insert({ institution_id: profile.institution_id })
        .select()
        .single();

      if (erroConversa) throw erroConversa;

      // 4. Adicionar participantes
      const { error: erroParticipantes } = await supabase
        .from('conversa_participantes')
        .insert([
          { conversa_id: novaConversa.id, usuario_id: profile.id },
          { conversa_id: novaConversa.id, usuario_id: outroUsuarioId }
        ]);

      if (erroParticipantes) throw erroParticipantes;

      navigate(`/aluno/chat/dm/${novaConversa.id}`);
    } catch (error) {
      console.error('Erro ao iniciar conversa:', error);
      toast.error('Erro ao iniciar conversa');
    }
  };

  const totalFiltrado = liderancaFiltrada.length + membrosComunsFiltrados.length;

  return (
    <div className="py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/aluno/chat')}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-white">Membros</h1>
            <p className="text-xs text-white/50">
              {membrosOnline} online de {membrosCasa.length}
            </p>
          </div>
        </div>
      </div>

      {/* Campo de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <Input
          placeholder="Buscar por nome ou cargo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/50" />
        </div>
      ) : totalFiltrado === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="w-12 h-12 text-white/20 mb-3" />
          <p className="text-white/50">
            {searchTerm ? 'Nenhum membro encontrado' : 'Nenhum membro na casa'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Seção: Liderança */}
          {liderancaFiltrada.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider px-1 flex items-center gap-1.5 mb-2">
                <span>🦅</span> Liderança
              </h3>
              <div className="space-y-1 bg-white/5 rounded-lg overflow-hidden">
                {liderancaFiltrada.map((membro) => (
                  <MembroCard
                    key={membro.id}
                    membro={membro}
                    isMe={membro.id === profile?.id}
                    onIniciarConversa={iniciarConversa}
                    casaColor={casaColor}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Seção: Membros */}
          {membrosComunsFiltrados.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider px-1 flex items-center gap-1.5 mb-2">
                <span>👥</span> Membros ({membrosComunsFiltrados.length})
              </h3>
              <div className="space-y-1 bg-white/5 rounded-lg overflow-hidden">
                {membrosComunsFiltrados.map((membro) => (
                  <MembroCard
                    key={membro.id}
                    membro={membro}
                    isMe={membro.id === profile?.id}
                    onIniciarConversa={iniciarConversa}
                    casaColor={casaColor}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MembrosPage;
