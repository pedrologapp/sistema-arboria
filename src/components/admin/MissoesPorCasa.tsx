import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft, User, Users, Leaf, Calculator, BookOpen, Palette, Activity, Music,
  Plus, Check, X, Loader2, Trash2, FileText, Upload, Eye, Calendar, Clock,
  ChevronDown, ChevronUp,
  type LucideIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { parseDataLocal } from '@/utils/timezone';
import { addDays, differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MissoesPorCasaProps {
  faseId: string;
  institutionId: string;
  semana: number;
  serie: number;
  dataInicio: string;
  dataFim: string;
  inteligenciaId?: number;
  onVoltar: () => void;
}

interface Missao {
  id: string;
  fase_id: string;
  semana: number | null;
  tipo_missao: string | null;
  casa_id: number | null;
  titulo: string;
  descricao: string | null;
  contexto: string | null;
  lente_especial: string | null;
  instrucoes: string | null;
  itens: { nome: string; descricao: string }[] | null;
  reflexao: string | null;
  pontos_base: number;
  requer_texto: boolean | null;
  requer_arquivo: boolean | null;
  status: string | null;
  arquivo_pdf_url: string | null;
  arquivo_pdf_nome: string | null;
  data_prazo: string | null;
  serie_filtro: number | null;
}

interface Inteligencia {
  id: number;
  nome: string;
  codigo: string;
  cor_hex: string | null;
  brasao_url: string | null;
  ordem: number | null;
}

const ICONES_CASAS: Record<string, LucideIcon> = {
  linguistica: BookOpen, logico_matematica: Calculator, espacial: Palette,
  musical: Music, corporal_cinestesica: Activity, naturalista: Leaf,
  interpessoal: Users, intrapessoal: User,
};

const TIPOS_ENTREGA = [
  { id: 'texto', label: 'Texto' },
  { id: 'imagem', label: 'Imagem/Foto' },
  { id: 'arquivo', label: 'Arquivo (PDF, DOC)' },
];

const MissoesPorCasa = ({ faseId, institutionId, semana, serie, dataInicio, dataFim, inteligenciaId, onVoltar }: MissoesPorCasaProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [modalTipo, setModalTipo] = useState<'individual' | 'geral'>('individual');
  const [casaAtual, setCasaAtual] = useState<Inteligencia | null>(null);
  const [missaoEditando, setMissaoEditando] = useState<Missao | null>(null);

  // Form state
  const [titulo, setTitulo] = useState('');
  const [porqueImporta, setPorqueImporta] = useState('');
  const [contexto, setContexto] = useState('');
  const [lente, setLente] = useState('');
  const [instrucoes, setInstrucoes] = useState('');
  const [experimentos, setExperimentos] = useState<{ nome: string; descricao: string }[]>([]);
  const [reflexao, setReflexao] = useState('');
  const [pontos, setPontos] = useState(15);
  const [tiposEntrega, setTiposEntrega] = useState<string[]>(['texto', 'imagem', 'arquivo']);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfExistente, setPdfExistente] = useState<{ url: string; nome: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [uploadando, setUploadando] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [dataPrazo, setDataPrazo] = useState('');
  const [horaPrazo, setHoraPrazo] = useState('23:59');

  const periodoSemana = useMemo(() => {
    if (!dataInicio || !dataFim) return { inicio: null, fim: null };
    const inicio = parseDataLocal(dataInicio);
    const fim = parseDataLocal(dataFim);
    const totalDias = differenceInDays(fim, inicio) + 1;
    const diasPorSemana = Math.ceil(totalDias / 4);
    const semanaInicio = addDays(inicio, (semana - 1) * diasPorSemana);
    const semanaFim = semana === 4 ? fim : addDays(semanaInicio, diasPorSemana - 1);
    return { inicio: semanaInicio, fim: semanaFim };
  }, [dataInicio, dataFim, semana]);

  const { data: inteligencias } = useQuery({
    queryKey: ['inteligencias'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inteligencias').select('id, nome, codigo, cor_hex, brasao_url, ordem').order('ordem');
      if (error) throw error;
      return (data as Inteligencia[]) || [];
    }
  });

  const { data: missoes, isLoading } = useQuery({
    queryKey: ['missoes-individuais', faseId, semana, serie],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missoes')
        .select('id, fase_id, semana, tipo_missao, casa_id, titulo, descricao, contexto, lente_especial, instrucoes, itens, reflexao, pontos_base, requer_texto, requer_arquivo, status, arquivo_pdf_url, arquivo_pdf_nome, data_prazo, serie_filtro')
        .eq('fase_id', faseId).eq('semana', semana).eq('tipo_missao', 'individual')
        .eq('serie_filtro', serie);
      if (error) throw error;
      return (data as any as Missao[]) || [];
    },
    enabled: !!faseId
  });

  // Missão geral desta série/semana
  const { data: missaoGeral } = useQuery({
    queryKey: ['missao-geral', faseId, semana, serie],
    queryFn: async () => {
      const { data } = await supabase.from('missoes')
        .select('id, titulo, pontos_base, status, serie_filtro')
        .eq('fase_id', faseId).eq('semana', semana).eq('tipo_missao', 'geral')
        .eq('serie_filtro', serie)
        .maybeSingle();
      return data;
    },
    enabled: !!faseId,
  });

  const getMissaoCasa = (casaId: number) => missoes?.find(m => m.casa_id === casaId);
  const totalConfiguradas = missoes?.length || 0;
  const porcentagem = Math.round((totalConfiguradas / 8) * 100);
  const formatarData = (data: Date) => format(data, "dd MMM", { locale: ptBR });

  const abrirModalGeral = async () => {
    setModalTipo('geral');
    setCasaAtual(null);
    if (missaoGeral) {
      // Buscar missão completa
      const { data } = await supabase.from('missoes')
        .select('id, fase_id, semana, tipo_missao, casa_id, titulo, contexto, lente_especial, instrucoes, itens, reflexao, pontos_base, requer_texto, requer_arquivo, status, arquivo_pdf_url, arquivo_pdf_nome, data_prazo, serie_filtro, descricao')
        .eq('id', missaoGeral.id).single();
      if (data) {
        setMissaoEditando(data as any);
        setTitulo(data.titulo);
        setPorqueImporta((data as any).descricao || '');
        setContexto(data.contexto || '');
        setLente(data.lente_especial || '');
        setInstrucoes(data.instrucoes || '');
        setExperimentos(data.itens as any || []);
        setReflexao(data.reflexao || '');
        setPontos(data.pontos_base);
        setTiposEntrega(['texto', 'imagem', 'arquivo']);
      }
    } else {
      setMissaoEditando(null);
      setTitulo(''); setPorqueImporta(''); setContexto(''); setLente(''); setInstrucoes('');
      setExperimentos([{ nome: 'Experimento 1', descricao: '' }, { nome: 'Experimento 2', descricao: '' }]);
      setReflexao(''); setPontos(100);
      setTiposEntrega(['texto', 'imagem', 'arquivo']);
    }
    setPdfFile(null); setPdfExistente(null);
    setModalAberto(true);
  };

  const abrirModal = (casa: Inteligencia, missao?: Missao) => {
    setModalTipo('individual');
    setCasaAtual(casa);
    if (missao) {
      setMissaoEditando(missao);
      setTitulo(missao.titulo);
      setPorqueImporta(missao.descricao || '');
      setContexto(missao.contexto || '');
      setLente(missao.lente_especial || '');
      setInstrucoes(missao.instrucoes || '');
      setExperimentos(missao.itens || []);
      setReflexao(missao.reflexao || '');
      setPontos(missao.pontos_base);
      setPdfExistente(missao.arquivo_pdf_url ? { url: missao.arquivo_pdf_url, nome: missao.arquivo_pdf_nome || 'arquivo.pdf' } : null);
      const tipos: string[] = [];
      if (missao.requer_texto) tipos.push('texto');
      if (missao.requer_arquivo) tipos.push('imagem', 'arquivo');
      setTiposEntrega(tipos.length > 0 ? tipos : ['texto', 'imagem', 'arquivo']);
      if (missao.data_prazo) {
        const dtPrazo = new Date(missao.data_prazo);
        setDataPrazo(format(dtPrazo, 'yyyy-MM-dd'));
        setHoraPrazo(format(dtPrazo, 'HH:mm'));
      } else {
        setDataPrazo(periodoSemana.fim ? format(periodoSemana.fim, 'yyyy-MM-dd') : '');
        setHoraPrazo('23:59');
      }
    } else {
      setMissaoEditando(null);
      setTitulo(''); setPorqueImporta(''); setContexto(''); setLente(''); setInstrucoes('');
      setExperimentos([{ nome: 'Experimento 1', descricao: '' }, { nome: 'Experimento 2', descricao: '' }]);
      setReflexao(''); setPontos(15);
      setTiposEntrega(['texto', 'imagem', 'arquivo']); setPdfExistente(null);
      setDataPrazo(periodoSemana.fim ? format(periodoSemana.fim, 'yyyy-MM-dd') : '');
      setHoraPrazo('23:59');
    }
    setPdfFile(null);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false); setCasaAtual(null); setMissaoEditando(null);
    setTitulo(''); setPorqueImporta(''); setContexto(''); setLente(''); setInstrucoes('');
    setExperimentos([]); setReflexao(''); setPontos(15);
    setTiposEntrega(['texto', 'imagem', 'arquivo']); setPdfFile(null); setPdfExistente(null);
    setDataPrazo(''); setHoraPrazo('23:59');
  };

  const toggleTipoEntrega = (tipo: string) => {
    if (tiposEntrega.includes(tipo)) {
      if (tiposEntrega.length > 1) setTiposEntrega(tiposEntrega.filter(t => t !== tipo));
    } else {
      setTiposEntrega([...tiposEntrega, tipo]);
    }
  };

  const adicionarExperimento = () => {
    setExperimentos([...experimentos, { nome: `Experimento ${experimentos.length + 1}`, descricao: '' }]);
  };

  const removerExperimento = (index: number) => {
    setExperimentos(experimentos.filter((_, i) => i !== index));
  };

  const atualizarExperimento = (index: number, campo: 'nome' | 'descricao', valor: string) => {
    setExperimentos(experimentos.map((e, i) => i === index ? { ...e, [campo]: valor } : e));
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') { toast.error('Apenas PDFs'); return; }
      if (file.size > 10 * 1024 * 1024) { toast.error('Máximo 10MB'); return; }
      setPdfFile(file); setPdfExistente(null);
    }
  };

  const salvarMutation = useMutation({
    mutationFn: async () => {
      if (modalTipo === 'individual' && !casaAtual) throw new Error('Casa não selecionada');
      setSalvando(true);

      let pdfUrl = pdfExistente?.url || null;
      let pdfNome = pdfExistente?.nome || null;

      if (pdfFile) {
        setUploadando(true);
        const fileName = `missoes/${faseId}/${semana}/${modalTipo === 'geral' ? 'geral' : casaAtual!.id}_${Date.now()}.pdf`;
        const { error: uploadError } = await supabase.storage.from('fase-conteudos').upload(fileName, pdfFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('fase-conteudos').getPublicUrl(fileName);
        pdfUrl = urlData.publicUrl;
        pdfNome = pdfFile.name;
        setUploadando(false);
      }

      const requerTexto = tiposEntrega.includes('texto');
      const requerArquivo = tiposEntrega.some(t => ['imagem', 'arquivo'].includes(t));
      const itensLimpos = experimentos.filter(e => e.descricao.trim()).length > 0 ? experimentos.filter(e => e.descricao.trim()) : null;

      const dadosMissao = {
        fase_id: faseId, institution_id: institutionId, semana,
        tipo_missao: modalTipo, tipo: 'principal',
        casa_id: modalTipo === 'geral' ? null : casaAtual!.id,
        serie_filtro: serie, titulo,
        contexto: contexto || null,
        lente_especial: lente || null,
        instrucoes: instrucoes || null,
        itens: itensLimpos,
        reflexao: reflexao || null,
        descricao: porqueImporta || null, pontos_base: pontos,
        requer_texto: requerTexto, requer_arquivo: requerArquivo,
        arquivo_pdf_url: pdfUrl, arquivo_pdf_nome: pdfNome,
        status: 'rascunho', criado_por: user?.id,
        data_liberacao: new Date().toISOString(),
        data_prazo: periodoSemana.fim ? addDays(periodoSemana.fim, 3).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString(),
      };

      if (missaoEditando) {
        const { error } = await supabase.from('missoes').update({
          titulo, contexto: contexto || null, lente_especial: lente || null,
          instrucoes: instrucoes || null, itens: itensLimpos, reflexao: reflexao || null,
          descricao: porqueImporta || null, pontos_base: pontos, requer_texto: requerTexto, requer_arquivo: requerArquivo,
          arquivo_pdf_url: pdfUrl, arquivo_pdf_nome: pdfNome,
          serie_filtro: serie,
          updated_at: new Date().toISOString()
        }).eq('id', missaoEditando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('missoes').insert(dadosMissao);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(missaoEditando ? 'Missão atualizada' : 'Missão criada');
      queryClient.invalidateQueries({ queryKey: ['missoes-individuais', faseId, semana, serie] });
      queryClient.invalidateQueries({ queryKey: ['missao-geral', faseId, semana, serie] });
      queryClient.invalidateQueries({ queryKey: ['fase-missoes', faseId] });
      fecharModal();
    },
    onError: (error: Error) => { toast.error('Erro ao salvar: ' + error.message); },
    onSettled: () => { setSalvando(false); setUploadando(false); }
  });

  const excluirMutation = useMutation({
    mutationFn: async (missaoId: string) => {
      // Verificar se a missão é desta série antes de deletar
      const { data: missao } = await supabase.from('missoes')
        .select('serie_filtro').eq('id', missaoId).single();
      if (missao && missao.serie_filtro !== null && missao.serie_filtro !== serie) {
        throw new Error('Esta missão pertence a outra série');
      }
      const { error } = await supabase.from('missoes').delete().eq('id', missaoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Missão excluída');
      queryClient.invalidateQueries({ queryKey: ['missoes-individuais', faseId, semana, serie] });
      queryClient.invalidateQueries({ queryKey: ['fase-missoes', faseId] });
      fecharModal();
    },
    onError: (error: Error) => { toast.error('Erro ao excluir: ' + error.message); }
  });

  // Habilidades por série
  const [showHabModal, setShowHabModal] = useState(false);
  const [habSelecionadas, setHabSelecionadas] = useState<Set<number>>(new Set());
  const [salvandoHab, setSalvandoHab] = useState(false);

  const { data: habsDaSerie = [] } = useQuery({
    queryKey: ['habs-serie', faseId, semana, serie],
    queryFn: async () => {
      const { data } = await supabase.from('atividade_habilidades')
        .select('habilidade:habilidades!atividade_habilidades_habilidade_id_fkey(id, codigo, nome, dimensao)')
        .eq('fase_id', faseId).eq('institution_id', institutionId).eq('semana', semana).eq('serie', serie);
      return (data || []).map((d: any) => d.habilidade);
    },
    enabled: !!faseId && !!institutionId,
  });

  const { data: todasHabilidades = [] } = useQuery({
    queryKey: ['todas-habilidades'],
    queryFn: async () => {
      const { data } = await supabase.from('habilidades').select('id, codigo, nome, dimensao').order('ordem');
      return data || [];
    },
  });

  const [filtroHab, setFiltroHab] = useState<'mecanismo' | 'todas'>('mecanismo');

  const { data: mapaAtivacao = { nucleo: [], suporte: [] } } = useQuery({
    queryKey: ['mapa-ativacao', inteligenciaId],
    queryFn: async () => {
      if (!inteligenciaId) return { nucleo: [], suporte: [] };
      const { data } = await supabase.from('habilidade_inteligencia')
        .select('tipo, habilidade:habilidades!habilidade_inteligencia_habilidade_id_fkey(id, codigo, nome, dimensao)')
        .eq('inteligencia_id', inteligenciaId);
      return {
        nucleo: (data || []).filter(d => d.tipo === 'nucleo').map(d => d.habilidade as any),
        suporte: (data || []).filter(d => d.tipo === 'suporte').map(d => d.habilidade as any),
      };
    },
    enabled: !!inteligenciaId,
  });

  const abrirHabModal = () => {
    setHabSelecionadas(new Set(habsDaSerie.map((h: any) => h.id)));
    setShowHabModal(true);
  };

  const salvarHab = async () => {
    if (!faseId || !institutionId) return;
    setSalvandoHab(true);
    try {
      await supabase.from('atividade_habilidades').delete()
        .eq('fase_id', faseId).eq('institution_id', institutionId).eq('semana', semana).eq('serie', serie);
      if (habSelecionadas.size > 0) {
        await supabase.from('atividade_habilidades').insert(
          Array.from(habSelecionadas).map(hId => ({ institution_id: institutionId, fase_id: faseId, semana, serie, habilidade_id: hId }))
        );
      }
      toast.success(`Habilidades do ${serie}° ano salvas!`);
      setShowHabModal(false);
      queryClient.invalidateQueries({ queryKey: ['habs-serie', faseId, semana, serie] });
    } catch (err: any) { toast.error(err.message || 'Erro'); }
    finally { setSalvandoHab(false); }
  };

  const getIconeCasa = (codigo: string): LucideIcon => ICONES_CASAS[codigo] || User;

  // Conteúdo do professor por série
  const conteudoInputRef = useRef<HTMLInputElement>(null);
  const [uploadandoConteudo, setUploadandoConteudo] = useState(false);

  const { data: conteudoProfessor } = useQuery({
    queryKey: ['conteudo-professor', faseId, semana, serie],
    queryFn: async () => {
      const { data } = await supabase.from('fase_conteudos')
        .select('id, titulo, arquivo_nome, arquivo_url')
        .eq('fase_id', faseId).eq('institution_id', institutionId)
        .eq('semana', semana).eq('serie', serie)
        .maybeSingle();
      return data;
    },
    enabled: !!faseId && !!institutionId,
  });

  const handleUploadConteudo = async (file: File) => {
    if (!faseId || !institutionId || file.size > 10 * 1024 * 1024) { toast.error('Arquivo muito grande (máx 10MB)'); return; }
    setUploadandoConteudo(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `fases/${faseId}/s${semana}_${serie}ano_${Date.now()}_${safeName}`;

      // Upload via fetch com auth token (mais confiável que supabase.storage.upload)
      const session = (await supabase.auth.getSession()).data.session;
      const uploadRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/fase-conteudos/${filePath}`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': file.type, 'x-upsert': 'true' }, body: file }
      );
      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Upload falhou: ${errText}`);
      }

      const { data: pubUrl } = supabase.storage.from('fase-conteudos').getPublicUrl(filePath);

      if (conteudoProfessor) {
        const { error } = await supabase.from('fase_conteudos').update({
          arquivo_nome: file.name, arquivo_url: pubUrl.publicUrl, arquivo_tamanho: file.size,
        }).eq('id', conteudoProfessor.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('fase_conteudos').insert({
          institution_id: institutionId, fase_id: faseId, semana, serie,
          titulo: `Conteúdo S${semana} ${serie}° Ano`, arquivo_nome: file.name,
          arquivo_url: pubUrl.publicUrl, arquivo_tamanho: file.size,
        });
        if (error) throw error;
      }
      toast.success('Conteúdo enviado!');
      queryClient.invalidateQueries({ queryKey: ['conteudo-professor', faseId, semana, serie] });
    } catch (err: any) { toast.error(err.message || 'Erro ao enviar'); }
    finally { setUploadandoConteudo(false); }
  };

  const removerConteudo = async () => {
    if (!conteudoProfessor) return;
    await supabase.from('fase_conteudos').delete().eq('id', conteudoProfessor.id);
    toast.success('Conteúdo removido');
    queryClient.invalidateQueries({ queryKey: ['conteudo-professor', faseId, semana, serie] });
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-white/40 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <button onClick={onVoltar} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" /><span className="text-sm">Voltar</span>
        </button>
        <h3 className="text-white text-lg font-medium">Missões por Casa — {serie}° Ano</h3>
        <p className="text-white/40 text-sm">Semana {semana} {periodoSemana.inicio && `· ${formatarData(periodoSemana.inicio)} - ${periodoSemana.fim && formatarData(periodoSemana.fim)}`}</p>
      </div>

      {/* Conteúdo do professor */}
      <div className="bg-white/5 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-white/30 uppercase tracking-wider flex-1">Conteúdo do professor — {serie}° Ano</p>
          {conteudoProfessor && <Check className="w-4 h-4 text-green-500" />}
        </div>
        {conteudoProfessor ? (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
            <FileText className="w-4 h-4 text-green-400 shrink-0" />
            <a href={conteudoProfessor.arquivo_url} target="_blank" rel="noopener noreferrer"
              className="text-sm text-green-400/80 hover:text-green-300 truncate flex-1">{conteudoProfessor.arquivo_nome || 'PDF'}</a>
            <button onClick={removerConteudo} className="p-1.5 text-white/20 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <button onClick={() => conteudoInputRef.current?.click()}
            disabled={uploadandoConteudo}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-white/20 hover:border-white/40 hover:bg-white/5 transition-colors text-white/40 text-sm">
            <Upload className="w-4 h-4" />
            {uploadandoConteudo ? 'Enviando...' : 'Enviar PDF do professor'}
          </button>
        )}
        <input ref={conteudoInputRef} type="file" accept=".pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadConteudo(f); e.target.value = ''; }} />
      </div>

      {/* Habilidades da série */}
      <div className="bg-white/5 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Habilidades — {serie}° Ano</p>
            {habsDaSerie.length > 0 && <Check className="w-3.5 h-3.5 text-green-500" />}
          </div>
          <button onClick={abrirHabModal} className="text-[10px] text-violet-400 hover:text-violet-300">
            {habsDaSerie.length > 0 ? 'Editar' : 'Configurar'}
          </button>
        </div>
        {habsDaSerie.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {habsDaSerie.map((h: any) => (
              <span key={h.id} className="px-1.5 py-0.5 rounded text-[9px] bg-violet-500/15 text-violet-300/80 border border-violet-500/20">{h.codigo}</span>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-white/15">Nenhuma configurada</p>
        )}
      </div>

      {/* Missão Geral */}
      <div className="bg-white/5 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-white/30 uppercase tracking-wider flex-1">Missão Geral — {serie}° Ano</p>
          {missaoGeral && <Check className="w-4 h-4 text-green-500" />}
        </div>
        {missaoGeral ? (
          <button
            onClick={abrirModalGeral}
            className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors text-left"
          >
            <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm text-emerald-400/80 truncate flex-1">{missaoGeral.titulo}</span>
            <span className="text-[8px] text-white/30">{missaoGeral.pontos_base}pts</span>
            {missaoGeral.status !== 'liberada' && (
              <span className="text-[8px] text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full">rascunho</span>
            )}
          </button>
        ) : (
          <button
            onClick={abrirModalGeral}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-white/20 hover:border-white/40 hover:bg-white/5 transition-colors text-white/40 text-sm"
          >
            <Plus className="w-4 h-4" /> Criar missão geral
          </button>
        )}
      </div>

      {/* Progresso + Status (Individuais) */}
      {(() => {
        const liberadas = missoes?.filter((m: any) => m.status === 'liberada').length || 0;
        const rascunhos = totalConfiguradas - liberadas;
        return (
          <div className="bg-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Configuradas: {totalConfiguradas}/8</span>
              {rascunhos > 0 && (
                <span className="text-[10px] text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">{rascunhos} rascunho{rascunhos > 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${porcentagem >= 100 ? 'bg-green-500' : porcentagem >= 50 ? 'bg-yellow-500' : 'bg-white/40'}`} style={{ width: `${porcentagem}%` }} />
            </div>
            {rascunhos > 0 && totalConfiguradas > 0 && (
              <button
                onClick={async () => {
                  // Liberar individuais + geral
                  const ids = missoes?.filter((m: any) => m.status !== 'liberada').map((m: any) => m.id) || [];
                  if (missaoGeral && missaoGeral.status !== 'liberada') ids.push(missaoGeral.id);
                  if (ids.length === 0) return;
                  await supabase.from('missoes').update({ status: 'liberada', data_liberacao: new Date().toISOString() }).in('id', ids);
                  toast.success(`${ids.length} missões liberadas!`);
                  queryClient.invalidateQueries({ queryKey: ['missoes-individuais', faseId, semana, serie] });
                  queryClient.invalidateQueries({ queryKey: ['missao-geral', faseId, semana, serie] });
                }}
                className="w-full py-2 rounded-lg bg-green-500/15 text-green-400 text-sm font-medium border border-green-500/25 hover:bg-green-500/25 transition-colors"
              >
                Liberar {rascunhos} {rascunhos > 1 ? 'missões' : 'missão'} para os alunos
              </button>
            )}
          </div>
        );
      })()}

      {/* Lista de Casas */}
      <div className="space-y-3">
        {inteligencias?.map((casa) => {
          const missao = getMissaoCasa(casa.id);
          const IconeCasa = getIconeCasa(casa.codigo);
          const configurada = !!missao;
          return (
            <button key={casa.id} onClick={() => abrirModal(casa, missao || undefined)}
              className={`w-full p-4 rounded-xl border text-left transition-colors hover:bg-white/5 ${configurada ? 'bg-white/5 border-violet-500/10' : 'border-dashed border-white/20'}`}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: casa.cor_hex ? `${casa.cor_hex}20` : 'rgba(255,255,255,0.1)' }}>
                  <IconeCasa className="w-5 h-5" style={{ color: casa.cor_hex || 'rgba(255,255,255,0.5)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{casa.nome}</p>
                  {configurada ? (
                    <p className="text-white/40 text-xs truncate mt-0.5">{missao.titulo} · {missao.pontos_base} pts</p>
                  ) : (
                    <p className="text-white/30 text-xs mt-0.5">Clique para adicionar</p>
                  )}
                </div>
                {configurada ? <Check className="w-5 h-5 text-green-500 flex-shrink-0" /> : <Plus className="w-5 h-5 text-white/30 flex-shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal de Missão */}
      {modalAberto && (modalTipo === 'geral' || casaAtual) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12122A] p-4">
          <div className="w-full max-w-lg bg-slate-800 rounded-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl border border-violet-500/10">
            {/* Header fixo */}
            <div className="flex items-center justify-between p-4 border-b border-violet-500/10 shrink-0">
              <div className="flex items-center gap-3">
                {modalTipo === 'geral' ? (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/20">
                    <Users className="w-4 h-4 text-emerald-400" />
                  </div>
                ) : casaAtual && (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: casaAtual.cor_hex ? `${casaAtual.cor_hex}20` : 'rgba(255,255,255,0.1)' }}>
                    {(() => { const Ic = getIconeCasa(casaAtual.codigo); return <Ic className="w-4 h-4" style={{ color: casaAtual.cor_hex || '#fff' }} />; })()}
                  </div>
                )}
                <div>
                  <h3 className="text-white font-medium">{modalTipo === 'geral' ? 'Missão Geral' : casaAtual?.nome}</h3>
                  <p className="text-white/40 text-xs">Semana {semana} · {serie}° Ano</p>
                </div>
              </div>
              <button onClick={fecharModal} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5 text-white/60" /></button>
            </div>

            {/* Conteúdo scrollável */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* Título */}
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">Título da missão *</label>
                <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: A Conversa que Desviou"
                  className="w-full p-3 bg-white/5 border border-violet-500/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20" />
              </div>

              {/* Campos só para Individual */}
              {modalTipo === 'individual' && (
                <>
                  {/* Por que essa fase importa */}
                  <div>
                    <label className="text-white/60 text-sm mb-1.5 block">Por que essa fase importa para você</label>
                    <p className="text-white/25 text-[10px] mb-1.5">Texto que conecta a casa do aluno com a fase atual</p>
                    <textarea value={porqueImporta} onChange={(e) => setPorqueImporta(e.target.value)}
                      placeholder="Você é da Casa Linguística — palavras são seu elemento natural..."
                      rows={3} className="w-full p-3 bg-white/5 border border-violet-500/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none" />
                  </div>

                  {/* Contexto */}
                  <div>
                    <label className="text-white/60 text-sm mb-1.5 block">Contexto</label>
                    <textarea value={contexto} onChange={(e) => setContexto(e.target.value)}
                      placeholder="Cenário que situa o aluno na missão..."
                      rows={3} className="w-full p-3 bg-white/5 border border-violet-500/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none" />
                  </div>

                  {/* Lente */}
                  <div>
                    <label className="text-white/60 text-sm mb-1.5 block">Lente especial</label>
                    <textarea value={lente} onChange={(e) => setLente(e.target.value)}
                      placeholder="A pergunta-guia que direciona o olhar do aluno..."
                      rows={2} className="w-full p-3 bg-white/5 border border-violet-500/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none" />
                  </div>
                </>
              )}

              {/* Missão */}
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">Missão *</label>
                <p className="text-white/25 text-[10px] mb-1.5">O que o aluno deve fazer (resumo)</p>
                <textarea value={instrucoes} onChange={(e) => setInstrucoes(e.target.value)}
                  placeholder="Observar alguém que parece diferente do normal..."
                  rows={3} className="w-full p-3 bg-white/5 border border-violet-500/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none" />
              </div>

              {/* Experimentos (só individual) */}
              {modalTipo === 'individual' && (<div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-white/60 text-sm">Experimentos</label>
                  <button onClick={adicionarExperimento} className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                </div>
                <p className="text-white/25 text-[10px] mb-2">Atividades práticas para o aluno realizar</p>
                <div className="space-y-3">
                  {experimentos.map((exp, i) => (
                    <div key={i} className="p-3 bg-white/[0.03] border border-violet-500/10 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="text" value={exp.nome} onChange={(e) => atualizarExperimento(i, 'nome', e.target.value)}
                          className="flex-1 p-2 bg-white/5 border border-violet-500/10 rounded-lg text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-white/20" />
                        <button onClick={() => removerExperimento(i)} className="p-1.5 text-white/20 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <textarea value={exp.descricao} onChange={(e) => atualizarExperimento(i, 'descricao', e.target.value)}
                        placeholder="Descreva o que o aluno deve fazer neste experimento..."
                        rows={3} className="w-full p-2 bg-white/5 border border-violet-500/10 rounded-lg text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none" />
                    </div>
                  ))}
                </div>
              </div>)}

              {/* Reflexão (só individual) */}
              {modalTipo === 'individual' && (
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">Reflexão final</label>
                <textarea value={reflexao} onChange={(e) => setReflexao(e.target.value)}
                  placeholder="O que você aprendeu sobre como ouvir palavras de um jeito diferente?"
                  rows={2} className="w-full p-3 bg-white/5 border border-violet-500/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none" />
              </div>
              )}

              {/* PDF opcional */}
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">PDF de apoio (opcional)</label>
                {pdfFile ? (
                  <div className="flex items-center gap-3 p-3 bg-white/5 border border-violet-500/10 rounded-xl">
                    <FileText className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <p className="text-white text-sm truncate flex-1">{pdfFile.name}</p>
                    <button onClick={() => { setPdfFile(null); }} className="p-1.5 text-white/40 hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                ) : pdfExistente ? (
                  <div className="flex items-center gap-3 p-3 bg-white/5 border border-violet-500/10 rounded-xl">
                    <FileText className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <p className="text-white text-sm truncate flex-1">{pdfExistente.nome}</p>
                    <button onClick={() => setPdfExistente(null)} className="p-1.5 text-white/40 hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full p-3 border border-dashed border-white/20 rounded-xl hover:border-white/40 hover:bg-white/5 transition-colors">
                    <div className="flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4 text-white/30" />
                      <span className="text-white/40 text-sm">Adicionar PDF</span>
                    </div>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept=".pdf" onChange={handlePdfChange} className="hidden" />
              </div>

              {/* Pontuação */}
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">Pontos</label>
                <input type="number" value={pontos} onChange={(e) => setPontos(Number(e.target.value))} min={1} max={200}
                  className="w-full p-3 bg-white/5 border border-violet-500/10 rounded-xl text-white text-sm focus:outline-none focus:border-white/20" />
              </div>

              {/* Prazo automático */}
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-300 font-medium">Prazo automático</span>
                </div>
                <p className="text-xs text-white/40">7 dias após o professor confirmar a aula. O prazo é calculado automaticamente quando o professor clica "Aula dada".</p>
              </div>

              {/* Tipos de Entrega */}
              <div>
                <label className="text-white/60 text-sm mb-2 block">Tipos de entrega aceitos</label>
                <div className="flex gap-2">
                  {TIPOS_ENTREGA.map((tipo) => (
                    <button key={tipo.id} onClick={() => toggleTipoEntrega(tipo.id)}
                      className={`flex-1 p-2.5 rounded-xl border text-center transition-colors text-xs ${
                        tiposEntrega.includes(tipo.id) ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-violet-500/10 text-white/40'
                      }`}>
                      {tipo.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-violet-500/10 bg-[#1E1E3A] flex-shrink-0">
              {missaoEditando && (
                <button onClick={() => excluirMutation.mutate(missaoEditando.id)} className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button onClick={() => setShowPreview(true)} className="p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors">
                <Eye className="w-5 h-5" />
              </button>
              <button onClick={fecharModal} className="flex-1 p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors">Cancelar</button>
              <button onClick={() => salvarMutation.mutate()}
                disabled={!titulo.trim() || !instrucoes.trim() || salvando}
                className="flex-1 p-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {salvando ? (<><Loader2 className="w-4 h-4 animate-spin" />{uploadando ? 'Enviando...' : 'Salvando...'}</>) : missaoEditando ? 'Salvar' : 'Criar Missão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Preview — como o aluno vê */}
      {showPreview && (() => {
        const previewCor = casaAtual?.cor_hex || '#22C55E';
        return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0A0A1A] p-4">
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto">
            {/* Header preview */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/50 text-sm">Preview — Visão do aluno</p>
              <button onClick={() => setShowPreview(false)} className="p-2 text-white/40 hover:text-white bg-white/10 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pergaminho preview */}
            <div className="rounded-2xl overflow-hidden" style={{
              background: `linear-gradient(180deg, ${previewCor}12 0%, #1a1a2e 8%, #1a1a2e 92%, ${previewCor}08 100%)`,
              border: `1px solid ${previewCor}25`,
            }}>
              <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, transparent, ${previewCor}, transparent)` }} />

              <div className="px-5 pt-5 pb-3 text-center">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="h-px flex-1 max-w-[40px]" style={{ background: `linear-gradient(90deg, transparent, ${previewCor}40)` }} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">PRINCIPAL</span>
                  <div className="h-px flex-1 max-w-[40px]" style={{ background: `linear-gradient(90deg, ${previewCor}40, transparent)` }} />
                </div>
                <h1 className="text-xl font-bold text-white mb-2">{titulo || 'Título da missão'}</h1>
                <p className="text-sm text-white/40">{pontos} pts</p>
              </div>

              <div className="px-5 pb-5 space-y-4">
                {/* Por que importa */}
                {porqueImporta && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: previewCor }}>Por que essa fase importa para você</p>
                    <div className="rounded-lg p-3" style={{ backgroundColor: `${previewCor}08`, borderLeft: `2px solid ${previewCor}30` }}>
                      <p className="text-white/70 text-sm leading-relaxed text-justify">{porqueImporta}</p>
                    </div>
                  </div>
                )}

                {/* Contexto */}
                {contexto && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: `${previewCor}90` }}>Contexto</p>
                    <p className="text-white/70 text-sm leading-relaxed text-justify">{contexto}</p>
                  </div>
                )}

                {/* Lente */}
                {lente && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: `${previewCor}90` }}>Sua Lente Especial</p>
                    <div className="rounded-lg p-3" style={{ backgroundColor: `${previewCor}08`, borderLeft: `2px solid ${previewCor}40` }}>
                      <p className="text-white/80 italic leading-relaxed text-sm text-justify">"{lente}"</p>
                    </div>
                  </div>
                )}

                {/* Missão */}
                {instrucoes && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: previewCor }}>Sua Missão</p>
                    <p className="text-white/75 text-sm leading-relaxed text-justify">{instrucoes}</p>
                  </div>
                )}

                {/* Experimentos */}
                {experimentos.filter(e => e.descricao.trim()).length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: `${previewCor}90` }}>Experimentos</p>
                    <div className="space-y-2.5">
                      {experimentos.filter(e => e.descricao.trim()).map((exp, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-lg p-2.5" style={{ backgroundColor: `${previewCor}06` }}>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: `${previewCor}20`, color: previewCor }}>
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-white/90 font-medium text-sm">{exp.nome}</p>
                            <p className="text-white/50 text-xs mt-1 leading-relaxed text-justify">{exp.descricao}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reflexão */}
                {reflexao && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: `${previewCor}70` }}>Reflexão Final</p>
                    <p className="text-white/55 text-sm italic leading-relaxed text-justify">{reflexao}</p>
                  </div>
                )}
              </div>

              <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, transparent, ${previewCor}40, transparent)` }} />
            </div>
          </div>
        </div>
        );
      })()}

      {/* Modal de Habilidades */}
      {showHabModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0A0A1A] p-4">
          <div className="w-full max-w-lg bg-[#1E1E3A] border border-violet-500/10 rounded-2xl max-h-[75vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-violet-500/10 shrink-0">
              <div>
                <p className="text-white font-medium">Habilidades — {serie}° Ano</p>
                <p className="text-xs text-white/30">Semana {semana} · {habSelecionadas.size} selecionadas</p>
              </div>
              <button onClick={() => setShowHabModal(false)} className="p-1 text-white/30 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 min-h-0">
              {/* Filtro tabs */}
              <div className="flex gap-2 mb-3">
                <button onClick={() => setFiltroHab('mecanismo')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    filtroHab === 'mecanismo' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/[0.04] text-white/40 border border-transparent'
                  }`}>
                  Ativação
                </button>
                <button onClick={() => setFiltroHab('todas')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    filtroHab === 'todas' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-white/[0.04] text-white/40 border border-transparent'
                  }`}>
                  Todas (52)
                </button>
              </div>

              {/* Botão selecionar todas de ativação */}
              {filtroHab === 'mecanismo' && mapaAtivacao.nucleo.length > 0 && (
                <button onClick={() => {
                  setHabSelecionadas(prev => new Set([...prev, ...mapaAtivacao.nucleo.map((h: any) => h.id)]));
                }} className="w-full mb-3 py-2 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/20 hover:bg-amber-500/25 transition-colors">
                  + Selecionar todas de ativação
                </button>
              )}

              {/* Lista */}
              {(() => {
                const mecanismoIds = new Set([
                  ...mapaAtivacao.nucleo.map((h: any) => h.id),
                  ...mapaAtivacao.suporte.map((h: any) => h.id),
                ]);
                const dimLabels: Record<string, string> = { cognitiva: 'Cognitiva', autorregulatoria: 'Autorregulatória', social: 'Social', emocional: 'Emocional' };

                return Object.entries(dimLabels).map(([dim, label]) => {
                  const habs = filtroHab === 'mecanismo'
                    ? todasHabilidades.filter((h: any) => h.dimensao === dim && mecanismoIds.has(h.id))
                    : todasHabilidades.filter((h: any) => h.dimensao === dim);
                  if (!habs.length) return null;
                  return (
                    <div key={dim} className="mb-3">
                      <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1.5">{label}</p>
                      {habs.map((h: any) => {
                        const sel = habSelecionadas.has(h.id);
                        const isNucleo = mapaAtivacao.nucleo.some((n: any) => n.id === h.id);
                        const isSuporte = mapaAtivacao.suporte.some((s: any) => s.id === h.id);
                        return (
                          <button key={h.id} onClick={() => {
                            setHabSelecionadas(prev => { const n = new Set(prev); if (n.has(h.id)) n.delete(h.id); else n.add(h.id); return n; });
                          }} className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-left transition-colors ${sel ? 'bg-violet-500/20 border border-violet-500/30' : 'hover:bg-white/[0.04] border border-transparent'}`}>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${sel ? 'bg-violet-500 border-violet-500' : 'border-white/20'}`}>
                              {sel && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-xs flex-1 ${sel ? 'text-white' : 'text-white/60'}`}>
                              <span className="text-white/40 mr-1">{h.codigo}</span>{h.nome}
                            </span>
                            {isNucleo && <span className="text-[8px] text-amber-400/60 shrink-0">ativação</span>}
                            {isSuporte && <span className="text-[8px] text-white/20 shrink-0">suporte</span>}
                          </button>
                        );
                      })}
                    </div>
                  );
                });
              })()}
            </div>

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

export default MissoesPorCasa;
