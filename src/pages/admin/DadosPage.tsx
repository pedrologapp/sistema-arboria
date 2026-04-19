import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronDown, ChevronUp, TreePine, Target, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import ArvoreTalentosView from '@/components/aluno/ArvoreTalentosView';

interface Aluno {
  id: string;
  full_name: string | null;
  nome: string | null;
  serie: string | null;
  turma: string | null;
  avatar_url: string | null;
  casa_id: number | null;
}

interface Casa {
  id: number;
  nome: string;
  cor_hex: string;
  codigo: string;
  brasao_url: string | null;
}

const DadosPage = () => {
  const { user } = useAuth();
  const [casaExpandida, setCasaExpandida] = useState<number | null>(null);
  const [tab, setTab] = useState<'casas' | 'arvore' | 'crossim'>('casas');
  const [alunoArvore, setAlunoArvore] = useState<Aluno | null>(null);
  const [buscaArvore, setBuscaArvore] = useState('');

  // Dados da árvore para aluno selecionado
  const { data: dadosArvore } = useQuery({
    queryKey: ['admin-arvore-dados', alunoArvore?.id],
    queryFn: async () => {
      if (!alunoArvore?.id) return {};
      const { data } = await supabase.from('arvore_talentos')
        .select('habilidade_id, inteligencia_id, tipo_ponto, habilidade:habilidades!arvore_talentos_habilidade_id_fkey(codigo)')
        .eq('aluno_id', alunoArvore.id);
      const { data: intels } = await supabase.from('inteligencias').select('id, codigo');
      const intelMap: Record<number, string> = {};
      (intels || []).forEach((i: any) => { intelMap[i.id] = i.codigo; });
      const resultado: Record<string, Record<string, string>> = {};
      (data || []).forEach((d: any) => {
        const intCodigo = intelMap[d.inteligencia_id];
        const habCodigo = (d.habilidade as any)?.codigo;
        if (!intCodigo || !habCodigo) return;
        if (!resultado[intCodigo]) resultado[intCodigo] = {};
        const prioridade: Record<string, number> = { exposicao: 1, contato: 2, desenvolvimento: 3, consolidacao: 4 };
        const atual = resultado[intCodigo][habCodigo];
        if (!atual || (prioridade[d.tipo_ponto] || 0) > (prioridade[atual] || 0)) {
          resultado[intCodigo][habCodigo] = d.tipo_ponto;
        }
      });
      return resultado;
    },
    enabled: !!alunoArvore?.id,
  });

  // Buscar instituicao do admin
  const { data: institutionId } = useQuery({
    queryKey: ['admin-institution', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('institution_id').eq('id', user!.id).single();
      return data?.institution_id;
    },
    enabled: !!user?.id,
  });

  // Casas
  const { data: casas = [] } = useQuery({
    queryKey: ['admin-casas'],
    queryFn: async () => {
      const { data } = await supabase.from('inteligencias').select('id, nome, cor_hex, codigo, brasao_url').order('id');
      return (data || []) as Casa[];
    },
  });

  // Todos os alunos F2
  const { data: alunos = [], isLoading } = useQuery({
    queryKey: ['admin-alunos-dados', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data } = await supabase.from('profiles')
        .select('id, full_name, nome, serie, turma, avatar_url, casa_id')
        .eq('institution_id', institutionId)
        .eq('segmento', 'fundamental2')
        .not('casa_id', 'is', null)
        .order('full_name');
      return (data || []) as Aluno[];
    },
    enabled: !!institutionId,
    staleTime: 120000,
  });

  // Entregas por aluno
  const { data: entregasMap = {} } = useQuery({
    queryKey: ['admin-entregas-dados', institutionId],
    queryFn: async () => {
      if (!institutionId) return {};
      const { data: missoes } = await supabase.from('missoes').select('id').eq('institution_id', institutionId).eq('status', 'liberada');
      if (!missoes?.length) return {};
      const { data: entregas } = await supabase.from('entregas').select('aluno_id').in('missao_id', missoes.map(m => m.id));
      const map: Record<string, number> = {};
      (entregas || []).forEach(e => { map[e.aluno_id] = (map[e.aluno_id] || 0) + 1; });
      return map;
    },
    enabled: !!institutionId,
    staleTime: 120000,
  });

  // Agrupar alunos por casa
  const alunosPorCasa = useMemo(() => {
    const map: Record<number, Aluno[]> = {};
    alunos.forEach(a => {
      if (a.casa_id) {
        if (!map[a.casa_id]) map[a.casa_id] = [];
        map[a.casa_id].push(a);
      }
    });
    return map;
  }, [alunos]);

  // Mapa de brasões para a árvore
  const brasoesMap = useMemo(() => {
    const map: Record<string, string> = {};
    casas.forEach(c => { if (c.brasao_url) map[c.codigo] = c.brasao_url; });
    return map;
  }, [casas]);

  const getNomeAbreviado = (a: Aluno) => {
    const nome = a.nome || a.full_name?.split(' ')[0] || '?';
    const partes = (a.full_name || '').split(' ');
    const seg = partes.length > 1 ? partes[1]?.[0] + '.' : '';
    return `${nome} ${seg}`.trim();
  };

  const arvoreJSX = (
    <div className="p-4 space-y-5 pb-24">
      <div>
        <h1 className="text-xl font-semibold text-white">Dados</h1>
        <p className="text-xs text-white/30 mt-0.5">{alunos.length} alunos F2</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'casas', label: 'Alunos por Casa' },
          { id: 'arvore', label: 'Arvore de Talentos' },
          { id: 'crossim', label: 'Cross-IM' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              tab === t.id ? 'bg-amber-500 text-white' : 'bg-white/[0.06] text-white/50 hover:bg-white/[0.1]'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Alunos por Casa */}
      {tab === 'casas' && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            casas.map(casa => {
              const alunosDaCasa = alunosPorCasa[casa.id] || [];
              const isOpen = casaExpandida === casa.id;
              const comEntrega = alunosDaCasa.filter(a => (entregasMap[a.id] || 0) > 0).length;

              return (
                <div key={casa.id} className="rounded-xl bg-[#252547] border border-violet-500/10 overflow-hidden">
                  <button
                    onClick={() => setCasaExpandida(isOpen ? null : casa.id)}
                    className="w-full p-3.5 text-left hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: casa.cor_hex }} />
                        <span className="text-base font-bold text-white">{casa.nome}</span>
                        <span className="text-xs text-white/30">{alunosDaCasa.length} alunos</span>
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                    </div>
                    <div className="flex items-center gap-4 text-[10px]">
                      {comEntrega > 0 && <span className="text-emerald-400/70">{comEntrega} com entregas</span>}
                      {alunosDaCasa.length - comEntrega > 0 && <span className="text-white/30">{alunosDaCasa.length - comEntrega} sem entregas</span>}
                    </div>
                  </button>

                  {!isOpen && alunosDaCasa.length > 0 && (
                    <div className="px-3.5 pb-3 flex gap-1.5">
                      {alunosDaCasa.slice(0, 10).map(a => (
                        <div key={a.id} className="w-7 h-7 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: casa.cor_hex }}>
                          {a.avatar_url ? (
                            <img src={a.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="flex items-center justify-center w-full h-full text-[9px] text-white/50" style={{ backgroundColor: `${casa.cor_hex}20` }}>
                              {(a.nome || '?').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      ))}
                      {alunosDaCasa.length > 10 && (
                        <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0">
                          <span className="text-[8px] text-white/40">+{alunosDaCasa.length - 10}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {isOpen && (
                    <div className="px-2 pb-2">
                      <div className="grid grid-cols-4 gap-1.5">
                        {alunosDaCasa.map(a => (
                          <button key={a.id} onClick={() => setAlunoArvore(a)} className="flex flex-col items-center gap-1 p-1.5 hover:bg-white/[0.04] rounded-lg transition-colors">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full overflow-hidden border-2" style={{ borderColor: casa.cor_hex }}>
                                {a.avatar_url ? (
                                  <img src={a.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="flex items-center justify-center w-full h-full text-xs text-white/50" style={{ backgroundColor: `${casa.cor_hex}20` }}>
                                    {(a.nome || '?').charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              {(entregasMap[a.id] || 0) > 0 && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#1a1a1e]" />
                              )}
                            </div>
                            <span className="text-[9px] text-white/50 text-center leading-tight truncate w-full">{getNomeAbreviado(a)}</span>
                            <span className="text-[8px] text-white/25">{a.serie} {a.turma}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Arvore de Talentos */}
      {tab === 'arvore' && (
        <div className="space-y-3">
          {/* Seletor de aluno */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input value={buscaArvore} onChange={e => setBuscaArvore(e.target.value)}
              placeholder="Buscar aluno..."
              className="w-full bg-[#252547] border border-violet-500/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20" />
          </div>

          {/* Lista de alunos filtrados */}
          {buscaArvore.trim() && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {alunos.filter(a => (a.full_name || '').toLowerCase().includes(buscaArvore.toLowerCase())).slice(0, 8).map(a => {
                const casa = casas.find(c => c.id === a.casa_id);
                return (
                  <button key={a.id} onClick={() => { setAlunoArvore(a); setBuscaArvore(''); }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[#252547] border border-violet-500/5 hover:bg-white/[0.04] text-left transition-colors">
                    <div className="w-8 h-8 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: casa?.cor_hex || '#444' }}>
                      {a.avatar_url ? <img src={a.avatar_url} alt="" className="w-full h-full object-cover" /> :
                        <span className="flex items-center justify-center w-full h-full text-[10px] text-white/40" style={{ backgroundColor: `${casa?.cor_hex || '#444'}20` }}>{(a.nome || '?')[0]}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{a.full_name}</p>
                      <p className="text-[9px] text-white/30">{a.serie} {a.turma} · {casa?.nome}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Aluno selecionado + Árvore */}
          {alunoArvore ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#252547] border border-emerald-500/20">
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: casas.find(c => c.id === alunoArvore.casa_id)?.cor_hex || '#444' }}>
                  {alunoArvore.avatar_url ? <img src={alunoArvore.avatar_url} alt="" className="w-full h-full object-cover" /> :
                    <span className="flex items-center justify-center w-full h-full text-sm text-white/40">{(alunoArvore.nome || '?')[0]}</span>}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{alunoArvore.full_name}</p>
                  <p className="text-[10px] text-white/30">{alunoArvore.serie} {alunoArvore.turma} · {casas.find(c => c.id === alunoArvore.casa_id)?.nome}</p>
                </div>
                <button onClick={() => setAlunoArvore(null)} className="p-1.5 text-white/30 hover:text-white/50"><X className="w-4 h-4" /></button>
              </div>

              <div className="rounded-xl overflow-hidden border border-emerald-500/20" style={{ height: 500 }}>
                <ArvoreTalentosView
                  alunoNome={alunoArvore.full_name || alunoArvore.nome || 'Aluno'}
                  alunoInfo={`${alunoArvore.serie} ${alunoArvore.turma} · Arboria`}
                  avatarUrl={alunoArvore.avatar_url}
                  dadosPorInteligencia={dadosArvore || {}} brasoes={brasoesMap}
                />
              </div>
            </div>
          ) : !buscaArvore.trim() && (
            <div className="p-8 rounded-xl bg-[#252547] border border-violet-500/10 text-center">
              <TreePine className="w-10 h-10 text-white/15 mx-auto mb-3" />
              <p className="text-white/40 text-sm">Busque um aluno acima para ver sua árvore</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Cross-IM */}
      {tab === 'crossim' && (
        <div className="p-8 rounded-xl bg-[#252547] border border-violet-500/10 text-center">
          <Target className="w-10 h-10 text-white/15 mx-auto mb-3" />
          <p className="text-white/40 text-sm">Circulos Cross-IM</p>
          <p className="text-white/20 text-xs mt-1">Dados de Cross-IM aparecerão quando as observacoes semanais forem processadas</p>
        </div>
      )}
    </div>
  );

  // Modal da árvore (quando clica no avatar na aba Casas)
  const modalArvore = alunoArvore && tab === 'casas' ? (
    <div className="fixed inset-0 z-50 bg-[#020309]">
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
        <button onClick={() => setAlunoArvore(null)}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 backdrop-blur text-white/70 text-sm">
          <X className="w-4 h-4" /> Fechar
        </button>
        <p className="text-xs text-white/40">{alunoArvore.serie} {alunoArvore.turma} · {casas.find(c => c.id === alunoArvore.casa_id)?.nome}</p>
      </div>
      <ArvoreTalentosView
        alunoNome={alunoArvore.full_name || alunoArvore.nome || 'Aluno'}
        alunoInfo={`${alunoArvore.serie} ${alunoArvore.turma} · Arboria`}
        avatarUrl={alunoArvore.avatar_url}
        dadosPorInteligencia={dadosArvore || {}} brasoes={brasoesMap}
      />
    </div>
  ) : null;

  return (
    <>
      {arvoreJSX}
      {modalArvore}
    </>
  );
};

export default DadosPage;
