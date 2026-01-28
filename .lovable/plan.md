
Objetivo
- Garantir que, após você excluir os alunos e reimportar 92 alunos do infantil, a sincronização crie todos os 92 (e não marque a maior parte como “atualizado”) quando de fato não existe ninguém naquela instituição.
- Corrigir a causa mais provável do “32 criados / 60 atualizados” mesmo depois de excluir: hoje a função considera “existe” apenas por matricula_externa globalmente (sem filtrar institution_id), então ela pode estar encontrando matrícula igual em outro contexto e marcando como “atualizado”.

Por que isso acontece (explicação simples)
- A função sync-alunos-externos hoje faz:
  - “Se existe algum profile com matricula_externa = X → atualiza”
  - Ela NÃO confere se esse profile é da mesma instituição (institution_id) que você está importando.
- Resultado possível: mesmo você tendo apagado os alunos da sua instituição, a função encontra a mesma matrícula em outro lugar (ou um cadastro antigo/orfão) e “atualiza” aquele registro, em vez de criar um novo.

O que vamos ajustar
1) UPSERT por (institution_id + matricula_externa)
- Mudar a busca do “aluno já existe?” para:
  - where matricula_externa = aluno.matricula AND institution_id = aluno.institution_id
- Isso torna o upsert realmente “por instituição”, que é o comportamento esperado no seu caso.

2) UPDATE deve atualizar também institution_id e matricula_externa (consistência)
- No caminho de UPDATE (quando existe), além de nome/sobrenome/série/turma/segmento, vamos garantir que:
  - institution_id = aluno.institution_id (mantém consistente)
  - matricula_externa = aluno.matricula (garante o vínculo)
- Assim não fica “meio cadastrado” em casos antigos.

3) “Email já registrado” não pode virar “atualizado” indevido
- Hoje, quando o email já existe, a função tenta “vincular” ao profile do email se ele não tiver matricula_externa.
- Vamos tornar isso seguro por instituição:
  - Buscar profile do usuário existente e ler institution_id e matricula_externa.
  - Só fazer o vínculo (setar matricula_externa) se:
    - matricula_externa estiver vazia E
    - (institution_id for igual ao aluno.institution_id OU institution_id estiver nulo)
  - Se institution_id for diferente, não vamos “roubar” o usuário de outra instituição: vamos tratar como colisão de email e criar com email alternativo (sufixo 2, 3, 4…).

4) Garantir que “atualizado” continue sendo aluno (role e dados mínimos)
- Em alguns cenários antigos, pode existir profile com matricula_externa mas sem role ‘user’.
- No caminho de UPDATE e no caminho de VÍNCULO, vamos:
  - upsert em user_roles (user_id, role='user') com proteção de duplicidade
  - garantir inteligencia_scores para o ano letivo atual sem sobrescrever valores existentes:
    - usar upsert com onConflict (aluno_id,inteligencia_id,ano_letivo) e ignoreDuplicates=true (ou equivalente) para só criar faltantes

5) Melhorar o relatório do retorno (para você entender rápido)
- Manter os contadores:
  - criados, atualizados, vinculados, erros
- Adicionar (opcional, sem expor dados sensíveis):
  - “atualizados_por_matricula_mesma_instituicao” vs “vinculados_por_email”
  - isso ajuda a diferenciar “já existia mesmo” de “email já existia”.

Arquivos que serão alterados
- supabase/functions/sync-alunos-externos/index.ts
  - Ajustar query de busca de existingProfile para incluir institution_id
  - Ajustar payload do update para incluir institution_id + matricula_externa
  - Ajustar regra de vínculo por email para respeitar institution_id
  - Garantir role ‘user’ e scores no caminho de update/vínculo (sem sobrescrever)

Validação (como vamos confirmar que resolveu)
1) Antes de importar:
- Conferir no backend (ambiente de teste) que a sua instituição está “zerada”:
  - count profiles com institution_id = sua instituição e matricula_externa não nula deve ser 0

2) Rodar a importação de 92 alunos novamente
- Esperado:
  - criados ≈ 92
  - atualizados ≈ 0
  - vinculados ≈ 0 (a menos que exista ainda algum usuário com email igual sobrando)
  - erros ≈ 0

3) Se ainda aparecer “atualizados”
- A função vai estar correta; então o motivo normalmente será um destes:
  - o arquivo/payload tem matrículas repetidas dentro dos 92 (duplicadas)
  - ainda existem contas antigas na mesma instituição (não deletadas), agora corretamente detectadas
- Se acontecer, vamos usar 1 ou 2 matrículas de exemplo para localizar exatamente o que foi encontrado e por quê (sem precisar apagar “no escuro”).

Risco/impacto
- A mudança evita atualizar registros “de outra instituição” por engano (isso é uma correção de segurança/consistência de dados).
- Mantém o comportamento de UPSERT esperado: só atualiza quando o aluno já existe naquela instituição.

Entrega
- Implementar as mudanças na função
- Re-deploy automático do backend
- Teste rápido com uma chamada de exemplo (1–2 alunos) e depois com o lote completo (92)
