import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, X, CheckCircle, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfessor } from '@/contexts/ProfessorContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { hojeBrasil } from '@/utils/timezone';

const CirculoRelatoPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, faseAtual } = useProfessor();
  const [tipoRelato, setTipoRelato] = useState<'aluno' | 'aula'>('aluno');
  const [texto, setTexto] = useState('');
  const [busca, setBusca] = useState('');
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const { data: alunos = [] } = useQuery({
    queryKey: ['relato-alunos', profile?.institution_id],
    queryFn: async () => {
      if (!profile?.institution_id) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, nome, serie, turma, avatar_url, casa_id, casa:inteligencias!profiles_casa_id_fkey(nome, cor_hex)')
        .eq('institution_id', profile.institution_id)
        .not('casa_id', 'is', null)
        .order('full_name');
      return data || [];
    },
    enabled: !!profile?.institution_id,
  });

  const alunosFiltrados = busca.trim()
    ? alunos.filter(a =>
        (a.full_name || '').toLowerCase().includes(busca.toLowerCase()) ||
        (a.serie || '').toLowerCase().includes(busca.toLowerCase())
      ).slice(0, 8)
    : [];

  const enviar = async () => {
    if (!texto.trim() || salvando) return;
    setSalvando(true);

    const payload: any = {
      professor_id: user?.id,
      observacao_texto: texto.trim(),
      tipo_observacao: tipoRelato === 'aula' ? 'relato_aula' : 'relato_professor',
      intensidade: 'normal',
      data_observacao: hojeBrasil(),
      institution_id: profile?.institution_id,
    };

    if (tipoRelato === 'aluno' && alunoSelecionado) {
      payload.aluno_id = alunoSelecionado.id;
    }
    if (faseAtual?.id) {
      payload.fase_id = faseAtual.id;
    }

    const { error } = await supabase.from('observacoes').insert(payload);

    if (error) {
      toast.error('Erro ao salvar relato');
      setSalvando(false);
      return;
    }

    setSalvando(false);
    setSucesso(true);
  };

  // Tela de sucesso
  if (sucesso) {
    return (
      <div className="p-4 pb-24 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-1">Relato registrado!</h2>
        <p className="text-sm text-white/40 mb-6">
          {tipoRelato === 'aula' ? 'Relato sobre a aula registrado' : alunoSelecionado ? `Vinculado a ${alunoSelecionado.full_name || alunoSelecionado.nome}` : 'Relato geral registrado'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => { setTexto(''); setAlunoSelecionado(null); setSucesso(false); }}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-cyan-500/15 text-cyan-400"
          >
            Novo relato
          </button>
          <button
            onClick={() => navigate('/professor/circulo')}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-white/50"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/professor/circulo')} className="p-2 -ml-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-white">Relato do Professor</h1>
          <p className="text-xs text-white/30">Escreva e vincule a um aluno (opcional)</p>
        </div>
      </div>

      {/* Tipo de relato */}
      <div className="flex gap-2">
        <button
          onClick={() => { setTipoRelato('aluno'); setAlunoSelecionado(null); }}
          className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors',
            tipoRelato === 'aluno' ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' : 'bg-white/[0.04] text-white/40 border-transparent'
          )}>
          Sobre um aluno
        </button>
        <button
          onClick={() => { setTipoRelato('aula'); setAlunoSelecionado(null); setBusca(''); }}
          className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors',
            tipoRelato === 'aula' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-white/[0.04] text-white/40 border-transparent'
          )}>
          Sobre a aula
        </button>
      </div>

      {/* Aluno vinculado (só se tipo = aluno) */}
      {tipoRelato === 'aluno' && alunoSelecionado ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#252547] border border-cyan-500/20">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: (alunoSelecionado.casa as any)?.cor_hex || '#444' }}>
            {alunoSelecionado.avatar_url ? (
              <img src={alunoSelecionado.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-sm text-white/40" style={{ backgroundColor: `${(alunoSelecionado.casa as any)?.cor_hex || '#444'}20` }}>
                {(alunoSelecionado.nome || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{alunoSelecionado.full_name}</p>
            <p className="text-[10px] text-white/30">{alunoSelecionado.serie} - Turma {alunoSelecionado.turma}</p>
          </div>
          <button onClick={() => setAlunoSelecionado(null)} className="p-1.5 rounded-lg text-white/30 hover:text-white/50 hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : tipoRelato === 'aluno' ? (
        <div>
          <p className="text-[10px] text-white/40 mb-2 px-1">Vincular a um aluno (opcional)</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar aluno..."
              className="w-full bg-[#252547] border border-violet-500/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20"
            />
          </div>
          {alunosFiltrados.length > 0 && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {alunosFiltrados.map(a => {
                const casaInfo = a.casa as any;
                return (
                  <button
                    key={a.id}
                    onClick={() => { setAlunoSelecionado(a); setBusca(''); }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[#252547] border border-violet-500/5 hover:bg-white/[0.04] text-left transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden border shrink-0" style={{ borderColor: casaInfo?.cor_hex || '#444' }}>
                      {a.avatar_url ? (
                        <img src={a.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="flex items-center justify-center w-full h-full text-[10px] text-white/40">
                          {(a.nome || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{a.full_name}</p>
                      <p className="text-[9px] text-white/30">{a.serie} - {a.turma}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-300">Escreva sobre como foi a aula: o que funcionou, o que não funcionou, sugestões, dúvidas.</p>
          {faseAtual && (
            <p className="text-[10px] text-amber-300/50 mt-1">
              Fase {faseAtual.inteligencia?.nome} · Semana {faseAtual.semana_atual || 1}
            </p>
          )}
        </div>
      )}

      {/* Texto do relato */}
      <div>
        <p className="text-[10px] text-white/40 mb-2 px-1">
          {tipoRelato === 'aula' ? 'Como foi a aula?' : 'Seu relato'}
        </p>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder={tipoRelato === 'aula' ? 'Como foi a aula? O que funcionou? O que melhoraria? Alguma dúvida?' : 'Escreva aqui o que observou, sentiu ou quer registrar...'}
          maxLength={1000}
          rows={5}
          className="w-full bg-[#252547] border border-violet-500/10 rounded-xl p-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-white/20 transition-colors"
        />
        <span className="text-[9px] text-white/15 px-1">{texto.length}/1000</span>
      </div>

      {/* Botão enviar */}
      <button
        onClick={enviar}
        disabled={!texto.trim() || salvando}
        className="w-full py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-30 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 active:scale-[0.98]"
      >
        {salvando ? 'Salvando...' : 'Registrar relato'}
      </button>
    </div>
  );
};

export default CirculoRelatoPage;
