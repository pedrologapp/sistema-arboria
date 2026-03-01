
Objetivo: corrigir o travamento em “Enviando...” no upload de conteúdo da fase (rota `/admin/fases/:id`), sem depender de tentativa manual repetida.

Diagnóstico rápido
- O backend já está com permissões de upload para o bucket de conteúdos.
- A conta logada está com role admin.
- O problema atual é de fluxo no frontend: o upload entra em estado pendente e a UI fica presa em “Enviando...” quando a promessa não finaliza (ou demora indefinidamente).

Do I know what the issue is?
- Sim: o ponto frágil está no `TabConteudo.tsx`, no fluxo assíncrono de upload (`storage -> url -> upsert/insert`), sem proteção contra timeout/hang de rede.

Plano de implementação (conciso)
1) Fortalecer o fluxo de upload em `src/components/admin/TabConteudo.tsx`
- Quebrar em etapas com mensagens de erro específicas:
  - etapa 1: upload do arquivo
  - etapa 2: obter URL pública
  - etapa 3: insert/update em `fase_conteudos`
- Em cada etapa, lançar erro claro (ex.: “Falha no upload do arquivo”, “Falha ao salvar metadados”).

2) Adicionar timeout defensivo para não travar indefinidamente
- Encapsular a chamada de upload com timeout (ex.: 25–30s).
- Se estourar tempo: abortar operação, liberar botão e mostrar toast de timeout com instrução de tentar novamente.

3) Garantir limpeza de estado 100% das vezes
- Centralizar loading no estado da mutation (`isPending`) ou garantir `finally` único.
- Impedir que o modal fique travado se houver erro silencioso.
- Reabilitar botão e manter dados do formulário para retry rápido.

4) Rollback se upload subir mas banco falhar
- Se arquivo subir e falhar no `fase_conteudos`, tentar remover o arquivo recém-enviado para evitar órfãos.

5) Melhorar observabilidade para depuração real
- Log estruturado por etapa no console (`[upload-conteudo] etapa x`), incluindo duração.
- Assim, se voltar a acontecer, conseguimos isolar imediatamente se foi rede, storage ou banco.

Validação após implementação
- Testar upload de PDF (4MB) no “Conteúdo Geral” da fase corporal.
- Confirmar 3 cenários:
  1. sucesso: sai de “Enviando...”, fecha modal e item aparece na lista;
  2. falha simulada: botão destrava e mostra erro útil;
  3. timeout: operação cancela e permite nova tentativa sem recarregar página.

Arquivos envolvidos
- `src/components/admin/TabConteudo.tsx` (principal correção).
