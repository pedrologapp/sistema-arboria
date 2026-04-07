import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, ChevronUp, ChevronRight, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Aluno {
  id: string;
  full_name: string | null;
  nome: string | null;
  serie: string | null;
  turma: string | null;
  avatar_url: string | null;
  casa_id: number | null;
  entregas_count: number;
  missoes_total: number;
}

const AlunosPage = () => {
  const navigate = useNavigate();
  const { profile } = useProfessor();
  const [busca, setBusca] = useState('');
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});

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

  // Buscar todos os alunos F2
  const { data: alunos = [], isLoading } = useQuery({
    queryKey: ['professor-alunos', profile?.institution_id],
    queryFn: async () => {
      if (!profile?.institution_id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, nome, serie, turma, avatar_url, casa_id')
        .eq('institution_id', profile.institution_id)
        .eq('segmento', 'fundamental2')
        .not('casa_id', 'is', null)
        .order('full_name');
      if (error) throw error;

      // Entregas
      const { data: missoes } = await supabase
        .from('missoes').select('id, serie_filtro')
        .eq('institution_id', profile.institution_id).eq('status', 'liberada');
      const missaoIds = missoes?.map(m => m.id) || [];
      let entregasMap: Record<string, number> = {};
      if (missaoIds.length > 0) {
        const { data: entregas } = await supabase.from('entregas').select('aluno_id').in('missao_id', missaoIds);
        (entregas || []).forEach(e => { entregasMap[e.aluno_id] = (entregasMap[e.aluno_id] || 0) + 1; });
      }
      const missoesPorSerie: Record<string, number> = {};
      (missoes || []).forEach(m => {
        if (m.serie_filtro) missoesPorSerie[String(m.serie_filtro)] = (missoesPorSerie[String(m.serie_filtro)] || 0) + 1;
        else ['6','7','8','9'].forEach(s => { missoesPorSerie[s] = (missoesPorSerie[s] || 0) + 1; });
      });

      return (data || []).map(p => ({
        ...p,
        entregas_count: entregasMap[p.id] || 0,
        missoes_total: missoesPorSerie[p.serie?.replace(/\D/g, '') || '0'] || 0,
      })) as Aluno[];
    },
    enabled: !!profile?.institution_id,
    staleTime: 120000,
  });

  // Agrupar por serie+turma
  const grupos = useMemo(() => {
    let lista = alunos;
    if (busca) {
      const termo = busca.toLowerCase();
      lista = lista.filter(a => (a.full_name || a.nome || '').toLowerCase().includes(termo));
    }

    const map: Record<string, Aluno[]> = {};
    lista.forEach(a => {
      const serieNum = a.serie?.replace(/\D/g, '') || '0';
      const key = `${serieNum}${a.turma || ''}`;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });

    return Object.entries(map)
      .map(([key, alunos]) => {
        const serieNum = alunos[0]?.serie?.replace(/\D/g, '') || '0';
        const turma = alunos[0]?.turma || '';
        const comEntrega = alunos.filter(a => a.entregas_count > 0).length;
        return { key, serieNum, turma, alunos, comEntrega };
      })
      .sort((a, b) => {
        const sDiff = parseInt(a.serieNum) - parseInt(b.serieNum);
        if (sDiff !== 0) return sDiff;
        return a.turma.localeCompare(b.turma);
      });
  }, [alunos, busca]);

  const toggleGrupo = (key: string) => {
    setExpandido(p => ({ ...p, [key]: !p[key] }));
  };

  const getNomeAbreviado = (a: Aluno) => {
    const nome = a.nome || a.full_name?.split(' ')[0] || '?';
    const partes = (a.full_name || '').split(' ');
    const seg = partes.length > 1 ? partes[1]?.[0] + '.' : '';
    return `${nome} ${seg}`.trim();
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-semibold text-white">Alunos</h1>
        <p className="text-xs text-white/30 mt-0.5">{alunos.length} alunos F2</p>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input
          placeholder="Buscar aluno..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-10 bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 h-9 text-sm"
        />
        {busca && (
          <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grupos por serie+turma */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : grupos.length === 0 ? (
        <div className="p-8 rounded-xl bg-[rgba(26,26,30,0.85)] border border-white/10 text-center">
          <p className="text-white/40 text-sm">Nenhum aluno encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grupos.map(grupo => {
            const isOpen = expandido[grupo.key] || !!busca;
            const preview = grupo.alunos.slice(0, 8);

            return (
              <div key={grupo.key} className="rounded-xl bg-[rgba(26,26,30,0.85)] border border-white/10 overflow-hidden">
                {/* Header do grupo */}
                <button
                  onClick={() => toggleGrupo(grupo.key)}
                  className="w-full p-3.5 hover:bg-white/[0.04] transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-bold text-white">{grupo.serieNum}o Ano — Turma {grupo.turma}</span>
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 text-white/30" />
                      : <ChevronDown className="w-4 h-4 text-white/30" />
                    }
                  </div>
                  {/* Mini stats */}
                  <div className="flex items-center gap-4 text-[10px]">
                    <span className="text-white/40">{grupo.alunos.length} alunos</span>
                    {grupo.alunos[0]?.missoes_total > 0 && (
                      <>
                        <span className="text-emerald-400/70">{grupo.comEntrega} entregaram</span>
                        <span className="text-red-400/70">{grupo.alunos.length - grupo.comEntrega} pendentes</span>
                      </>
                    )}
                  </div>
                </button>

                {/* Preview compacto (fechado) */}
                {!isOpen && (
                  <div className="px-3.5 pb-3 flex gap-1.5">
                    {preview.map(a => {
                      const cor = casaCores[a.casa_id || 0] || '#444';
                      return (
                        <div
                          key={a.id}
                          className="w-8 h-8 rounded-full overflow-hidden border-2 shrink-0"
                          style={{ borderColor: cor }}
                        >
                          {a.avatar_url ? (
                            <img src={a.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="flex items-center justify-center w-full h-full text-[10px] text-white/50"
                              style={{ backgroundColor: `${cor}20` }}>
                              {(a.nome || '?').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {grupo.alunos.length > 8 && (
                      <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0">
                        <span className="text-[9px] text-white/40">+{grupo.alunos.length - 8}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Lista expandida */}
                {isOpen && (
                  <div className="px-2 pb-2">
                    <div className="grid grid-cols-4 gap-1.5">
                      {grupo.alunos.map(a => {
                        const cor = casaCores[a.casa_id || 0] || '#444';
                        const progresso = a.missoes_total > 0
                          ? Math.round((a.entregas_count / a.missoes_total) * 100)
                          : -1;

                        return (
                          <button
                            key={a.id}
                            onClick={() => navigate(`/professor/alunos/${a.id}`)}
                            className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/[0.06] transition-colors active:scale-95"
                          >
                            <div className="relative">
                              <div
                                className="w-11 h-11 rounded-full overflow-hidden border-2"
                                style={{ borderColor: cor }}
                              >
                                {a.avatar_url ? (
                                  <img src={a.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="flex items-center justify-center w-full h-full text-xs text-white/50"
                                    style={{ backgroundColor: `${cor}20` }}>
                                    {(a.nome || '?').charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              {/* Mini badge de entregas */}
                              {progresso >= 0 && (
                                <div className={cn(
                                  'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#1a1a1e]',
                                  progresso === 100 ? 'bg-emerald-500' :
                                  progresso > 0 ? 'bg-amber-500' : 'bg-red-500'
                                )} />
                              )}
                            </div>
                            <span className="text-[10px] text-white/60 text-center leading-tight truncate w-full">
                              {getNomeAbreviado(a)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlunosPage;
