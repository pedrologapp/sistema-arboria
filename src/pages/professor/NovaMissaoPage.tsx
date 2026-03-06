import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { toast } from 'sonner';
import { ArrowLeft, Eye, X, Search, Upload, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { CasaBrasao } from '@/components/CasaBrasao';

interface MissaoItem {
  nome: string;
  descricao: string;
}

interface MissaoForm {
  // Organização
  serie_filtro: number | null;
  semana: number | 'extra' | null;
  tipo_missao: 'geral' | 'individual';
  inteligencia_cross: number | null;
  turmas: string[];
  
  // Destinatários
  para_todos: boolean;
  alunos_selecionados: string[];
  
  // Liberação
  liberar_agora: boolean;
  data_liberacao: string;
  hora_liberacao: string;
  
  // Prazo
  data_prazo: string;
  hora_prazo: string;
  
  // Conteúdo
  titulo: string;
  contexto: string;
  lente_especial: string;
  instrucoes: string;
  itens: MissaoItem[];
  reflexao: string;
  
  // Legacy (kept for backward compat)
  descricao: string;
  dicas: string;
  
  // Configurações
  tipo: 'principal' | 'secundaria' | 'bonus';
  pontos_base: number;
  requer_texto: boolean;
  requer_arquivo: boolean;
}

const NovaMissaoPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, casaMentor, faseAtual } = useProfessor();
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [buscaAluno, setBuscaAluno] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfFile, setPdfFile] = useState<{ name: string; url: string } | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Verificar se deve iniciar com semana extra
  const defaultSemana = searchParams.get('semana') === 'extra' ? 'extra' : null;

  const [form, setForm] = useState<MissaoForm>({
    // Organização
    serie_filtro: null,
    semana: defaultSemana,
    tipo_missao: 'geral',
    inteligencia_cross: null,
    turmas: ['A', 'B'],
    
    // Destinatários
    para_todos: true,
    alunos_selecionados: [],
    
    // Liberação
    liberar_agora: true,
    data_liberacao: '',
    hora_liberacao: '08:00',
    
    // Prazo
    data_prazo: '',
    hora_prazo: '23:59',
    
    // Conteúdo
    titulo: '',
    contexto: '',
    lente_especial: '',
    instrucoes: '',
    itens: [],
    reflexao: '',
    descricao: '',
    dicas: '',
    
    // Configurações
    tipo: 'principal',
    pontos_base: 100,
    requer_texto: true,
    requer_arquivo: false,
  });

  // Buscar inteligências (para missão individual)
  const { data: inteligencias } = useQuery({
    queryKey: ['inteligencias'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inteligencias')
        .select('id, nome, emoji, cor_hex, brasao_url')
        .order('id');
      return data || [];
    }
  });

  // Buscar alunos disponíveis (filtrados por série, turma, casa)
  // NOTA: Usamos casa_id IS NOT NULL para identificar alunos (professores/admins não têm casa)
  // Isso evita depender da tabela user_roles que tem RLS restritiva para professores
  const { data: alunosDisponiveis } = useQuery({
    queryKey: ['alunos-disponiveis', form.serie_filtro, form.turmas, form.tipo_missao, form.inteligencia_cross, profile?.institution_id],
    queryFn: async () => {
      if (!form.serie_filtro || !profile?.institution_id) return [];

      let query = supabase
        .from('profiles')
        .select('id, full_name, nome, sobrenome, serie, turma, casa_id')
        .eq('institution_id', profile.institution_id)
        // Alunos sempre têm casa_id, professores/admins não têm
        .not('casa_id', 'is', null);

      // Filtrar por série
      query = query.ilike('serie', `%${form.serie_filtro}%`);

      // Filtrar por turmas selecionadas
      if (form.turmas.length > 0 && form.turmas.length < 2) {
        query = query.eq('turma', form.turmas[0]);
      }

      // Se for INDIVIDUAL, filtrar pela casa/inteligência selecionada
      if (form.tipo_missao === 'individual' && form.inteligencia_cross) {
        query = query.eq('casa_id', form.inteligencia_cross);
      }

      const { data, error } = await query.order('full_name');
      
      if (error) {
        console.error('Erro ao buscar alunos:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!form.serie_filtro && !!profile?.institution_id
  });

  // Filtrar alunos pela busca
  const alunosFiltrados = alunosDisponiveis?.filter(aluno => {
    const nome = aluno.full_name || `${aluno.nome || ''} ${aluno.sobrenome || ''}`;
    return nome.toLowerCase().includes(buscaAluno.toLowerCase());
  }) || [];

  // Alunos já selecionados
  const alunosSelecionados = alunosDisponiveis?.filter(aluno =>
    form.alunos_selecionados.includes(aluno.id)
  ) || [];

  // Alunos disponíveis (não selecionados)
  const alunosNaoSelecionados = alunosFiltrados?.filter(aluno =>
    !form.alunos_selecionados.includes(aluno.id)
  ) || [];

  // Adicionar aluno
  const adicionarAluno = (alunoId: string) => {
    setForm(f => ({
      ...f,
      alunos_selecionados: [...f.alunos_selecionados, alunoId]
    }));
  };

  // Remover aluno
  const removerAluno = (alunoId: string) => {
    setForm(f => ({
      ...f,
      alunos_selecionados: f.alunos_selecionados.filter(id => id !== alunoId)
    }));
  };

  // Selecionar todos os alunos
  const selecionarTodos = () => {
    setForm(f => ({
      ...f,
      alunos_selecionados: alunosDisponiveis?.map(a => a.id) || []
    }));
  };

  // Atualizar pontos baseado no tipo
  const handleTipoChange = (tipo: 'principal' | 'secundaria' | 'bonus') => {
    const pontos: Record<string, number> = {
      principal: 100,
      secundaria: 50,
      bonus: 75
    };
    setForm(f => ({ ...f, tipo, pontos_base: pontos[tipo] }));
  };

  // Toggle turma
  const toggleTurma = (turma: string) => {
    setForm(f => ({
      ...f,
      turmas: f.turmas.includes(turma)
        ? f.turmas.filter(t => t !== turma)
        : [...f.turmas, turma],
      // Reset alunos selecionados when turma changes
      alunos_selecionados: []
    }));
  };

  // Helper para obter nome do aluno
  const getNomeAluno = (aluno: { full_name: string | null; nome: string | null; sobrenome: string | null }) => {
    return aluno.full_name || `${aluno.nome || ''} ${aluno.sobrenome || ''}`.trim() || 'Sem nome';
  };

  // Salvar missão
  const salvarMissao = async () => {
    // Validações
    if (!form.serie_filtro) {
      toast.error('Selecione a série');
      return;
    }
    if (form.semana === null) {
      toast.error('Selecione a semana');
      return;
    }
    if (form.tipo_missao === 'individual' && !form.inteligencia_cross) {
      toast.error('Selecione a casa/inteligência');
      return;
    }
    if (!form.para_todos && form.alunos_selecionados.length === 0) {
      toast.error('Selecione pelo menos um aluno');
      return;
    }
    if (!form.liberar_agora && !form.data_liberacao) {
      toast.error('Selecione a data de liberação');
      return;
    }
    if (!form.titulo.trim()) {
      toast.error('Digite o título da missão');
      return;
    }
    // PDF ou texto são necessários
    if (!pdfFile && !form.contexto.trim() && !form.instrucoes.trim()) {
      toast.error('Anexe o PDF da missão ou preencha o conteúdo em texto');
      return;
    }
    if (!form.data_prazo) {
      toast.error('Selecione o prazo');
      return;
    }

    // Calcular data de liberação
    let dataLiberacao: Date;
    let status: string;

    if (form.liberar_agora) {
      dataLiberacao = new Date();
      status = 'liberada';
    } else {
      dataLiberacao = new Date(`${form.data_liberacao}T${form.hora_liberacao}`);
      status = dataLiberacao > new Date() ? 'agendada' : 'liberada';
    }

    const prazo = new Date(`${form.data_prazo}T${form.hora_prazo}`);

    // Validar que prazo é depois da liberação
    if (prazo <= dataLiberacao) {
      toast.error('O prazo deve ser depois da data de liberação');
      return;
    }

    setLoading(true);

    try {
      // turma_filtro: null se todas, ou a turma específica
      const turmaFiltro = form.turmas.length === 2 ? null : (form.turmas[0] || null);
      
      // Converter 'extra' para 0 ao salvar
      const semanaValue = form.semana === 'extra' ? 0 : form.semana;
      
      const { data: missao, error } = await supabase.from('missoes').insert({
        institution_id: profile?.institution_id,
        casa_id: casaMentor?.id,
        fase_id: faseAtual?.id,
        criado_por: profile?.id,
        
        // Organização
        serie_filtro: form.serie_filtro,
        semana: semanaValue,
        tipo_missao: form.tipo_missao,
        inteligencia_cross: form.tipo_missao === 'individual' ? form.inteligencia_cross : null,
        turma_filtro: turmaFiltro,
        
        // Destinatários
        para_todos_da_casa: form.para_todos,
        
        // Datas
        data_liberacao: dataLiberacao.toISOString(),
        data_prazo: prazo.toISOString(),
        status: status,
        
        // Conteúdo
        titulo: form.titulo.trim(),
        contexto: form.contexto.trim() || null,
        lente_especial: form.lente_especial.trim() || null,
        instrucoes: form.instrucoes.trim() || null,
        itens: form.itens.length > 0 ? form.itens : null,
        reflexao: form.reflexao.trim() || null,
        descricao: form.descricao.trim() || form.contexto.trim() || null,
        arquivo_pdf_url: pdfFile?.url || null,
        arquivo_pdf_nome: pdfFile?.name || null,
        
        // Configurações
        tipo: form.tipo,
        pontos_base: form.pontos_base,
        requer_texto: form.requer_texto,
        requer_arquivo: form.requer_arquivo,
      } as any).select().single();

      if (error) throw error;

      // Se alunos específicos, inserir destinatários
      if (!form.para_todos && form.alunos_selecionados.length > 0 && missao) {
        const { error: destError } = await supabase.from('missao_destinatarios').insert(
          form.alunos_selecionados.map(alunoId => ({
            missao_id: missao.id,
            aluno_id: alunoId
          }))
        );

        if (destError) {
          console.error('Erro ao inserir destinatários:', destError);
          // Não falhar a operação, missão já foi criada
        }
      }

      toast.success(
        form.liberar_agora 
          ? 'Missão criada e liberada!' 
          : 'Missão agendada com sucesso!'
      );
      navigate('/professor/missoes');
      
    } catch (error: any) {
      console.error('Erro ao criar missão:', error);
      toast.error(error.message || 'Erro ao criar missão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pt-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">Nova Missão</h1>
      </div>

      <div className="space-y-8">
        {/* ══════════════════════════════════════ */}
        {/* SEÇÃO: ORGANIZAÇÃO */}
        {/* ══════════════════════════════════════ */}
        <div>
          <h2 className="text-white/40 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
            📍 Organização
          </h2>

          {/* Série */}
          <div className="mb-4">
            <label className="text-white/60 text-sm block mb-2">Série *</label>
            <div className="grid grid-cols-4 gap-2">
              {[6, 7, 8, 9].map((serie) => (
                <button
                  key={serie}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, serie_filtro: serie, alunos_selecionados: [] }))}
                  className={cn(
                    "py-3 rounded-lg text-center font-medium transition-colors",
                    form.serie_filtro === serie
                      ? "bg-blue-600 text-white"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  )}
                >
                  {serie}º ano
                </button>
              ))}
            </div>
          </div>

          {/* Semana */}
          <div className="mb-4">
            <label className="text-white/60 text-sm block mb-2">Semana *</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((sem) => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, semana: sem }))}
                  className={cn(
                    "py-3 rounded-lg text-center font-medium transition-colors",
                    form.semana === sem
                      ? "bg-blue-600 text-white"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  )}
                >
                  Sem {sem}
                </button>
              ))}
            </div>
            
            {/* Botão Extra */}
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, semana: 'extra' }))}
              className={cn(
                "w-full mt-2 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2",
                form.semana === 'extra'
                  ? "bg-yellow-600 text-white"
                  : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20"
              )}
            >
              <span>⭐</span>
              <span>Extra</span>
            </button>
          </div>

          {/* Turmas */}
          <div className="mb-4">
            <label className="text-white/60 text-sm block mb-2">Turmas</label>
            <div className="flex gap-2">
              {['A', 'B'].map((turma) => (
                <button
                  key={turma}
                  type="button"
                  onClick={() => toggleTurma(turma)}
                  className={cn(
                    "flex-1 py-3 rounded-lg font-medium transition-colors",
                    form.turmas.includes(turma)
                      ? "bg-green-600/20 border border-green-500/50 text-green-400"
                      : "bg-white/5 border border-transparent text-white/40"
                  )}
                >
                  {form.turmas.includes(turma) ? '✓' : ''} Turma {turma}
                </button>
              ))}
            </div>
            <p className="text-white/30 text-xs mt-2">
              Deixe ambas selecionadas para enviar a todas as turmas
            </p>
          </div>

          {/* Tipo de Missão */}
          <div className="mb-4">
            <label className="text-white/60 text-sm block mb-2">Tipo de Missão *</label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, tipo_missao: 'geral', inteligencia_cross: null, alunos_selecionados: [] }))}
                className={cn(
                  "w-full p-4 rounded-lg text-left transition-colors flex items-center gap-3",
                  form.tipo_missao === 'geral'
                    ? "bg-blue-600/20 border border-blue-500/50"
                    : "bg-white/5 border border-transparent hover:bg-white/10"
                )}
              >
                <span className="text-2xl">📋</span>
                <div>
                  <p className="text-white font-medium">Geral</p>
                  <p className="text-white/40 text-sm">Para todos os alunos da série</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, tipo_missao: 'individual', alunos_selecionados: [] }))}
                className={cn(
                  "w-full p-4 rounded-lg text-left transition-colors flex items-center gap-3",
                  form.tipo_missao === 'individual'
                    ? "bg-purple-600/20 border border-purple-500/50"
                    : "bg-white/5 border border-transparent hover:bg-white/10"
                )}
              >
                <span className="text-2xl">🏠</span>
                <div>
                  <p className="text-white font-medium">Individual</p>
                  <p className="text-white/40 text-sm">Para alunos de uma casa específica</p>
                </div>
              </button>
            </div>
          </div>

          {/* Casa/Inteligência (se Individual) */}
          {form.tipo_missao === 'individual' && (
            <div className="mb-4">
              <label className="text-white/60 text-sm block mb-2">Casa/Inteligência *</label>
              <div className="grid grid-cols-2 gap-2">
                {inteligencias?.map((int) => (
                  <button
                    key={int.id}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, inteligencia_cross: int.id, alunos_selecionados: [] }))}
                    className={cn(
                      "p-3 rounded-lg text-left transition-colors flex items-center gap-2",
                      form.inteligencia_cross === int.id
                        ? "border-2"
                        : "bg-white/5 border border-transparent hover:bg-white/10"
                    )}
                    style={{
                      backgroundColor: form.inteligencia_cross === int.id ? `${int.cor_hex}20` : undefined,
                      borderColor: form.inteligencia_cross === int.id ? int.cor_hex || undefined : undefined
                    }}
                  >
                    <CasaBrasao 
                      brasaoUrl={int.brasao_url}
                      emoji={int.emoji}
                      nome={int.nome}
                      size="mini"
                    />
                    <span className="text-white text-sm truncate">{int.nome}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════ */}
        {/* SEÇÃO: DESTINATÁRIOS */}
        {/* ══════════════════════════════════════ */}
        <div>
          <h2 className="text-white/40 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
            👥 Destinatários
          </h2>

          {/* Para quem? */}
          <div className="mb-4">
            <label className="text-white/60 text-sm block mb-2">Para quem? *</label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, para_todos: true, alunos_selecionados: [] }))}
                className={cn(
                  "w-full p-3 rounded-lg text-left flex items-center gap-3 transition-colors",
                  form.para_todos
                    ? "bg-blue-600/20 border border-blue-500/50"
                    : "bg-white/5 border border-transparent hover:bg-white/10"
                )}
              >
                <span className={form.para_todos ? "text-blue-400" : "text-white/30"}>
                  {form.para_todos ? '●' : '○'}
                </span>
                <div>
                  <p className="text-white">Todos os alunos</p>
                  <p className="text-white/40 text-xs">
                    {form.tipo_missao === 'geral' 
                      ? `Todos do ${form.serie_filtro || '?'}º ano`
                      : `Todos da casa ${inteligencias?.find(i => i.id === form.inteligencia_cross)?.nome || '(selecione)'}`
                    }
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, para_todos: false }))}
                className={cn(
                  "w-full p-3 rounded-lg text-left flex items-center gap-3 transition-colors",
                  !form.para_todos
                    ? "bg-purple-600/20 border border-purple-500/50"
                    : "bg-white/5 border border-transparent hover:bg-white/10"
                )}
              >
                <span className={!form.para_todos ? "text-purple-400" : "text-white/30"}>
                  {!form.para_todos ? '●' : '○'}
                </span>
                <div>
                  <p className="text-white">Alunos específicos</p>
                  <p className="text-white/40 text-xs">Selecione quais alunos receberão</p>
                </div>
              </button>
            </div>
          </div>

          {/* Seleção de Alunos (se não for para todos) */}
          {!form.para_todos && (
            <div className="space-y-4">
              {/* Mensagem se série não selecionada */}
              {!form.serie_filtro && (
                <p className="text-amber-400/80 text-sm text-center py-4 bg-amber-500/10 rounded-lg">
                  ⚠️ Selecione a série primeiro para ver os alunos disponíveis
                </p>
              )}

              {form.serie_filtro && (
                <>
                  {/* Campo de busca */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      value={buscaAluno}
                      onChange={(e) => setBuscaAluno(e.target.value)}
                      placeholder="Buscar aluno por nome..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>

                  {/* Alunos selecionados */}
                  {alunosSelecionados.length > 0 && (
                    <div>
                      <p className="text-green-400 text-sm mb-2">
                        ✓ Selecionados ({alunosSelecionados.length})
                      </p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {alunosSelecionados.map(aluno => (
                          <div 
                            key={aluno.id}
                            className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-green-400">✓</span>
                              <span className="text-white text-sm">{getNomeAluno(aluno)}</span>
                              <span className="text-white/40 text-xs">({aluno.serie} {aluno.turma})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removerAluno(aluno.id)}
                              className="text-red-400/60 hover:text-red-400 px-2"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alunos disponíveis */}
                  {alunosNaoSelecionados.length > 0 && (
                    <div>
                      <p className="text-white/40 text-sm mb-2">
                        Disponíveis ({alunosNaoSelecionados.length})
                        {form.tipo_missao === 'individual' && form.inteligencia_cross && (
                          <span className="ml-1">
                            — {inteligencias?.find(i => i.id === form.inteligencia_cross)?.emoji}
                          </span>
                        )}
                      </p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {alunosNaoSelecionados.map(aluno => (
                          <div 
                            key={aluno.id}
                            className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-white/30">○</span>
                              <span className="text-white text-sm">{getNomeAluno(aluno)}</span>
                              <span className="text-white/40 text-xs">({aluno.serie} {aluno.turma})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => adicionarAluno(aluno.id)}
                              className="text-blue-400 px-2 text-sm hover:text-blue-300"
                            >
                              + Adicionar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mensagem se não houver alunos */}
                  {alunosDisponiveis?.length === 0 && (
                    <p className="text-white/40 text-sm text-center py-4">
                      Nenhum aluno encontrado para os filtros selecionados.
                      <br />
                      <span className="text-xs">Verifique série, turma e casa.</span>
                    </p>
                  )}

                  {/* Selecionar todos */}
                  {alunosNaoSelecionados.length > 0 && (
                    <button
                      type="button"
                      onClick={selecionarTodos}
                      className="text-blue-400 text-sm hover:text-blue-300"
                    >
                      Selecionar todos ({alunosDisponiveis?.length})
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════ */}
        {/* SEÇÃO: LIBERAÇÃO */}
        {/* ══════════════════════════════════════ */}
        <div>
          <h2 className="text-white/40 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
            📅 Liberação
          </h2>

          {/* Quando liberar? */}
          <div className="mb-4">
            <label className="text-white/60 text-sm block mb-2">Quando liberar? *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, liberar_agora: true }))}
                className={cn(
                  "p-3 rounded-lg text-center transition-colors",
                  form.liberar_agora
                    ? "bg-green-600/20 border border-green-500/50"
                    : "bg-white/5 border border-transparent hover:bg-white/10"
                )}
              >
                <p className="text-white font-medium">🚀 Agora</p>
                <p className="text-white/40 text-xs">Liberar imediatamente</p>
              </button>

              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, liberar_agora: false }))}
                className={cn(
                  "p-3 rounded-lg text-center transition-colors",
                  !form.liberar_agora
                    ? "bg-blue-600/20 border border-blue-500/50"
                    : "bg-white/5 border border-transparent hover:bg-white/10"
                )}
              >
                <p className="text-white font-medium">📅 Agendar</p>
                <p className="text-white/40 text-xs">Definir data/hora</p>
              </button>
            </div>
          </div>

          {/* Data/Hora de Liberação (se agendar) */}
          {!form.liberar_agora && (
            <div className="mb-4">
              <label className="text-white/60 text-sm block mb-2">Data e Hora de Liberação *</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={form.data_liberacao}
                  onChange={(e) => setForm(f => ({ ...f, data_liberacao: e.target.value }))}
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                />
                <input
                  type="time"
                  value={form.hora_liberacao}
                  onChange={(e) => setForm(f => ({ ...f, hora_liberacao: e.target.value }))}
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
          )}

          {/* Prazo de Entrega */}
          <div className="mb-4">
            <label className="text-white/60 text-sm block mb-2">Prazo de Entrega *</label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={form.data_prazo}
                onChange={(e) => setForm(f => ({ ...f, data_prazo: e.target.value }))}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
              />
              <input
                type="time"
                value={form.hora_prazo}
                onChange={(e) => setForm(f => ({ ...f, hora_prazo: e.target.value }))}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════ */}
        {/* SEÇÃO: CONTEÚDO */}
        {/* ══════════════════════════════════════ */}
        <div>
          <h2 className="text-white/40 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
            📝 Conteúdo da Missão
          </h2>

          {/* Título */}
          <div className="mb-4">
            <label className="text-white/60 text-sm block mb-2">Título *</label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))}
              placeholder="Ex: O Colecionador de Palavras"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Contexto */}
          <div className="mb-4">
            <label className="text-white/60 text-sm block mb-1">Contexto *</label>
            <p className="text-white/30 text-xs mb-2">Texto narrativo que inspira e contextualiza. Fale diretamente com o aluno.</p>
            <textarea
              value={form.contexto}
              onChange={(e) => setForm(f => ({ ...f, contexto: e.target.value }))}
              placeholder="Explique o cenário ou situação para o aluno..."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Lente Especial */}
          <div className="mb-4">
            <label className="text-white/60 text-sm block mb-1">🔍 Lente Especial <span className="text-white/30">(opcional)</span></label>
            <p className="text-white/30 text-xs mb-2">Ex: "O que ele DIRIA? Como ele FALARIA?"</p>
            <input
              type="text"
              value={form.lente_especial}
              onChange={(e) => setForm(f => ({ ...f, lente_especial: e.target.value }))}
              placeholder="Qual pergunta ou ângulo guia esta missão?"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Instrução da Missão */}
          <div className="mb-4">
            <label className="text-white/60 text-sm block mb-1">🎯 Instrução da Missão *</label>
            <p className="text-white/30 text-xs mb-2">Descreva a tarefa principal. Suporta Markdown.</p>
            <textarea
              value={form.instrucoes}
              onChange={(e) => setForm(f => ({ ...f, instrucoes: e.target.value }))}
              placeholder="Ex: Crie a identidade verbal do seu personagem"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Itens para Registrar */}
          <div className="mb-4">
            <label className="text-white/60 text-sm block mb-1">📝 Itens para Registrar <span className="text-white/30">(opcional)</span></label>
            <p className="text-white/30 text-xs mb-2">Cada item terá um campo de resposta individual para o aluno.</p>
            
            <div className="space-y-3 mb-3">
              {form.itens.map((item, index) => (
                <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white/40 text-xs font-medium">Item {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({
                        ...f,
                        itens: f.itens.filter((_, i) => i !== index)
                      }))}
                      className="text-red-400/60 hover:text-red-400 text-xs px-2 py-1"
                    >
                      ✕ Remover
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.nome}
                    onChange={(e) => setForm(f => ({
                      ...f,
                      itens: f.itens.map((it, i) => i === index ? { ...it, nome: e.target.value } : it)
                    }))}
                    placeholder="Nome do item (ex: A FRASE DE APRESENTAÇÃO)"
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 font-medium"
                  />
                  <textarea
                    value={item.descricao}
                    onChange={(e) => setForm(f => ({
                      ...f,
                      itens: f.itens.map((it, i) => i === index ? { ...it, descricao: e.target.value } : it)
                    }))}
                    placeholder="Descrição / orientação para o aluno..."
                    rows={2}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 resize-none focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setForm(f => ({
                ...f,
                itens: [...f.itens, { nome: '', descricao: '' }]
              }))}
              className="w-full py-2.5 border border-dashed border-white/20 rounded-lg text-white/50 text-sm hover:border-white/40 hover:text-white/70 transition-colors"
            >
              + Adicionar item
            </button>
          </div>

          {/* Reflexão Final */}
          <div className="mb-4">
            <label className="text-white/60 text-sm block mb-1">💭 Reflexão Final <span className="text-white/30">(opcional)</span></label>
            <p className="text-white/30 text-xs mb-2">Pergunta reflexiva para o aluno responder ao final (mínimo 3 linhas)</p>
            <textarea
              value={form.reflexao}
              onChange={(e) => setForm(f => ({ ...f, reflexao: e.target.value }))}
              placeholder="Ex: O jeito de falar do seu personagem se parece com o SEU jeito de falar?"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        {/* ══════════════════════════════════════ */}
        {/* SEÇÃO: CONFIGURAÇÕES */}
        {/* ══════════════════════════════════════ */}
        <div>
          <h2 className="text-white/40 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
            ⚙️ Configurações
          </h2>

          {/* Categoria/Tipo */}
          <div className="mb-4">
            <label className="text-white/60 text-sm block mb-2">Categoria *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { tipo: 'principal' as const, label: 'Principal', pontos: 100 },
                { tipo: 'secundaria' as const, label: 'Secundária', pontos: 50 },
                { tipo: 'bonus' as const, label: 'Bônus', pontos: 75 },
              ].map((opt) => (
                <button
                  key={opt.tipo}
                  type="button"
                  onClick={() => handleTipoChange(opt.tipo)}
                  className={cn(
                    "py-3 rounded-lg text-center transition-colors",
                    form.tipo === opt.tipo
                      ? "bg-blue-600 text-white"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  )}
                >
                  <p className="font-medium">{opt.label}</p>
                  <p className="text-xs opacity-60">{opt.pontos} pts</p>
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de Entrega */}
          <div className="mb-4">
            <label className="text-white/60 text-sm block mb-2">Tipo de Entrega *</label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, requer_texto: !f.requer_texto }))}
                className={cn(
                  "w-full p-3 rounded-lg text-left flex items-center gap-3 transition-colors",
                  form.requer_texto
                    ? "bg-green-600/20 border border-green-500/50"
                    : "bg-white/5 border border-transparent"
                )}
              >
                <span className={form.requer_texto ? "text-green-400" : "text-white/30"}>
                  {form.requer_texto ? '✓' : '○'}
                </span>
                <span className="text-white">Requer resposta em texto</span>
              </button>
              
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, requer_arquivo: !f.requer_arquivo }))}
                className={cn(
                  "w-full p-3 rounded-lg text-left flex items-center gap-3 transition-colors",
                  form.requer_arquivo
                    ? "bg-green-600/20 border border-green-500/50"
                    : "bg-white/5 border border-transparent"
                )}
              >
                <span className={form.requer_arquivo ? "text-green-400" : "text-white/30"}>
                  {form.requer_arquivo ? '✓' : '○'}
                </span>
                <span className="text-white">Requer envio de arquivo</span>
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════ */}
        {/* BOTÕES */}
        {/* ══════════════════════════════════════ */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="flex-1 py-3 bg-white/10 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-white/15 transition-colors"
          >
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button
            type="button"
            onClick={salvarMissao}
            disabled={loading}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            {loading ? 'Criando...' : (form.liberar_agora ? '💾 Criar Missão' : '📅 Agendar Missão')}
          </button>
        </div>
      </div>

      {/* Modal de Preview */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] rounded-xl p-5 max-w-md w-full max-h-[85vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold">Preview da Missão</h3>
              <button 
                onClick={() => setShowPreview(false)} 
                className="text-white/60 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Badges */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {form.serie_filtro && (
                <span className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-xs">
                  {form.serie_filtro}º ano
                </span>
              )}
              {form.semana && (
                <span className="bg-purple-600/20 text-purple-400 px-2 py-1 rounded text-xs">
                  Semana {form.semana}
                </span>
              )}
              <span className="bg-white/10 text-white/60 px-2 py-1 rounded text-xs">
                {form.pontos_base} pts
              </span>
              {form.para_todos ? (
                <span className="bg-green-600/20 text-green-400 px-2 py-1 rounded text-xs">
                  Todos os alunos
                </span>
              ) : (
                <span className="bg-purple-600/20 text-purple-400 px-2 py-1 rounded text-xs">
                  {form.alunos_selecionados.length} aluno(s) específico(s)
                </span>
              )}
              {form.liberar_agora ? (
                <span className="bg-green-600/20 text-green-400 px-2 py-1 rounded text-xs">
                  🚀 Liberar agora
                </span>
              ) : (
                <span className="bg-amber-600/20 text-amber-400 px-2 py-1 rounded text-xs">
                  📅 Agendada
                </span>
              )}
            </div>
            
            {/* Conteúdo do preview */}
            <div className="space-y-4">
              <h4 className="text-xl text-white font-semibold">
                {form.titulo || 'Sem título'}
              </h4>
              
              <div className="bg-white/5 p-3 rounded-lg">
                <p className="text-white/40 text-xs uppercase mb-1">📖 Contexto</p>
                <p className="text-white/70">{form.contexto || 'Sem contexto'}</p>
              </div>
              
              {form.lente_especial && (
                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                  <p className="text-white/40 text-xs uppercase mb-1">🔍 Lente Especial</p>
                  <p className="text-white/80 italic">"{form.lente_especial}"</p>
                </div>
              )}

              {form.instrucoes && (
                <div>
                  <p className="text-white/40 text-sm mb-2 font-medium">🎯 Instrução da Missão:</p>
                  <div className="text-white/70 prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{form.instrucoes}</ReactMarkdown>
                  </div>
                </div>
              )}

              {form.itens.length > 0 && (
                <div>
                  <p className="text-white/40 text-sm mb-2 font-medium">📝 Itens para Registrar:</p>
                  <div className="space-y-2">
                    {form.itens.map((item, i) => (
                      <div key={i} className="bg-white/5 p-3 rounded-lg">
                        <p className="text-white font-medium text-sm">{i + 1}. {item.nome || '(sem nome)'}</p>
                        {item.descricao && <p className="text-white/60 text-xs mt-1">{item.descricao}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {form.reflexao && (
                <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-lg">
                  <p className="text-white/40 text-sm mb-1">💭 Reflexão Final:</p>
                  <p className="text-white/80 italic">{form.reflexao}</p>
                </div>
              )}
              
              {/* Info de datas */}
              <div className="pt-2 border-t border-white/10 space-y-1">
                {!form.liberar_agora && form.data_liberacao && (
                  <p className="text-white/40 text-sm">
                    📅 Liberação: {new Date(`${form.data_liberacao}T${form.hora_liberacao}`).toLocaleString('pt-BR')}
                  </p>
                )}
                {form.data_prazo && (
                  <p className="text-white/40 text-sm">
                    ⏰ Prazo: {new Date(`${form.data_prazo}T${form.hora_prazo}`).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NovaMissaoPage;
