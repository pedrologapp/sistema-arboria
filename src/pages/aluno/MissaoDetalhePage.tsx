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
  ExternalLink,
  Download
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

// Formatar bytes
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
          
          // Invalidar caches de notificações
          queryClient.invalidateQueries({ queryKey: ['count-aprovadas-nao-vistas'] });
          queryClient.invalidateQueries({ queryKey: ['notificacoes-por-fase'] });
          queryClient.invalidateQueries({ queryKey: ['notificacoes-por-semana'] });
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

    // Texto é SEMPRE obrigatório
    if (!textoResposta.trim()) {
      erros.push('O texto da resposta é obrigatório');
    }

    // Arquivo é opcional (só obrigatório se a missão exigir)
    if (missao?.requer_arquivo && arquivos.length === 0) {
      erros.push('É necessário anexar pelo menos um arquivo');
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
      const { data: novaEntrega, error: entregaError } = await supabase
        .from('entregas')
        .insert({
          missao_id: missao.id,
          aluno_id: user.id,
          texto_resposta: textoResposta.trim() || null,
          status: 'pendente',
          entregue_no_prazo: !isPast(new Date(missao.data_prazo)),
          numero_tentativa: (entrega?.numero_tentativa || 0) + 1
        })
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

      // 7. Sucesso
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

    // Se a missão é de uma casa específica e não é a casa do aluno, não pode enviar
    if (missao.casa_id !== null && missao.casa_id !== profile?.casa_id) {
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

  // É missão de outra casa?
  const ehMissaoDeOutraCasa = missao?.casa_id !== null && missao?.casa_id !== profile?.casa_id;

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-6 space-y-6 pb-24"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/aluno/missoes')}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar</span>
        </button>
        <span 
          className="text-lg font-bold"
          style={{ color: casaColor }}
        >
          {missao.pontos_base} pts
        </span>
      </div>

      {/* Tipo da missão */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${tipoConfig.bg} ${tipoConfig.text} ${tipoConfig.border} border`}>
        <span>{tipoConfig.emoji}</span>
        <span className="text-sm font-semibold">{tipoConfig.label}</span>
      </div>

      {/* Título */}
      <h1 className="text-2xl font-bold text-white">
        {missao.titulo}
      </h1>

      {/* Prazo */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2 text-white/60">
          <Calendar className="w-4 h-4" />
          <span>Prazo: {format(new Date(missao.data_prazo), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
        </div>
        {tempoRestante && (
          <div className={`flex items-center gap-2 ${
            tempoRestante.atrasado ? 'text-red-400' : 
            tempoRestante.urgente ? 'text-orange-400' : 'text-green-400'
          }`}>
            <Clock className="w-4 h-4" />
            <span>{tempoRestante.texto}</span>
          </div>
        )}
      </div>

      <div className="h-px bg-white/10" />

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
              <p className="font-medium text-blue-300">
                Esta missão é da Casa {missao.casa_nome}
              </p>
              <p className="text-sm text-blue-300/70 mt-1">
                Você está visualizando esta missão, mas não pode realizá-la pois pertence a outra casa.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Contexto - sempre visível */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-2"
      >
        <h2 className="text-sm font-semibold text-white/60 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          📖 CONTEXTO
        </h2>
        <p className="text-white/80 whitespace-pre-wrap leading-relaxed">
          {missao.descricao || 'Nenhum contexto adicional para esta missão.'}
        </p>
      </motion.div>

      {/* Instruções - sempre visível */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-2"
      >
        <div className="h-px bg-white/10" />
        <h2 className="text-sm font-semibold text-white/60 flex items-center gap-2 pt-2">
          📋 INSTRUÇÕES
        </h2>
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            components={{
              p: ({ children }) => (
                <p className="text-white/80 mb-4 leading-relaxed">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="text-white font-semibold">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="text-white/70 italic">{children}</em>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-1 text-white/80 mb-4 ml-2">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside space-y-1 text-white/80 mb-4 ml-2">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="text-white/80">{children}</li>
              ),
              hr: () => (
                <hr className="border-white/10 my-4" />
              ),
              h1: ({ children }) => (
                <h1 className="text-lg font-bold text-white mb-3">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-base font-semibold text-white mb-2">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-semibold text-white/90 mb-2">{children}</h3>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-white/30 pl-4 italic text-white/70 my-4">
                  {children}
                </blockquote>
              ),
            }}
          >
            {missao.instrucoes || 'Siga as orientações do professor para completar esta missão.'}
          </ReactMarkdown>
        </div>
      </motion.div>

      {/* Material de Apoio (PDF do Admin) */}
      {missao.arquivo_pdf_url && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-medium text-white">📎 Material de Apoio</h3>
          </div>
          
          {/* Card do arquivo com duas ações */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {missao.arquivo_pdf_nome || 'Material da Missão.pdf'}
              </p>
              <p className="text-xs text-white/50">PDF anexado pelo professor</p>
            </div>
            
            {/* Botões de ação */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Visualizar */}
              <a
                href={missao.arquivo_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-all"
                title="Visualizar"
              >
                <ExternalLink className="w-4 h-4 text-blue-400" />
              </a>
              
              {/* Baixar */}
              <button
                onClick={() => baixarPDF(
                  missao.arquivo_pdf_url!, 
                  missao.arquivo_pdf_nome || 'material.pdf'
                )}
                className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 transition-all"
                title="Baixar"
              >
                <Download className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Separador antes da seção de entrega */}
      <div className="h-px bg-white/10" />

      {/* Título da seção de entrega */}
      <h2 className="text-sm font-semibold text-white/60 flex items-center gap-2">
        📨 SUA ENTREGA
      </h2>

      {/* Status da entrega existente */}
      {entrega && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {/* Status Badge */}
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
            </div>
          )}

          {entrega.status === 'refazer' && (
            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
              <div className="flex items-center gap-2 text-orange-400 mb-2">
                <RefreshCw className="w-5 h-5" />
                <span className="font-medium">Refazer</span>
              </div>
              {entrega.feedback_professor && (
                <>
                  <p className="text-sm text-white/80 mb-2">
                    O professor pediu algumas correções:
                  </p>
                  <p className="text-white/60 italic text-sm bg-black/20 p-3 rounded-lg">
                    "{entrega.feedback_professor}"
                  </p>
                </>
              )}
            </div>
          )}

          {/* Resposta enviada */}
          {entrega.texto_resposta && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h4 className="text-sm text-white/60 mb-2">Sua resposta:</h4>
              <p className="text-white/80 whitespace-pre-wrap text-sm">
                {entrega.texto_resposta}
              </p>
            </div>
          )}

          {/* Arquivos enviados */}
          {entrega.arquivos.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm text-white/60">Arquivos enviados:</h4>
              <div className="space-y-2">
                {entrega.arquivos.map(arquivo => (
                  <a
                    key={arquivo.id}
                    href={arquivo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    {isImage({ tipo_arquivo: arquivo.tipo_arquivo }) ? (
                      <ImageIcon className="w-5 h-5 text-white/60" />
                    ) : (
                      <FileText className="w-5 h-5 text-white/60" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{arquivo.nome_original}</p>
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
            className="space-y-6"
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

            {/* Textarea */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-white/60 flex items-center gap-2">
                ✏️ SUA RESPOSTA
                {missao.requer_texto && <span className="text-red-400">*</span>}
              </h2>
              <div className="relative">
                <Textarea
                  value={textoResposta}
                  onChange={(e) => setTextoResposta(e.target.value)}
                  placeholder="Digite sua resposta aqui..."
                  rows={6}
                  disabled={enviando}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
                />
                <span className="absolute bottom-3 right-3 text-xs text-white/40">
                  {textoResposta.length} caracteres
                </span>
              </div>
            </div>

            {/* Upload de arquivos */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-white/60 flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                ANEXAR ARQUIVO
                {missao.requer_arquivo && <span className="text-red-400">*</span>}
              </h2>

              {/* Área de drop */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                  ${isDragging 
                    ? 'border-white/40 bg-white/10' 
                    : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/[0.07]'
                  }
                `}
              >
                <Paperclip className="w-8 h-8 text-white/40 mx-auto mb-2" />
                <p className="text-white/60 text-sm">
                  Arraste ou clique para anexar
                </p>
                <p className="text-white/40 text-xs mt-1">
                  PDF, imagens (PNG, JPG) e texto (TXT) até 10MB
                </p>
                <p className="text-amber-400/80 text-xs mt-1">
                  ⚠️ Arquivos .docx não são aceitos
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.txt"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                  disabled={enviando}
                />
              </div>

              {/* Lista de arquivos */}
              {arquivos.length > 0 && (
                <div className="space-y-2">
                  {arquivos.map((arquivo) => (
                    <motion.div
                      key={arquivo.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                    >
                      {arquivo.preview ? (
                        <img 
                          src={arquivo.preview} 
                          alt="Preview"
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-white/10 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-white/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{arquivo.file.name}</p>
                        <p className="text-xs text-white/40">{formatBytes(arquivo.file.size)}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removerArquivo(arquivo.id);
                        }}
                        disabled={enviando}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-white/60" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Botão de enviar */}
            <Button
              onClick={handleEnviar}
              disabled={enviando}
              className="w-full h-12 text-base font-semibold"
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
                  Enviar Resposta
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mensagem se não pode enviar */}
      {!mostrarFormulario && !entrega && tempoRestante?.atrasado && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 font-medium">Prazo encerrado</p>
          <p className="text-white/60 text-sm mt-1">
            Esta missão não aceita entregas atrasadas.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default MissaoDetalhePage;
