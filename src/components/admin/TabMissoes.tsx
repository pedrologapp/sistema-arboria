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
  Upload,
  Calendar,
  Clock
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
  descricao: string | null;
  instrucoes: string | null;
  dicas: string | null;
  reflexao: string | null;
  pontos_base: number;
  tipo: string | null;
  requer_texto: boolean | null;
  requer_arquivo: boolean | null;
  status: string | null;
  arquivo_pdf_url: string | null;
  arquivo_pdf_nome: string | null;
  serie_filtro: number | null;
  turma_filtro: string | null;
  data_liberacao: string | null;
  data_liberacao_6ano: string | null;
  data_liberacao_7ano: string | null;
  data_liberacao_8ano: string | null;
  data_liberacao_9ano: string | null;
  data_prazo: string | null;
}

// Constantes
const CATEGORIAS = [
  { id: 'principal', label: 'Principal', pontos: 100, desc: 'Missão central' },
  { id: 'secundaria', label: 'Secundária', pontos: 50, desc: 'Complementar' },
  { id: 'bonus', label: 'Bônus', pontos: 75, desc: 'Desafio extra' },
];

const SERIES = [
  { id: 6, label: '6º' },
  { id: 7, label: '7º' },
  { id: 8, label: '8º' },
  { id: 9, label: '9º' },
];

const TURMAS = ['A', 'B', 'C', 'D'];

const TabMissoes = ({ faseId, institutionId, dataInicio, dataFim }: TabMissoesProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modalAberto, setModalAberto] = useState(false);
  const [semanaAtual, setSemanaAtual] = useState(1);
  const [missaoEditando, setMissaoEditando] = useState<Missao | null>(null);
  const [semanaMissoesCasa, setSemanaMissoesCasa] = useState<number | null>(null);
  
  // Form state - Conteúdo
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [instrucoes, setInstrucoes] = useState('');
  const [dicas, setDicas] = useState('');
  const [reflexao, setReflexao] = useState('');
  
  // Form state - Configurações
  const [categoria, setCategoria] = useState<'principal' | 'secundaria' | 'bonus'>('secundaria');
  const [pontosCustom, setPontosCustom] = useState(50);
  const [seriesSelecionadas, setSeriesSelecionadas] = useState<number[]>([6, 7, 8, 9]);
  const [turmasFiltro, setTurmasFiltro] = useState<string[]>([]);
  
  // Form state - Liberação
  const [liberacao, setLiberacao] = useState<'agora' | 'agendado'>('agora');
  const [dataLiberacao6ano, setDataLiberacao6ano] = useState('');
  const [horaLiberacao6ano, setHoraLiberacao6ano] = useState('08:00');
  const [dataLiberacao7ano, setDataLiberacao7ano] = useState('');
  const [horaLiberacao7ano, setHoraLiberacao7ano] = useState('08:00');
  const [dataLiberacao8ano, setDataLiberacao8ano] = useState('');
  const [horaLiberacao8ano, setHoraLiberacao8ano] = useState('08:00');
  const [dataLiberacao9ano, setDataLiberacao9ano] = useState('');
  const [horaLiberacao9ano, setHoraLiberacao9ano] = useState('08:00');
  
  // Form state - Prazo
  const [dataPrazo, setDataPrazo] = useState('');
  const [horaPrazo, setHoraPrazo] = useState('23:59');
  
  // Form state - Entrega
  const [requerTexto, setRequerTexto] = useState(true);
  const [requerArquivo, setRequerArquivo] = useState(false);
  
  // PDF
  const [arquivoPdfUrl, setArquivoPdfUrl] = useState<string | null>(null);
  const [arquivoPdfNome, setArquivoPdfNome] = useState<string | null>(null);
  const [uploadando, setUploadando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Calcular pontos baseado na categoria
  const pontosFinais = useMemo(() => {
    return CATEGORIAS.find(c => c.id === categoria)?.pontos || 50;
  }, [categoria]);

  // Toggle turma
  const toggleTurma = (turma: string) => {
    if (turmasFiltro.includes(turma)) {
      setTurmasFiltro(turmasFiltro.filter(t => t !== turma));
    } else {
      setTurmasFiltro([...turmasFiltro, turma]);
    }
  };

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
        .select('id, fase_id, semana, tipo_missao, casa_id, titulo, descricao, instrucoes, dicas, reflexao, pontos_base, tipo, requer_texto, requer_arquivo, status, arquivo_pdf_url, arquivo_pdf_nome, serie_filtro, turma_filtro, data_liberacao, data_liberacao_6ano, data_liberacao_7ano, data_liberacao_8ano, data_liberacao_9ano, data_prazo')
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

  // Formatar categoria para exibição
  const formatarCategoria = (missao: Missao) => {
    const cat = CATEGORIAS.find(c => c.id === missao.tipo);
    return cat ? `${cat.label} (${missao.pontos_base} pts)` : `${missao.pontos_base} pts`;
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

  // Toggle série
  const toggleSerie = (serieId: number) => {
    if (seriesSelecionadas.includes(serieId)) {
      if (seriesSelecionadas.length > 1) {
        setSeriesSelecionadas(seriesSelecionadas.filter(s => s !== serieId));
      }
    } else {
      setSeriesSelecionadas([...seriesSelecionadas, serieId]);
    }
  };

  // Abrir modal para criar/editar
  const abrirModal = (semana: number, missao?: Missao) => {
    setSemanaAtual(semana);
    if (missao) {
      setMissaoEditando(missao);
      setTitulo(missao.titulo);
      setDescricao(missao.descricao || '');
      setInstrucoes(missao.instrucoes || '');
      setDicas(missao.dicas || '');
      setReflexao(missao.reflexao || '');
      setArquivoPdfUrl(missao.arquivo_pdf_url);
      setArquivoPdfNome(missao.arquivo_pdf_nome);
      
      // Categoria
      const cat = CATEGORIAS.find(c => c.id === missao.tipo);
      if (cat) {
        setCategoria(missao.tipo as any);
      } else {
        setCategoria('secundaria');
      }
      
      // Séries
      if (missao.serie_filtro) {
        setSeriesSelecionadas([missao.serie_filtro]);
      } else {
        setSeriesSelecionadas([6, 7, 8, 9]);
      }
      
      // Turmas
      if (missao.turma_filtro) {
        setTurmasFiltro(missao.turma_filtro.split(',').map(t => t.trim()));
      } else {
        setTurmasFiltro([]);
      }
      
      // Liberação
      if (missao.data_liberacao_6ano || missao.data_liberacao_7ano || missao.data_liberacao_8ano || missao.data_liberacao_9ano) {
        setLiberacao('agendado');
        if (missao.data_liberacao_6ano) {
          const dt6 = new Date(missao.data_liberacao_6ano);
          setDataLiberacao6ano(format(dt6, 'yyyy-MM-dd'));
          setHoraLiberacao6ano(format(dt6, 'HH:mm'));
        }
        if (missao.data_liberacao_7ano) {
          const dt7 = new Date(missao.data_liberacao_7ano);
          setDataLiberacao7ano(format(dt7, 'yyyy-MM-dd'));
          setHoraLiberacao7ano(format(dt7, 'HH:mm'));
        }
        if (missao.data_liberacao_8ano) {
          const dt8 = new Date(missao.data_liberacao_8ano);
          setDataLiberacao8ano(format(dt8, 'yyyy-MM-dd'));
          setHoraLiberacao8ano(format(dt8, 'HH:mm'));
        }
        if (missao.data_liberacao_9ano) {
          const dt9 = new Date(missao.data_liberacao_9ano);
          setDataLiberacao9ano(format(dt9, 'yyyy-MM-dd'));
          setHoraLiberacao9ano(format(dt9, 'HH:mm'));
        }
      } else {
        setLiberacao('agora');
        setDataLiberacao6ano('');
        setHoraLiberacao6ano('08:00');
        setDataLiberacao7ano('');
        setHoraLiberacao7ano('08:00');
        setDataLiberacao8ano('');
        setHoraLiberacao8ano('08:00');
        setDataLiberacao9ano('');
        setHoraLiberacao9ano('08:00');
      }
      
      // Prazo
      if (missao.data_prazo) {
        const dtPrazo = new Date(missao.data_prazo);
        setDataPrazo(format(dtPrazo, 'yyyy-MM-dd'));
        setHoraPrazo(format(dtPrazo, 'HH:mm'));
      } else {
        setDataPrazo('');
        setHoraPrazo('23:59');
      }
      
      // Entrega
      setRequerTexto(missao.requer_texto ?? true);
      setRequerArquivo(missao.requer_arquivo ?? false);
    } else {
      resetarFormulario();
    }
    setModalAberto(true);
  };

  // Resetar formulário
  const resetarFormulario = () => {
    setMissaoEditando(null);
    setTitulo('');
    setDescricao('');
    setInstrucoes('');
    setDicas('');
    setReflexao('');
    setCategoria('secundaria');
    setPontosCustom(50);
    setSeriesSelecionadas([6, 7, 8, 9]);
    setTurmasFiltro([]);
    setLiberacao('agora');
    setDataLiberacao6ano('');
    setHoraLiberacao6ano('08:00');
    setDataLiberacao7ano('');
    setHoraLiberacao7ano('08:00');
    setDataLiberacao8ano('');
    setHoraLiberacao8ano('08:00');
    setDataLiberacao9ano('');
    setHoraLiberacao9ano('08:00');
    setDataPrazo('');
    setHoraPrazo('23:59');
    setRequerTexto(true);
    setRequerArquivo(false);
    setArquivoPdfUrl(null);
    setArquivoPdfNome(null);
  };

  // Fechar modal
  const fecharModal = () => {
    setModalAberto(false);
    resetarFormulario();
  };

  // Salvar missão
  const salvarMutation = useMutation({
    mutationFn: async () => {
      setSalvando(true);
      
      // Validações
      if (!titulo.trim()) throw new Error('Título é obrigatório');
      if (!descricao.trim()) throw new Error('Descrição é obrigatória');
      if (!dataPrazo) throw new Error('Prazo de entrega é obrigatório');
      if (seriesSelecionadas.length === 0) throw new Error('Selecione pelo menos uma série');
      if (!requerTexto && !requerArquivo) throw new Error('Selecione pelo menos um tipo de entrega');
      
      // Calcular data de liberação principal (mais cedo entre as séries)
      const agora = new Date();
      let dataLiberacaoFinal = agora.toISOString();
      let status = 'liberada';
      
      if (liberacao === 'agendado') {
        const datas: Date[] = [];
        if (seriesSelecionadas.includes(6) && dataLiberacao6ano) {
          datas.push(new Date(`${dataLiberacao6ano}T${horaLiberacao6ano}`));
        }
        if (seriesSelecionadas.includes(7) && dataLiberacao7ano) {
          datas.push(new Date(`${dataLiberacao7ano}T${horaLiberacao7ano}`));
        }
        if (seriesSelecionadas.includes(8) && dataLiberacao8ano) {
          datas.push(new Date(`${dataLiberacao8ano}T${horaLiberacao8ano}`));
        }
        if (seriesSelecionadas.includes(9) && dataLiberacao9ano) {
          datas.push(new Date(`${dataLiberacao9ano}T${horaLiberacao9ano}`));
        }
        if (datas.length > 0) {
          const maisProxima = new Date(Math.min(...datas.map(d => d.getTime())));
          dataLiberacaoFinal = maisProxima.toISOString();
          status = maisProxima > agora ? 'agendada' : 'liberada';
        }
      }
      
      const dadosMissao = {
        fase_id: faseId,
        institution_id: institutionId,
        criado_por: user?.id,
        semana: semanaAtual,
        tipo_missao: 'geral',
        casa_id: null,
        
        // Conteúdo
        titulo,
        descricao: descricao || null,
        instrucoes: instrucoes || null,
        dicas: dicas || null,
        reflexao: reflexao || null,
        
        // Configurações
        tipo: categoria,
        pontos_base: pontosFinais,
        
        // Séries (se todas selecionadas, null = todas)
        serie_filtro: seriesSelecionadas.length === 4 ? null : seriesSelecionadas[0],
        
        // Turmas
        turma_filtro: turmasFiltro.length > 0 ? turmasFiltro.join(', ') : null,
        
        // Datas
        data_liberacao: dataLiberacaoFinal,
        data_prazo: new Date(`${dataPrazo}T${horaPrazo}`).toISOString(),
        data_liberacao_6ano: liberacao === 'agendado' && seriesSelecionadas.includes(6) && dataLiberacao6ano 
          ? new Date(`${dataLiberacao6ano}T${horaLiberacao6ano}`).toISOString() 
          : null,
        data_liberacao_7ano: liberacao === 'agendado' && seriesSelecionadas.includes(7) && dataLiberacao7ano 
          ? new Date(`${dataLiberacao7ano}T${horaLiberacao7ano}`).toISOString() 
          : null,
        data_liberacao_8ano: liberacao === 'agendado' && seriesSelecionadas.includes(8) && dataLiberacao8ano 
          ? new Date(`${dataLiberacao8ano}T${horaLiberacao8ano}`).toISOString() 
          : null,
        data_liberacao_9ano: liberacao === 'agendado' && seriesSelecionadas.includes(9) && dataLiberacao9ano 
          ? new Date(`${dataLiberacao9ano}T${horaLiberacao9ano}`).toISOString() 
          : null,
        
        // Entrega
        requer_texto: requerTexto,
        requer_arquivo: requerArquivo,
        
        // PDF
        arquivo_pdf_url: arquivoPdfUrl,
        arquivo_pdf_nome: arquivoPdfNome,
        
        status,
      };

      if (missaoEditando) {
        const { error } = await supabase
          .from('missoes')
          .update({
            titulo: dadosMissao.titulo,
            descricao: dadosMissao.descricao,
            instrucoes: dadosMissao.instrucoes,
            dicas: dadosMissao.dicas,
            reflexao: dadosMissao.reflexao,
            tipo: dadosMissao.tipo,
            pontos_base: dadosMissao.pontos_base,
            serie_filtro: dadosMissao.serie_filtro,
            turma_filtro: dadosMissao.turma_filtro,
            data_liberacao: dadosMissao.data_liberacao,
            data_prazo: dadosMissao.data_prazo,
            data_liberacao_6ano: dadosMissao.data_liberacao_6ano,
            data_liberacao_7ano: dadosMissao.data_liberacao_7ano,
            data_liberacao_8ano: dadosMissao.data_liberacao_8ano,
            data_liberacao_9ano: dadosMissao.data_liberacao_9ano,
            requer_texto: dadosMissao.requer_texto,
            requer_arquivo: dadosMissao.requer_arquivo,
            arquivo_pdf_url: dadosMissao.arquivo_pdf_url,
            arquivo_pdf_nome: dadosMissao.arquivo_pdf_nome,
            status: dadosMissao.status,
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
                            {formatarCategoria(missaoGeral)}
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
          <div className="w-full max-w-lg bg-slate-900 rounded-t-2xl sm:rounded-2xl max-h-[75vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-white/10 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">
                  {missaoEditando ? 'Editar Missão' : 'Nova Missão'} — Semana {semanaAtual}
                </h3>
                <button onClick={fecharModal} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>
              <p className="text-white/40 text-sm mt-1">
                Geral • {seriesSelecionadas.length === 4 ? 'Todas as séries' : seriesSelecionadas.map(s => `${s}º`).join(', ')}
                {turmasFiltro.length > 0 && ` • Turmas ${turmasFiltro.join(', ')}`}
              </p>
            </div>

            {/* Conteúdo */}
            <div className="p-4 space-y-5 overflow-y-auto flex-1 pb-6">
              
              {/* Séries */}
              <div>
                <label className="text-white/60 text-sm mb-2 block font-medium">
                  Série(s) *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {SERIES.map((serie) => (
                    <button
                      key={serie.id}
                      onClick={() => toggleSerie(serie.id)}
                      className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                        seriesSelecionadas.includes(serie.id)
                          ? 'bg-white/15 border-white/30 text-white'
                          : 'bg-white/5 border-white/10 text-white/40'
                      }`}
                    >
                      {serie.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Turmas */}
              <div>
                <label className="text-white/60 text-sm mb-2 block font-medium">
                  Turma(s) <span className="text-white/30">(opcional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {TURMAS.map((turma) => (
                    <button
                      key={turma}
                      onClick={() => toggleTurma(turma)}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                        turmasFiltro.includes(turma)
                          ? 'bg-white/15 border-white/30 text-white'
                          : 'bg-white/5 border-white/10 text-white/40'
                      }`}
                    >
                      {turma}
                    </button>
                  ))}
                </div>
                {turmasFiltro.length === 0 && (
                  <p className="text-xs text-white/30 mt-1.5">Deixe vazio para todas as turmas</p>
                )}
              </div>
                  {SERIES.map((serie) => (
                    <button
                      key={serie.id}
                      onClick={() => toggleSerie(serie.id)}
                      className={`flex-1 p-3 rounded-xl border transition-colors flex items-center justify-center gap-2 ${
                        seriesSelecionadas.includes(serie.id)
                          ? 'bg-white/10 border-white/30 text-white'
                          : 'bg-white/5 border-white/10 text-white/40'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        seriesSelecionadas.includes(serie.id)
                          ? 'bg-white border-white'
                          : 'border-white/20'
                      }`}>
                        {seriesSelecionadas.includes(serie.id) && (
                          <Check className="w-3 h-3 text-black" />
                        )}
                      </div>
                      <span className="text-sm">{serie.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Divisor - Conteúdo */}
              <div className="border-t border-white/10 pt-4">
                <h4 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-4">Conteúdo</h4>
              </div>

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

              {/* Descrição */}
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">
                  Descrição *
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Breve descrição da missão..."
                  rows={2}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
                />
              </div>

              {/* Instruções */}
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">
                  Instruções <span className="text-white/30">(Markdown)</span>
                </label>
                <textarea
                  value={instrucoes}
                  onChange={(e) => setInstrucoes(e.target.value)}
                  placeholder="Passo a passo do que o aluno deve fazer..."
                  rows={4}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none font-mono"
                />
              </div>

              {/* Dicas */}
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">
                  Dicas <span className="text-white/30">(opcional, Markdown)</span>
                </label>
                <textarea
                  value={dicas}
                  onChange={(e) => setDicas(e.target.value)}
                  placeholder="Dicas para ajudar o aluno..."
                  rows={2}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none font-mono"
                />
              </div>

              {/* Reflexão */}
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">
                  Reflexão <span className="text-white/30">(opcional)</span>
                </label>
                <textarea
                  value={reflexao}
                  onChange={(e) => setReflexao(e.target.value)}
                  placeholder="Pergunta para reflexão..."
                  rows={2}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
                />
              </div>

              {/* PDF da Missão */}
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">
                  PDF <span className="text-white/30">(opcional)</span>
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

              {/* Divisor - Configurações */}
              <div className="border-t border-white/10 pt-4">
                <h4 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-4">Configurações</h4>
              </div>

              {/* Categoria */}
              <div>
                <label className="text-white/60 text-sm mb-2 block">
                  Categoria *
                </label>
                <div className="space-y-2">
                  {CATEGORIAS.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoria(cat.id as any)}
                      className={`w-full p-3 rounded-xl border text-left transition-colors flex items-center justify-between ${
                        categoria === cat.id
                          ? 'bg-white/10 border-white/30 text-white'
                          : 'bg-white/5 border-white/10 text-white/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          categoria === cat.id
                            ? 'border-white bg-white'
                            : 'border-white/30'
                        }`}>
                          {categoria === cat.id && (
                            <div className="w-2 h-2 rounded-full bg-black" />
                          )}
                        </div>
                        <span className="text-sm">{cat.label}</span>
                      </div>
                      {cat.pontos !== null && (
                        <span className="text-sm text-white/40">{cat.pontos} pts</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quando liberar */}
              <div>
                <label className="text-white/60 text-sm mb-2 block">
                  Quando liberar *
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => setLiberacao('agora')}
                    className={`w-full p-3 rounded-xl border text-left transition-colors flex items-center gap-3 ${
                      liberacao === 'agora'
                        ? 'bg-white/10 border-white/30 text-white'
                        : 'bg-white/5 border-white/10 text-white/40'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      liberacao === 'agora'
                        ? 'border-white bg-white'
                        : 'border-white/30'
                    }`}>
                      {liberacao === 'agora' && (
                        <div className="w-2 h-2 rounded-full bg-black" />
                      )}
                    </div>
                    <span className="text-sm">Agora (publicar imediatamente)</span>
                  </button>
                  
                  <button
                    onClick={() => setLiberacao('agendado')}
                    className={`w-full p-3 rounded-xl border text-left transition-colors flex items-center gap-3 ${
                      liberacao === 'agendado'
                        ? 'bg-white/10 border-white/30 text-white'
                        : 'bg-white/5 border-white/10 text-white/40'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      liberacao === 'agendado'
                        ? 'border-white bg-white'
                        : 'border-white/30'
                    }`}>
                      {liberacao === 'agendado' && (
                        <div className="w-2 h-2 rounded-full bg-black" />
                      )}
                    </div>
                    <span className="text-sm">Agendado</span>
                  </button>
                  
                  {/* Campos de data se agendado */}
                  {liberacao === 'agendado' && (
                    <div className="pl-7 pt-2 space-y-3">
                      {seriesSelecionadas.includes(6) && (
                        <div className="flex items-center gap-2">
                          <span className="text-white/60 text-sm w-16">6º Ano:</span>
                          <div className="flex gap-2 flex-1">
                            <div className="relative flex-1">
                              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                              <input
                                type="date"
                                value={dataLiberacao6ano}
                                onChange={(e) => setDataLiberacao6ano(e.target.value)}
                                className="w-full p-2 pl-9 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/20"
                              />
                            </div>
                            <div className="relative w-24">
                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                              <input
                                type="time"
                                value={horaLiberacao6ano}
                                onChange={(e) => setHoraLiberacao6ano(e.target.value)}
                                className="w-full p-2 pl-9 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/20"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      {seriesSelecionadas.includes(9) && (
                        <div className="flex items-center gap-2">
                          <span className="text-white/60 text-sm w-16">9º Ano:</span>
                          <div className="flex gap-2 flex-1">
                            <div className="relative flex-1">
                              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                              <input
                                type="date"
                                value={dataLiberacao9ano}
                                onChange={(e) => setDataLiberacao9ano(e.target.value)}
                                className="w-full p-2 pl-9 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/20"
                              />
                            </div>
                            <div className="relative w-24">
                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                              <input
                                type="time"
                                value={horaLiberacao9ano}
                                onChange={(e) => setHoraLiberacao9ano(e.target.value)}
                                className="w-full p-2 pl-9 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/20"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Prazo de entrega */}
              <div>
                <label className="text-white/60 text-sm mb-2 block">
                  Prazo de entrega *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="date"
                      value={dataPrazo}
                      onChange={(e) => setDataPrazo(e.target.value)}
                      className="w-full p-3 pl-10 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-white/20"
                    />
                  </div>
                  <div className="relative w-28">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="time"
                      value={horaPrazo}
                      onChange={(e) => setHoraPrazo(e.target.value)}
                      className="w-full p-3 pl-10 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-white/20"
                    />
                  </div>
                </div>
              </div>

              {/* Tipo de entrega */}
              <div>
                <label className="text-white/60 text-sm mb-2 block">
                  Tipo de entrega *
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => setRequerTexto(!requerTexto)}
                    className={`w-full p-3 rounded-xl border text-left transition-colors flex items-center gap-3 ${
                      requerTexto
                        ? 'bg-white/10 border-white/30 text-white'
                        : 'bg-white/5 border-white/10 text-white/40'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                      requerTexto
                        ? 'bg-white border-white'
                        : 'border-white/20'
                    }`}>
                      {requerTexto && (
                        <Check className="w-3 h-3 text-black" />
                      )}
                    </div>
                    <span className="text-sm">Requer resposta em texto</span>
                  </button>
                  
                  <button
                    onClick={() => setRequerArquivo(!requerArquivo)}
                    className={`w-full p-3 rounded-xl border text-left transition-colors flex items-center gap-3 ${
                      requerArquivo
                        ? 'bg-white/10 border-white/30 text-white'
                        : 'bg-white/5 border-white/10 text-white/40'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                      requerArquivo
                        ? 'bg-white border-white'
                        : 'border-white/20'
                    }`}>
                      {requerArquivo && (
                        <Check className="w-3 h-3 text-black" />
                      )}
                    </div>
                    <span className="text-sm">Requer envio de arquivo</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-white/10 bg-[#1a1a1a] flex-shrink-0">
              <button
                onClick={fecharModal}
                className="flex-1 p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
              >
                Cancelar
              </button>
              {missaoEditando && (
                <button
                  onClick={() => excluirMutation.mutate(missaoEditando.id)}
                  className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => salvarMutation.mutate()}
                disabled={!titulo.trim() || !descricao.trim() || !dataPrazo || salvando}
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
