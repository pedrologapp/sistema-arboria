// =============================================
// Helper único pra enviar eventos pro n8n.
//
// Webhook único do n8n recebe um ENVELOPE padrão:
//   { tipo, institution_id, ts, payload }
//
// O Switch node do n8n decide o branch baseado em `tipo`.
// Tipos cobertos hoje:
//   - 'capitulo_relatorio' : prof anexou PDF do relatório do capítulo
//   - 'missao_entrega'     : aluno entregou uma missão (com ou sem PDF)
// Futuro:
//   - 'observacao_manual'  : prof escreveu obs manual (pode enriquecer IA)
//
// Chamada é fire-and-forget: NÃO bloqueia a UX se o webhook estiver fora.
// O n8n é quem escreve no banco quando termina de processar.
// =============================================

export type TipoEvento =
  | 'capitulo_relatorio'
  | 'missao_entrega'
  | 'observacao_manual';

interface Envelope {
  tipo: TipoEvento;
  institution_id: string;
  ts: string;
  payload: Record<string, unknown>;
}

const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined;

/**
 * Envia um evento pro webhook do n8n.
 * Fire-and-forget — não aguarda resposta nem propaga erro.
 * Se VITE_N8N_WEBHOOK_URL não estiver setado, vira no-op (com warn no console).
 */
export async function enviarParaIA(
  tipo: TipoEvento,
  institution_id: string,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!WEBHOOK_URL) {
    console.warn('[n8n] VITE_N8N_WEBHOOK_URL não configurado — evento ignorado:', tipo);
    return;
  }

  const envelope: Envelope = {
    tipo,
    institution_id,
    ts: new Date().toISOString(),
    payload,
  };

  try {
    // keepalive: garante que o POST sai mesmo se a página fechar logo depois.
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
      keepalive: true,
    });
  } catch (err) {
    // Não bloqueia a UX se o webhook estiver fora — só loga.
    console.warn('[n8n] falha ao enviar evento', tipo, err);
  }
}
