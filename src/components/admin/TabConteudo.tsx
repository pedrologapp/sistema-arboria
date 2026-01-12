import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Upload, 
  X, 
  Eye, 
  RefreshCw,
  Loader2,
  Copy,
  Download,
  MoreVertical,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatarData, parseDataLocal } from '@/utils/timezone';
import { addDays, differenceInDays } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface TabConteudoProps {
  faseId: string;
  institutionId: string;
  dataInicio: string;
  dataFim: string;
}

interface Conteudo {
  id: string;
  semana: number;
  titulo: string | null;
  descricao: string | null;
  arquivo_nome: string;
  arquivo_url: string;
  arquivo_tamanho: number | null;
}

const TabConteudo = ({ faseId, institutionId, dataInicio, dataFim }: TabConteudoProps) => {
  const queryClient = useQueryClient();
  const [modalAberto, setModalAberto] = useState(false);
  const [semanaAtual, setSemanaAtual] = useState(1);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calcular semanas
  const semanas = (() => {
    if (!dataInicio || !dataFim) return [];
    
    const inicio = parseDataLocal(dataInicio);
    const fim = parseDataLocal(dataFim);
    const totalDias = differenceInDays(fim, inicio) + 1;
    const diasPorSemana = Math.ceil(totalDias / 4);
    
    const resultado = [];
    for (let i = 0; i < 4; i++) {
      const semanaInicio = addDays(inicio, i * diasPorSemana);
      const semanaFim = i === 3 ? fim : addDays(semanaInicio, diasPorSemana - 1);
      resultado.push({
        numero: i + 1,
        inicio: semanaInicio,
        fim: semanaFim
      });
    }
    return resultado;
  })();

  // Buscar conteúdos da fase
  const { data: conteudos, isLoading } = useQuery({
    queryKey: ['fase-conteudos', faseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fase_conteudos')
        .select('*')
        .eq('fase_id', faseId)
        .order('semana');

      if (error) throw error;
      return (data as Conteudo[]) || [];
    },
    enabled: !!faseId
  });

  // Upload de arquivo
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!arquivo) throw new Error('Nenhum arquivo selecionado');

      setUploading(true);

      // 1. Upload para o Storage
      const fileExt = arquivo.name.split('.').pop();
      const fileName = `${faseId}/semana-${semanaAtual}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('fase-conteudos')
        .upload(fileName, arquivo, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Obter URL pública
      const { data: urlData } = supabase.storage
        .from('fase-conteudos')
        .getPublicUrl(fileName);

      // 3. Verificar se já existe conteúdo para esta semana
      const { data: existente } = await supabase
        .from('fase_conteudos')
        .select('id')
        .eq('fase_id', faseId)
        .eq('semana', semanaAtual)
        .maybeSingle();

      // 4. Inserir ou atualizar no banco
      if (existente) {
        const { error: updateError } = await supabase
          .from('fase_conteudos')
          .update({
            titulo: titulo || null,
            descricao: descricao || null,
            arquivo_nome: arquivo.name,
            arquivo_url: urlData.publicUrl,
            arquivo_tamanho: arquivo.size,
            updated_at: new Date().toISOString()
          })
          .eq('id', existente.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('fase_conteudos')
          .insert({
            fase_id: faseId,
            institution_id: institutionId,
            semana: semanaAtual,
            titulo: titulo || null,
            descricao: descricao || null,
            arquivo_nome: arquivo.name,
            arquivo_url: urlData.publicUrl,
            arquivo_tamanho: arquivo.size
          });

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      toast.success('Conteúdo salvo com sucesso');
      queryClient.invalidateQueries({ queryKey: ['fase-conteudos', faseId] });
      fecharModal();
    },
    onError: (error) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
    onSettled: () => {
      setUploading(false);
    }
  });

  // Remover conteúdo
  const removerMutation = useMutation({
    mutationFn: async (conteudoId: string) => {
      const { error } = await supabase
        .from('fase_conteudos')
        .delete()
        .eq('id', conteudoId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Conteúdo removido');
      queryClient.invalidateQueries({ queryKey: ['fase-conteudos', faseId] });
    },
    onError: (error) => {
      toast.error('Erro ao remover: ' + error.message);
    }
  });

  // Abrir modal
  const abrirModal = (semana: number, conteudoExistente?: Conteudo) => {
    setSemanaAtual(semana);
    setArquivo(null);
    setTitulo(conteudoExistente?.titulo || '');
    setDescricao(conteudoExistente?.descricao || '');
    setModalAberto(true);
  };

  // Fechar modal
  const fecharModal = () => {
    setModalAberto(false);
    setArquivo(null);
    setTitulo('');
    setDescricao('');
  };

  // Handler de arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setArquivo(file);
    }
  };

  // Formatar tamanho do arquivo
  const formatarTamanho = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Obter conteúdo de uma semana
  const getConteudoSemana = (semana: number) => {
    return conteudos?.find(c => c.semana === semana);
  };

  // Copiar link
  const copiarLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  // Download via fetch/blob (funciona cross-origin)
  const baixarPDF = async (url: string, nomeArquivo: string) => {
    try {
      toast.info('Iniciando download...');
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
      
      toast.success('Download concluído!');
    } catch {
      // Fallback: copiar link
      await navigator.clipboard.writeText(url);
      toast.error('Erro no download. Link copiado.', {
        description: 'Cole o link no navegador para baixar.'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-white font-semibold text-sm uppercase tracking-wider">
          Material de Apoio
        </h2>
        <p className="text-white/40 text-xs">
          PDFs disponíveis para professores consultarem
        </p>
      </div>

      {/* Lista de Semanas */}
      <div className="space-y-4">
        {semanas.map((semana) => {
          const conteudo = getConteudoSemana(semana.numero);

          return (
            <div 
              key={semana.numero}
              className="bg-[#1E293B] rounded-xl p-4 space-y-3"
            >
              {/* Header da Semana */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium text-sm">
                    Semana {semana.numero}
                  </p>
                  <p className="text-white/40 text-xs">
                    {formatarData(semana.inicio)} - {formatarData(semana.fim)}
                  </p>
                </div>
              </div>

              {/* Conteúdo ou Upload */}
              {conteudo ? (
                <div className="bg-white/5 rounded-xl p-4">
                  {/* Header com info e menu */}
                  <div className="flex items-start gap-3">
                    {/* Ícone PDF */}
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-white/50" />
                    </div>
                    
                    {/* Info do arquivo */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {conteudo.arquivo_nome}
                      </p>
                      {conteudo.arquivo_tamanho && (
                        <p className="text-white/40 text-xs mt-0.5">
                          {formatarTamanho(conteudo.arquivo_tamanho)}
                        </p>
                      )}
                    </div>
                    
                    {/* Menu de ações secundárias */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/60 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end" 
                        className="bg-[#1E293B] border-white/10 min-w-[160px]"
                      >
                        <DropdownMenuItem 
                          onClick={() => copiarLink(conteudo.arquivo_url)}
                          className="text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copiar link
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => abrirModal(semana.numero, conteudo)}
                          className="text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Substituir
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem 
                          onClick={() => removerMutation.mutate(conteudo.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {/* Botões principais */}
                  <div className="flex gap-2 mt-4">
                    <a
                      href={conteudo.arquivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 border border-white/20 rounded-lg text-white/70 text-sm hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Visualizar
                    </a>
                    <button
                      onClick={() => baixarPDF(conteudo.arquivo_url, conteudo.arquivo_nome)}
                      className="flex items-center gap-1.5 px-4 py-2 border border-white/20 rounded-lg text-white/70 text-sm hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Baixar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => abrirModal(semana.numero)}
                  className="w-full p-8 border-2 border-dashed border-white/15 rounded-xl hover:border-white/30 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                      <Upload className="w-5 h-5 text-white/30 group-hover:text-white/50" />
                    </div>
                    <div className="text-center">
                      <p className="text-white/50 text-sm group-hover:text-white/70">
                        Clique para adicionar PDF
                      </p>
                      <p className="text-white/30 text-xs mt-1">
                        ou arraste o arquivo aqui
                      </p>
                    </div>
                  </div>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de Upload */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E293B] rounded-2xl max-w-md w-full overflow-hidden">
            {/* Header Modal */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white font-semibold">
                Adicionar Conteúdo — Semana {semanaAtual}
              </h3>
              <button onClick={fecharModal} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo Modal */}
            <div className="p-4 space-y-4">
              {/* Upload Area */}
              <div className="space-y-2">
                <label className="text-white/60 text-sm">Arquivo</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {arquivo ? (
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    <FileText className="w-5 h-5 text-white/60" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{arquivo.name}</p>
                      <p className="text-white/40 text-xs">
                        {formatarTamanho(arquivo.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => setArquivo(null)}
                      className="text-white/40 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-8 border border-dashed border-white/20 rounded-xl hover:border-white/40 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-white/30" />
                      <p className="text-white/60 text-sm">
                        Clique para selecionar
                      </p>
                      <p className="text-white/30 text-xs">
                        PDF • Máximo 10MB
                      </p>
                    </div>
                  </button>
                )}
              </div>

              {/* Título */}
              <div className="space-y-2">
                <label className="text-white/60 text-sm">
                  Título (opcional)
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Introdução à inteligência intrapessoal"
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <label className="text-white/60 text-sm">
                  Descrição (opcional)
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Breve descrição do conteúdo..."
                  rows={3}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
                />
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex gap-3 p-4 border-t border-white/10">
              <button
                onClick={fecharModal}
                className="flex-1 p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => uploadMutation.mutate()}
                disabled={!arquivo || uploading}
                className="flex-1 p-3 bg-white text-black font-medium rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabConteudo;
