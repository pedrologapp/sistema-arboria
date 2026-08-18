// ============================================================
// Upload com PROGRESSO de verdade.
//
// Por que nao usar supabase.storage.upload() direto: ele usa fetch, e fetch
// nao sabe dizer quanto do arquivo ja' subiu. Num video de 120 MB no 4G da
// escola isso vira uma tela parada por 6 minutos, sem nenhum sinal de vida. A
// crianca conclui que travou, fecha o app e perde tudo.
//
// XMLHttpRequest e' a unica API do navegador que reporta progresso de upload.
// Por isso ele, e nao fetch, mesmo sendo mais antigo.
//
// O endpoint e' o mesmo que a biblioteca chama por baixo:
//   POST /storage/v1/object/{bucket}/{caminho}
// com o access_token do aluno, e ai a RLS do bucket continua valendo igual.
// ============================================================
import { supabase } from '@/integrations/supabase/client';

const URL_BASE = import.meta.env.VITE_SUPABASE_URL as string;
const CHAVE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export interface FalhaUpload extends Error {
  status?: number;
  corpo?: string;
}

export async function subirComProgresso(
  bucket: string,
  caminho: string,
  arquivo: File,
  contentType: string,
  aoProgredir: (pct: number, enviados: number) => void
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sua sessão expirou. Saia e entre de novo no app.');

  await new Promise<void>((ok, falhar) => {
    const req = new XMLHttpRequest();
    req.open('POST', `${URL_BASE}/storage/v1/object/${bucket}/${caminho}`, true);
    req.setRequestHeader('authorization', `Bearer ${token}`);
    req.setRequestHeader('apikey', CHAVE);
    req.setRequestHeader('x-upsert', 'false');
    req.setRequestHeader('cache-control', '3600');
    if (contentType) req.setRequestHeader('content-type', contentType);

    req.upload.onprogress = (e) => {
      if (e.lengthComputable) aoProgredir(Math.round((e.loaded / e.total) * 100), e.loaded);
    };

    req.onload = () => {
      if (req.status >= 200 && req.status < 300) return ok();
      // O corpo do erro do Storage e' JSON com {statusCode, error, message}.
      // Guardar o texto cru importa: e' a diferenca entre "nao deu" e saber
      // que foi o limite global do projeto, e nao o do bucket.
      let recado = `HTTP ${req.status}`;
      try {
        const j = JSON.parse(req.responseText);
        recado = j.message || j.error || recado;
      } catch { /* resposta nao-JSON: fica o status */ }
      const erro = new Error(recado) as FalhaUpload;
      erro.status = req.status;
      erro.corpo = (req.responseText || '').slice(0, 400);
      falhar(erro);
    };

    // Sem internet, DNS, CORS: o navegador nao conta o motivo por seguranca.
    req.onerror = () => falhar(new Error('A conexão caiu no meio do envio. Tente de novo pelo wi-fi.'));
    req.onabort = () => falhar(new Error('O envio foi interrompido.'));
    req.ontimeout = () => falhar(new Error('O envio demorou demais e foi cortado.'));
    req.timeout = 0;   // arquivo grande em rede lenta nao pode ter prazo

    req.send(arquivo);
  });
}
