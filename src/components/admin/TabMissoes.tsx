import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Target, 
  Plus, 
  Pencil,
  Trash2,
  ChevronRight,
  AlertCircle,
  Check,
  X,
  Loader2,
  Home,
  FileText,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';
import { parseDataLocal } from '@/utils/timezone';
import { addDays, differenceInDays, format } from 'date-fns';
import MissoesPorCasa from './MissoesPorCasa';
import { ptBR } from 'date-fns/locale';

interface TabMissoesProps {
  faseId: string;
  institutionId: string;
  dataInicio: string;
  dataFim: string;
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

const TIPOS_ENTREGA = [
  { id: 'texto', label: 'Texto' },
  { id: 'imagem', label: 'Imagem/Foto' },
  { id: 'arquivo', label: 'Arquivo (PDF, DOC)' },
  { id: 'link', label: 'Link externo' },
  { id: 'audio', label: 'Áudio' },
  { id: 'video', label: 'Vídeo' },
];

const TabMissoes = ({ faseId, institutionId, dataInicio, dataFim }: TabMissoesProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modalAberto, setModalAberto] = useState(false);
  const [semanaAtual, setSemanaAtual] = useState(1);
  const [missaoEditando, setMissaoEditando] = useState<Missao | null>(null);
  const [semanaMissoesCasa, setSemanaMissoesCasa] = useState<number | null>(null);
  
  // Form state
  const [titulo, setTitulo] = useState('');
  const [contexto, setContexto] = useState('');
  const [instrucoes, setInstrucoes] = useState('');
  const [pontos, setPontos] = useState(10);
  const [tiposEntrega, setTiposEntrega] = useState<string[]>(['texto']);
  const [arquivoPdfUrl, setArquivoPdfUrl] = useState<string | null>(null);
  const [arquivoPdfNome, setArquivoPdfNome] = useState<string | null>(null);
  const [uploadando, setUploadando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Calcular semanas
  const semanas = useMemo(() => {
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
  }, [dataInicio, dataFim]);

  // Buscar missões da fase
  const { data: missoes, isLoading } = useQuery({
    queryKey: ['fase-missoes', faseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missoes')
        .select('id, fase_id, semana, tipo_missao, casa_id, titulo, contexto, instrucoes, pontos_base, requer_texto, requer_arquivo, status, arquivo_pdf_url, arquivo_pdf_nome')
        .eq('fase_id', faseId)
        .order('semana')
        .order('tipo_missao');

      if (error) throw error;
      return (data as Missao[]) || [];
    },
    enabled: !!faseId
  });

  // Contadores
  const contadores = useMemo(() => {
    const missoesGerais = missoes?.filter(m => m.tipo_missao === 'geral').length || 0;
    const missoesIndividuais = missoes?.filter(m => m.tipo_missao === 'individual').length || 0;
    const total = missoesGerais + missoesIndividuais;
    const totalEsperado = 36;
    
    return {
      gerais: missoesGerais,
      individuais: missoesIndividuais,
      total,
      totalEsperado,
      porcentagem: Math.round((total / totalEsperado) * 100)
    };
  }, [missoes]);

  // Obter missão geral de uma semana
  const getMissaoGeral = (semana: number) => {
    return missoes?.find(m => m.semana === semana && m.tipo_missao === 'geral');
  };

  // Contar missões individuais de uma semana
  const contarMissoesIndividuais = (semana: number) => {
    return missoes?.filter(m => m.semana === semana && m.tipo_missao === 'individual').length || 0;
  };

  // Formatar tipos de entrega para exibição
  const formatarTiposEntrega = (missao: Missao) => {
    const tipos: string[] = [];
    if (missao.requer_texto) tipos.push('Texto');
    if (missao.requer_arquivo) tipos.push('Arquivo');
    return tipos.length > 0 ? tipos.join(', ') : 'Texto';
  };

  // Upload de PDF
  const handleUploadPdf = async (file: File) => {
    if (!file || file.type !== 'application/pdf') {
      toast.error('Apenas arquivos PDF são permitidos');
      return;
    }
    
    setUploadando(true);
    try {
      const fileName = `missoes/${faseId}_semana${semanaAtual}_${Date.now()}.pdf`;
      
      const { error: uploadError } = await supabase.storage
        .from('fase-conteudos')
        .upload(fileName, file, { upsert: true });
        
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('fase-conteudos')
        .getPublicUrl(fileName);
        
      setArquivoPdfUrl(urlData.publicUrl);
      setArquivoPdfNome(file.name);
      toast.success('PDF enviado');
    } catch (error: any) {
      toast.error('Erro ao enviar PDF: ' + error.message);
    } finally {
      setUploadando(false);
    }
  };

  // Remover PDF
  const removerPdf = () => {
    setArquivoPdfUrl(null);
    setArquivoPdfNome(null);
  };

  // Abrir modal para criar/editar
  const abrirModal = (semana: number, missao?: Missao) => {
    setSemanaAtual(semana);
    if (missao) {
      setMissaoEditando(missao);
      setTitulo(missao.titulo);
      setContexto(missao.contexto || '');
      setInstrucoes(missao.instrucoes || '');
      setPontos(missao.pontos_base);
      setArquivoPdfUrl(missao.arquivo_pdf_url);
      setArquivoPdfNome(missao.arquivo_pdf_nome);
      
      const tipos: string[] = [];
      if (missao.requer_texto) tipos.push('texto');
      if (missao.requer_arquivo) tipos.push('arquivo');
      setTiposEntrega(tipos.length > 0 ? tipos : ['texto']);
    } else {
      setMissaoEditando(null);
      setTitulo('');
      setContexto('');
      setInstrucoes('');
      setPontos(10);
      setTiposEntrega(['texto']);
      setArquivoPdfUrl(null);
      setArquivoPdfNome(null);
    }
    setModalAberto(true);
  };

  // Fechar modal
  const fecharModal = () => {
    setModalAberto(false);
    setMissaoEditando(null);
    setTitulo('');
    setContexto('');
    setInstrucoes('');
    setPontos(10);
    setTiposEntrega(['texto']);
    setArquivoPdfUrl(null);
    setArquivoPdfNome(null);
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

  // Salvar missão
  const salvarMutation = useMutation({
    mutationFn: async () => {
      setSalvando(true);
      
      const requerTexto = tiposEntrega.includes('texto');
      const requerArquivo = tiposEntrega.some(t => ['imagem', 'arquivo', 'audio', 'video'].includes(t));
      
      const dadosMissao = {
        fase_id: faseId,
        institution_id: institutionId,
        semana: semanaAtual,
        tipo_missao: 'geral',
        tipo: 'principal',
        casa_id: null,
        titulo,
        contexto: contexto || null,
        instrucoes: instrucoes || null,
        descricao: null,
        pontos_base: pontos,
        requer_texto: requerTexto,
        requer_arquivo: requerArquivo,
        arquivo_pdf_url: arquivoPdfUrl,
        arquivo_pdf_nome: arquivoPdfNome,
        status: 'liberada',
        criado_por: user?.id,
        data_liberacao: new Date().toISOString(),
        data_prazo: new Date().toISOString(),
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
            arquivo_pdf_url: arquivoPdfUrl,
            arquivo_pdf_nome: arquivoPdfNome,
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
      queryClient.invalidateQueries({ queryKey: ['fase-missoes', faseId] });
      fecharModal();
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
    onSettled: () => {
      setSalvando(false);
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
      queryClient.invalidateQueries({ queryKey: ['fase-missoes', faseId] });
      fecharModal();
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir: ' + error.message);
    }
  });

  // Handler para abrir missões por casa
  const handleAbrirMissoesCasa = (semana: number) => {
    setSemanaMissoesCasa(semana);
  };

  // Formatar data
  const formatarData = (data: Date) => {
    return format(data, "dd MMM", { locale: ptBR });
  };

  // Se estiver vendo missões por casa, mostrar esse componente
  if (semanaMissoesCasa !== null) {
    return (
      <MissoesPorCasa
        faseId={faseId}
        institutionId={institutionId}
        semana={semanaMissoesCasa}
        dataInicio={dataInicio}
        dataFim={dataFim}
        onVoltar={() => setSemanaMissoesCasa(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Progresso */}
      <div className="space-y-4">
        <div>
          <h3 className="text-white text-lg font-medium">
            Missões da Fase
          </h3>
          <p className="text-white/40 text-sm mt-1">
            Configure as missões de cada semana
          </p>
        </div>

        {/* Barra de Progresso */}
        <div className="bg-white/5 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-sm">
              Configuradas: {contadores.total}/{contadores.totalEsperado}
            </span>
            <span className="text-white/40 text-sm">
              {contadores.porcentagem}%
            </span>
          </div>

          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                contadores.porcentagem >= 100 
                  ? 'bg-green-500' 
                  : contadores.porcentagem >= 50 
                  ? 'bg-yellow-500' 
                  : 'bg-white/40'
              }`}
              style={{ width: `${contadores.porcentagem}%` }}
            />
          </div>

          <div className="flex gap-4 text-xs text-white/40">
            <span>Gerais: {contadores.gerais}/4</span>
            <span>Individuais: {contadores.individuais}/32</span>
          </div>
        </div>
      </div>

      {/* Lista de Semanas */}
      <div className="space-y-4">
        {semanas.map((semana) => {
          const missaoGeral = getMissaoGeral(semana.numero);
          const qtdIndividuais = contarMissoesIndividuais(semana.numero);
          const temAlertaIndividuais = qtdIndividuais < 8;

          return (
            <div key={semana.numero} className="bg-white/5 rounded-xl p-4 space-y-4">
              {/* Header da Semana */}
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">
                  Semana {semana.numero}
                </h4>
                <span className="text-white/40 text-sm">
                  {formatarData(semana.inicio)} - {formatarData(semana.fim)}
                </span>
              </div>

              {/* Missão Geral */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Target className="w-4 h-4" />
                  <span>Missão Geral</span>
                </div>

                {missaoGeral ? (
                  <button
                    onClick={() => abrirModal(semana.numero, missaoGeral)}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                          <Target className="w-4 h-4 text-white/50" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {missaoGeral.titulo}
                          </p>
                          <p className="text-white/40 text-xs mt-0.5">
                            {missaoGeral.pontos_base} pts • {formatarTiposEntrega(missaoGeral)}
                          </p>
                        </div>
                      </div>
                      <Pencil className="w-4 h-4 text-white/20 group-hover:text-white/40 flex-shrink-0" />
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={() => abrirModal(semana.numero)}
                    className="w-full p-4 border border-dashed border-white/20 rounded-xl hover:border-white/40 hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4 text-white/30 group-hover:text-white/50" />
                      <span className="text-white/40 text-sm group-hover:text-white/60">
                        Adicionar missão geral
                      </span>
                    </div>
                  </button>
                )}
              </div>

              {/* Missões por Casa */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Home className="w-4 h-4" />
                  <span>Missões por Casa</span>
                </div>

                <button
                  onClick={() => handleAbrirMissoesCasa(semana.numero)}
                  className={`w-full p-4 rounded-xl border text-left transition-colors hover:bg-white/5 ${
                    temAlertaIndividuais 
                      ? 'bg-yellow-500/5 border-yellow-500/20' 
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {temAlertaIndividuais ? (
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                      <span className={`text-sm ${temAlertaIndividuais ? 'text-yellow-500' : 'text-white/60'}`}>
                        {qtdIndividuais}/8 configuradas
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/30" />
                  </div>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Missão Geral */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg bg-slate-800 rounded-xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white font-medium">
                Missão Geral — Semana {semanaAtual}
              </h3>
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
                  placeholder="Ex: Carta para você do futuro"
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
                  placeholder="Por que essa missão é importante para o aluno..."
                  rows={3}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
                />
              </div>

              {/* Missão */}
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">
                  Missão
                </label>
                <textarea
                  value={instrucoes}
                  onChange={(e) => setInstrucoes(e.target.value)}
                  placeholder="O que o aluno deve fazer..."
                  rows={4}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
                />
              </div>

              {/* PDF da Missão */}
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">
                  PDF da Missão (opcional)
                </label>
                {arquivoPdfUrl ? (
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-red-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm truncate">{arquivoPdfNome}</p>
                        <p className="text-white/40 text-xs">PDF</p>
                      </div>
                    </div>
                    <button
                      onClick={removerPdf}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-white/40" />
                    </button>
                  </div>
                ) : (
                  <label className="w-full p-4 border border-dashed border-white/20 rounded-xl hover:border-white/40 hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center gap-2">
                    {uploadando ? (
                      <>
                        <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                        <span className="text-white/40 text-sm">Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-white/30" />
                        <span className="text-white/40 text-sm">Clique para adicionar PDF</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => e.target.files?.[0] && handleUploadPdf(e.target.files[0])}
                      className="hidden"
                      disabled={uploadando}
                    />
                  </label>
                )}
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
                disabled={!titulo.trim() || salvando}
                className="flex-1 p-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
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

export default TabMissoes;
