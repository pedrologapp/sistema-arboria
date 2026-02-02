import { useState, ReactNode } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Send, Loader2, ClipboardList, MessageCircle } from 'lucide-react';
import { AlertaExplicacao } from '@/hooks/useAlertasAlunos';
import { supabase } from '@/integrations/supabase/client';
import { useProfessor } from '@/contexts/ProfessorContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

interface ExplicacaoContradicaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerta: AlertaExplicacao;
}

const tipoContradicaoLabels: Record<string, string> = {
  celebracao_para_atencao: 'De Celebração para Atenção',
  atencao_para_recuperacao: 'De Atenção para Recuperação',
  outro: 'Mudança de padrão'
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

// Renderiza texto com markdown básico:
// - **texto** -> negrito
// - \n -> quebra de parágrafo
const renderizarTextoFormatado = (texto: string): ReactNode => {
  // Separar por quebras de linha
  const linhas = texto.split('\n');
  
  return (
    <>
      {linhas.map((linha, lineIndex) => {
        // Linha vazia = espaçamento
        if (linha.trim() === '') {
          return <div key={lineIndex} className="h-2" />;
        }
        
        // Processar negritos dentro da linha
        const partes = linha.split(/(\*\*[^*]+\*\*)/g);
        const conteudo = partes.map((parte, i) => {
          if (parte.startsWith('**') && parte.endsWith('**')) {
            return (
              <strong key={i} className="text-white font-semibold">
                {parte.slice(2, -2)}
              </strong>
            );
          }
          return <span key={i}>{parte}</span>;
        });
        
        return (
          <div key={lineIndex} className="mb-1">
            {conteudo}
          </div>
        );
      })}
    </>
  );
};

export const ExplicacaoContradicaoModal = ({
  isOpen,
  onClose,
  alerta
}: ExplicacaoContradicaoModalProps) => {
  const { profile, faseAtual } = useProfessor();
  const queryClient = useQueryClient();
  const [explicacao, setExplicacao] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Determinar se há contexto do N8N ou usar fallback
  const temContextoN8N = alerta.mensagem_professor || alerta.texto_acontecendo;
  const mensagemFallback = `Professor(a), foi detectada uma contradição entre a sugestão ativa e sua nova observação para ${alerta.aluno.nome}. Por favor, explique o que motivou essa mudança para que possamos ajustar nossas análises.`;

  const handleEnviar = async () => {
    if (!explicacao.trim()) {
      toast({
        title: 'Explicação vazia',
        description: 'Por favor, escreva sua explicação antes de enviar.',
        variant: 'destructive'
      });
      return;
    }

    if (!profile?.id || !profile?.institution_id) {
      toast({
        title: 'Erro de sessão',
        description: 'Sessão expirada. Por favor, recarregue a página.',
        variant: 'destructive'
      });
      return;
    }

    setIsSending(true);

    try {
      // 1. Buscar dados adicionais do aluno para o webhook
      const { data: alunoData } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome, serie, turma, casa_id, matricula_externa, segmento')
        .eq('id', alerta.aluno.id)
        .single();

      // 2. Preparar payload para N8N
      const webhookPayload = {
        evento: 'explicacao_professor_enviada',
        aluno: {
          id: alunoData?.id || alerta.aluno.id,
          nome: alunoData ? `${alunoData.nome} ${alunoData.sobrenome}`.trim() : alerta.aluno.nome,
          matricula: alunoData?.matricula_externa || null,
          serie: alunoData?.serie || alerta.aluno.serie,
          turma: alunoData?.turma || alerta.aluno.turma,
          casa_id: alunoData?.casa_id || null,
          segmento: alunoData?.segmento || null
        },
        contexto: {
          fase_id: faseAtual?.id || null,
          institution_id: profile.institution_id
        },
        professor: {
          id: profile.id,
          nome: profile.full_name || profile.nome || 'Professor'
        },
        explicacao: {
          tipo_registro: 'explicacao_professor',
          tipo_contradicao: alerta.tipo_contradicao,
          perguntas_apresentadas: alerta.perguntas_professor,
          sugestao_anterior_resumo: alerta.sugestao_anterior_resumo,
          observacao_nova: alerta.observacao_nova,
          resposta_professor: explicacao.trim(),
          alerta_id: alerta.id
        },
        timestamp: new Date().toISOString()
      };

      // 3. Enviar para N8N
      const webhookUrl = 'https://webhook.escolaamadeus.com/webhook/projetoarboria';
      
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      }).catch(err => {
        console.warn('Webhook N8N falhou (continuando):', err);
      });

      // 4. Atualizar alerta para resolvido
      const { error: updateError } = await supabase
        .from('alertas_alunos')
        .update({
          status: 'resolvido',
          resolved_at: new Date().toISOString(),
          resolved_by: profile.id,
          acao_tomada: `Explicação do professor: ${explicacao.trim().substring(0, 200)}...`,
          notificacao_ativa: false
        })
        .eq('id', alerta.id);

      if (updateError) {
        console.error('Erro ao atualizar alerta:', updateError);
        throw updateError;
      }

      // 5. Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['alertas-alunos'] });
      queryClient.invalidateQueries({ queryKey: ['alertas-alunos-turmas'] });
      queryClient.invalidateQueries({ queryKey: ['perfil-aluno'] });

      toast({
        title: '✅ Explicação enviada',
        description: 'Sua resposta foi registrada com sucesso.'
      });

      onClose();
    } catch (error) {
      console.error('Erro ao enviar explicação:', error);
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível enviar sua explicação. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-md p-0 max-h-[90vh]" hideCloseButton>
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-purple-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={alerta.aluno.avatarUrl || ''} />
                <AvatarFallback className="bg-purple-800/50 text-white">
                  {getInitials(alerta.aluno.nome)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-white font-medium text-base flex items-center gap-2">
                  💬 Explicação necessária
                </h2>
                <p className="text-white/60 text-sm">
                  {alerta.aluno.nome}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/40 hover:text-white" />
            </button>
          </div>
          
          {/* Badge de tipo */}
          <div className="mt-3">
            <span className="px-2.5 py-1 bg-purple-800/50 text-purple-300 text-xs rounded-full">
              {tipoContradicaoLabels[alerta.tipo_contradicao] || 'Contradição detectada'}
            </span>
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 space-y-4">
            
            {/* NOVO: Bloco "O que aconteceu" - texto_acontecendo */}
            {alerta.texto_acontecendo && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400/80 text-xs font-medium uppercase tracking-wider">
                  <ClipboardList className="w-3.5 h-3.5" />
                  O que aconteceu
                </div>
                <div className="bg-amber-900/20 rounded-lg p-3 border border-amber-600/30">
                  <div className="text-amber-100/90 text-sm leading-relaxed">
                    {renderizarTextoFormatado(alerta.texto_acontecendo)}
                  </div>
                </div>
              </div>
            )}

            {/* NOVO: Bloco "Mensagem para você" - mensagem_professor */}
            {alerta.mensagem_professor && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-purple-400/80 text-xs font-medium uppercase tracking-wider">
                  <MessageCircle className="w-3.5 h-3.5" />
                  Mensagem para você
                </div>
                <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-600/40">
                  <div className="text-purple-100/90 text-sm leading-relaxed">
                    {renderizarTextoFormatado(alerta.mensagem_professor)}
                  </div>
                </div>
              </div>
            )}

            {/* FALLBACK: Se não houver contexto do N8N */}
            {!temContextoN8N && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-purple-400/80 text-xs font-medium uppercase tracking-wider">
                  <MessageCircle className="w-3.5 h-3.5" />
                  Mensagem para você
                </div>
                <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-600/40">
                  <p className="text-purple-100/90 text-sm leading-relaxed">
                    {mensagemFallback}
                  </p>
                </div>
              </div>
            )}

            {/* Campo de explicação */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-white/60 text-xs font-medium uppercase tracking-wider">
                💬 Sua explicação <span className="text-red-400">*</span>
              </label>
              <Textarea
                value={explicacao}
                onChange={(e) => setExplicacao(e.target.value)}
                placeholder="Descreva o que aconteceu e o que você observou..."
                className="min-h-[120px] bg-white/5 border-white/20 text-white placeholder:text-white/30 resize-none focus:border-purple-500/50"
                disabled={isSending}
              />
              <p className="text-white/30 text-xs">
                Essa informação será usada para melhorar as sugestões futuras.
              </p>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSending}
            className="flex-1 bg-transparent border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleEnviar}
            disabled={isSending || !explicacao.trim()}
            className="flex-1 bg-purple-700 hover:bg-purple-600 text-white"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar explicação
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
