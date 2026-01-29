import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ChevronLeft, 
  FileText, 
  Upload, 
  X, 
  Eye, 
  Download,
  MoreVertical,
  Trash2,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { CasaBrasao } from '@/components/CasaBrasao';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface Conteudo {
  id: string;
  semana: number;
  titulo: string | null;
  descricao: string | null;
  arquivo_nome: string;
  arquivo_url: string;
  arquivo_tamanho: number | null;
}

const SERIES = [
  { value: 1, label: '1º ano' },
  { value: 2, label: '2º ano' },
  { value: 3, label: '3º ano' },
  { value: 4, label: '4º ano' },
  { value: 5, label: '5º ano' },
  { value: 6, label: '6º ano' },
  { value: 7, label: '7º ano' },
  { value: 8, label: '8º ano' },
  { value: 9, label: '9º ano' },
];

const ConteudoInteligenciaAdminPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const inteligenciaId = parseInt(id || '1');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Buscar institution_id do usuário
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id
  });
  
  const institutionId = userProfile?.institution_id;
  
  const [serieSelecionada, setSerieSelecionada] = useState(1);
  const [modalAberto, setModalAberto] = useState(false);
  const [semanaAtual, setSemanaAtual] = useState(1);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Buscar inteligência
  const { data: inteligencia } = useQuery({
    queryKey: ['inteligencia', inteligenciaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inteligencias')
        .select('id, nome, emoji, cor_hex, brasao_url')
        .eq('id', inteligenciaId)
        .single();
      if (error) throw error;
      return data;
    }
  });

  // Buscar conteúdos da série selecionada
  const { data: conteudos, isLoading } = useQuery({
    queryKey: ['conteudo-inteligencia', institutionId, inteligenciaId, serieSelecionada],
    queryFn: async () => {
      if (!institutionId) return [];
      
      const { data, error } = await supabase
        .from('conteudo_inteligencia')
        .select('*')
        .eq('institution_id', institutionId)
        .eq('inteligencia_id', inteligenciaId)
        .eq('serie', serieSelecionada)
        .order('semana');

      if (error) throw error;
      return (data as Conteudo[]) || [];
    },
    enabled: !!institutionId
  });

  // Upload de arquivo
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!arquivo || !institutionId) throw new Error('Dados inválidos');

      setUploading(true);

      // 1. Upload para o Storage
      const fileExt = arquivo.name.split('.').pop();
      const fileName = `inteligencia-${inteligenciaId}/serie-${serieSelecionada}/semana-${semanaAtual}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('inteligencia-conteudos')
        .upload(fileName, arquivo, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Obter URL pública
      const { data: urlData } = supabase.storage
        .from('inteligencia-conteudos')
        .getPublicUrl(fileName);

      // 3. Verificar se já existe conteúdo para esta semana
      const { data: existente } = await supabase
        .from('conteudo_inteligencia')
        .select('id')
        .eq('institution_id', institutionId)
        .eq('inteligencia_id', inteligenciaId)
        .eq('serie', serieSelecionada)
        .eq('semana', semanaAtual)
        .maybeSingle();

      // 4. Inserir ou atualizar no banco
      if (existente) {
        const { error: updateError } = await supabase
          .from('conteudo_inteligencia')
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
          .from('conteudo_inteligencia')
          .insert({
            institution_id: institutionId,
            inteligencia_id: inteligenciaId,
            serie: serieSelecionada,
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
      queryClient.invalidateQueries({ queryKey: ['conteudo-inteligencia'] });
      queryClient.invalidateQueries({ queryKey: ['conteudo-contagem'] });
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
        .from('conteudo_inteligencia')
        .delete()
        .eq('id', conteudoId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Conteúdo removido');
      queryClient.invalidateQueries({ queryKey: ['conteudo-inteligencia'] });
      queryClient.invalidateQueries({ queryKey: ['conteudo-contagem'] });
    },
    onError: (error) => {
      toast.error('Erro ao remover: ' + error.message);
    }
  });

  const abrirModal = (semana: number, conteudoExistente?: Conteudo) => {
    setSemanaAtual(semana);
    setArquivo(null);
    setTitulo(conteudoExistente?.titulo || '');
    setDescricao(conteudoExistente?.descricao || '');
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setArquivo(null);
    setTitulo('');
    setDescricao('');
  };

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

  const formatarTamanho = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getConteudoSemana = (semana: number) => {
    return conteudos?.find(c => c.semana === semana);
  };

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
      toast.error('Erro no download');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0F172A]/95 backdrop-blur-lg border-b border-white/5">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/admin/conteudo')}
              className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {inteligencia && (
              <div className="flex items-center gap-3">
                <CasaBrasao 
                  brasaoUrl={inteligencia.brasao_url}
                  emoji={inteligencia.emoji}
                  nome={inteligencia.nome}
                  size="small"
                />
                <h1 className="text-white font-semibold text-lg">{inteligencia.nome}</h1>
              </div>
            )}
          </div>
        </div>

        {/* Tabs de Séries */}
        <div className="px-4 pb-3 overflow-x-auto">
          <div className="flex gap-2">
            {SERIES.map((serie) => (
              <button
                key={serie.value}
                onClick={() => setSerieSelecionada(serie.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  serieSelecionada === serie.value
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {serie.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 space-y-4">
        <p className="text-white/50 text-sm">
          Conteúdos do {SERIES.find(s => s.value === serieSelecionada)?.label} para {inteligencia?.nome}
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((semana) => {
              const conteudo = getConteudoSemana(semana);

              return (
                <div 
                  key={semana}
                  className="bg-white/5 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-white font-medium text-sm">Semana {semana}</p>
                  </div>

                  {conteudo ? (
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-white/50" />
                        </div>
                        
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
                              onClick={() => abrirModal(semana, conteudo)}
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
                      onClick={() => abrirModal(semana)}
                      className="w-full p-6 border-2 border-dashed border-white/15 rounded-xl hover:border-white/30 hover:bg-white/[0.02] transition-colors group"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                          <Upload className="w-5 h-5 text-white/30 group-hover:text-white/50" />
                        </div>
                        <p className="text-white/50 text-sm group-hover:text-white/70">
                          Adicionar PDF
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Upload */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E293B] rounded-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white font-semibold">
                Semana {semanaAtual} — {SERIES.find(s => s.value === serieSelecionada)?.label}
              </h3>
              <button onClick={fecharModal} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
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
                      <p className="text-white/60 text-sm">Clique para selecionar</p>
                      <p className="text-white/30 text-xs">PDF • Máximo 10MB</p>
                    </div>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-white/60 text-sm">Título (opcional)</label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Guia da Semana 1"
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-white/60 text-sm">Descrição (opcional)</label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Breve descrição do conteúdo..."
                  rows={3}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
                />
              </div>
            </div>

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
                className="flex-1 p-3 bg-indigo-500 text-white font-medium rounded-xl hover:bg-indigo-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

export default ConteudoInteligenciaAdminPage;
