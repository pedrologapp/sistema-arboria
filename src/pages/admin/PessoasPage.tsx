import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search, ChevronDown, ChevronUp, ChevronRight, Plus, RefreshCw, Users, Shield, X, UserPlus, Copy, Check, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Tab = 'alunos' | 'professores';

const PessoasPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [segmento, setSegmento] = useState<'infantil' | 'fundamental1' | 'fundamental2'>('fundamental2');
  const [tab, setTab] = useState<Tab>('alunos');
  const [busca, setBusca] = useState('');
  const [casaExpandida, setCasaExpandida] = useState<number | null>(null);
  const [showAddProfessor, setShowAddProfessor] = useState(false);
  const [profEmail, setProfEmail] = useState('');
  const [profSenha, setProfSenha] = useState('');
  const [profNome, setProfNome] = useState('');
  const [profCasa, setProfCasa] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [filtroCargo, setFiltroCargo] = useState<'todos' | 'lider' | 'coordenador'>('todos');
  // Novo aluno (manual)
  const [showAddAluno, setShowAddAluno] = useState(false);
  const [alunoNome, setAlunoNome] = useState('');
  const [alunoSobrenome, setAlunoSobrenome] = useState('');
  const [alunoSerie, setAlunoSerie] = useState('');
  const [alunoTurmaLetra, setAlunoTurmaLetra] = useState('');
  const [alunoCasa, setAlunoCasa] = useState<number | null>(null);
  const [criandoAluno, setCriandoAluno] = useState(false);
  const [resultadoAluno, setResultadoAluno] = useState<{ email: string; senha: string; full_name: string; turma: string } | null>(null);
  const [copiado, setCopiado] = useState<'email' | 'senha' | 'tudo' | null>(null);

  const { data: institutionId } = useQuery({
    queryKey: ['admin-institution', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('institution_id').eq('id', user!.id).single();
      return data?.institution_id;
    },
    enabled: !!user?.id,
  });

  const { data: casas = [] } = useQuery({
    queryKey: ['admin-casas'],
    queryFn: async () => {
      const { data } = await supabase.from('inteligencias').select('id, nome, cor_hex, codigo').order('id');
      return data || [];
    },
  });

  // Turmas da instituição: usadas no dropdown de "Novo aluno"
  const { data: turmas = [] } = useQuery({
    queryKey: ['admin-turmas', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data } = await supabase.from('turmas')
        .select('id, serie, turma_letra')
        .eq('institution_id', institutionId)
        .order('serie').order('turma_letra');
      return data || [];
    },
    enabled: !!institutionId,
  });

  const seriesUnicas = useMemo(
    () => Array.from(new Set(turmas.map((t: any) => t.serie))).sort(),
    [turmas]
  );
  const letrasPorSerie = useMemo(() => {
    const map: Record<string, string[]> = {};
    turmas.forEach((t: any) => {
      if (!map[t.serie]) map[t.serie] = [];
      map[t.serie].push(t.turma_letra);
    });
    return map;
  }, [turmas]);

  // Alunos F2
  const { data: alunos = [], isLoading: loadingAlunos } = useQuery({
    queryKey: ['admin-pessoas-alunos', institutionId, segmento],
    queryFn: async () => {
      if (!institutionId) return [];
      let q = supabase.from('profiles')
        .select('id, full_name, nome, sobrenome, serie, turma, avatar_url, casa_id, segmento')
        .eq('institution_id', institutionId).eq('segmento', segmento).order('full_name');
      // F2 tem casa, Infantil/F1 pode nao ter
      if (segmento === 'fundamental2') q = q.not('casa_id', 'is', null);
      const { data } = await q;
      return data || [];
    },
    enabled: !!institutionId,
    staleTime: 120000,
  });

  // Professores
  const { data: professores = [], isLoading: loadingProfs } = useQuery({
    queryKey: ['admin-pessoas-professores', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data } = await supabase.from('profiles')
        .select('id, full_name, nome, sobrenome, avatar_url, segmento')
        .eq('institution_id', institutionId)
        .in('id', (await supabase.from('user_roles').select('user_id').eq('role', 'professor')).data?.map(r => r.user_id) || []);
      return data || [];
    },
    enabled: !!institutionId,
    staleTime: 120000,
  });

  // Professor-casa (mentores)
  const { data: mentores = [] } = useQuery({
    queryKey: ['admin-mentores', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data } = await supabase.from('professor_casa')
        .select('professor_id, casa_id, eh_mentor_principal')
        .eq('institution_id', institutionId).eq('ativo', true);
      return data || [];
    },
    enabled: !!institutionId,
  });

  // Cargos ativos
  const { data: cargosAtivos = [] } = useQuery({
    queryKey: ['admin-cargos-ativos', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data } = await supabase.from('cargos_casa')
        .select('aluno_id, cargo')
        .eq('institution_id', institutionId)
        .eq('ativo', true)
        .eq('ano_letivo', new Date().getFullYear());
      return data || [];
    },
    enabled: !!institutionId,
  });

  const cargoMap = useMemo(() => {
    const map = new Map<string, string>();
    cargosAtivos.forEach(c => map.set(c.aluno_id, c.cargo));
    return map;
  }, [cargosAtivos]);

  // Agrupar alunos por casa
  const alunosPorCasa = useMemo(() => {
    let lista = alunos;
    if (busca) {
      const t = busca.toLowerCase();
      lista = lista.filter(a => (a.full_name || a.nome || '').toLowerCase().includes(t));
    }
    if (filtroCargo !== 'todos') {
      lista = lista.filter(a => cargoMap.get(a.id) === filtroCargo);
    }
    const map: Record<number, typeof alunos> = {};
    lista.forEach(a => { if (a.casa_id) { if (!map[a.casa_id]) map[a.casa_id] = []; map[a.casa_id].push(a); }});
    return map;
  }, [alunos, busca, filtroCargo, cargoMap]);

  // Sem casa (relevante para F2)
  const alunosSemCasa = useMemo(() => {
    if (segmento !== 'fundamental2') return [];
    let lista = alunos.filter(a => !a.casa_id);
    if (busca) { const t = busca.toLowerCase(); lista = lista.filter(a => (a.full_name || a.nome || '').toLowerCase().includes(t)); }
    return lista;
  }, [alunos, busca, segmento]);

  // Sincronizar de arboria_alunos
  const sincronizarAlunos = async () => {
    if (!institutionId) return;
    setSincronizando(true);
    try {
      // Buscar alunos da tabela arboria_alunos que nao estao em profiles
      const { data: arboriaAlunos } = await supabase.from('arboria_alunos')
        .select('nome, sobrenome, nome_completo, serie, turma, segmento, casa_nome, email, ativo')
        .eq('ativo', true);

      if (!arboriaAlunos?.length) { toast.info('Nenhum aluno novo para sincronizar'); setSincronizando(false); return; }

      // Buscar emails existentes
      const { data: existentes } = await supabase.from('profiles').select('email_gerado').eq('institution_id', institutionId);
      const emailsExistentes = new Set((existentes || []).map(e => e.email_gerado).filter(Boolean));

      const casaMap: Record<string, number> = {};
      casas.forEach(c => { casaMap[c.nome.toLowerCase()] = c.id; casaMap[c.codigo] = c.id; });

      let criados = 0;
      for (const aluno of arboriaAlunos) {
        if (!aluno.email || emailsExistentes.has(aluno.email)) continue;
        if (aluno.segmento !== 'fundamental2') continue;

        const casaId = aluno.casa_nome ? casaMap[aluno.casa_nome.toLowerCase()] || null : null;

        // Tentar criar via admin API (simplificado - apenas profile update)
        const { data: existingProfile } = await supabase.from('profiles')
          .select('id').eq('full_name', aluno.nome_completo).eq('institution_id', institutionId).maybeSingle();

        if (existingProfile) {
          // Atualizar profile existente
          await supabase.from('profiles').update({
            serie: aluno.serie, turma: aluno.turma, casa_id: casaId, segmento: aluno.segmento,
          }).eq('id', existingProfile.id);
          criados++;
        }
      }
      toast.success(`${criados} alunos sincronizados`);
      queryClient.invalidateQueries({ queryKey: ['admin-pessoas-alunos'] });
    } catch (err: any) { toast.error(err.message || 'Erro ao sincronizar'); }
    finally { setSincronizando(false); }
  };

  // Criar professor
  const criarProfessor = async () => {
    if (!institutionId || !profEmail || !profSenha || !profNome) return;
    setSalvando(true);
    try {
      const nomes = profNome.trim().split(' ');
      const nome = nomes[0];
      const sobrenome = nomes.slice(1).join(' ');

      // Criar via Supabase Auth Admin (precisa service role - usar edge function ou workaround)
      // Por agora, criar signup normal
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: profEmail, password: profSenha,
        options: { data: { full_name: profNome, nome, sobrenome } }
      });
      if (authErr) throw authErr;
      if (!authData.user) throw new Error('Erro ao criar usuario');

      // Atualizar profile
      await supabase.from('profiles').update({
        nome, sobrenome, full_name: profNome, institution_id: institutionId,
        segmento: 'fundamental2', must_change_password: false,
      }).eq('id', authData.user.id);

      // Adicionar role professor
      await supabase.from('user_roles').insert({ user_id: authData.user.id, role: 'professor' });

      // Se casa selecionada, definir como mentor
      if (profCasa) {
        await supabase.from('professor_casa').insert({
          professor_id: authData.user.id, casa_id: profCasa, institution_id: institutionId,
          ano_letivo: new Date().getFullYear(), eh_mentor_principal: true, ativo: true,
        });
      }

      toast.success('Professor criado!');
      setShowAddProfessor(false);
      setProfEmail(''); setProfSenha(''); setProfNome(''); setProfCasa(null);
      queryClient.invalidateQueries({ queryKey: ['admin-pessoas-professores'] });
      queryClient.invalidateQueries({ queryKey: ['admin-mentores'] });
    } catch (err: any) { toast.error(err.message || 'Erro'); }
    finally { setSalvando(false); }
  };

  // Criar aluno manualmente (via edge function que gera email/senha + vincula turma)
  const criarAluno = async () => {
    if (!institutionId || !alunoNome.trim() || !alunoSobrenome.trim() || !alunoSerie || !alunoTurmaLetra) {
      toast.error('Preencha nome, sobrenome, série e turma');
      return;
    }
    setCriandoAluno(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-aluno-manual', {
        body: {
          nome: alunoNome.trim(),
          sobrenome: alunoSobrenome.trim(),
          serie: alunoSerie,
          turma_letra: alunoTurmaLetra,
          casa_id: alunoCasa,
          institution_id: institutionId,
          segmento: 'fundamental2',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResultadoAluno({
        email: data.email,
        senha: data.senha,
        full_name: data.full_name,
        turma: data.turma,
      });
      setShowAddAluno(false);
      setAlunoNome(''); setAlunoSobrenome('');
      setAlunoSerie(''); setAlunoTurmaLetra(''); setAlunoCasa(null);
      queryClient.invalidateQueries({ queryKey: ['admin-pessoas-alunos'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar aluno');
    } finally {
      setCriandoAluno(false);
    }
  };

  const copiarTexto = async (texto: string, chave: 'email' | 'senha' | 'tudo') => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(chave);
      setTimeout(() => setCopiado(null), 1500);
    } catch {
      toast.error('Falha ao copiar');
    }
  };

  const getNomeAbreviado = (a: any) => {
    const nome = a.nome || a.full_name?.split(' ')[0] || '?';
    const partes = (a.full_name || '').split(' ');
    const seg = partes.length > 1 ? partes[1]?.[0] + '.' : '';
    return `${nome} ${seg}`.trim();
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-semibold text-white">Pessoas</h1>
        <p className="text-xs text-white/30 mt-0.5">{alunos.length} alunos · {professores.length} professores</p>
      </div>

      {/* Segmento selector */}
      <div className="flex gap-2">
        {[
          { id: 'fundamental2' as const, label: 'Fundamental 2' },
          { id: 'fundamental1' as const, label: 'Fundamental 1' },
          { id: 'infantil' as const, label: 'Infantil' },
        ].map(s => (
          <button key={s.id} onClick={() => setSegmento(s.id)}
            className={cn('flex-1 py-2 rounded-lg text-[10px] font-medium transition-colors',
              segmento === s.id ? 'bg-blue-600 text-white' : 'bg-white/[0.06] text-white/40 hover:bg-white/[0.1]'
            )}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('alunos')}
          className={cn('flex-1 py-2 rounded-lg text-xs font-medium transition-colors',
            tab === 'alunos' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/[0.06] text-white/40'
          )}>
          <Users className="w-3.5 h-3.5 inline mr-1.5" />Alunos ({alunos.length})
        </button>
        <button onClick={() => setTab('professores')}
          className={cn('flex-1 py-2 rounded-lg text-xs font-medium transition-colors',
            tab === 'professores' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-white/[0.06] text-white/40'
          )}>
          <Shield className="w-3.5 h-3.5 inline mr-1.5" />Professores ({professores.length})
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)}
          className="pl-10 bg-white/[0.04] border-violet-500/10 text-white placeholder:text-white/30 h-9 text-sm" />
        {busca && <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"><X className="w-4 h-4" /></button>}
      </div>

      {/* Filtro por cargo (só na tab alunos) */}
      {tab === 'alunos' && (
        <div className="flex gap-2">
          {([
            { id: 'todos' as const, label: 'Todos', count: alunos.length },
            { id: 'lider' as const, label: 'Lideres', count: cargosAtivos.filter(c => c.cargo === 'lider').length },
            { id: 'coordenador' as const, label: 'Coordenadores', count: cargosAtivos.filter(c => c.cargo === 'coordenador').length },
          ]).map(f => (
            <button key={f.id} onClick={() => setFiltroCargo(f.id)}
              className={cn('px-3 py-1.5 rounded-full text-[10px] font-medium transition-colors border',
                filtroCargo === f.id
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'border-white/5 text-white/30 hover:bg-white/5'
              )}>
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      )}

      {/* TAB: ALUNOS */}
      {tab === 'alunos' && (
        <div className="space-y-3">
          {/* Acoes */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={sincronizarAlunos} disabled={sincronizando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/25 hover:bg-blue-500/25 transition-colors disabled:opacity-50">
              <RefreshCw className={cn("w-3 h-3", sincronizando && "animate-spin")} />
              {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
            </button>
            <button onClick={() => setShowAddAluno(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors">
              <UserPlus className="w-3 h-3" />
              Cadastrar aluno
            </button>
          </div>

          {/* Grid por casa */}
          {loadingAlunos ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}</div>
          ) : (
            <>
              {casas.map(casa => {
                const alunosDaCasa = alunosPorCasa[casa.id] || [];
                if (alunosDaCasa.length === 0 && busca) return null;
                const isOpen = casaExpandida === casa.id;

                return (
                  <div key={casa.id} className="rounded-xl bg-[#252547] border border-violet-500/10 overflow-hidden">
                    <button onClick={() => setCasaExpandida(isOpen ? null : casa.id)}
                      className="w-full p-3 text-left hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: casa.cor_hex }} />
                          <span className="text-sm font-medium text-white">{casa.nome}</span>
                          <span className="text-xs text-white/30">{alunosDaCasa.length}</span>
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                      </div>
                    </button>

                    {!isOpen && alunosDaCasa.length > 0 && (
                      <div className="px-3 pb-2.5 flex gap-1">
                        {alunosDaCasa.slice(0, 10).map(a => (
                          <div key={a.id} className="w-7 h-7 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: casa.cor_hex }}>
                            {a.avatar_url ? <img src={a.avatar_url} alt="" className="w-full h-full object-cover" /> :
                            <span className="flex items-center justify-center w-full h-full text-[9px] text-white/50" style={{ backgroundColor: `${casa.cor_hex}20` }}>
                              {(a.nome || '?').charAt(0).toUpperCase()}</span>}
                          </div>
                        ))}
                        {alunosDaCasa.length > 10 && <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center"><span className="text-[8px] text-white/40">+{alunosDaCasa.length - 10}</span></div>}
                      </div>
                    )}

                    {isOpen && (
                      <div className="px-2 pb-2">
                        <div className="grid grid-cols-4 gap-1">
                          {alunosDaCasa.map(a => (
                            <button key={a.id} onClick={() => navigate(`/admin/pessoas/aluno/${a.id}`)}
                              className="flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-white/[0.06] active:scale-95">
                              <div className="w-10 h-10 rounded-full overflow-hidden border-2" style={{ borderColor: casa.cor_hex }}>
                                {a.avatar_url ? <img src={a.avatar_url} alt="" className="w-full h-full object-cover" /> :
                                <span className="flex items-center justify-center w-full h-full text-xs text-white/50" style={{ backgroundColor: `${casa.cor_hex}20` }}>
                                  {(a.nome || '?').charAt(0).toUpperCase()}</span>}
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
              })}

              {alunosSemCasa.length > 0 && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                  <p className="text-xs text-amber-400 mb-1">{alunosSemCasa.length} alunos sem casa alocada</p>
                  <p className="text-[10px] text-amber-400/50">Sincronize ou aloque manualmente</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: PROFESSORES */}
      {tab === 'professores' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowAddProfessor(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-violet-500/15 text-violet-300 border border-violet-500/25 hover:bg-violet-500/25 transition-colors">
              <Plus className="w-3 h-3" /> Novo professor
            </button>
            <button onClick={() => navigate('/admin/logins-professores')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/25 hover:bg-blue-500/25 transition-colors">
              <KeyRound className="w-3 h-3" /> Logins de professores
            </button>
          </div>

          {loadingProfs ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}</div>
          ) : professores.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#252547] border border-violet-500/10 text-center">
              <p className="text-white/30 text-sm">Nenhum professor cadastrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {professores.filter(p => !busca || (p.full_name || p.nome || '').toLowerCase().includes(busca.toLowerCase())).map(prof => {
                const mentorDe = mentores.filter(m => m.professor_id === prof.id);
                return (
                  <div key={prof.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-[#252547] border border-violet-500/10">
                    <div className="w-10 h-10 rounded-full bg-violet-500/20 overflow-hidden shrink-0">
                      {prof.avatar_url ? <img src={prof.avatar_url} alt="" className="w-full h-full object-cover" /> :
                      <span className="flex items-center justify-center w-full h-full text-sm text-violet-300">
                        {(prof.nome || '?').charAt(0).toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{prof.full_name || prof.nome}</p>
                      {mentorDe.length > 0 ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-white/30">Mentor:</span>
                          {mentorDe.map(m => {
                            const c = casas.find(c => c.id === m.casa_id);
                            return c ? (
                              <span key={m.casa_id} className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor_hex }} />
                                <span className="text-[10px] text-white/40">{c.nome}</span>
                              </span>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] text-amber-400/60 mt-0.5">Sem casa atribuida</p>
                      )}
                    </div>
                    <button onClick={() => navigate(`/admin/pessoas/professor/${prof.id}`)}
                      className="p-1 text-white/20 hover:text-white/50"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Novo Professor */}
      {showAddProfessor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1E1E3A] border border-violet-500/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-white font-medium">Novo Professor</p>
              <button onClick={() => setShowAddProfessor(false)} className="p-1 text-white/30 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-white/30 block mb-1">Nome completo</label>
                <input value={profNome} onChange={e => setProfNome(e.target.value)} placeholder="Maria da Silva"
                  className="w-full bg-white/[0.06] border border-violet-500/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-white/30 block mb-1">Email</label>
                <input value={profEmail} onChange={e => setProfEmail(e.target.value)} placeholder="professor@arboria.com"
                  className="w-full bg-white/[0.06] border border-violet-500/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-white/30 block mb-1">Senha</label>
                <input value={profSenha} onChange={e => setProfSenha(e.target.value)} placeholder="senha123"
                  className="w-full bg-white/[0.06] border border-violet-500/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-white/30 block mb-1">Mentor da casa (opcional)</label>
                <select value={profCasa || ''} onChange={e => setProfCasa(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-white/[0.06] border border-violet-500/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                  <option value="">Nenhuma</option>
                  {casas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>

            <button onClick={criarProfessor} disabled={!profNome || !profEmail || !profSenha || salvando}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-40">
              {salvando ? 'Criando...' : 'Criar professor'}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Novo Aluno */}
      {showAddAluno && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1E1E3A] border border-emerald-500/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Novo Aluno</p>
                <p className="text-[10px] text-white/40 mt-0.5">Email e senha são gerados automaticamente</p>
              </div>
              <button onClick={() => setShowAddAluno(false)} className="p-1 text-white/30 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-white/30 block mb-1">Nome</label>
                  <input value={alunoNome} onChange={e => setAlunoNome(e.target.value)} placeholder="Maria"
                    className="w-full bg-white/[0.06] border border-emerald-500/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-white/30 block mb-1">Sobrenome</label>
                  <input value={alunoSobrenome} onChange={e => setAlunoSobrenome(e.target.value)} placeholder="Silva"
                    className="w-full bg-white/[0.06] border border-emerald-500/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-white/30 block mb-1">Série</label>
                  <select value={alunoSerie} onChange={e => { setAlunoSerie(e.target.value); setAlunoTurmaLetra(''); }}
                    className="w-full bg-white/[0.06] border border-emerald-500/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                    <option value="">Selecione</option>
                    {seriesUnicas.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-white/30 block mb-1">Turma</label>
                  <select value={alunoTurmaLetra} onChange={e => setAlunoTurmaLetra(e.target.value)}
                    disabled={!alunoSerie}
                    className="w-full bg-white/[0.06] border border-emerald-500/10 rounded-lg px-3 py-2 text-sm text-white outline-none disabled:opacity-40">
                    <option value="">Selecione</option>
                    {(letrasPorSerie[alunoSerie] || []).map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-white/30 block mb-1">Casa (opcional)</label>
                <select value={alunoCasa || ''} onChange={e => setAlunoCasa(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-white/[0.06] border border-emerald-500/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                  <option value="">Nenhuma</option>
                  {casas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>

            <button onClick={criarAluno}
              disabled={!alunoNome || !alunoSobrenome || !alunoSerie || !alunoTurmaLetra || criandoAluno}
              className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors disabled:opacity-40">
              {criandoAluno ? 'Criando...' : 'Criar aluno'}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Resultado do cadastro (email + senha) */}
      {resultadoAluno && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1E1E3A] border border-emerald-500/20 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Aluno criado ✓</p>
                <p className="text-[10px] text-white/50 mt-0.5">{resultadoAluno.full_name} · {resultadoAluno.turma}</p>
              </div>
              <button onClick={() => setResultadoAluno(null)} className="p-1 text-white/30 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-2">
              <div className="rounded-lg bg-white/[0.04] border border-emerald-500/10 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-white/40">Email</p>
                    <p className="text-sm text-white font-mono truncate">{resultadoAluno.email}</p>
                  </div>
                  <button onClick={() => copiarTexto(resultadoAluno.email, 'email')}
                    className="p-1.5 text-white/40 hover:text-white">
                    {copiado === 'email' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="rounded-lg bg-white/[0.04] border border-emerald-500/10 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-white/40">Senha</p>
                    <p className="text-sm text-white font-mono truncate">{resultadoAluno.senha}</p>
                  </div>
                  <button onClick={() => copiarTexto(resultadoAluno.senha, 'senha')}
                    className="p-1.5 text-white/40 hover:text-white">
                    {copiado === 'senha' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button onClick={() => copiarTexto(`Email: ${resultadoAluno.email}\nSenha: ${resultadoAluno.senha}`, 'tudo')}
              className="w-full py-2 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-xs font-medium hover:bg-emerald-500/25 transition-colors">
              {copiado === 'tudo' ? '✓ Copiado!' : 'Copiar email e senha'}
            </button>

            <p className="text-[10px] text-white/30 text-center">
              Anote ou envie pro aluno, depois ele troca a senha no primeiro acesso.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PessoasPage;
