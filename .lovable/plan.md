

# Plano: Mapa de Desenvolvimento + Reorganização Bottom Nav

## Visão Geral

Criar a feature "Mapa de Desenvolvimento" — uma ferramenta de posicionamento rápido semanal de alunos em 4 quadrantes — e reorganizar o bottom nav do professor simplificado de 4 para 5 itens.

---

## 1. Banco de Dados — Tabela `mapa_desenvolvimento`

Criar via migration:

```sql
CREATE TABLE mapa_desenvolvimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL,
  turma_id UUID NOT NULL,
  professor_id UUID NOT NULL,
  fase_id UUID NOT NULL,
  semana_numero SMALLINT NOT NULL,
  institution_id UUID NOT NULL,
  quadrante TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (aluno_id, fase_id, semana_numero)
);

CREATE INDEX idx_mapa_turma_fase ON mapa_desenvolvimento(turma_id, fase_id);
CREATE INDEX idx_mapa_aluno_fase ON mapa_desenvolvimento(aluno_id, fase_id);

ALTER TABLE mapa_desenvolvimento ENABLE ROW LEVEL SECURITY;
```

RLS policies:
- Professor pode INSERT/UPDATE/SELECT/DELETE onde `professor_id = auth.uid()` OU `turma_id IN get_professor_turma_ids()`
- Admin pode ALL onde `institution_id = get_user_institution_id()`

Trigger `update_updated_at_column` reutilizado para `updated_at`.

Validação via trigger (não CHECK) para `quadrante IN ('surpreendeu','foi_bem','teve_dificuldades','atencao')` e `semana_numero BETWEEN 1 AND 4`.

---

## 2. Bottom Nav — Reorganizar para 5 itens

**Arquivo**: `src/components/professor/ProfessorBottomNavSimplificado.tsx`

Alterar de 4 para 5 itens:

| Antes | Depois |
|-------|--------|
| Home | Home |
| Círculo | **Mapa** (novo, ícone `LayoutGrid`) |
| Conteúdo | **Observar** (antigo Círculo, ícone `Sparkles`) |
| Alunos | Conteúdo |
| — | Alunos |

Atualizar `getActiveIndex` para as 5 rotas: `/professor`, `/professor/mapa`, `/professor/circulo`, `/professor/conteudo`, `/professor/alunos`.

---

## 3. Criar Tela `MapaDesenvolvimentoPage`

**Novo arquivo**: `src/pages/professor/MapaDesenvolvimentoPage.tsx`

### Layout da tela:
1. **Header**: "Mapa de Desenvolvimento" + subtítulo dinâmico "Fase N — Inteligência | Semana X"
2. **Seletor de turma** (dropdown com turmas do professor)
3. **Seletor de semana** (pills: S1-S4, semana atual pré-selecionada, futuras desabilitadas)
4. **Grid 2x2** com os 4 quadrantes coloridos (Surpreendeu/Foi Bem/Teve Dificuldades/Atenção)
5. **Lista de alunos não alocados** abaixo dos quadrantes (chips: foto + primeiro nome)
6. **Botão fixo** "Salvar Semana N" (habilitado só quando todos alocados)

### Interação:
- Tap num aluno → Drawer/Sheet com 4 opções coloridas
- Tap num aluno já alocado → mesma sheet com opção "Remover"
- Semanas passadas: modo visualização com banner informativo
- Semana anterior: editável via botão "Editar"

### Dados:
- Buscar alunos via `aluno_turma` + `profiles` (foto, nome) para a turma selecionada
- Buscar alocações existentes via `mapa_desenvolvimento` (fase_id + semana)
- Salvar: upsert em batch (INSERT ... ON CONFLICT UPDATE)

---

## 4. Webhook para N8N

Após save no Supabase com sucesso, disparar POST fire-and-forget para URL configurável.

A URL do webhook será buscada de uma variável de ambiente. Como o projeto já tem um padrão de webhooks N8N (ver `trigger_notificar_n8n_observacao`), usaremos o mesmo endpoint base ou um secret dedicado `MAPA_WEBHOOK_URL`.

O webhook será disparado via trigger no banco (como já feito para observações) OU direto do frontend como fetch fire-and-forget. Dado que o prompt pede configuração via `VITE_*`, farei via frontend (fetch após save).

Payload conforme especificado: evento, professor, turma, fase, semana, alocações, resumo.

---

## 5. Atualizar Home — Ações Rápidas

**Arquivo**: `src/pages/professor/ProfessorDashboardSimplificado.tsx`

Adicionar card "Mapa de Desenvolvimento" como primeiro item do `quickActions`:
- Ícone: `LayoutGrid`
- Label: "Mapa de Desenvolvimento"
- Descrição: "Visão rápida semanal dos alunos"
- Path: `/professor/mapa`

---

## 6. Rota no App.tsx

Adicionar rota `/professor/mapa` → `MapaDesenvolvimentoPage` dentro do `ProfessorLayout`.

---

## Arquivos a criar/editar

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar tabela + RLS + trigger |
| `src/pages/professor/MapaDesenvolvimentoPage.tsx` | **Criar** — tela completa |
| `src/components/professor/ProfessorBottomNavSimplificado.tsx` | Editar — 5 itens |
| `src/pages/professor/ProfessorDashboardSimplificado.tsx` | Editar — novo card ações rápidas |
| `src/App.tsx` | Editar — nova rota `/professor/mapa` |

