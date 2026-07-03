import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Check, X, Upload, FileText, Trash2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import MissoesPorCasa from '@/components/admin/MissoesPorCasa';

const mecanismos: Record<string, string> = {
  linguistica: 'A experiencia chega narrada. O linguistico pensa em palavras antes de agir, enquanto age e depois de agir: o processamento verbal e anterior e simultaneo ao comportamento.',
  logico_matematica: 'O mundo chega como sistema esperando ser decifrado. O logico-matematico percebe relacoes, padroes e inconsistencias automaticamente, antes de decidir procura-las.',
  espacial: 'A realidade chega como imagem. O espacial ve antes de pensar: a solucao existe como representacao visual antes de poder ser descrita em palavras.',
  musical: 'O mundo chega com textura sonora. O musical percebe padroes nos sons: ritmo, melodia, estrutura; de forma automatica, antes de qualquer analise consciente.',
  corporal_cinestesica: 'O corpo pensa junto com a mente. O corporal-cinestesico nao planeja e depois move: ele move para descobrir. O gesto precede e produz a compreensao.',
  naturalista: 'O mundo chega em categorias. O naturalista percebe distincoes, agrupa, classifica e nomeia espontaneamente: qualquer conjunto de coisas convoca o mecanismo de organizacao.',
  interpessoal: 'O mundo chega atraves das pessoas. O interpessoal le estados internos, intencoes e dinamicas de grupo automaticamente, antes de qualquer decisao consciente de observar.',
  intrapessoal: 'O mundo chega filtrado pelo estado interno. O intrapessoal acessa com precisao o que sente e por que sente, e usa esse autoconhecimento para orientar o comportamento.',
};

const dimLabels: Record<string, string> = {
  cognitiva: 'Cognitiva', autorregulatoria: 'Autorregulatoria', social: 'Social', emocional: 'Emocional',
};

const FaseDetalhesPage = () => {
  const { id: faseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [calibracaoEstado, setCalibracaoEstado] = useState<string | null>(null);
  const [semanaEditando, setSemanaEditando] = useState<number | null>(null);
  const [editandoDatas, setEditandoDatas] = useState(false);
  const [novaDataInicio, setNovaDataInicio] = useState('');
  const [novaDataFim, setNovaDataFim] = useState('');
  const [semanaDatas, setSemanaDatas] = useState<Record<number, { inicio: string; fim: string }>>({});
  const [salvandoDatas, setSalvandoDatas] = useState(false);
  const [habSelecionadas, setHabSelecionadas] = useState<Set<number>>(new Set());
  const [salvandoHab, setSalvandoHab] = useState(false);
  const [filtroHab, setFiltroHab] = useState<'mecanismo' | 'todas'>('mecanismo');

  const { data: institutionId } = useQuery({
    queryKey: ['admin-institution', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('institution_id').eq('id', user!.id).single();
      return data?.institution_id;
    },
    enabled: !!user?.id,
  });

  const { data: fase, isLoading } = useQuery({
    queryKey: ['admin-fase-detalhe', faseId],
    queryFn: async () => {
      const { data } = await supabase.from('fases')
        .select('*, inteligencia:inteligencias!inteligencia_id(id, nome, cor_hex, codigo, descricao)')
        .eq('id', faseId).single();
      return data;
    },
    enabled: !!faseId,
  });

  const { data: mapaAtivacao = { nucleo: [], suporte: [] } } = useQuery({
    queryKey: ['admin-mapa-ativacao', fase?.inteligencia_id],
    queryFn: async () => {
      if (!fase?.inteligencia_id) return { nucleo: [], suporte: [] };
      const { data } = await supabase.from('habilidade_inteligencia')
        .select('tipo, habilidade:habilidades!habilidade_inteligencia_habilidade_id_fkey(id, codigo, nome, dimensao)')
        .eq('inteligencia_id', fase.inteligencia_id);
      return {
        nucleo: (data || []).filter(d => d.tipo === 'nucleo').map(d => d.habilidade as any),
        suporte: (data || []).filter(d => d.tipo === 'suporte').map(d => d.habilidade as any),
      };
    },
    enabled: !!fase?.inteligencia_id,
  });

  const { data: habPorSemana = {} } = useQuery({
    queryKey: ['admin-hab-semana', faseId, institutionId],
    queryFn: async () => {
      if (!faseId || !institutionId) return {};
      const { data } = await supabase.from('atividade_habilidades')
        .select('semana, habilidade:habilidades!atividade_habilidades_habilidade_id_fkey(id, codigo, nome, dimensao)')
        .eq('fase_id', faseId).eq('institution_id', institutionId);
      const map: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [] };
      (data || []).forEach(d => { if (map[d.semana]) map[d.semana].push(d.habilidade); });
      return map;
    },
    enabled: !!faseId && !!institutionId,
  });

  const { data: todasHabilidades = [] } = useQuery({
    queryKey: ['admin-todas-habilidades'],
    queryFn: async () => {
      const { data } = await supabase.from('habilidades').select('id, codigo, nome, dimensao').order('ordem');
      return data || [];
    },
  });

  // Conteudos (PDFs) por semana
  const { data: conteudosPorSemana = {} } = useQuery({
    queryKey: ['admin-conteudos-semana', faseId, institutionId],
    queryFn: async () => {
      if (!faseId || !institutionId) return {};
      const { data } = await supabase.from('fase_conteudos')
        .select('id, semana, titulo, arquivo_nome, arquivo_url')
        .eq('fase_id', faseId).eq('institution_id', institutionId);
      const map: Record<number, any> = {};
      (data || []).forEach(c => { map[c.semana] = c; });
      return map;
    },
    enabled: !!faseId && !!institutionId,
  });

  const [uploadingSemana, setUploadingSemana] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const missaoInputRef = useRef<HTMLInputElement>(null);
  const [semanaParaUpload, setSemanaParaUpload] = useState<number | null>(null);
  const [missaoUploadInfo, setMissaoUploadInfo] = useState<{ semana: number; tipo: string; casaId: number | null } | null>(null);
  const [semanaExpandida, setSemanaExpandida] = useState<number | null>(null);
  const [semanaMissoesCasa, setSemanaMissoesCasa] = useState<number | null>(null);
  const [serieMissoesCasa, setSerieMissoesCasa] = useState<number>(6);

  const handleUploadPdf = async (file: File, semana: number) => {
    if (!faseId || !institutionId) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('PDF deve ter no maximo 10MB'); return; }
    setUploadingSemana(semana);
    try {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `fases/${faseId}/semana${semana}_${timestamp}_${safeName}`;

      const session = (await supabase.auth.getSession()).data.session;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/fase-conteudos/${filePath}`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': file.type, 'x-upsert': 'true' }, body: file }
      );
      if (!response.ok) throw new Error('Falha no upload');

      const { data: publicUrl } = supabase.storage.from('fase-conteudos').getPublicUrl(filePath);

      // Upsert conteudo
      const existente = conteudosPorSemana[semana];
      if (existente) {
        await supabase.from('fase_conteudos').update({
          arquivo_nome: file.name, arquivo_url: publicUrl.publicUrl, arquivo_tamanho: file.size,
        }).eq('id', existente.id);
      } else {
        await supabase.from('fase_conteudos').insert({
          institution_id: institutionId, fase_id: faseId, semana,
          titulo: `Conteudo Semana ${semana}`, arquivo_nome: file.name,
          arquivo_url: publicUrl.publicUrl, arquivo_tamanho: file.size,
        });
      }
      toast.success(`PDF da Semana ${semana} enviado!`);
      queryClient.invalidateQueries({ queryKey: ['admin-conteudos-semana'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar PDF');
    } finally {
      setUploadingSemana(null);
    }
  };

  // Casas (para missoes individuais)
  const { data: casas = [] } = useQuery({
    queryKey: ['admin-casas-lista'],
    queryFn: async () => {
      const { data } = await supabase.from('inteligencias').select('id, nome, cor_hex, codigo').order('id');
      return data || [];
    },
  });

  // Missoes pre-configuradas por semana
  const { data: missoesPorSemana = {} } = useQuery({
    queryKey: ['admin-missoes-fase', faseId, institutionId],
    queryFn: async () => {
      if (!faseId || !institutionId) return {};
      const { data } = await supabase.from('missoes')
        .select('id, semana, tipo_missao, casa_id, titulo, arquivo_pdf_nome, arquivo_pdf_url, status, origem, criado_por, pontos_base')
        .eq('fase_id', faseId).eq('institution_id', institutionId);
      const map: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [] };
      (data || []).forEach(m => { if (map[m.semana]) map[m.semana].push(m); });
      return map;
    },
    enabled: !!faseId && !!institutionId,
  });

  // Confirmacoes de aula
  const { data: confirmacoes = {} } = useQuery({
    queryKey: ['admin-confirmacoes', faseId],
    queryFn: async () => {
      if (!faseId) return {};
      const { data } = await supabase.from('aula_confirmacao')
        .select('semana, confirmada, aula_nao_ocorreu, motivo_ausencia, professor:profiles!aula_confirmacao_professor_id_fkey(full_name)')
        .eq('fase_id', faseId);
      const map: Record<number, any[]> = {};
      (data || []).forEach(c => { if (!map[c.semana]) map[c.semana] = []; map[c.semana].push(c); });
      return map;
    },
    enabled: !!faseId,
  });

  const handleUploadMissao = async (file: File) => {
    if (!faseId || !institutionId || !missaoUploadInfo) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('PDF max 10MB'); return; }
    const { semana, tipo, casaId } = missaoUploadInfo;
    try {
      const ts = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `missoes/admin/${faseId}/s${semana}_${tipo}_${ts}_${safeName}`;
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/fase-conteudos/${filePath}`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': file.type, 'x-upsert': 'true' }, body: file });
      if (!res.ok) throw new Error('Upload falhou');
      const { data: pubUrl } = supabase.storage.from('fase-conteudos').getPublicUrl(filePath);

      await supabase.from('missoes').insert({
        institution_id: institutionId, fase_id: faseId, semana,
        tipo_missao: tipo, casa_id: casaId,
        titulo: `Missao S${semana} ${tipo === 'geral' ? 'Geral' : casas.find(c => c.id === casaId)?.nome || ''}`,
        arquivo_pdf_url: pubUrl.publicUrl, arquivo_pdf_nome: file.name,
        status: 'pre_configurada', origem: 'admin',
        pontos_base: 100, requer_texto: true, requer_arquivo: false,
        criado_por: user!.id,
      });
      toast.success('Missao adicionada!');
      queryClient.invalidateQueries({ queryKey: ['admin-missoes-fase'] });
    } catch (err: any) { toast.error(err.message || 'Erro'); }
    setMissaoUploadInfo(null);
  };

  const removerMissao = async (missaoId: string) => {
    await supabase.from('missoes').delete().eq('id', missaoId);
    toast.success('Missao removida');
    queryClient.invalidateQueries({ queryKey: ['admin-missoes-fase'] });
  };

  const removerPdf = async (semana: number) => {
    const conteudo = conteudosPorSemana[semana];
    if (!conteudo) return;
    await supabase.from('fase_conteudos').delete().eq('id', conteudo.id);
    toast.success('PDF removido');
    queryClient.invalidateQueries({ queryKey: ['admin-conteudos-semana'] });
  };

  const int = fase?.inteligencia as any;
  const mecanismo = mecanismos[int?.codigo || ''] || '';

  const formatDate = (d: string) => {
    if (!d) return '-';
    return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatus = () => {
    if (!fase) return 'futura';
    const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
    if (fase.ativo && new Date(fase.data_inicio + 'T12:00:00') <= hoje && new Date(fase.data_fim + 'T12:00:00') >= hoje) return 'ativa';
    if (hoje > new Date(fase.data_fim + 'T12:00:00')) return 'concluida';
    return 'futura';
  };

  const habPorDimensao = (habs: any[]) => {
    const dims: Record<string, any[]> = { cognitiva: [], autorregulatoria: [], social: [], emocional: [] };
    habs.forEach(h => { if (dims[h.dimensao]) dims[h.dimensao].push(h); });
    return dims;
  };

  const abrirEditorSemana = (semana: number) => {
    setHabSelecionadas(new Set((habPorSemana[semana] || []).map((h: any) => h.id)));
    setFiltroHab('mecanismo');
    setSemanaEditando(semana);
  };

  const toggleHab = (id: number) => {
    setHabSelecionadas(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const salvarHab = async () => {
    if (!faseId || !institutionId || semanaEditando === null) return;
    setSalvandoHab(true);
    try {
      await supabase.from('atividade_habilidades').delete().eq('fase_id', faseId).eq('institution_id', institutionId).eq('semana', semanaEditando);
      if (habSelecionadas.size > 0) {
        const { error } = await supabase.from('atividade_habilidades').insert(
          Array.from(habSelecionadas).map(hId => ({ institution_id: institutionId, fase_id: faseId, semana: semanaEditando, habilidade_id: hId }))
        );
        if (error) throw error;
      }
      toast.success(`Semana ${semanaEditando} configurada!`);
      setSemanaEditando(null);
      queryClient.invalidateQueries({ queryKey: ['admin-hab-semana'] });
      queryClient.invalidateQueries({ queryKey: ['admin-hab-config'] });
    } catch (err: any) { toast.error(err.message || 'Erro'); } finally { setSalvandoHab(false); }
  };

  if (isLoading) return <div className="p-4 space-y-4"><div className="h-10 bg-white/5 rounded-xl animate-pulse" /><div className="h-48 bg-white/5 rounded-xl animate-pulse" /></div>;

  if (!fase) return <div className="p-4"><button onClick={() => navigate(-1)} className="p-2 text-white/50"><ArrowLeft className="w-5 h-5" /></button><p className="text-white/40 text-center mt-12">Fase nao encontrada</p></div>;

  // Se está editando missões por casa de uma semana específica
  if (semanaMissoesCasa && institutionId && faseId) {
    return (
      <div className="p-4 pb-24">
        {/* Seletor de série */}
        <div className="flex gap-2 mb-4">
          {[6, 7, 8, 9].map(s => (
            <button
              key={s}
              onClick={() => setSerieMissoesCasa(s)}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors',
                serieMissoesCasa === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/[0.06] text-white/40 hover:bg-white/[0.1]'
              )}
            >
              {s}° Ano
            </button>
          ))}
        </div>
        <MissoesPorCasa
          faseId={faseId}
          institutionId={institutionId}
          semana={semanaMissoesCasa}
          serie={serieMissoesCasa}
          dataInicio={fase.data_inicio}
          dataFim={fase.data_fim}
          inteligenciaId={(fase.inteligencia as any)?.id}
          onVoltar={() => setSemanaMissoesCasa(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/fases')} className="p-2 -ml-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-white">Fase {fase.numero_fase}: {int?.nome || '?'}</h1>
          <p className="text-xs text-white/30">{formatDate(fase.data_inicio)} a {formatDate(fase.data_fim)} · {getStatus()}</p>
        </div>
      </div>

      {/* Configuração de Datas por Semana */}
      {(() => {
        const inicio = new Date(fase.data_inicio + 'T12:00:00');
        const fim = new Date(fase.data_fim + 'T12:00:00');
        const totalDias = Math.floor((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const diasPorSemana = Math.ceil(totalDias / 4);
        const hoje = new Date(); hoje.setHours(12, 0, 0, 0);

        const getSemanaDefault = (s: number) => {
          const semInicio = new Date(inicio.getTime() + (s - 1) * diasPorSemana * 86400000);
          const semFim = s === 4 ? fim : new Date(inicio.getTime() + s * diasPorSemana * 86400000 - 86400000);
          return {
            inicio: semInicio.toISOString().split('T')[0],
            fim: semFim.toISOString().split('T')[0],
          };
        };

        return (
          <div className="rounded-xl bg-[#252547] border border-violet-500/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Datas da Fase</p>
              {!editandoDatas ? (
                <button onClick={() => {
                  const datas: Record<number, { inicio: string; fim: string }> = {};
                  [1, 2, 3, 4].forEach(s => { datas[s] = getSemanaDefault(s); });
                  setSemanaDatas(datas);
                  setEditandoDatas(true);
                }} className="text-[10px] text-violet-400 hover:text-violet-300">Editar semanas</button>
              ) : (
                <button onClick={() => setEditandoDatas(false)} className="text-[10px] text-white/30 hover:text-white/50">Cancelar</button>
              )}
            </div>

            {editandoDatas ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(s => (
                  <div key={s} className="p-2.5 rounded-lg bg-white/[0.03] border border-violet-500/10 space-y-1.5">
                    <p className="text-[10px] text-white/50 font-medium">Semana {s}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[8px] text-white/25 block mb-0.5">Início</label>
                        <input type="date" value={semanaDatas[s]?.inicio || ''}
                          onChange={e => setSemanaDatas(prev => ({ ...prev, [s]: { ...prev[s], inicio: e.target.value } }))}
                          className="w-full p-1.5 bg-white/5 border border-violet-500/10 rounded text-white text-[10px] focus:outline-none focus:border-white/20" />
                      </div>
                      <div>
                        <label className="text-[8px] text-white/25 block mb-0.5">Fim</label>
                        <input type="date" value={semanaDatas[s]?.fim || ''}
                          onChange={e => setSemanaDatas(prev => ({ ...prev, [s]: { ...prev[s], fim: e.target.value } }))}
                          className="w-full p-1.5 bg-white/5 border border-violet-500/10 rounded text-white text-[10px] focus:outline-none focus:border-white/20" />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={async () => {
                    if (!faseId) return;
                    setSalvandoDatas(true);
                    try {
                      // Atualizar data_inicio e data_fim da fase com base nas semanas
                      const novoInicio = semanaDatas[1]?.inicio;
                      const novoFim = semanaDatas[4]?.fim;
                      if (!novoInicio || !novoFim) throw new Error('Preencha todas as datas');

                      await supabase.from('fases').update({
                        data_inicio: novoInicio,
                        data_fim: novoFim,
                      }).eq('id', faseId);

                      // Atualizar prazo das missões por semana
                      for (let s = 1; s <= 4; s++) {
                        const semFim = semanaDatas[s]?.fim;
                        if (semFim) {
                          const novoPrazo = new Date(semFim + 'T23:59:59');
                          await supabase.from('missoes').update({
                            data_prazo: novoPrazo.toISOString(),
                          }).eq('fase_id', faseId).eq('semana', s).in('status', ['liberada', 'rascunho']);
                        }
                      }

                      toast.success('Datas das semanas e prazos atualizados!');
                      setEditandoDatas(false);
                      queryClient.invalidateQueries({ queryKey: ['admin-fase-detalhe'] });
                    } catch (err: any) {
                      toast.error('Erro: ' + (err.message || 'Erro'));
                    }
                    setSalvandoDatas(false);
                  }}
                  disabled={salvandoDatas}
                  className="w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  {salvandoDatas ? 'Salvando...' : 'Salvar datas das semanas'}
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {[1, 2, 3, 4].map(s => {
                  const sem = getSemanaDefault(s);
                  const semInicio = new Date(sem.inicio + 'T12:00:00');
                  const semFim = new Date(sem.fim + 'T12:00:00');
                  const ativa = hoje >= semInicio && hoje <= semFim;
                  const dias = Math.floor((semFim.getTime() - semInicio.getTime()) / 86400000) + 1;
                  return (
                    <div key={s} className={cn('flex items-center gap-2 text-[9px] py-1 px-1.5 rounded', ativa && 'bg-violet-500/10')}>
                      <span className={cn('w-16', ativa ? 'text-violet-400 font-bold' : 'text-white/50')}>Semana {s}:</span>
                      <span className={cn(ativa ? 'text-violet-300' : 'text-white/30')}>
                        {semInicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}; {semFim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </span>
                      <span className="text-[8px] text-white/15 ml-auto">{dias}d</span>
                      {ativa && <span className="text-[8px] text-violet-400">atual</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Mecanismo */}
      {mecanismo && (
        <div className="p-4 rounded-xl border" style={{ backgroundColor: `${int?.cor_hex || '#666'}10`, borderColor: `${int?.cor_hex || '#666'}25` }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: `${int?.cor_hex || '#666'}90` }}>O Mecanismo</p>
          <p className="text-sm text-white/70 leading-relaxed italic">"{mecanismo}"</p>
        </div>
      )}

      {/* Habilidades de Ativacao */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1 h-3.5 rounded-full bg-amber-500" />
          <p className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-widest">Habilidades de Ativacao</p>
        </div>
        <div className="rounded-xl bg-[#252547] border border-violet-500/10 p-4 space-y-3">
          <p className="text-[10px] text-white/30">Habilidades que ativam esta inteligencia. Foco prioritario.</p>
          {Object.entries(habPorDimensao(mapaAtivacao.nucleo)).map(([dim, habs]) => {
            if (habs.length === 0) return null;
            return (
              <div key={dim}>
                <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1">{dimLabels[dim]}</p>
                <div className="flex flex-wrap gap-1.5">
                  {habs.map((h: any) => (
                    <span key={h.id} className="px-2 py-1 rounded-md text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/20">
                      {h.codigo} {h.nome}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Suporte */}
      {mapaAtivacao.suporte.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-1 h-3.5 rounded-full bg-white/20" />
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Habilidades Suporte</p>
          </div>
          <div className="rounded-xl bg-[#252547] border border-violet-500/10 p-4">
            <p className="text-[10px] text-white/30 mb-2">Amplificam a inteligencia quando desenvolvidas.</p>
            <div className="flex flex-wrap gap-1.5">
              {mapaAtivacao.suporte.map((h: any) => (
                <span key={h.id} className="px-2 py-1 rounded-md text-[10px] bg-white/[0.06] text-white/50 border border-violet-500/10">{h.codigo} {h.nome}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Semanas */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1 h-3.5 rounded-full bg-violet-500" />
          <p className="text-[10px] font-semibold text-violet-400/80 uppercase tracking-widest">Semanas</p>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map(semana => {
            const habs = habPorSemana[semana] || [];
            const conteudo = conteudosPorSemana[semana];
            const isUploading = uploadingSemana === semana;
            const missoes = missoesPorSemana[semana] || [];
            const missaoGeral = missoes.find((m: any) => m.tipo_missao === 'geral');
            const missoesIndiv = missoes.filter((m: any) => m.tipo_missao === 'individual');
            const isExpanded = semanaExpandida === semana;
            const confs = confirmacoes[semana] || [];
            const aulaConfirmada = confs.some((c: any) => c.confirmada && !c.aula_nao_ocorreu);

            return (
              <div key={semana} className="rounded-xl bg-[#252547] border border-violet-500/10 overflow-hidden">
                {/* Header */}
                <button onClick={() => setSemanaExpandida(isExpanded ? null : semana)}
                  className="w-full p-3.5 text-left hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">Semana {semana}</span>
                      {aulaConfirmada && <span className="text-[8px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded">Aula confirmada</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {habs.length > 0 && <span className="text-[9px] text-violet-400/60">{habs.length} hab</span>}
                      {missoes.length > 0 && <span className="text-[9px] text-blue-400/60">{missoes.length} missao</span>}
                      {conteudo && <FileText className="w-3 h-3 text-blue-400/40" />}
                    </div>
                  </div>
                  {/* Preview habilidades */}
                  {!isExpanded && habs.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {habs.slice(0, 6).map((h: any) => (
                        <span key={h.id} className="px-1 py-0.5 rounded text-[8px] bg-violet-500/10 text-violet-300/60">{h.codigo}</span>
                      ))}
                      {habs.length > 6 && <span className="text-[8px] text-white/20">+{habs.length - 6}</span>}
                    </div>
                  )}
                </button>

                {/* Conteudo expandido */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 space-y-3 border-t border-violet-500/5 pt-3">
                    {/* Configurar por série */}
                    <div>
                      <p className="text-[10px] text-white/30 mb-2">Configurar por série</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[6, 7, 8, 9].map(s => {
                          const missoesSerieCount = missoes.filter((m: any) => m.serie_filtro === s || m.serie_filtro === null).length;
                          return (
                            <button
                              key={s}
                              onClick={() => { setSerieMissoesCasa(s); setSemanaMissoesCasa(semana); }}
                              className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/[0.04] border border-violet-500/10 hover:bg-white/[0.08] transition-colors"
                            >
                              <span className="text-[11px] text-white font-medium">{s}° Ano</span>
                              <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Status de aulas */}
                    <div>
                      <p className="text-[10px] text-white/30 mb-1.5">Status das aulas</p>
                      {confs.length > 0 ? (
                        <div className="space-y-1">
                          {confs.map((c: any, i: number) => (
                            <div key={i} className={cn('flex items-center gap-2 py-1 px-2 rounded-lg', c.aula_nao_ocorreu ? 'bg-red-500/10' : 'bg-emerald-500/10')}>
                              <div className={cn('w-1.5 h-1.5 rounded-full', c.aula_nao_ocorreu ? 'bg-red-500' : 'bg-emerald-500')} />
                              <span className="text-[10px] text-white/60 flex-1">{(c.professor as any)?.full_name || 'Professor'}</span>
                              <span className={cn('text-[9px]', c.aula_nao_ocorreu ? 'text-red-400/60' : 'text-emerald-400/60')}>
                                {c.aula_nao_ocorreu ? 'Nao ocorreu' : 'Confirmada'}
                              </span>
                            </div>
                          ))}
                          {confs.some((c: any) => c.aula_nao_ocorreu && c.motivo_ausencia) && (
                            <div className="mt-1">
                              {confs.filter((c: any) => c.aula_nao_ocorreu && c.motivo_ausencia).map((c: any, i: number) => (
                                <p key={i} className="text-[9px] text-red-400/40 px-2">Motivo: {c.motivo_ausencia}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-white/15 py-1 px-2">Nenhum professor confirmou aula nesta semana</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Inputs file ocultos */}
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f && semanaParaUpload) handleUploadPdf(f, semanaParaUpload); e.target.value = ''; }} />
          <input ref={missaoInputRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f && missaoUploadInfo) handleUploadMissao(f); e.target.value = ''; }} />
        </div>
      </div>

      {/* ═══ CALIBRAÇÃO DA FASE ═══ */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1 h-3.5 rounded-full bg-emerald-500" />
          <p className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-widest">Calibração da Fase</p>
        </div>

        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {[
            { key: 'surpreendeu', label: 'Foi além', bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
            { key: 'fez', label: 'Fez', bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' },
            { key: 'dificuldades', label: 'Dificuldades', bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
            { key: 'nao_conseguiu', label: 'Não conseguiu', bg: 'bg-red-500/15', text: 'text-red-300', border: 'border-red-500/30' },
          ].map(e => (
            <button key={e.key} onClick={() => setCalibracaoEstado(calibracaoEstado === e.key ? null : e.key)}
              className={cn('px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 border',
                calibracaoEstado === e.key ? `${e.bg} ${e.text} ${e.border}` : 'bg-white/[0.04] text-white/40 border-transparent')}>
              {e.label}
            </button>
          ))}
        </div>

        {calibracaoEstado && (
          <CalibracaoLista faseId={faseId!} estado={calibracaoEstado} />
        )}
      </div>

      {/* Modal seletor */}
      {semanaEditando !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#1E1E3A] border border-violet-500/10 rounded-2xl max-h-[75vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header fixo */}
            <div className="flex items-center justify-between p-4 border-b border-violet-500/10 shrink-0">
              <div>
                <p className="text-white font-medium">Semana {semanaEditando}</p>
                <p className="text-xs text-white/30">{habSelecionadas.size} habilidades</p>
              </div>
              <button onClick={() => setSemanaEditando(null)} className="p-1 text-white/30 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {/* Conteúdo scrollável */}
            <div className="p-4 overflow-y-auto flex-1">

            {/* Filtro tabs */}
            <div className="flex gap-2 mb-3">
              <button onClick={() => setFiltroHab('mecanismo')}
                className={cn('flex-1 py-2 rounded-lg text-xs font-medium transition-colors',
                  filtroHab === 'mecanismo' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/[0.04] text-white/40 border border-transparent'
                )}>
                {int?.nome || 'Mecanismo'}
              </button>
              <button onClick={() => setFiltroHab('todas')}
                className={cn('flex-1 py-2 rounded-lg text-xs font-medium transition-colors',
                  filtroHab === 'todas' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-white/[0.04] text-white/40 border border-transparent'
                )}>
                Todas (52)
              </button>
            </div>

            {/* Botao rapido */}
            {filtroHab === 'mecanismo' && (
              <button onClick={() => {
                setHabSelecionadas(prev => new Set([...prev, ...mapaAtivacao.nucleo.map((h: any) => h.id)]));
              }} className="w-full mb-3 py-2 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/20 hover:bg-amber-500/25 transition-colors">
                + Selecionar todas de ativacao
              </button>
            )}

            {/* Lista de habilidades */}
            {(() => {
              const mecanismoIds = new Set([
                ...mapaAtivacao.nucleo.map((h: any) => h.id),
                ...mapaAtivacao.suporte.map((h: any) => h.id),
              ]);
              const habsFiltradas = filtroHab === 'mecanismo'
                ? todasHabilidades.filter(h => mecanismoIds.has(h.id))
                : todasHabilidades;

              return Object.entries(dimLabels).map(([dim, label]) => {
                const habs = habsFiltradas.filter(h => h.dimensao === dim);
                if (!habs.length) return null;
                return (
                  <div key={dim} className="mb-3">
                    <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1.5">{label}</p>
                    {habs.map(h => {
                      const sel = habSelecionadas.has(h.id);
                      const isNucleo = mapaAtivacao.nucleo.some((n: any) => n.id === h.id);
                      const isSuporte = mapaAtivacao.suporte.some((s: any) => s.id === h.id);
                      return (
                        <button key={h.id} onClick={() => toggleHab(h.id)}
                          className={cn('w-full flex items-center gap-2 py-2 px-3 rounded-lg text-left transition-colors',
                            sel ? 'bg-violet-500/20 border border-violet-500/30' : 'hover:bg-white/[0.04] border border-transparent'
                          )}>
                          <div className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0',
                            sel ? 'bg-violet-500 border-violet-500' : 'border-white/20'
                          )}>{sel && <Check className="w-3 h-3 text-white" />}</div>
                          <span className={cn('text-xs flex-1', sel ? 'text-white' : 'text-white/60')}>
                            <span className="text-white/40 mr-1">{h.codigo}</span>{h.nome}
                          </span>
                          {isNucleo && <span className="text-[8px] text-amber-400/60 shrink-0">ativacao</span>}
                          {isSuporte && <span className="text-[8px] text-white/20 shrink-0">suporte</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              });
            })()}

            </div>

            {/* Footer fixo com botão salvar */}
            <div className="p-4 border-t border-violet-500/10 shrink-0 bg-[#1E1E3A]">
              <button onClick={salvarHab} disabled={salvandoHab}
                className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50">
                {salvandoHab ? 'Salvando...' : `Salvar ${habSelecionadas.size} habilidades`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente de calibração: lista alunos por estado
const CalibracaoLista = ({ faseId, estado }: { faseId: string; estado: string }) => {
  const { data: observacoes = [], isLoading } = useQuery({
    queryKey: ['calibracao', faseId, estado],
    queryFn: async () => {
      const { data } = await supabase
        .from('observacao_aluno')
        .select(`
          id, aluno_id, estado, observacao_texto,
          observacao_semanal:observacao_semanal_id (serie, turma, semana)
        `)
        .eq('estado', estado)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!data) return [];

      // Buscar nomes dos alunos
      const alunoIds = [...new Set(data.map(d => d.aluno_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, nome, casa_id')
        .in('id', alunoIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Buscar casas
      const { data: casas } = await supabase.from('inteligencias').select('id, nome, cor_hex');
      const casaMap = new Map((casas || []).map(c => [c.id, c]));

      return data.map(d => {
        const p = profileMap.get(d.aluno_id);
        const casa = p?.casa_id ? casaMap.get(p.casa_id) : null;
        const obs = d.observacao_semanal as any;
        return {
          ...d,
          aluno_nome: p?.full_name || p?.nome || 'Aluno',
          casa_nome: casa?.nome || '',
          casa_cor: casa?.cor_hex || '#666',
          serie: obs?.serie,
          turma: obs?.turma,
          semana: obs?.semana,
        };
      });
    },
    enabled: !!faseId && !!estado,
  });

  const LABELS: Record<string, string> = {
    surpreendeu: 'Foi além', fez: 'Fez', dificuldades: 'Dificuldades', nao_conseguiu: 'Não conseguiu',
  };

  if (isLoading) return <div className="p-4 text-center"><div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white/20 mx-auto" /></div>;

  if (observacoes.length === 0) return (
    <div className="p-4 rounded-xl bg-[#252547] border border-violet-500/10 text-center">
      <p className="text-white/30 text-sm">Nenhum aluno com estado "{LABELS[estado]}" nesta fase</p>
    </div>
  );

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-white/30">{observacoes.length} aluno{observacoes.length > 1 ? 's' : ''}</p>
      {observacoes.map((o: any) => (
        <div key={o.id} className="p-3 rounded-xl bg-[#252547] border border-violet-500/10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: o.casa_cor }} />
            <p className="text-[11px] text-white/70 flex-1 truncate">{o.aluno_nome}</p>
            <span className="text-[9px] text-white/25">{o.serie}° {o.turma} · S{o.semana}</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/10 text-white/40">{o.casa_nome}</span>
          </div>
          {o.observacao_texto && (
            <p className="text-xs text-white/50 leading-relaxed mt-1">"{o.observacao_texto}"</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default FaseDetalhesPage;
