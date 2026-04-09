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

  // Membros da casa (para meta proporcional)
  const { data: membrosCasa = 0 } = useQuery({
    queryKey: ['conquistas-membros-casa', casa?.id, profile?.institution_id],
    queryFn: async () => {
      if (!casa?.id || !profile?.institution_id) return 0;
      const { count } = await supabase.from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('casa_id', casa.id)
        .eq('institution_id', profile.institution_id)
        .eq('segmento', 'fundamental2');
      return count || 0;
    },
    enabled: !!casa?.id && !!profile?.institution_id,
    staleTime: 300000,
  });

  // Meta = 35% do máximo possível da casa
  // 7 fases × 3 semanas × 100 pts = 2100 por aluno
  const MAX_POR_ALUNO = 7 * 3 * 100;
  const getMetaAjustada = () => {
    if (!membrosCasa) return 0;
    return Math.round(MAX_POR_ALUNO * membrosCasa * 0.35);
  };

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
            const meta = getMetaAjustada();
            const desbloqueada = pontosCasa >= meta;
            const pct = Math.min(Math.round((pontosCasa / meta) * 100), 100);
            const faltam = meta - pontosCasa;

            return (
              <div key={c.id} className={cn(
                'rounded-xl border p-4 flex flex-col items-center text-center',
                desbloqueada ? 'border-white/20 bg-white/[0.08]' : 'border-white/[0.08] bg-[#252547]'
              )}
              style={!desbloqueada ? { borderColor: `${c.cor}20` } : undefined}
              >
                <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center mb-2')}
                  style={{ backgroundColor: desbloqueada ? `${c.cor}25` : `${c.cor}10` }}>
                  {desbloqueada ? <Shirt className="w-7 h-7" style={{ color: c.cor }} /> : <Lock className="w-6 h-6" style={{ color: `${c.cor}60` }} />}
                </div>
                <p className={cn('text-xs font-semibold mb-1', desbloqueada ? 'text-white' : 'text-white/70')}>{c.nome}</p>

                {/* Pontuação */}
                <p className="text-[10px] font-bold mb-2" style={{ color: desbloqueada ? c.cor : `${c.cor}90` }}>
                  {pontosCasa.toLocaleString('pt-BR')} / {meta.toLocaleString('pt-BR')} pts
                </p>

                <div className="w-full">
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: `${c.cor}15` }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: c.cor }} />
                  </div>
                  <p className="text-[9px] mt-1.5" style={{ color: desbloqueada ? '#10b981' : `${c.cor}70` }}>
                    {desbloqueada ? `Desbloqueada! · ${new Date().getFullYear()}` : `Faltam ${faltam.toLocaleString('pt-BR')} pts`}
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
            const pts = dados?.pontos || 0;
            const max = dados?.max || 300;
            const concluida = pct >= 100;
            const conquista = conquistasPessoais[int.codigo] || { nome: int.nome, descricao: '' };

            return (
              <div key={int.id} className={cn(
                'rounded-xl border p-3.5 flex flex-col items-center text-center',
                concluida ? 'border-white/20 bg-white/[0.08]' : 'border-white/[0.08] bg-[#252547]'
              )}
              style={!concluida ? { borderColor: `${int.cor_hex}15` } : undefined}
              >
                <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-2"
                  style={{ backgroundColor: concluida ? `${int.cor_hex}25` : `${int.cor_hex}10` }}>
                  {concluida ? (
                    <Star className="w-5 h-5" style={{ color: int.cor_hex }} />
                  ) : (
                    <Lock className="w-4 h-4" style={{ color: `${int.cor_hex}50` }} />
                  )}
                </div>
                <p className={cn('text-[11px] font-semibold mb-0.5', concluida ? 'text-white' : 'text-white/60')}>
                  {conquista.nome}
                </p>
                <p className={cn('text-[8px] mb-1.5 leading-tight', concluida ? 'text-white/50' : 'text-white/30')}>
                  {conquista.descricao}
                </p>

                {/* Pontuação */}
                <p className="text-[9px] font-bold mb-1.5" style={{ color: concluida ? int.cor_hex : `${int.cor_hex}80` }}>
                  {pts} / {max} pts
                </p>

                <div className="w-full">
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${int.cor_hex}12` }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: int.cor_hex }} />
                  </div>
                  <p className="text-[8px] mt-1" style={{ color: concluida ? '#10b981' : `${int.cor_hex}60` }}>
                    {concluida ? `Dominio alcancado · ${new Date().getFullYear()}` : `${pct}%`}
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
