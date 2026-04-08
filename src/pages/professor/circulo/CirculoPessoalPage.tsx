import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, Check } from 'lucide-react';
import { useProfessor } from '@/contexts/ProfessorContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { agoraBrasil } from '@/utils/timezone';

interface Aluno {
  id: string;
  full_name: string | null;
  nome: string | null;
  sobrenome: string | null;
  avatar_url: string | null;
  serie: string | null;
  turma: string | null;
  casa_id: number | null;
}

const CirculoPessoalPage = () => {
  const navigate = useNavigate();
  const { profile, faseAtual } = useProfessor();
  const [busca, setBusca] = useState('');
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  // Buscar todos os alunos F2
  const { data: alunos = [] } = useQuery({
    queryKey: ['alunos-pessoal', profile?.institution_id],
    queryFn: async () => {
      if (!profile?.institution_id) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, nome, sobrenome, avatar_url, serie, turma, casa_id')
        .eq('institution_id', profile.institution_id)
        .eq('segmento', 'fundamental2')
        .not('casa_id', 'is', null)
        .order('full_name');
      return (data || []) as Aluno[];
    },
    enabled: !!profile?.institution_id,
    staleTime: 120000,
  });

  // Cores das casas
  const { data: casaCores = {} } = useQuery({
    queryKey: ['casa-cores'],
    queryFn: async () => {
      const { data } = await supabase.from('inteligencias').select('id, cor_hex');
      const map: Record<number, string> = {};
      (data || []).forEach((i: any) => { if (i.cor_hex) map[i.id] = i.cor_hex; });
      return map;
    },
    staleTime: 600000,
  });

  const filtrados = busca
    ? alunos.filter(a => (a.full_name || a.nome || '').toLowerCase().includes(busca.toLowerCase()))
    : alunos;

  const salvarObservacao = async () => {
    if (!alunoSelecionado || !texto.trim() || !profile?.id || !profile?.institution_id) return;
    setSalvando(true);
    try {
      const { error } = await supabase.from('observacoes').insert({
        institution_id: profile.institution_id,
        aluno_id: alunoSelecionado.id,
        professor_id: profile.id,
        turma_id: null,
        fase_id: faseAtual?.id || null,
        sinal_id: null,
        inteligencia_fase: faseAtual?.inteligencia?.id || null,
        inteligencia_expressa: alunoSelecionado.casa_id,
        intensidade: 'normal',
        observacao_texto: texto.trim(),
        data_observacao: format(agoraBrasil(), 'yyyy-MM-dd'),
        semana: faseAtual?.semana_atual || null,
        tipo_observacao: 'pessoal',
      });
      if (error) throw error;
      setSalvo(true);
    } catch (err: any) {
      console.error('Erro:', err);
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  // Tela de sucesso
  if (salvo) {
    return (
      <div className="p-4 space-y-5 pb-24">
        <div className="pt-12 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Observacao registrada!</h1>
          <p className="text-white/40 text-sm">
            {alunoSelecionado?.full_name || alunoSelecionado?.nome}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setAlunoSelecionado(null); setTexto(''); setSalvo(false); }}
            className="flex-1 py-3 rounded-xl bg-white/[0.08] border border-violet-500/10 text-white/60 text-sm hover:bg-white/[0.12] transition-colors"
          >
            Nova observacao
          </button>
          <button
            onClick={() => navigate('/professor/circulo')}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Tela de escrita (aluno selecionado)
  if (alunoSelecionado) {
    const cor = casaCores[alunoSelecionado.casa_id || 0] || '#444';
    return (
      <div className="p-4 space-y-5 pb-24">
        <div className="flex items-center gap-3">
          <button onClick={() => setAlunoSelecionado(null)} className="p-2 -ml-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-white">Observacao Pessoal</h1>
        </div>

        {/* Aluno card */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#252547] border border-violet-500/10">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2" style={{ borderColor: cor }}>
            {alunoSelecionado.avatar_url ? (
              <img src={alunoSelecionado.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-sm text-white/50" style={{ backgroundColor: `${cor}20` }}>
                {(alunoSelecionado.nome || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-white font-medium">{alunoSelecionado.full_name || alunoSelecionado.nome}</p>
            <p className="text-xs text-white/40">{alunoSelecionado.serie} - Turma {alunoSelecionado.turma}</p>
          </div>
        </div>

        {/* Texto */}
        <div>
          <label className="text-xs text-white/40 block mb-2">O que voce observou?</label>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Descreva o que observou sobre este aluno..."
            rows={6}
            className="w-full bg-white/[0.04] border border-violet-500/10 rounded-xl px-4 py-3
              text-sm text-white placeholder:text-white/20 resize-none outline-none
              focus:border-white/20 transition-colors"
          />
          <p className="text-[10px] text-white/20 text-right mt-1">{texto.length} caracteres</p>
        </div>

        {/* Botao */}
        <button
          onClick={salvarObservacao}
          disabled={!texto.trim() || salvando}
          className="w-full py-3 rounded-xl bg-amber-500 text-white text-sm font-medium
            hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {salvando ? 'Salvando...' : 'Registrar observacao'}
        </button>
      </div>
    );
  }

  // Tela de busca (selecionar aluno)
  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/professor/circulo')} className="p-2 -ml-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-white">Observacao Pessoal</h1>
      </div>

      <p className="text-xs text-white/30">Selecione o aluno para registrar uma observacao</p>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input
          placeholder="Buscar aluno..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-10 bg-white/[0.04] border-violet-500/10 text-white placeholder:text-white/30 h-10 text-sm"
        />
      </div>

      {/* Lista */}
      <div className="space-y-0.5">
        {filtrados.slice(0, 30).map(aluno => {
          const cor = casaCores[aluno.casa_id || 0] || '#444';
          return (
            <button
              key={aluno.id}
              onClick={() => setAlunoSelecionado(aluno)}
              className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/[0.06] transition-colors active:scale-[0.98]"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: cor }}>
                {aluno.avatar_url ? (
                  <img src={aluno.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="flex items-center justify-center w-full h-full text-xs text-white/50" style={{ backgroundColor: `${cor}20` }}>
                    {(aluno.nome || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm text-white/80 truncate">{aluno.full_name || aluno.nome}</p>
                <p className="text-[10px] text-white/30">{aluno.serie} - Turma {aluno.turma}</p>
              </div>
            </button>
          );
        })}
        {filtrados.length > 30 && (
          <p className="text-[10px] text-white/20 text-center py-2">Refine a busca para ver mais</p>
        )}
        {filtrados.length === 0 && busca && (
          <p className="text-sm text-white/30 text-center py-8">Nenhum aluno encontrado</p>
        )}
      </div>
    </div>
  );
};

export default CirculoPessoalPage;
