-- ============================================================
-- Pre-requisitos de esquema pra importacao/reconciliacao de alunos por planilha.
-- Decisao do Fundador 18/07 (mesa Dados+Riscos+Produto). Ver empresa/registros/
-- decisoes.md (2026-07-18) e riscos.md (2026-07-18).
--
-- 3 mudancas aprovadas em profiles:
--  1. status/desativado: "aluno que saiu = DESATIVAR, nunca apagar" (preserva os
--     12 anos de historico longitudinal; o hard-delete cascatearia observacoes).
--  2. data_nascimento: SO a data, unico desambiguador de homonimo no match.
--  3. indice unico PARCIAL de matricula por escola: fecha a porta da duplicata
--     silenciosa; parcial em status='ativo' pra ex-aluno poder reciclar matricula.
--
-- Confirmado no banco antes de rodar: nenhuma dessas colunas existe hoje; nao ha
-- matricula duplicada por instituicao (o indice cria sem conflito). Idempotente.
-- ============================================================

alter table public.profiles
  add column if not exists status          text not null default 'ativo',
  add column if not exists desativado_em   timestamptz,
  add column if not exists motivo_saida    text,
  add column if not exists data_nascimento date;

-- CHECK do status (idempotente: ignora se ja existir).
do $$
begin
  alter table public.profiles
    add constraint profiles_status_chk
    check (status in ('ativo', 'inativo', 'transferido'));
exception
  when duplicate_object then null;
end $$;

-- Matricula unica por escola, SO entre alunos ATIVOS. Parcial de proposito:
-- um ex-aluno inativo nao trava a reemissao da mesma matricula pra outra crianca.
create unique index if not exists profiles_matricula_ativa_uniq
  on public.profiles (institution_id, matricula_externa)
  where matricula_externa is not null and status = 'ativo';

comment on column public.profiles.status is
  'ativo | inativo (saiu, historico preservado) | transferido (fase 2, entre escolas). NUNCA apagar aluno.';
comment on column public.profiles.data_nascimento is
  'So a data. Finalidade declarada: desambiguacao de match no import + gate etario (Principio 3).';
