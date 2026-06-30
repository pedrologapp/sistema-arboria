# Registro de Riscos — Arboria Tech
Riscos identificados pelo setor de Riscos, Privacidade & Compliance.

| Data | Risco | Severidade | Mitigação | Status |
|---|---|---|---|---|
| 2026-06-30 | **Deletar uma fase com observações apaga histórico da criança em CASCATA** (`inteligencia_evidencias.fase_id ON DELETE CASCADE`). | CRÍTICO | Fase com observação **nunca** é deletável; "finalizar" é só mudar status, jamais DELETE. A trilha (`turma_trilha`) não deleta fases. | Mitigado por construção |
| 2026-06-30 | `ano_letivo` do rio longitudinal deve vir do **momento da observação**, não da fase. Risco de corromper agrupamento na virada de ano. | ALTO | Trigger já lê de `institution_settings` — não regredir nisso. | OK |
| 2026-06-30 | RLS da `turma_trilha` precisa restringir a educador/admin; criança sem acesso. | ALTO | Policy SELECT = `institution + (professor OR admin)`. Escrita só via RPC SECURITY DEFINER (professor da própria turma). | Aplicado |
| 2026-06-30 | UI da trilha não pode induzir "a CRIANÇA concluiu a inteligência" (Princípio 6). "Finalizada" é estado da TURMA. | MÉDIO | Vigiar ao desenhar telas; nunca cruzar "fase concluída" + "criança com poucas observações". | A vigiar |
