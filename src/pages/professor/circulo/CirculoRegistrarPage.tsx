import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ThumbsUp, AlertTriangle, Plus } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import ConfirmarObservacaoModal from '@/components/professor/circulo/ConfirmarObservacaoModal';
import { ObservacaoPersonalizadaModal } from '@/components/professor/circulo/ObservacaoPersonalizadaModal';

interface Sinal {
  id: number;
  codigo: string;
  label_pt: string;
  valencia: string;
}

interface AlunoDetalhes {
  id: string;
  full_name: string | null;
  nome: string | null;
  avatar_url: string | null;
  serie: string | null;
  turma: string | null;
  casa_id: number | null;
  inteligencias: {
    id: number;
    nome: string;
    codigo: string;
  } | null;
}

const CirculoRegistrarPage = () => {
  const { alunoId } = useParams<{ alunoId: string }>();
  const [searchParams] = useSearchParams();
  const serieParam = searchParams.get('serie');
  const turmaParam = searchParams.get('turma');
  
  const { casaColor, profile, faseAtual } = useProfessor();
  const navigate = useNavigate();

  const [selectedSinal, setSelectedSinal] = useState<Sinal | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Estados para modal personalizado
  const [modalPersonalizadoOpen, setModalPersonalizadoOpen] = useState(false);
  const [tipoPersonalizado, setTipoPersonalizado] = useState<'positivo' | 'atencao'>('positivo');

  // Buscar dados do aluno
  const { data: aluno, isLoading: loadingAluno } = useQuery({
    queryKey: ['circulo-aluno-detalhe', alunoId],
    queryFn: async () => {
      if (!alunoId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, full_name, nome, avatar_url, serie, turma, casa_id,
          inteligencias!profiles_casa_id_fkey (id, nome, codigo)
        `)
        .eq('id', alunoId)
        .single();

      if (error) throw error;
      return data as unknown as AlunoDetalhes;
    },
    enabled: !!alunoId
  });

  // Buscar sinais
  const { data: sinais, isLoading: loadingSinais } = useQuery({
    queryKey: ['sinais'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sinais')
        .select('id, codigo, label_pt, valencia')
        .order('ordem');

      if (error) throw error;
      return data as Sinal[];
    }
  });

  // Filtrar sinais (excluir os "outro_" da lista normal)
  const sinaisPositivos = sinais?.filter(s => s.valencia === 'positivo' && s.codigo !== 'outro_positivo') || [];
  const sinaisAtencao = sinais?.filter(s => s.valencia === 'atencao' && s.codigo !== 'outro_atencao') || [];

  const handleSinalClick = (sinal: Sinal) => {
    setSelectedSinal(sinal);
    setModalOpen(true);
  };

  const handleOutroClick = (tipo: 'positivo' | 'atencao') => {
    setTipoPersonalizado(tipo);
    setModalPersonalizadoOpen(true);
  };

  const handleConfirm = async (nota: string | null) => {
    if (!selectedSinal || !aluno || !profile || !faseAtual) {
      toast.error('Dados incompletos');
      return;
    }

    setSaving(true);
    try {
      // Buscar turma_id
      const serieNum = parseInt(aluno.serie?.replace(/\D/g, '') || '6');
      const { data: turmaData } = await supabase
        .from('turmas')
        .select('id')
        .eq('institution_id', profile.institution_id!)
        .eq('serie', serieNum)
        .ilike('turma_letra', aluno.turma || 'A')
        .maybeSingle();

      if (!turmaData?.id) {
        toast.error('Turma não encontrada');
        setSaving(false);
        return;
      }

      const faseInteligenciaId = faseAtual.inteligencia?.id;
      const alunoInteligenciaId = aluno.casa_id;

      // Inserir observação (foi_cross_im é calculado automaticamente pelo banco)
      const { error } = await supabase.from('observacoes').insert({
        institution_id: profile.institution_id!,
        aluno_id: aluno.id,
        professor_id: profile.id,
        turma_id: turmaData.id,
        fase_id: faseAtual.id,
        sinal_id: selectedSinal.id,
        inteligencia_fase: faseInteligenciaId!,
        inteligencia_expressa: alunoInteligenciaId!,
        intensidade: 'normal',
        observacao_texto: nota || null,
        data_observacao: new Date().toISOString().split('T')[0]
      });

      if (error) throw error;

      toast.success('Observação registrada!');
      setModalOpen(false);
      setSelectedSinal(null);
      
      // Voltar para lista de alunos
      navigate(`/professor/circulo/serie/${serieParam}/turma/${turmaParam}`);
    } catch (error) {
      console.error('Erro ao salvar observação:', error);
      toast.error('Erro ao registrar observação');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPersonalizado = async (texto: string) => {
    if (!aluno || !profile || !faseAtual) {
      toast.error('Dados incompletos');
      return;
    }

    // Buscar o sinal correto (outro_positivo ou outro_atencao)
    const codigoSinal = tipoPersonalizado === 'positivo' ? 'outro_positivo' : 'outro_atencao';
    const sinalOutro = sinais?.find(s => s.codigo === codigoSinal);

    if (!sinalOutro) {
      toast.error('Sinal personalizado não configurado');
      return;
    }

    setSaving(true);
    try {
      // Buscar turma_id
      const serieNum = parseInt(aluno.serie?.replace(/\D/g, '') || '6');
      const { data: turmaData } = await supabase
        .from('turmas')
        .select('id')
        .eq('institution_id', profile.institution_id!)
        .eq('serie', serieNum)
        .ilike('turma_letra', aluno.turma || 'A')
        .maybeSingle();

      if (!turmaData?.id) {
        toast.error('Turma não encontrada');
        setSaving(false);
        return;
      }

      const faseInteligenciaId = faseAtual.inteligencia?.id;
      const alunoInteligenciaId = aluno.casa_id;

      // Inserir observação personalizada
      const { error } = await supabase.from('observacoes').insert({
        institution_id: profile.institution_id!,
        aluno_id: aluno.id,
        professor_id: profile.id,
        turma_id: turmaData.id,
        fase_id: faseAtual.id,
        sinal_id: sinalOutro.id,
        inteligencia_fase: faseInteligenciaId!,
        inteligencia_expressa: alunoInteligenciaId!,
        intensidade: 'normal',
        observacao_texto: texto, // Texto obrigatório aqui
        data_observacao: new Date().toISOString().split('T')[0]
      });

      if (error) throw error;

      toast.success('Observação personalizada registrada!');
      setModalPersonalizadoOpen(false);
      
      // Voltar para lista de alunos
      navigate(`/professor/circulo/serie/${serieParam}/turma/${turmaParam}`);
    } catch (error) {
      console.error('Erro ao salvar observação personalizada:', error);
      toast.error('Erro ao registrar observação');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    const name = aluno?.full_name || aluno?.nome || 'A';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0][0];
    return `${parts[0][0]}${parts[parts.length - 1][0]}`;
  };

  const handleBack = () => {
    if (serieParam && turmaParam) {
      navigate(`/professor/circulo/serie/${serieParam}/turma/${turmaParam}`);
    } else {
      navigate('/professor/circulo');
    }
  };

  if (loadingAluno || loadingSinais) {
    return (
      <div className="space-y-6 pt-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full bg-white/10" />
          <Skeleton className="w-32 h-6 bg-white/10" />
        </div>
        <Skeleton className="w-full h-64 bg-white/10 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-3 pb-6">
      {/* Header com voltar */}
      <div className="flex items-center gap-3">
        <button 
          onClick={handleBack}
          className="p-2 -ml-2 rounded-full hover:bg-white/10"
        >
          <ChevronLeft size={24} className="text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">Observar</h1>
      </div>

      {/* Seção POSITIVO */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-400">
          <ThumbsUp size={18} />
          <span className="font-semibold text-sm">POSITIVO</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sinaisPositivos.map((sinal) => (
            <button
              key={sinal.id}
              onClick={() => handleSinalClick(sinal)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
              style={{
                backgroundColor: selectedSinal?.id === sinal.id ? '#14532D' : '#374151',
                borderWidth: '1px',
                borderColor: selectedSinal?.id === sinal.id ? '#22C55E' : 'transparent',
                color: selectedSinal?.id === sinal.id ? '#22C55E' : '#E5E7EB'
              }}
            >
              {sinal.label_pt}
            </button>
          ))}
          {/* Botão + Outro Positivo */}
          <button
            onClick={() => handleOutroClick('positivo')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 flex items-center gap-1"
            style={{
              backgroundColor: '#4B5563',
              border: '1px dashed rgba(34, 197, 94, 0.4)',
              color: '#9CA3AF'
            }}
          >
            <Plus size={14} />
            Outro
          </button>
        </div>
      </div>

      {/* Separador + Foto do aluno */}
      <div className="py-3">
        <div className="h-px bg-white/10 mb-4" />
        <div className="flex items-center justify-center gap-3">
          <Avatar className="w-[48px] h-[48px] border-2" style={{ borderColor: casaColor }}>
            <AvatarImage src={aluno?.avatar_url || undefined} alt={aluno?.full_name || 'Aluno'} />
            <AvatarFallback 
              className="text-white text-lg font-medium"
              style={{ backgroundColor: `${casaColor}30` }}
            >
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-base font-semibold text-white">
              {aluno?.full_name || aluno?.nome || 'Aluno'}
            </h2>
            <p className="text-white/60 text-xs">
              {aluno?.serie} {aluno?.turma} • {aluno?.inteligencias?.nome || 'Sem casa'}
            </p>
          </div>
        </div>
        <div className="h-px bg-white/10 mt-4" />
      </div>

      {/* Seção ATENÇÃO */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle size={18} />
          <span className="font-semibold text-sm">ATENÇÃO</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sinaisAtencao.map((sinal) => (
            <button
              key={sinal.id}
              onClick={() => handleSinalClick(sinal)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
              style={{
                backgroundColor: selectedSinal?.id === sinal.id ? '#7F1D1D' : '#374151',
                borderWidth: '1px',
                borderColor: selectedSinal?.id === sinal.id ? '#EF4444' : 'transparent',
                color: selectedSinal?.id === sinal.id ? '#EF4444' : '#E5E7EB'
              }}
            >
              {sinal.label_pt}
            </button>
          ))}
          {/* Botão + Outro Atenção */}
          <button
            onClick={() => handleOutroClick('atencao')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 flex items-center gap-1"
            style={{
              backgroundColor: '#4B5563',
              border: '1px dashed rgba(239, 68, 68, 0.4)',
              color: '#9CA3AF'
            }}
          >
            <Plus size={14} />
            Outro
          </button>
        </div>
      </div>

      {/* Modal de confirmação padrão */}
      <ConfirmarObservacaoModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedSinal(null);
        }}
        sinal={selectedSinal}
        aluno={aluno ? { id: aluno.id, full_name: aluno.full_name || aluno.nome || 'Aluno' } : null}
        onConfirm={handleConfirm}
        saving={saving}
      />

      {/* Modal para observação personalizada */}
      <ObservacaoPersonalizadaModal
        isOpen={modalPersonalizadoOpen}
        tipo={tipoPersonalizado}
        alunoNome={aluno?.full_name || aluno?.nome || 'Aluno'}
        onClose={() => setModalPersonalizadoOpen(false)}
        onConfirm={handleConfirmPersonalizado}
        saving={saving}
      />
    </div>
  );
};

export default CirculoRegistrarPage;
