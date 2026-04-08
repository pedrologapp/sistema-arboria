import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  FileText, 
  Paperclip, 
  X, 
  Send, 
  CheckCircle2, 
  RefreshCw,
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  Trophy,
  Info,
  Download,
  Camera,
  File
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useStudent } from '@/contexts/StudentContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, isPast, differenceInDays, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Interfaces
interface MissaoDetalhe {
  id: string;
  titulo: string;
  descricao: string | null;
  instrucoes: string | null;
  contexto: string | null;
  lente_especial: string | null;
  itens: { nome: string; descricao: string }[] | null;
  reflexao: string | null;
  tipo: 'principal' | 'secundaria' | 'bonus';
  tipo_missao: 'geral' | 'individual' | null;
  pontos_base: number;
  data_prazo: string;
  data_liberacao: string;
  requer_arquivo: boolean;
  requer_texto: boolean;
  permite_entrega_atrasada: boolean;
  casa_id: number | null;
  casa_nome: string | null;
  casa_cor: string | null;
  casa_emoji: string | null;
  arquivo_pdf_url: string | null;
  arquivo_pdf_nome: string | null;
}

interface ArquivoEntrega {
  id: string;
  nome_original: string;
  url: string;
  tamanho_bytes: number | null;
  tipo_arquivo: string | null;
}

interface Entrega {
  id: string;
  status: string | null;
  texto_resposta: string | null;
  data_entrega: string | null;
  nota: number | null;
  pontos_concedidos: number | null;
  feedback_professor: string | null;
  numero_tentativa: number | null;
  visualizada_pelo_aluno: boolean | null;
  arquivos: ArquivoEntrega[];
}

interface ArquivoParaUpload {
  file: File;
  preview?: string;
  id: string;
}

// Configuração de tipo de missão
const getTipoConfig = (tipo: string) => {
  switch (tipo) {
    case 'principal':
      return { emoji: '🎯', label: 'PRINCIPAL', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' };
    case 'secundaria':
      return { emoji: '📚', label: 'SECUNDÁRIA', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' };
    case 'bonus':
      return { emoji: '⭐', label: 'BÔNUS', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' };
    default:
      return { emoji: '📋', label: 'MISSÃO', bg: 'bg-white/10', text: 'text-white', border: 'border-white/20' };
  }
};

// PDF Viewer com Google Docs proxy + fallback
const PdfViewerInline = ({ pdfUrl, pdfNome, casaColor, onBaixar }: { 
  pdfUrl: string; pdfNome: string; casaColor: string; onBaixar: () => void 
}) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`;

  useEffect(() => {
    setStatus('loading');
    timerRef.current = setTimeout(() => {
      setStatus(prev => prev === 'loading' ? 'error' : prev);
    }, 8000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [pdfUrl]);

  if (status === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-violet-500/10 bg-white/5 p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: `${casaColor}20` }}>
            <FileText className="w-6 h-6" style={{ color: casaColor }} />
          </div>
          <div>
            <p className="font-semibold text-white">{pdfNome}</p>
            <p className="text-xs text-white/50">PDF da missão</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => window.open(pdfUrl, '_blank')}
            className="flex-1 gap-2"
            style={{ background: casaColor }}
          >
            <FileText className="w-4 h-4" /> Abrir Missão
          </Button>
          <Button variant="outline" onClick={onBaixar} className="gap-2 border-white/20 text-white hover:bg-white/10">
            <Download className="w-4 h-4" /> Baixar
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
      {status === 'loading' && (
        <div className="rounded-xl border border-violet-500/10 bg-white/5 flex items-center justify-center" style={{ height: '70vh', minHeight: '400px' }}>
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: casaColor }} />
            <p className="text-white/50 text-sm">Carregando PDF...</p>
          </div>
        </div>
      )}
      <div className="rounded-xl overflow-hidden shadow-lg border border-violet-500/10" style={{ boxShadow: `0 0 20px ${casaColor}10`, display: status === 'loading' ? 'none' : 'block' }}>
        <iframe
          src={googleViewerUrl}
          className="w-full bg-white"
          style={{ height: '70vh', minHeight: '400px' }}
          title="PDF da Missão"
          onLoad={() => { setStatus('loaded'); if (timerRef.current) clearTimeout(timerRef.current); }}
        />
      </div>
      <button onClick={onBaixar} className="flex items-center gap-2 mx-auto text-white/50 hover:text-white/80 text-sm transition-colors">
        <Download className="w-4 h-4" />
        <span>Baixar PDF</span>
      </button>
    </motion.div>
  );
};


const formatBytes = (bytes: number | null) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Verificar se é imagem
const isImage = (file: File | { tipo_arquivo: string | null }) => {
  const type = 'type' in file ? file.type : file.tipo_arquivo;
  return type?.startsWith('image/');
};

const MissaoDetalhePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { casaColor, profile } = useStudent();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  // Estados
  const [missao, setMissao] = useState<MissaoDetalhe | null>(null);
  const [entrega, setEntrega] = useState<Entrega | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados do formulário
  const [textoResposta, setTextoResposta] = useState('');
  const [respostasItens, setRespostasItens] = useState<Record<number, string>>({});
  const [reflexaoResposta, setReflexaoResposta] = useState('');
  const [arquivos, setArquivos] = useState<ArquivoParaUpload[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [errosValidacao, setErrosValidacao] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Chave do rascunho
  const DRAFT_KEY = `missao_draft_${id}`;

  // Download via fetch/blob (funciona cross-origin)
  const baixarPDF = async (url: string, nomeArquivo: string) => {
    try {
      toast({
        title: "Iniciando download...",
        description: "Aguarde um momento"
      });
      
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      
      toast({
        title: "Download concluído!",
        description: nomeArquivo
      });
    } catch {
      toast({
        title: "Erro no download",
        description: "Tente visualizar o PDF e salvar manualmente",
        variant: "destructive"
      });
    }
  };

  // Buscar dados da missão
  const fetchMissao = useCallback(async () => {
    if (!id || !user) return;

    setLoading(true);
    setError(null);

    try {
      // Buscar missão
      const { data: missaoData, error: missaoError } = await supabase
        .from('missoes')
        .select(`
          id,
          titulo,
          descricao,
          instrucoes,
          contexto,
          lente_especial,
          itens,
          reflexao,
          tipo,
          tipo_missao,
          pontos_base,
          data_prazo,
          data_liberacao,
          requer_arquivo,
          requer_texto,
          permite_entrega_atrasada,
          casa_id,
          arquivo_pdf_url,
          arquivo_pdf_nome,
          casa:inteligencias!missoes_casa_id_fkey (
            nome,
            cor_hex,
            emoji
          )
        `)
        .eq('id', id)
        .single();

      if (missaoError) throw missaoError;
      if (!missaoData) throw new Error('Missão não encontrada');

      const inteligenciaData = missaoData.casa as { nome: string; cor_hex: string; emoji: string } | null;
      
      // Parse itens from JSONB
      const parsedItens = missaoData.itens ? (missaoData.itens as any as { nome: string; descricao: string }[]) : null;

      setMissao({
        id: missaoData.id,
        titulo: missaoData.titulo,
        descricao: missaoData.descricao,
        instrucoes: missaoData.instrucoes,
        contexto: (missaoData as any).contexto || missaoData.descricao || null,
        lente_especial: (missaoData as any).lente_especial || null,
        itens: parsedItens,
        reflexao: (missaoData as any).reflexao || null,
        tipo: missaoData.tipo as 'principal' | 'secundaria' | 'bonus',
        tipo_missao: (missaoData as any).tipo_missao || 'geral',
        pontos_base: missaoData.pontos_base,
        data_prazo: missaoData.data_prazo,
        data_liberacao: missaoData.data_liberacao,
        requer_arquivo: missaoData.requer_arquivo ?? false,
        requer_texto: missaoData.requer_texto ?? true,
        permite_entrega_atrasada: missaoData.permite_entrega_atrasada ?? false,
        casa_id: missaoData.casa_id ?? null,
        casa_nome: inteligenciaData?.nome ?? null,
        casa_cor: inteligenciaData?.cor_hex ?? null,
        casa_emoji: inteligenciaData?.emoji ?? null,
        arquivo_pdf_url: missaoData.arquivo_pdf_url ?? null,
        arquivo_pdf_nome: missaoData.arquivo_pdf_nome ?? null,
      });

      // Buscar entrega existente
      const { data: entregaData } = await supabase
        .from('entregas')
        .select(`
          id,
          status,
          texto_resposta,
          data_entrega,
          nota,
          pontos_concedidos,
          feedback_professor,
          numero_tentativa,
          visualizada_pelo_aluno
        `)
        .eq('missao_id', id)
        .eq('aluno_id', user.id)
        .order('numero_tentativa', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (entregaData) {
        // Buscar arquivos da entrega
        const { data: arquivosData } = await supabase
          .from('entrega_arquivos')
          .select('*')
          .eq('entrega_id', entregaData.id);

        // Generate signed URLs for private bucket
        const arquivosComUrl = await Promise.all(
          (arquivosData || []).map(async (arq) => {
            if (arq.nome_storage) {
              const { data: signedUrlData } = await supabase.storage
                .from('entregas')
                .createSignedUrl(arq.nome_storage, 3600);
              return { ...arq, url: signedUrlData?.signedUrl || arq.url };
            }
            return arq;
          })
        );

        setEntrega({
          ...entregaData,
          arquivos: arquivosComUrl
        });
        
        // Se a entrega foi aprovada e ainda não foi visualizada, marcar como visualizada
        if (entregaData.status === 'aprovada' && entregaData.visualizada_pelo_aluno === false) {
          await supabase
            .from('entregas')
            .update({ visualizada_pelo_aluno: true })
            .eq('id', entregaData.id);
          
          // Invalidar TODOS os caches de notificações
          queryClient.invalidateQueries({ queryKey: ['count-aprovadas-nao-vistas'] });
          queryClient.invalidateQueries({ queryKey: ['count-missoes-pendentes'] });
          queryClient.invalidateQueries({ queryKey: ['notificacoes-por-fase'] });
          queryClient.invalidateQueries({ queryKey: ['notificacoes-por-semana'] });
          queryClient.invalidateQueries({ queryKey: ['missoes-urgentes'] });
        }
      }

    } catch (err: any) {
      console.error('Erro ao buscar missão:', err);
      setError(err.message || 'Erro ao carregar missão');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  // Carregar rascunho do localStorage
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const { texto } = JSON.parse(draft);
        if (texto) setTextoResposta(texto);
      } catch (e) {
        // Ignorar erro de parse
      }
    }
  }, [DRAFT_KEY]);

  // Salvar rascunho (debounced)
  useEffect(() => {
    if (!textoResposta) return;
    
    const timeout = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        texto: textoResposta,
        timestamp: Date.now()
      }));
    }, 500);

    return () => clearTimeout(timeout);
  }, [textoResposta, DRAFT_KEY]);

  // Buscar ao montar
  useEffect(() => {
    fetchMissao();
  }, [fetchMissao]);

  // Handlers de arquivo
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const novosArquivos: ArquivoParaUpload[] = [];
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    Array.from(files).forEach(file => {
      if (file.size > MAX_SIZE) {
        toast({
          variant: "destructive",
          title: "Arquivo muito grande",
          description: `${file.name} excede o limite de 10MB`
        });
        return;
      }

      const arquivoUpload: ArquivoParaUpload = {
        file,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      // Criar preview para imagens
      if (file.type.startsWith('image/')) {
        arquivoUpload.preview = URL.createObjectURL(file);
      }

      novosArquivos.push(arquivoUpload);
    });

    setArquivos(prev => [...prev, ...novosArquivos]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removerArquivo = (id: string) => {
    setArquivos(prev => {
      const arquivo = prev.find(a => a.id === id);
      if (arquivo?.preview) {
        URL.revokeObjectURL(arquivo.preview);
      }
      return prev.filter(a => a.id !== id);
    });
  };

  // Validação
  const validar = (): string[] => {
    const erros: string[] = [];

    // Texto é obrigatório
    if (!textoResposta.trim()) {
      erros.push('Escreva sua resposta antes de enviar');
    }

    return erros;
  };

  // Enviar entrega
  const handleEnviar = async () => {
    if (!missao || !user) return;

    const erros = validar();
    if (erros.length > 0) {
      setErrosValidacao(erros);
      return;
    }

    setErrosValidacao([]);
    setEnviando(true);

    try {
      // 1. Criar registro de entrega
      // Build respostas_itens array from individual responses
      const respostasItensArray = missao.itens?.map((item, index) => ({
        item_index: index,
        nome: item.nome,
        resposta: respostasItens[index] || ''
      })).filter(r => r.resposta.trim()) || null;

      const { data: novaEntrega, error: entregaError } = await supabase
        .from('entregas')
        .insert({
          missao_id: missao.id,
          aluno_id: user.id,
          texto_resposta: textoResposta.trim() || null,
          respostas_itens: respostasItensArray,
          reflexao_resposta: reflexaoResposta.trim() || null,
          status: 'pendente',
          entregue_no_prazo: !isPast(new Date(missao.data_prazo)),
          numero_tentativa: (entrega?.numero_tentativa || 0) + 1
        } as any)
        .select()
        .single();

      if (entregaError) throw entregaError;

      // 2. Upload de arquivos
      for (const arquivo of arquivos) {
        const timestamp = Date.now();
        const safeFileName = arquivo.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${user.id}/${novaEntrega.id}/${timestamp}_${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('entregas')
          .upload(filePath, arquivo.file);

        if (uploadError) {
          console.error('Erro no upload:', uploadError);
          toast({
            variant: "destructive",
            title: "Erro ao enviar arquivo",
            description: `Não foi possível enviar "${arquivo.file.name}". Tente outro formato.`
          });
          continue;
        }

        // Gerar URL assinada (bucket privado)
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('entregas')
          .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

        const fileUrl = signedUrlData?.signedUrl || '';

        // 3. Registrar arquivo
        await supabase
          .from('entrega_arquivos')
          .insert({
            entrega_id: novaEntrega.id,
            nome_original: arquivo.file.name,
            nome_storage: filePath,
            url: fileUrl,
            tamanho_bytes: arquivo.file.size,
            tipo_arquivo: arquivo.file.type
          });
      }

      // 4. Limpar rascunho
      localStorage.removeItem(DRAFT_KEY);

      // 5. Limpar previews
      arquivos.forEach(a => {
        if (a.preview) URL.revokeObjectURL(a.preview);
      });

      // 6. Invalidar cache de missões pendentes
      queryClient.invalidateQueries({ queryKey: ['count-missoes-pendentes'] });

      // 7. Log de atividade
      import('@/utils/logActivity').then(({ logActivity }) =>
        logActivity(user.id, 'missao_entrega', {
          missao_id: missao.id,
          missao_titulo: missao.titulo,
          casa: missao.casa_nome,
        })
      );

      // 8. Sucesso
      toast({
        title: "🎉 Resposta enviada!",
        description: "Sua entrega foi registrada com sucesso."
      });

      navigate('/aluno/missoes');

    } catch (err: any) {
      console.error('Erro ao enviar:', err);
      toast({
        variant: "destructive",
        title: "Erro ao enviar",
        description: err.message || "Tente novamente em alguns instantes."
      });
    } finally {
      setEnviando(false);
    }
  };

  // Calcular tempo restante
  const getTempoRestante = () => {
    if (!missao) return null;
    
    const prazo = new Date(missao.data_prazo);
    const agora = new Date();
    
    if (isPast(prazo)) {
      return { texto: 'Prazo encerrado', atrasado: true };
    }
    
    const dias = differenceInDays(prazo, agora);
    const horas = differenceInHours(prazo, agora) % 24;
    
    if (dias > 1) {
      return { texto: `Faltam ${dias} dias`, atrasado: false };
    } else if (dias === 1) {
      return { texto: `Falta 1 dia e ${horas}h`, atrasado: false };
    } else {
      return { texto: `Faltam ${horas} horas`, atrasado: false, urgente: true };
    }
  };

  // Pode enviar resposta?
  const podeEnviar = () => {
    if (!missao) return false;

    // Missões GERAIS podem ser feitas por qualquer aluno da série
    // Missões INDIVIDUAIS só pela casa específica
    if (missao.tipo_missao === 'individual' && missao.casa_id !== null && missao.casa_id !== profile?.casa_id) {
      return false;
    }

    // Se nunca enviou
    if (!entrega) {
      // Verificar se está no prazo ou permite atrasada
      if (isPast(new Date(missao.data_prazo)) && !missao.permite_entrega_atrasada) {
        return false;
      }
      return true;
    }

    // Se já enviou e está aprovada, não pode mais
    if (entrega.status === 'aprovada') return false;

    // Se status é 'refazer', pode reenviar
    if (entrega.status === 'refazer') return true;

    // Se está pendente, não pode (aguardando avaliação)
    return false;
  };

  // É missão de outra casa? Só para missões INDIVIDUAIS
  const ehMissaoDeOutraCasa = missao?.tipo_missao === 'individual' && missao?.casa_id !== null && missao?.casa_id !== profile?.casa_id;

  // Loading state
  if (loading) {
    return (
      <div className="py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Error state
  if (error || !missao) {
    return (
      <div className="py-6">
        <button
          onClick={() => navigate('/aluno/missoes')}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar</span>
        </button>

        <div className="p-6 rounded-xl border border-red-500/30 bg-red-500/10 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-400 mb-2">
            {error || 'Missão não encontrada'}
          </h2>
          <Button
            variant="outline"
            onClick={fetchMissao}
            className="mt-4"
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const tipoConfig = getTipoConfig(missao.tipo);
  const tempoRestante = getTempoRestante();
  const mostrarFormulario = podeEnviar();

  // Determine display context
  const displayContexto = missao.contexto || missao.descricao;
  const hasNewFormat = !!(missao.lente_especial || missao.itens?.length || missao.reflexao || missao.contexto);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-6 space-y-5 pb-32"
    >
      {/* Header com cor da casa */}
      <div 
        className="rounded-xl p-4 -mx-1"
        style={{ backgroundColor: `${casaColor}15`, borderLeft: `3px solid ${casaColor}` }}
      >
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => navigate('/aluno/missoes')}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </button>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${tipoConfig.bg} ${tipoConfig.text} ${tipoConfig.border} border`}>
            <span>{tipoConfig.emoji}</span>
            <span className="text-sm font-semibold">{tipoConfig.label}</span>
          </div>
        </div>
        
        {/* Título no header */}
        <h1 className="text-xl font-bold text-white mb-2">
          {missao.titulo}
        </h1>

        {/* Status */}
        {entrega && (
          <div className="mb-2">
            {entrega.status === 'pendente' && (
              <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                ✅ Enviada — Aguardando avaliação
              </span>
            )}
            {entrega.status === 'aprovada' && (
              <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                🌟 Aprovada — {entrega.nota}/10
              </span>
            )}
            {entrega.status === 'refazer' && (
              <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                🔄 Refazer — Veja o feedback
              </span>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-4 text-sm text-white/60">
          <span className="font-bold text-lg" style={{ color: casaColor }}>
            ⭐ {missao.pontos_base} pts
          </span>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Prazo: {format(new Date(missao.data_prazo), "dd/MM/yyyy", { locale: ptBR })}</span>
          </div>
          {tempoRestante && (
            <span className={
              tempoRestante.atrasado ? 'text-red-400' : 
              tempoRestante.urgente ? 'text-orange-400' : 'text-green-400'
            }>
              {tempoRestante.texto}
            </span>
          )}
        </div>
      </div>

      {/* Banner de aviso para missão de outra casa */}
      {ehMissaoDeOutraCasa && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30"
        >
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-300">Esta missão é da Casa {missao.casa_nome}</p>
              <p className="text-sm text-blue-300/70 mt-1">Você não pode realizá-la pois pertence a outra casa.</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* PDF VIEWER INLINE */}
      {/* ═══════════════════════════════════════ */}
      {missao.arquivo_pdf_url ? (
        <PdfViewerInline
          pdfUrl={missao.arquivo_pdf_url}
          pdfNome={missao.arquivo_pdf_nome || 'missao.pdf'}
          casaColor={casaColor}
          onBaixar={() => baixarPDF(missao.arquivo_pdf_url!, missao.arquivo_pdf_nome || 'missao.pdf')}
        />
      
      ) : (
        /* ═══════════════════════════════════════ */
        /* FALLBACK: Conteúdo em texto */
        /* ═══════════════════════════════════════ */
        <>
          {/* Card CONTEXTO */}
          {displayContexto && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-violet-500/10 bg-white/5 p-4"
            >
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2 mb-3">
                📖 CONTEXTO
              </h2>
              <p className="text-white/80 whitespace-pre-wrap leading-relaxed">
                {displayContexto}
              </p>
            </motion.div>
          )}

          {/* Card LENTE ESPECIAL */}
          {missao.lente_especial && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-xl p-4"
              style={{ backgroundColor: `${casaColor}10`, border: `1px solid ${casaColor}30` }}
            >
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2 mb-2">
                🔍 SUA LENTE ESPECIAL
              </h2>
              <p className="text-white/90 italic text-lg leading-relaxed">
                "{missao.lente_especial}"
              </p>
            </motion.div>
          )}

          {/* Card SUA MISSÃO */}
          {missao.instrucoes && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl border border-violet-500/10 bg-white/5 p-4"
            >
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2 mb-3">
                🎯 SUA MISSÃO
              </h2>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="text-white/80 mb-3 leading-relaxed">{children}</p>,
                    strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="text-white/70 italic">{children}</em>,
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-white/80 mb-3 ml-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 text-white/80 mb-3 ml-2">{children}</ol>,
                    li: ({ children }) => <li className="text-white/80">{children}</li>,
                    blockquote: ({ children }) => <blockquote className="border-l-2 border-white/30 pl-4 italic text-white/70 my-3">{children}</blockquote>,
                  }}
                >
                  {missao.instrucoes}
                </ReactMarkdown>
              </div>
            </motion.div>
          )}

          {/* Card ITENS (view only) */}
          {missao.itens && missao.itens.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-xl border border-violet-500/10 bg-white/5 p-4"
            >
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2 mb-4">
                📝 O QUE REGISTRAR
              </h2>
              <div className="space-y-3">
                {missao.itens.map((item, index) => {
                  const numEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
                  return (
                    <div key={index}>
                      <p className="text-white font-semibold text-sm">
                        {numEmojis[index] || `${index + 1}.`} {item.nome}
                      </p>
                      {item.descricao && <p className="text-white/50 text-xs mt-0.5">{item.descricao}</p>}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Card REFLEXÃO */}
          {missao.reflexao && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl p-4"
              style={{ backgroundColor: `${casaColor}08`, border: `1px solid ${casaColor}20` }}
            >
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2 mb-2">
                💭 REFLEXÃO FINAL
              </h2>
              <p className="text-white/70 text-sm italic">{missao.reflexao}</p>
            </motion.div>
          )}
        </>
      )}

      {/* Separador */}
      <div className="h-px bg-white/10" />

      {/* ═══════════════════════════════════════ */}
      {/* SEÇÃO: SUA RESPOSTA */}
      {/* ═══════════════════════════════════════ */}
      <h2 className="text-sm font-semibold text-white/60 flex items-center gap-2">
        📤 SUA RESPOSTA
      </h2>

      {/* Feedback do professor (se refazer) */}
      {entrega?.status === 'refazer' && entrega.feedback_professor && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30"
        >
          <div className="flex items-center gap-2 text-orange-400 mb-2">
            <RefreshCw className="w-5 h-5" />
            <span className="font-medium">O professor pediu ajustes</span>
          </div>
          <p className="text-white/80 text-sm">Leia o feedback e envie novamente:</p>
          <p className="text-white/60 italic text-sm bg-black/20 p-3 rounded-lg mt-2">
            "{entrega.feedback_professor}"
          </p>
        </motion.div>
      )}

      {/* Status da entrega */}
      {entrega && entrega.status !== 'refazer' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {entrega.status === 'pendente' && (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Clock className="w-5 h-5" />
                <span className="font-medium">Aguardando avaliação</span>
              </div>
              <p className="text-sm text-white/60">
                Enviado em {entrega.data_entrega ? format(new Date(entrega.data_entrega), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}
              </p>
            </div>
          )}

          {entrega.status === 'aprovada' && (
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Aprovada!</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-green-400">{entrega.nota}</span>
                  <span className="text-white/60">/10</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-green-300">
                <Trophy className="w-4 h-4" />
                <span className="text-sm">+{entrega.pontos_concedidos} pontos conquistados!</span>
              </div>
              {entrega.feedback_professor && (
                <p className="text-white/60 italic text-sm mt-3 bg-black/20 p-3 rounded-lg">
                  "{entrega.feedback_professor}"
                </p>
              )}
            </div>
          )}

          {/* Resposta enviada */}
          {entrega.texto_resposta && (
            <div className="p-4 rounded-xl bg-white/5 border border-violet-500/10">
              <h4 className="text-sm text-white/60 mb-2">Sua resposta:</h4>
              <p className="text-white/80 whitespace-pre-wrap text-sm">{entrega.texto_resposta}</p>
            </div>
          )}

          {/* Arquivos enviados */}
          {entrega.arquivos.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm text-white/60">Arquivos enviados:</h4>
              <div className="grid grid-cols-2 gap-2">
                {entrega.arquivos.map(arquivo => (
                  <a
                    key={arquivo.id}
                    href={arquivo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    {isImage({ tipo_arquivo: arquivo.tipo_arquivo }) ? (
                      <ImageIcon className="w-4 h-4 text-white/60 flex-shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-white/60 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{arquivo.nome_original}</p>
                      <p className="text-xs text-white/40">{formatBytes(arquivo.tamanho_bytes)}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Formulário de entrega */}
      <AnimatePresence>
        {mostrarFormulario && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.3 }}
            className="space-y-5"
          >
            {/* Erros de validação */}
            {errosValidacao.length > 0 && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                {errosValidacao.map((erro, i) => (
                  <div key={i} className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{erro}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Instrução */}
            <p className="text-white/50 text-sm">
              Escreva sua resposta. Você também pode anexar fotos ou arquivos.
            </p>

            {/* Botões de upload em linha */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={enviando}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-white/5 border border-violet-500/10 hover:bg-white/10 transition-colors text-white/70"
              >
                <Camera className="w-5 h-5" />
                <span className="text-sm">Foto</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={enviando}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-white/5 border border-violet-500/10 hover:bg-white/10 transition-colors text-white/70"
              >
                <File className="w-5 h-5" />
                <span className="text-sm">Arquivo</span>
              </button>
            </div>

            {/* Hidden inputs */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              disabled={enviando}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              disabled={enviando}
            />

            {/* Grid de previews */}
            {arquivos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {arquivos.map((arquivo) => (
                  <motion.div
                    key={arquivo.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative rounded-lg overflow-hidden bg-white/5 border border-violet-500/10 aspect-square"
                  >
                    {arquivo.preview ? (
                      <img 
                        src={arquivo.preview} 
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2">
                        <FileText className="w-6 h-6 text-white/40 mb-1" />
                        <p className="text-xs text-white/50 truncate w-full text-center">{arquivo.file.name}</p>
                      </div>
                    )}
                    <button
                      onClick={() => removerArquivo(arquivo.id)}
                      disabled={enviando}
                      className="absolute top-1 right-1 p-1 bg-black/70 rounded-full hover:bg-black/90 transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                      <p className="text-[10px] text-white/70 truncate">{formatBytes(arquivo.file.size)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Textarea comentário */}
            <div className="space-y-2">
              <label className="text-sm text-white/50">Sua resposta <span className="text-red-400">*</span></label>
              <div className="relative">
                <Textarea
                  value={textoResposta}
                  onChange={(e) => setTextoResposta(e.target.value)}
                  placeholder="Escreva um comentário ou sua resposta..."
                  rows={4}
                  disabled={enviando}
                  className="bg-white/5 border-violet-500/10 text-white placeholder:text-white/30 resize-none"
                />
                {textoResposta.length > 0 && (
                  <span className="absolute bottom-3 right-3 text-xs text-white/40">
                    {textoResposta.length}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mensagem se não pode enviar */}
      {!mostrarFormulario && !entrega && tempoRestante?.atrasado && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 font-medium">Prazo encerrado</p>
          <p className="text-white/60 text-sm mt-1">Esta missão não aceita entregas atrasadas.</p>
        </div>
      )}

      {/* Botão Enviar Entrega inline */}
      {mostrarFormulario && (
        <div className="mt-4">
          <Button
            onClick={handleEnviar}
            disabled={enviando || !textoResposta.trim()}
            className="w-full h-12 text-base font-semibold rounded-xl shadow-lg"
            style={{ 
              backgroundColor: casaColor,
              color: 'white'
            }}
          >
            {enviando ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                📤 Enviar Entrega
              </>
            )}
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default MissaoDetalhePage;
