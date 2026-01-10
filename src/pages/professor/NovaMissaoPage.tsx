import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { toast } from 'sonner';
import { ArrowLeft, Eye, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface MissaoForm {
  // Organização
  serie_filtro: number | null;
  semana: number | null;
  tipo_missao: 'geral' | 'individual';
  inteligencia_cross: number | null;
  turmas: string[];
  
  // Conteúdo
  titulo: string;
  descricao: string;
  instrucoes: string;
  dicas: string;
  reflexao: string;
  
  // Configurações
  tipo: 'principal' | 'secundaria' | 'bonus';
  pontos_base: number;
  data_prazo: string;
  hora_prazo: string;
  requer_texto: boolean;
  requer_arquivo: boolean;
}

const NovaMissaoPage = () => {
  const navigate = useNavigate();
  const { profile, casaMentor, faseAtual } = useProfessor();
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [form, setForm] = useState<MissaoForm>({
    // Organização
    serie_filtro: null,
    semana: null,
    tipo_missao: 'geral',
    inteligencia_cross: null,
    turmas: ['A', 'B'],
    
    // Conteúdo
    titulo: '',
    descricao: '',
    instrucoes: '',
    dicas: '',
    reflexao: '',
    
    // Configurações
    tipo: 'principal',
    pontos_base: 100,
    data_prazo: '',
    hora_prazo: '23:59',
    requer_texto: true,
    requer_arquivo: false,
  });

  // Buscar inteligências (para missão individual)
  const { data: inteligencias } = useQuery({
    queryKey: ['inteligencias'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inteligencias')
        .select('id, nome, emoji, cor_hex')
        .order('id');
      return data || [];
    }
  });

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
        : [...f.turmas, turma]
    }));
  };

  // Salvar missão
  const salvarMissao = async () => {
    // Validações
    if (!form.serie_filtro) {
      toast.error('Selecione a série');
      return;
    }
    if (!form.semana) {
      toast.error('Selecione a semana');
      return;
    }
    if (form.tipo_missao === 'individual' && !form.inteligencia_cross) {
      toast.error('Selecione a casa/inteligência');
      return;
    }
    if (!form.titulo.trim()) {
      toast.error('Digite o título da missão');
      return;
    }
    if (!form.descricao.trim()) {
      toast.error('Digite a descrição da missão');
      return;
    }
    if (!form.data_prazo) {
      toast.error('Selecione o prazo');
      return;
    }
    if (!form.requer_texto && !form.requer_arquivo) {
      toast.error('Selecione pelo menos um tipo de entrega');
      return;
    }

    setLoading(true);

    try {
      const prazo = new Date(`${form.data_prazo}T${form.hora_prazo}`);
      
      // turma_filtro: null se todas, ou a turma específica
      const turmaFiltro = form.turmas.length === 2 ? null : (form.turmas[0] || null);
      
      const { error } = await supabase.from('missoes').insert({
        institution_id: profile?.institution_id,
        casa_id: casaMentor?.id,
        fase_id: faseAtual?.id,
        criado_por: profile?.id,
        
        // Organização
        serie_filtro: form.serie_filtro,
        semana: form.semana,
        tipo_missao: form.tipo_missao,
        inteligencia_cross: form.tipo_missao === 'individual' ? form.inteligencia_cross : null,
        turma_filtro: turmaFiltro,
        
        // Conteúdo
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        instrucoes: form.instrucoes.trim() || null,
        dicas: form.dicas.trim() || null,
        reflexao: form.reflexao.trim() || null,
        
        // Configurações
        tipo: form.tipo,
        pontos_base: form.pontos_base,
        data_prazo: prazo.toISOString(),
        data_liberacao: new Date().toISOString(),
        requer_texto: form.requer_texto,
        requer_arquivo: form.requer_arquivo,
        status: 'liberada'
      });

      if (error) throw error;

      toast.success('Missão criada com sucesso!');
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
                  onClick={() => setForm(f => ({ ...f, serie_filtro: serie }))}
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
          </div>

          {/* Tipo de Missão */}
          <div className="mb-4">
            <label className="text-white/60 text-sm block mb-2">Tipo de Missão *</label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, tipo_missao: 'geral', inteligencia_cross: null }))}
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
                onClick={() => setForm(f => ({ ...f, tipo_missao: 'individual' }))}
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
                    onClick={() => setForm(f => ({ ...f, inteligencia_cross: int.id }))}
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
                    <span>{int.emoji}</span>
                    <span className="text-white text-sm truncate">{int.nome}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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

          {/* Descrição */}
          <div className="mb-4">
            <label className="text-white/60 text-sm block mb-2">Descrição *</label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Contexto e objetivo da missão..."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Instruções */}
          <div className="mb-4">
            <label className="text-white/60 text-sm block mb-2">
              Instruções <span className="text-white/30">(suporta Markdown)</span>
            </label>
            <textarea
              value={form.instrucoes}
              onChange={(e) => setForm(f => ({ ...f, instrucoes: e.target.value }))}
              placeholder={`1. Primeira instrução\n2. Segunda instrução\n3. Terceira instrução`}
              rows={6}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-blue-500/50 font-mono text-sm"
            />
          </div>

          {/* Dicas */}
          <div className="mb-4">
            <label className="text-white/60 text-sm block mb-2">
              Dicas <span className="text-white/30">(opcional, suporta Markdown)</span>
            </label>
            <textarea
              value={form.dicas}
              onChange={(e) => setForm(f => ({ ...f, dicas: e.target.value }))}
              placeholder={`- Dica útil para o aluno\n- Outra dica importante`}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-blue-500/50 font-mono text-sm"
            />
          </div>

          {/* Reflexão */}
          <div className="mb-4">
            <label className="text-white/60 text-sm block mb-2">
              Reflexão <span className="text-white/30">(opcional)</span>
            </label>
            <input
              type="text"
              value={form.reflexao}
              onChange={(e) => setForm(f => ({ ...f, reflexao: e.target.value }))}
              placeholder="Pergunta para o aluno refletir..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
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

          {/* Prazo */}
          <div className="mb-4">
            <label className="text-white/60 text-sm block mb-2">Prazo *</label>
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
            {loading ? 'Criando...' : '💾 Criar Missão'}
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
            </div>
            
            {/* Conteúdo do preview */}
            <div className="space-y-4">
              <h4 className="text-xl text-white font-semibold">
                {form.titulo || 'Sem título'}
              </h4>
              
              <p className="text-white/70">
                {form.descricao || 'Sem descrição'}
              </p>
              
              {form.instrucoes && (
                <div>
                  <p className="text-white/40 text-sm mb-2 font-medium">📋 Instruções:</p>
                  <div className="text-white/70 prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{form.instrucoes}</ReactMarkdown>
                  </div>
                </div>
              )}
              
              {form.dicas && (
                <div>
                  <p className="text-white/40 text-sm mb-2 font-medium">💡 Dicas:</p>
                  <div className="text-white/70 prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{form.dicas}</ReactMarkdown>
                  </div>
                </div>
              )}
              
              {form.reflexao && (
                <div className="bg-white/5 p-3 rounded-lg">
                  <p className="text-white/40 text-sm mb-1">🤔 Reflexão:</p>
                  <p className="text-white/80 italic">{form.reflexao}</p>
                </div>
              )}
              
              {/* Info de prazo */}
              {form.data_prazo && (
                <div className="pt-2 border-t border-white/10">
                  <p className="text-white/40 text-sm">
                    ⏰ Prazo: {new Date(`${form.data_prazo}T${form.hora_prazo}`).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NovaMissaoPage;
