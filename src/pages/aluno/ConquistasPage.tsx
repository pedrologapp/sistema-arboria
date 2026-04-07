import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudent } from '@/contexts/StudentContext';
import { ArrowLeft, Lock, Shirt, Star, Crown, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const conquistasPessoais: Record<string, { nome: string; descricao: string }> = {
  linguistica: { nome: 'Voz que Atravessa', descricao: 'Concluiu a fase Linguistica com 100%' },
  logico_matematica: { nome: 'Mente Afiada', descricao: 'Concluiu a fase Logico-Matematica com 100%' },
  espacial: { nome: 'Visao sem Limites', descricao: 'Concluiu a fase Espacial com 100%' },
  musical: { nome: 'Ouvido Absoluto', descricao: 'Concluiu a fase Musical com 100%' },
  corporal_cinestesica: { nome: 'Dominio do Movimento', descricao: 'Concluiu a fase Corporal-Cinestesica com 100%' },
  naturalista: { nome: 'Olhar da Natureza', descricao: 'Concluiu a fase Naturalista com 100%' },
  interpessoal: { nome: 'Elo Invisivel', descricao: 'Concluiu a fase Interpessoal com 100%' },
  intrapessoal: { nome: 'Raiz Interior', descricao: 'Concluiu a fase Intrapessoal com 100%' },
};

const ConquistasPage = () => {
  const navigate = useNavigate();
  const { profile, casa } = useStudent();

  // Pontos da casa
  const { data: pontosCasa = 0 } = useQuery({
    queryKey: ['conquistas-pontos-casa', casa?.id, profile?.institution_id],
    queryFn: async () => {
      if (!casa?.id || !profile?.institution_id) return 0;
      const { data } = await supabase.from('ranking_casas')
        .select('total_pontos').eq('casa_id', casa.id).eq('institution_id', profile.institution_id).maybeSingle();
      return data?.total_pontos || 0;
    },
    enabled: !!casa?.id && !!profile?.institution_id,
  });

  // Conquistas da casa
  const { data: conquistas = [] } = useQuery({
    queryKey: ['conquistas', profile?.institution_id],
    queryFn: async () => {
      if (!profile?.institution_id) return [];
      const { data } = await supabase.from('conquistas')
        .select('*').eq('institution_id', profile.institution_id).eq('ativo', true).order('ordem');
      return data || [];
    },
    enabled: !!profile?.institution_id,
    staleTime: 300000,
  });

  // Inteligencias (para conquistas pessoais)
  const { data: inteligencias = [] } = useQuery({
    queryKey: ['conquistas-inteligencias'],
    queryFn: async () => {
      const { data } = await supabase.from('inteligencias').select('id, nome, cor_hex, codigo').order('id');
      return data || [];
    },
  });

  // Cargos (historico)
  const { data: cargos = [] } = useQuery({
    queryKey: ['conquistas-cargos', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase.from('cargos_casa')
        .select('cargo, ano_letivo, casa:inteligencias!cargos_casa_casa_id_fkey(nome, cor_hex)')
        .eq('aluno_id', profile.id).eq('ativo', true);
      return data || [];
    },
    enabled: !!profile?.id,
    staleTime: 300000,
  });

  // Pontos pessoais por fase (para conquistas pessoais)
  const { data: pontosPorFase = {} } = useQuery({
    queryKey: ['conquistas-pessoais', profile?.id, profile?.institution_id],
    queryFn: async () => {
      if (!profile?.id || !profile?.institution_id) return {};
      // Buscar pontos do aluno por fase
      const { data: pontos } = await supabase.from('pontos_gerais')
        .select('pontos, missao:missoes!pontos_gerais_missao_id_fkey(fase_id)')
        .eq('aluno_id', profile.id);

      // Buscar pontos maximos possiveis por fase (3 semanas × 100 pts)
      const maxPorFase = 300; // 3 semanas × 100 pontos

      const map: Record<string, number> = {};
      (pontos || []).forEach(p => {
        const faseId = (p.missao as any)?.fase_id;
        if (faseId) map[faseId] = (map[faseId] || 0) + (p.pontos || 0);
      });

      // Buscar fases com inteligencia
      const { data: fases } = await supabase.from('fases')
        .select('id, inteligencia_id').eq('institution_id', profile.institution_id);

      const result: Record<number, { pontos: number; max: number; pct: number }> = {};
      (fases || []).forEach(f => {
        const pts = map[f.id] || 0;
        if (!result[f.inteligencia_id]) result[f.inteligencia_id] = { pontos: 0, max: maxPorFase, pct: 0 };
        result[f.inteligencia_id].pontos += pts;
        result[f.inteligencia_id].pct = Math.round((result[f.inteligencia_id].pontos / maxPorFase) * 100);
      });
      return result;
    },
    enabled: !!profile?.id && !!profile?.institution_id,
    staleTime: 120000,
  });

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-white">Conquistas</h1>
          <p className="text-xs text-white/30">Casa {casa?.nome}</p>
        </div>
      </div>

      {/* Conquistas da Casa */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1 h-3.5 rounded-full bg-amber-500" />
          <p className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-widest">Conquistas da Casa</p>
          <span className="text-[10px] text-white/20 ml-auto">{pontosCasa.toLocaleString('pt-BR')} pts</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {conquistas.map(c => {
            const desbloqueada = pontosCasa >= c.pontos_necessarios;
            const pct = Math.min(Math.round((pontosCasa / c.pontos_necessarios) * 100), 100);

            return (
              <div key={c.id} className={cn(
                'rounded-xl border p-4 flex flex-col items-center text-center',
                desbloqueada ? 'border-white/20 bg-white/[0.08]' : 'border-white/[0.08] bg-[rgba(26,26,30,0.85)]'
              )}>
                <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center mb-2', desbloqueada ? '' : 'opacity-30')}
                  style={{ backgroundColor: desbloqueada ? `${c.cor}20` : 'rgba(255,255,255,0.05)' }}>
                  {desbloqueada ? <Shirt className="w-7 h-7" style={{ color: c.cor }} /> : <Lock className="w-6 h-6 text-white/25" />}
                </div>
                <p className={cn('text-xs font-semibold mb-1.5', desbloqueada ? 'text-white' : 'text-white/50')}>{c.nome}</p>
                <div className="w-full">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: c.cor }} />
                  </div>
                  <p className="text-[9px] text-white/20 mt-1">
                    {desbloqueada ? `Desbloqueada! · ${new Date().getFullYear()}` : `${pct}% · faltam ${(c.pontos_necessarios - pontosCasa).toLocaleString('pt-BR')}`}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Placeholders */}
          {conquistas.length < 2 && Array.from({ length: 2 - conquistas.length }).map((_, i) => (
            <div key={`ph-${i}`} className="rounded-xl border border-dashed border-white/[0.06] p-4 flex flex-col items-center justify-center min-h-[150px]">
              <Lock className="w-5 h-5 text-white/10 mb-1" />
              <p className="text-[9px] text-white/10">Em breve</p>
            </div>
          ))}
        </div>
      </div>

      {/* Conquistas Pessoais */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1 h-3.5 rounded-full bg-violet-500" />
          <p className="text-[10px] font-semibold text-violet-400/80 uppercase tracking-widest">Conquistas Pessoais</p>
        </div>

        <p className="text-[10px] text-white/25 mb-3 px-1">Domine cada inteligencia com excelencia</p>

        <div className="grid grid-cols-2 gap-3">
          {inteligencias.map(int => {
            const dados = pontosPorFase[int.id];
            const pct = dados?.pct || 0;
            const concluida = pct >= 100;
            const conquista = conquistasPessoais[int.codigo] || { nome: int.nome, descricao: '' };

            return (
              <div key={int.id} className={cn(
                'rounded-xl border p-3.5 flex flex-col items-center text-center',
                concluida ? 'border-white/20 bg-white/[0.08]' : 'border-white/[0.08] bg-[rgba(26,26,30,0.85)]'
              )}>
                <div className={cn('w-11 h-11 rounded-lg flex items-center justify-center mb-2', concluida ? '' : 'opacity-25')}
                  style={{ backgroundColor: concluida ? `${int.cor_hex}20` : 'rgba(255,255,255,0.05)' }}>
                  {concluida ? (
                    <Star className="w-5 h-5" style={{ color: int.cor_hex }} />
                  ) : (
                    <Lock className="w-4 h-4 text-white/25" />
                  )}
                </div>
                <p className={cn('text-[11px] font-semibold mb-0.5', concluida ? 'text-white' : 'text-white/40')}>
                  {conquista.nome}
                </p>
                <p className={cn('text-[8px] mb-2 leading-tight', concluida ? 'text-white/50' : 'text-white/15')}>
                  {conquista.descricao}
                </p>
                <div className="w-full">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: int.cor_hex }} />
                  </div>
                  <p className="text-[8px] text-white/15 mt-0.5">
                    {concluida ? `Dominio alcancado · ${new Date().getFullYear()}` : dados ? `${pct}%` : int.nome}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conquistas de Cargo */}
      {cargos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-1 h-3.5 rounded-full bg-emerald-500" />
            <p className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-widest">Cargos</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {cargos.map((c: any, idx: number) => {
              const casaInfo = c.casa as any;
              const isLider = c.cargo === 'lider';
              return (
                <div key={idx} className="rounded-xl border border-white/15 bg-white/[0.06] p-3.5 flex flex-col items-center text-center">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-2"
                    style={{ backgroundColor: `${casaInfo?.cor_hex || '#666'}20` }}>
                    {isLider ? (
                      <Crown className="w-5 h-5" style={{ color: casaInfo?.cor_hex || '#f59e0b' }} />
                    ) : (
                      <Shield className="w-5 h-5" style={{ color: casaInfo?.cor_hex || '#8b5cf6' }} />
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-white">
                    {isLider ? 'Lider' : 'Coordenador'}
                  </p>
                  <p className="text-[9px] text-white/40 mt-0.5">
                    Casa {casaInfo?.nome || '?'}
                  </p>
                  <p className="text-[8px] text-white/20 mt-1">{c.ano_letivo}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConquistasPage;
