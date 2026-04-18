import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, Key, Trash2, Trophy, Target, TreePine } from 'lucide-react';
import ArvoreTalentosView from '@/components/aluno/ArvoreTalentosView';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PerfilAlunoAdminPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [serie, setSerie] = useState('');
  const [turma, setTurma] = useState('');
  const [casaId, setCasaId] = useState<number | null>(null);
  const [cargo, setCargo] = useState('membro');
  const [hasChanges, setHasChanges] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const { data: aluno, isLoading } = useQuery({
    queryKey: ['admin-aluno-perfil', id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: casas = [] } = useQuery({
    queryKey: ['admin-casas'],
    queryFn: async () => {
      const { data } = await supabase.from('inteligencias').select('id, nome, cor_hex').order('id');
      return data || [];
    },
  });

  const [mostrarArvore, setMostrarArvore] = useState(false);

  // Dados da Árvore de Talentos
  const { data: dadosArvore } = useQuery({
    queryKey: ['admin-arvore-talentos', id],
    queryFn: async () => {
      if (!id) return {};
      const { data } = await supabase
        .from('arvore_talentos')
        .select('habilidade_id, inteligencia_id, tipo_ponto, habilidade:habilidades!arvore_talentos_habilidade_id_fkey(codigo)')
        .eq('aluno_id', id);

      if (!data) return {};

      // Buscar mapeamento inteligencia_id -> codigo
      const { data: intels } = await supabase.from('inteligencias').select('id, codigo');
      const intelMap: Record<number, string> = {};
      (intels || []).forEach((i: any) => { intelMap[i.id] = i.codigo; });

      // Agrupar por inteligência: { interpessoal: { S01: 'desenvolvimento', ... } }
      const resultado: Record<string, Record<string, string>> = {};
      (data || []).forEach((d: any) => {
        const intCodigo = intelMap[d.inteligencia_id];
        if (!intCodigo) return;
        const habCodigo = (d.habilidade as any)?.codigo;
        if (!habCodigo) return;
        if (!resultado[intCodigo]) resultado[intCodigo] = {};
        // Manter o estado mais alto (consolidacao > desenvolvimento > contato > exposicao)
        const prioridade: Record<string, number> = { exposicao: 1, contato: 2, desenvolvimento: 3, consolidacao: 4 };
        const atual = resultado[intCodigo][habCodigo];
        if (!atual || (prioridade[d.tipo_ponto] || 0) > (prioridade[atual] || 0)) {
          resultado[intCodigo][habCodigo] = d.tipo_ponto;
        }
      });
      return resultado;
    },
    enabled: !!id && mostrarArvore,
  });

  const { data: cargoAtual } = useQuery({
    queryKey: ['admin-aluno-cargo', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from('cargos_casa').select('cargo')
        .eq('aluno_id', id).eq('ativo', true).eq('ano_letivo', new Date().getFullYear()).maybeSingle();
      return data?.cargo || 'membro';
    },
    enabled: !!id,
  });

  const { data: ranking } = useQuery({
    queryKey: ['admin-aluno-ranking', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from('ranking_alunos_por_casa')
        .select('total_pontos, posicao_na_casa, missoes_completadas').eq('aluno_id', id).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (aluno) {
      setNome(aluno.nome || '');
      setSobrenome(aluno.sobrenome || '');
      setSerie(aluno.serie || '');
      setTurma(aluno.turma || '');
      setCasaId(aluno.casa_id);
    }
  }, [aluno]);

  useEffect(() => { if (cargoAtual) setCargo(cargoAtual); }, [cargoAtual]);

  const salvar = async () => {
    if (!id || !aluno) return;
    setSalvando(true);
    try {
      const fullName = `${nome} ${sobrenome}`.trim();
      await supabase.from('profiles').update({
        nome, sobrenome, full_name: fullName, serie, turma, casa_id: casaId,
      }).eq('id', id);

      // Atualizar cargo
      if (cargo !== cargoAtual && casaId) {
        await supabase.from('cargos_casa').delete()
          .eq('aluno_id', id).eq('ano_letivo', new Date().getFullYear());
        if (cargo !== 'membro') {
          await supabase.from('cargos_casa').insert({
            institution_id: aluno.institution_id, casa_id: casaId, aluno_id: id,
            cargo, ano_letivo: new Date().getFullYear(), ativo: true,
          });
        }
      }

      toast.success('Dados salvos!');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['admin-aluno-perfil'] });
      queryClient.invalidateQueries({ queryKey: ['admin-aluno-cargo'] });
    } catch (err: any) { toast.error(err.message || 'Erro'); }
    finally { setSalvando(false); }
  };

  const resetarSenha = async () => {
    if (!id) return;
    try {
      const { error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId: id, newPassword: `${nome.toLowerCase()}123` }
      });
      if (error) throw error;
      toast.success(`Senha resetada para: ${nome.toLowerCase()}123`);
    } catch { toast.error('Erro ao resetar senha'); }
  };

  const casaInfo = casas.find(c => c.id === casaId);
  const cor = casaInfo?.cor_hex || '#444';

  if (isLoading) return <div className="p-4 space-y-4"><div className="h-10 bg-white/5 rounded-xl animate-pulse" /><div className="h-48 bg-white/5 rounded-xl animate-pulse" /></div>;
  if (!aluno) return <div className="p-4"><button onClick={() => navigate(-1)} className="p-2 text-white/50"><ArrowLeft className="w-5 h-5" /></button><p className="text-white/40 text-center mt-12">Aluno nao encontrado</p></div>;

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-white">Editar Aluno</h1>
        {hasChanges && (
          <button onClick={salvar} disabled={salvando}
            className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50">
            <Save className="w-3 h-3" />{salvando ? 'Salvando...' : 'Salvar'}
          </button>
        )}
      </div>

      {/* Card do aluno */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-[#252547] border border-violet-500/10">
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: cor }}>
          {aluno.avatar_url ? <img src={aluno.avatar_url} alt="" className="w-full h-full object-cover" /> :
          <span className="flex items-center justify-center w-full h-full text-xl text-white/40" style={{ backgroundColor: `${cor}20` }}>
            {(nome || '?').charAt(0).toUpperCase()}</span>}
        </div>
        <div>
          <p className="text-lg font-bold text-white">{nome} {sobrenome}</p>
          <p className="text-sm" style={{ color: cor }}>{casaInfo?.nome || 'Sem casa'}</p>
          <p className="text-xs text-white/40">{serie} - Turma {turma}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl text-center bg-[#252547] border border-violet-500/10">
          <div className="flex items-center justify-center gap-1"><Trophy className="w-3 h-3 text-yellow-500" /><span className="text-lg font-bold text-white">{ranking?.total_pontos || 0}</span></div>
          <p className="text-[10px] text-white/40">Pontos</p>
        </div>
        <div className="p-3 rounded-xl text-center bg-[#252547] border border-violet-500/10">
          <span className="text-lg font-bold text-white">{ranking?.posicao_na_casa || '--'}</span><span className="text-white/40 text-xs">º</span>
          <p className="text-[10px] text-white/40">Na casa</p>
        </div>
        <div className="p-3 rounded-xl text-center bg-[#252547] border border-violet-500/10">
          <div className="flex items-center justify-center gap-1"><Target className="w-3 h-3 text-blue-400" /><span className="text-lg font-bold text-white">{ranking?.missoes_completadas || 0}</span></div>
          <p className="text-[10px] text-white/40">Missoes</p>
        </div>
      </div>

      {/* Formulario */}
      <div className="space-y-4">
        <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-1">Dados do aluno</p>

        <div className="rounded-xl bg-[#252547] border border-violet-500/10 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/30 block mb-1">Nome</label>
              <input value={nome} onChange={e => { setNome(e.target.value); setHasChanges(true); }}
                className="w-full bg-white/[0.06] border border-violet-500/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20" />
            </div>
            <div>
              <label className="text-[10px] text-white/30 block mb-1">Sobrenome</label>
              <input value={sobrenome} onChange={e => { setSobrenome(e.target.value); setHasChanges(true); }}
                className="w-full bg-white/[0.06] border border-violet-500/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/30 block mb-1">Serie</label>
              <select value={serie} onChange={e => { setSerie(e.target.value); setHasChanges(true); }}
                className="w-full bg-white/[0.06] border border-violet-500/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                <option value="">-</option>
                {['6º Ano', '7º Ano', '8º Ano', '9º Ano'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-white/30 block mb-1">Turma</label>
              <select value={turma} onChange={e => { setTurma(e.target.value); setHasChanges(true); }}
                className="w-full bg-white/[0.06] border border-violet-500/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                <option value="">-</option>
                {['A', 'B', 'C', 'D'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-white/30 block mb-1">Casa</label>
            <div className="grid grid-cols-4 gap-1.5">
              {casas.map(c => (
                <button key={c.id} onClick={() => { setCasaId(c.id); setHasChanges(true); }}
                  className={cn('py-2 px-1 rounded-lg text-center transition-colors border',
                    casaId === c.id ? 'border-white/30 bg-white/[0.1]' : 'border-transparent bg-white/[0.04] hover:bg-white/[0.08]'
                  )}>
                  <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: c.cor_hex }} />
                  <span className="text-[9px] text-white/60 leading-tight block">{c.nome.split('-')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-white/30 block mb-1">Cargo</label>
            <div className="flex gap-2">
              {['membro', 'coordenador', 'lider'].map(c => (
                <button key={c} onClick={() => { setCargo(c); setHasChanges(true); }}
                  className={cn('flex-1 py-2 rounded-lg text-[10px] font-medium transition-colors border',
                    cargo === c ? 'border-amber-500/30 bg-amber-500/15 text-amber-300' : 'border-transparent bg-white/[0.04] text-white/40'
                  )}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Acoes */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-1">Acoes</p>

        <button onClick={resetarSenha}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-[#252547] border border-violet-500/10 hover:bg-white/[0.06] transition-colors">
          <Key className="w-4 h-4 text-amber-400" />
          <div className="text-left">
            <p className="text-sm text-white/70">Resetar senha</p>
            <p className="text-[10px] text-white/30">Nova senha: {nome.toLowerCase() || 'nome'}123</p>
          </div>
        </button>

        {/* Árvore de Talentos */}
        <button onClick={() => setMostrarArvore(!mostrarArvore)}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors">
          <TreePine className="w-4 h-4 text-emerald-400" />
          <div className="text-left">
            <p className="text-sm text-white/70">Árvore de Talentos</p>
            <p className="text-[10px] text-white/30">{mostrarArvore ? 'Toque para fechar' : 'Visualizar a árvore do aluno'}</p>
          </div>
        </button>

        {mostrarArvore && (
          <div className="rounded-xl overflow-hidden border border-emerald-500/20" style={{ height: 500 }}>
            <ArvoreTalentosView
              alunoNome={`${nome} ${sobrenome}`.trim() || 'Aluno'}
              alunoInfo={`${serie} ${turma} · Arboria`}
              dadosPorInteligencia={dadosArvore || {}}
            />
          </div>
        )}

        <button onClick={() => { if (confirm('Tem certeza?')) { /* TODO: delete user */ toast.info('Funcionalidade em desenvolvimento'); }}}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-red-500/20 hover:bg-red-500/10 transition-colors">
          <Trash2 className="w-4 h-4 text-red-400" />
          <p className="text-sm text-red-400/70">Remover aluno</p>
        </button>
      </div>
    </div>
  );
};

export default PerfilAlunoAdminPage;
