import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowLeft,
  User,
  Users,
  Leaf,
  Calculator,
  BookOpen,
  Palette,
  Activity,
  Music,
  Plus,
  Check,
  X,
  Loader2,
  Trash2,
  FileText,
  Upload,
  Eye,
  Calendar,
  Clock,
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
  dataInicio: string;
  dataFim: string;
  onVoltar: () => void;
}

interface Missao {
  id: string;
  fase_id: string;
  semana: number | null;
  tipo_missao: string | null;
  casa_id: number | null;
  titulo: string;
  contexto: string | null;
  instrucoes: string | null;
  pontos_base: number;
  requer_texto: boolean | null;
  requer_arquivo: boolean | null;
  status: string | null;
  arquivo_pdf_url: string | null;
  arquivo_pdf_nome: string | null;
}

interface Inteligencia {
  id: number;
  nome: string;
  codigo: string;
  cor_hex: string | null;
  brasao_url: string | null;
  ordem: number | null;
}

// Mapeamento de ícones por código
const ICONES_CASAS: Record<string, LucideIcon> = {
  linguistica: BookOpen,
  logico_matematica: Calculator,
  espacial: Palette,
  musical: Music,
  corporal_cinestesica: Activity,
  naturalista: Leaf,
  interpessoal: Users,
  intrapessoal: User,
};

const TIPOS_ENTREGA = [
  { id: 'texto', label: 'Texto' },
  { id: 'imagem', label: 'Imagem/Foto' },
  { id: 'arquivo', label: 'Arquivo (PDF, DOC)' },
  { id: 'link', label: 'Link externo' },
  { id: 'audio', label: 'Áudio' },
  { id: 'video', label: 'Vídeo' },
];

const MissoesPorCasa = ({ 
  faseId, 
  institutionId,
  semana, 
  dataInicio, 
  dataFim, 
  onVoltar 
}: MissoesPorCasaProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [modalAberto, setModalAberto] = useState(false);
  const [casaAtual, setCasaAtual] = useState<Inteligencia | null>(null);
  const [missaoEditando, setMissaoEditando] = useState<Missao | null>(null);
  
  // Form state
  const [titulo, setTitulo] = useState('');
  const [contexto, setContexto] = useState('');
  const [instrucoes, setInstrucoes] = useState('');
  const [pontos, setPontos] = useState(15);
  const [tiposEntrega, setTiposEntrega] = useState<string[]>(['texto']);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfExistente, setPdfExistente] = useState<{ url: string; nome: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [uploadando, setUploadando] = useState(false);
  
  // Form state - Prazo
  const [dataPrazo, setDataPrazo] = useState('');
  const [horaPrazo, setHoraPrazo] = useState('23:59');

  // Calcular período da semana
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

  // Buscar inteligências
  const { data: inteligencias } = useQuery({
    queryKey: ['inteligencias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inteligencias')
        .select('id, nome, codigo, cor_hex, brasao_url, ordem')
        .order('ordem');

      if (error) throw error;
      return (data as Inteligencia[]) || [];
    }
  });

  // Buscar missões individuais desta semana
  const { data: missoes, isLoading } = useQuery({
    queryKey: ['missoes-individuais', faseId, semana],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missoes')
        .select('id, fase_id, semana, tipo_missao, casa_id, titulo, contexto, instrucoes, pontos_base, requer_texto, requer_arquivo, status, arquivo_pdf_url, arquivo_pdf_nome')
        .eq('fase_id', faseId)
        .eq('semana', semana)
        .eq('tipo_missao', 'individual');

      if (error) throw error;
      return (data as Missao[]) || [];
    },
    enabled: !!faseId
  });

  // Obter missão de uma casa
  const getMissaoCasa = (casaId: number) => {
    return missoes?.find(m => m.casa_id === casaId);
  };

  // Contadores
  const totalConfiguradas = missoes?.length || 0;
  const porcentagem = Math.round((totalConfiguradas / 8) * 100);

  // Formatar data
  const formatarData = (data: Date) => {
    return format(data, "dd MMM", { locale: ptBR });
  };

  // Abrir modal
  const abrirModal = (casa: Inteligencia, missao?: Missao) => {
    setCasaAtual(casa);
    if (missao) {
      setMissaoEditando(missao);
      setTitulo(missao.titulo);
      setContexto(missao.contexto || '');
      setInstrucoes(missao.instrucoes || '');
      setPontos(missao.pontos_base);
      setPdfExistente(missao.arquivo_pdf_url ? { url: missao.arquivo_pdf_url, nome: missao.arquivo_pdf_nome || 'arquivo.pdf' } : null);
      
      const tipos: string[] = [];
      if (missao.requer_texto) tipos.push('texto');
      if (missao.requer_arquivo) tipos.push('arquivo');
      setTiposEntrega(tipos.length > 0 ? tipos : ['texto']);
      
      // Carregar prazo existente
      if ((missao as any).data_prazo) {
        const dtPrazo = new Date((missao as any).data_prazo);
        setDataPrazo(format(dtPrazo, 'yyyy-MM-dd'));
        setHoraPrazo(format(dtPrazo, 'HH:mm'));
      } else {
        // Padrão: fim da semana
        setDataPrazo(periodoSemana.fim ? format(periodoSemana.fim, 'yyyy-MM-dd') : '');
        setHoraPrazo('23:59');
      }
    } else {
      setMissaoEditando(null);
      setTitulo('');
      setContexto('');
      setInstrucoes('');
      setPontos(15);
      setTiposEntrega(['texto']);
      setPdfExistente(null);
      // Padrão para nova missão: fim da semana
      setDataPrazo(periodoSemana.fim ? format(periodoSemana.fim, 'yyyy-MM-dd') : '');
      setHoraPrazo('23:59');
    }
    setPdfFile(null);
    setModalAberto(true);
  };

  // Fechar modal
  const fecharModal = () => {
    setModalAberto(false);
    setCasaAtual(null);
    setMissaoEditando(null);
    setTitulo('');
    setContexto('');
    setInstrucoes('');
    setPontos(15);
    setTiposEntrega(['texto']);
    setPdfFile(null);
    setPdfExistente(null);
    setDataPrazo('');
    setHoraPrazo('23:59');
  };

  // Toggle tipo de entrega
  const toggleTipoEntrega = (tipo: string) => {
    if (tiposEntrega.includes(tipo)) {
      if (tiposEntrega.length > 1) {
        setTiposEntrega(tiposEntrega.filter(t => t !== tipo));
      }
    } else {
      setTiposEntrega([...tiposEntrega, tipo]);
    }
  };

  // Handler de arquivo PDF
  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Apenas arquivos PDF são permitidos');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo: 10MB');
        return;
      }
      setPdfFile(file);
      setPdfExistente(null);
    }
  };

  // Remover PDF
  const removerPdf = () => {
    setPdfFile(null);
    setPdfExistente(null);
  };

  // Formatar tamanho do arquivo
  const formatarTamanho = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Salvar missão
  const salvarMutation = useMutation({
    mutationFn: async () => {
      if (!casaAtual) throw new Error('Casa não selecionada');
      setSalvando(true);

      let pdfUrl = pdfExistente?.url || null;
      let pdfNome = pdfExistente?.nome || null;

      // Upload do PDF se houver novo arquivo
      if (pdfFile) {
        setUploadando(true);
        const fileExt = pdfFile.name.split('.').pop();
        const fileName = `missoes/${faseId}/${semana}/${casaAtual.id}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('fase-conteudos')
          .upload(fileName, pdfFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('fase-conteudos')
          .getPublicUrl(fileName);

        pdfUrl = urlData.publicUrl;
        pdfNome = pdfFile.name;
        setUploadando(false);
      }

      const requerTexto = tiposEntrega.includes('texto');
      const requerArquivo = tiposEntrega.some(t => ['imagem', 'arquivo', 'audio', 'video'].includes(t));

      const dadosMissao = {
        fase_id: faseId,
        institution_id: institutionId,
        semana,
        tipo_missao: 'individual' as const,
        tipo: 'principal',
        casa_id: casaAtual.id,
        titulo,
        contexto: contexto || null,
        instrucoes: instrucoes || null,
        descricao: null,
        pontos_base: pontos,
        requer_texto: requerTexto,
        requer_arquivo: requerArquivo,
        arquivo_pdf_url: pdfUrl,
        arquivo_pdf_nome: pdfNome,
        status: 'liberada',
        criado_por: user?.id,
        data_liberacao: new Date().toISOString(),
        data_prazo: dataPrazo ? new Date(`${dataPrazo}T${horaPrazo}`).toISOString() : new Date().toISOString(),
      };

      if (missaoEditando) {
        const { error } = await supabase
          .from('missoes')
          .update({
            titulo,
            contexto: contexto || null,
            instrucoes: instrucoes || null,
            descricao: null,
            pontos_base: pontos,
            requer_texto: requerTexto,
            requer_arquivo: requerArquivo,
            arquivo_pdf_url: pdfUrl,
            arquivo_pdf_nome: pdfNome,
            data_prazo: dataPrazo ? new Date(`${dataPrazo}T${horaPrazo}`).toISOString() : undefined,
            updated_at: new Date().toISOString()
          })
          .eq('id', missaoEditando.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('missoes')
          .insert(dadosMissao);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(missaoEditando ? 'Missão atualizada' : 'Missão criada');
      queryClient.invalidateQueries({ queryKey: ['missoes-individuais', faseId, semana] });
      queryClient.invalidateQueries({ queryKey: ['fase-missoes', faseId] });
      fecharModal();
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
    onSettled: () => {
      setSalvando(false);
      setUploadando(false);
    }
  });

  // Excluir missão
  const excluirMutation = useMutation({
    mutationFn: async (missaoId: string) => {
      const { error } = await supabase
        .from('missoes')
        .delete()
        .eq('id', missaoId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Missão excluída');
      queryClient.invalidateQueries({ queryKey: ['missoes-individuais', faseId, semana] });
      queryClient.invalidateQueries({ queryKey: ['fase-missoes', faseId] });
      fecharModal();
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir: ' + error.message);
    }
  });

  // Obter ícone da casa
  const getIconeCasa = (codigo: string): LucideIcon => {
    return ICONES_CASAS[codigo] || User;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <button
          onClick={onVoltar}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Voltar</span>
        </button>
        
        <h3 className="text-white text-lg font-medium">
          Missões por Casa
        </h3>
        <p className="text-white/40 text-sm">
          Semana {semana} • {periodoSemana.inicio && formatarData(periodoSemana.inicio)} - {periodoSemana.fim && formatarData(periodoSemana.fim)}
        </p>
      </div>

      {/* Progresso */}
      <div className="bg-white/5 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-white/60 text-sm">
            Configuradas: {totalConfiguradas}/8
          </span>
          <span className="text-white/40 text-sm">
            {porcentagem}%
          </span>
        </div>

        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              porcentagem >= 100 
                ? 'bg-green-500' 
                : porcentagem >= 50 
                ? 'bg-yellow-500' 
                : 'bg-white/40'
            }`}
            style={{ width: `${porcentagem}%` }}
          />
        </div>
      </div>

      {/* Lista de Casas */}
      <div className="space-y-3">
        {inteligencias?.map((casa) => {
          const missao = getMissaoCasa(casa.id);
          const IconeCasa = getIconeCasa(casa.codigo);
          const configurada = !!missao;

          return (
            <button
              key={casa.id}
              onClick={() => abrirModal(casa, missao || undefined)}
              className={`w-full p-4 rounded-xl border text-left transition-colors hover:bg-white/5 ${
                configurada 
                  ? 'bg-white/5 border-white/10' 
                  : 'border-dashed border-white/20'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Ícone da Casa */}
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: casa.cor_hex ? `${casa.cor_hex}20` : 'rgba(255,255,255,0.1)' }}
                >
                  <IconeCasa 
                    className="w-5 h-5" 
                    style={{ color: casa.cor_hex || 'rgba(255,255,255,0.5)' }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">
                    {casa.nome}
                  </p>
                  
                  {configurada ? (
                    <p className="text-white/40 text-xs truncate mt-0.5">
                      {missao.titulo} • {missao.pontos_base} pts
                    </p>
                  ) : (
                    <p className="text-white/30 text-xs mt-0.5">
                      Clique para adicionar
                    </p>
                  )}
                </div>

                {/* Indicador */}
                {configurada ? (
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <Plus className="w-5 h-5 text-white/30 flex-shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal de Missão */}
      {modalAberto && casaAtual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg bg-slate-800 rounded-xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: casaAtual.cor_hex ? `${casaAtual.cor_hex}20` : 'rgba(255,255,255,0.1)' }}
                >
                  {(() => {
                    const IconeCasa = getIconeCasa(casaAtual.codigo);
                    return <IconeCasa className="w-4 h-4" style={{ color: casaAtual.cor_hex || 'rgba(255,255,255,0.5)' }} />;
                  })()}
                </div>
                <div>
                  <h3 className="text-white font-medium">
                    {casaAtual.nome}
                  </h3>
                  <p className="text-white/40 text-xs">
                    Semana {semana}
                  </p>
                </div>
              </div>
              <button onClick={fecharModal} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Título */}
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">
                  Título *
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Diário de emoções"
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20"
                />
              </div>

              {/* Contexto */}
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">
                  Contexto
                </label>
                <textarea
                  value={contexto}
                  onChange={(e) => setContexto(e.target.value)}
                  placeholder="Explique o cenário ou situação para o aluno..."
                  rows={3}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
                />
              </div>

              {/* Missão */}
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">
                  Missão *
                </label>
                <textarea
                  value={instrucoes}
                  onChange={(e) => setInstrucoes(e.target.value)}
                  placeholder="Descreva o que o aluno deve fazer..."
                  rows={4}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
                />
              </div>

              {/* PDF da Missão */}
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">
                  PDF da Missão (opcional)
                </label>
                <p className="text-white/30 text-xs mb-3">
                  Arquivo que o aluno pode baixar como apoio
                </p>

                {pdfFile ? (
                  <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{pdfFile.name}</p>
                      <p className="text-white/40 text-xs">
                        {formatarTamanho(pdfFile.size)}
                      </p>
                    </div>
                    <button
                      onClick={removerPdf}
                      className="p-2 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : pdfExistente ? (
                  <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{pdfExistente.nome}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={pdfExistente.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <button
                        onClick={removerPdf}
                        className="p-2 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 border border-dashed border-white/20 rounded-xl hover:border-white/40 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Upload className="w-5 h-5 text-white/30" />
                      <span className="text-white/40 text-sm">
                        Adicionar PDF
                      </span>
                    </div>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfChange}
                  className="hidden"
                />
              </div>

              {/* Pontuação */}
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">
                  Pontuação
                </label>
                <input
                  type="number"
                  value={pontos}
                  onChange={(e) => setPontos(Number(e.target.value))}
                  min={1}
                  max={100}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-white/20"
                />
              </div>

              {/* Prazo de Entrega */}
              <div>
                <label className="text-white/60 text-sm mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  Prazo de entrega *
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dataPrazo}
                    onChange={(e) => setDataPrazo(e.target.value)}
                    className="flex-1 p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-white/20"
                  />
                  <div className="flex items-center gap-1.5 p-3 bg-white/5 border border-white/10 rounded-xl">
                    <Clock className="w-4 h-4 text-white/40" />
                    <input
                      type="time"
                      value={horaPrazo}
                      onChange={(e) => setHoraPrazo(e.target.value)}
                      className="bg-transparent text-white text-sm focus:outline-none w-20"
                    />
                  </div>
                </div>
              </div>

              {/* Tipos de Entrega */}
              <div>
                <label className="text-white/60 text-sm mb-3 block">
                  Tipos de entrega aceitos
                </label>
                <div className="space-y-2">
                  {TIPOS_ENTREGA.map((tipo) => (
                    <button
                      key={tipo.id}
                      onClick={() => toggleTipoEntrega(tipo.id)}
                      className={`w-full p-3 rounded-xl border text-left transition-colors flex items-center gap-3 ${
                        tiposEntrega.includes(tipo.id)
                          ? 'bg-white/10 border-white/20 text-white'
                          : 'bg-white/5 border-white/10 text-white/40'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                        tiposEntrega.includes(tipo.id)
                          ? 'bg-white border-white'
                          : 'border-white/20'
                      }`}>
                        {tiposEntrega.includes(tipo.id) && (
                          <Check className="w-3 h-3 text-black" />
                        )}
                      </div>
                      <span className="text-sm">{tipo.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-white/10 bg-[#1a1a1a] flex-shrink-0">
              {missaoEditando && (
                <button
                  onClick={() => excluirMutation.mutate(missaoEditando.id)}
                  className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={fecharModal}
                className="flex-1 p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => salvarMutation.mutate()}
                disabled={!titulo.trim() || !instrucoes.trim() || !dataPrazo || salvando}
                className="flex-1 p-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {uploadando ? 'Enviando...' : 'Salvando...'}
                  </>
                ) : missaoEditando ? (
                  'Salvar Alterações'
                ) : (
                  'Criar Missão'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissoesPorCasa;
