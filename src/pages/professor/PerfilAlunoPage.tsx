import { ArrowLeft, Trophy, Target, MessageCircle, ChevronRight, TreePine, Award } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProfessor } from '@/contexts/ProfessorContext';
import { usePerfilAluno } from '@/hooks/usePerfilAluno';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const PerfilAlunoPage = () => {
  const { id: alunoId } = useParams();
  const navigate = useNavigate();
  const { profile: profProfile } = useProfessor();

  const { data: aluno, isLoading } = usePerfilAluno(alunoId);

  // Cores das casas
  const { data: casaCores = {} } = useQuery({
    queryKey: ['casa-cores'],
    queryFn: async () => {
      const { data } = await supabase.from('inteligencias').select('id, cor_hex, nome');
      const map: Record<number, { cor: string; nome: string }> = {};
      (data || []).forEach((i: any) => { map[i.id] = { cor: i.cor_hex || '#444', nome: i.nome }; });
      return map;
    },
    staleTime: 600000,
  });

  // Iniciar DM com aluno
  const iniciarConversa = async () => {
    if (!profProfile?.id || !profProfile?.institution_id || !alunoId) return;
    const { data: minhas } = await supabase.from('conversa_participantes').select('conversa_id').eq('usuario_id', profProfile.id);
    if (minhas?.length) {
      const { data: existente } = await supabase.from('conversa_participantes').select('conversa_id')
        .eq('usuario_id', alunoId).in('conversa_id', minhas.map(c => c.conversa_id)).limit(1).maybeSingle();
      if (existente) { navigate(`/professor/chat/dm/${existente.conversa_id}`); return; }
    }
    const id = crypto.randomUUID();
    await supabase.from('conversas_privadas').insert({ id, institution_id: profProfile.institution_id });
    await supabase.from('conversa_participantes').insert([
      { conversa_id: id, usuario_id: profProfile.id },
      { conversa_id: id, usuario_id: alunoId },
    ]);
    navigate(`/professor/chat/dm/${id}`);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
        <div className="h-20 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="p-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06]">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="text-white/40 text-center mt-12">Aluno nao encontrado</p>
      </div>
    );
  }

  const casaInfo = casaCores[aluno.casaId];
  const cor = casaInfo?.cor || '#444';

  // Missoes separadas por status
  const missoesAprovadas = aluno.missoes.filter(m => m.status === 'aprovada');
  const missoesPendentes = aluno.missoes.filter(m => m.status === 'nao_entregue' || m.status === 'pendente');
  const missoesAguardando = aluno.missoes.filter(m => m.status === 'aguardando');

  // Top inteligencias (ordenadas por score)
  const topInteligencias = [...aluno.inteligencias].sort((a, b) => b.score - a.score).slice(0, 3);

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-white">Perfil do Aluno</h1>
      </div>

      {/* Card do aluno */}
      <div className="relative overflow-hidden p-5 rounded-2xl bg-[#252547] border border-violet-500/10">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: cor }}>
            {aluno.avatarUrl ? (
              <img src={aluno.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-xl text-white/40" style={{ backgroundColor: `${cor}20` }}>
                {aluno.nome.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{aluno.nome}</h2>
            <p className="text-sm" style={{ color: cor }}>{aluno.casaNome}</p>
            <p className="text-xs text-white/40 mt-0.5">{aluno.serie} - Turma {aluno.turma}</p>
          </div>
          {/* Botao mensagem */}
          <button
            onClick={iniciarConversa}
            className="p-2.5 rounded-lg bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.1] transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl text-center bg-[#252547] border border-violet-500/10">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xl font-bold text-white">{aluno.pontosTotais}</span>
          </div>
          <p className="text-[10px] text-white/40">Pontos</p>
        </div>
        <div className="p-3.5 rounded-xl text-center bg-[#252547] border border-violet-500/10">
          <span className="text-xl font-bold text-white">{aluno.ranking}</span>
          <span className="text-white/40 text-xs align-top">º</span>
          <span className="text-white/30 text-[10px]">/{aluno.totalAlunosCasa}</span>
          <p className="text-[10px] text-white/40 mt-0.5">Na casa</p>
        </div>
        <div className="p-3.5 rounded-xl text-center bg-[#252547] border border-violet-500/10">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Target className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xl font-bold text-white">{aluno.percentualEntregas}%</span>
          </div>
          <p className="text-[10px] text-white/40">Entregas</p>
        </div>
      </div>

      {/* Missoes */}
      <div>
        <h3 className="text-xs font-medium text-white/40 uppercase tracking-widest mb-3">Missoes</h3>
        <div className="rounded-xl bg-[#252547] border border-violet-500/10 overflow-hidden">
          {aluno.missoes.length === 0 ? (
            <p className="p-4 text-sm text-white/30 text-center">Nenhuma missao atribuida</p>
          ) : (
            <>
              {/* Resumo em barras */}
              <div className="p-3.5 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex h-2 rounded-full overflow-hidden bg-white/10">
                    {missoesAprovadas.length > 0 && (
                      <div className="bg-emerald-500 transition-all" style={{ width: `${(missoesAprovadas.length / aluno.missoes.length) * 100}%` }} />
                    )}
                    {missoesAguardando.length > 0 && (
                      <div className="bg-amber-500 transition-all" style={{ width: `${(missoesAguardando.length / aluno.missoes.length) * 100}%` }} />
                    )}
                    {missoesPendentes.length > 0 && (
                      <div className="bg-red-500/50 transition-all" style={{ width: `${(missoesPendentes.length / aluno.missoes.length) * 100}%` }} />
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-white/40 shrink-0">
                  {missoesAprovadas.length}/{aluno.missoes.length}
                </span>
              </div>
              {/* Lista de missoes */}
              {aluno.missoes.slice(0, 5).map(m => (
                <div key={m.id} className="flex items-center gap-3 py-2.5 px-3.5 border-t border-violet-500/5">
                  <div className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    m.status === 'aprovada' && 'bg-emerald-500',
                    m.status === 'aguardando' && 'bg-amber-500',
                    (m.status === 'pendente' || m.status === 'nao_entregue') && 'bg-red-500/50',
                  )} />
                  <span className="text-sm text-white/70 flex-1 truncate">{m.titulo}</span>
                  {m.nota != null && (
                    <span className="text-xs text-white/40 shrink-0">Nota {m.nota}</span>
                  )}
                </div>
              ))}
              {aluno.missoes.length > 5 && (
                <p className="py-2 text-center text-[10px] text-white/25">+{aluno.missoes.length - 5} missoes</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Top Inteligencias */}
      {topInteligencias.length > 0 && topInteligencias.some(i => i.score > 0) && (
        <div>
          <h3 className="text-xs font-medium text-white/40 uppercase tracking-widest mb-3">Inteligencias</h3>
          <div className="rounded-xl bg-[#252547] border border-violet-500/10 p-3.5 space-y-2.5">
            {topInteligencias.filter(i => i.score > 0).map(intel => (
              <div key={intel.id} className="flex items-center gap-3">
                <span className="text-xs text-white/50 w-24 truncate">{intel.nome}</span>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(intel.score, 100)}%`, backgroundColor: intel.cor }}
                  />
                </div>
                <span className="text-[10px] text-white/40 w-8 text-right">{Math.round(intel.score)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Arvore de Talentos (placeholder) */}
      <div>
        <h3 className="text-xs font-medium text-white/40 uppercase tracking-widest mb-3">Arvore de Talentos</h3>
        <div className="p-5 rounded-xl bg-[#252547] border border-violet-500/10 text-center">
          <TreePine className="w-7 h-7 text-white/15 mx-auto mb-1.5" />
          <p className="text-white/25 text-xs">Em breve — habilidades desenvolvidas</p>
        </div>
      </div>

      {/* Conquistas (placeholder) */}
      <div>
        <h3 className="text-xs font-medium text-white/40 uppercase tracking-widest mb-3">Conquistas</h3>
        <div className="p-5 rounded-xl bg-[#252547] border border-violet-500/10 text-center">
          <Award className="w-7 h-7 text-white/15 mx-auto mb-1.5" />
          <p className="text-white/25 text-xs">Em breve — badges desbloqueados</p>
        </div>
      </div>
    </div>
  );
};

export default PerfilAlunoPage;
