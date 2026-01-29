
# Plano: Sistema de Conteúdo Editável pelo Admin (por Série/Inteligência)

## Objetivo

Criar um sistema onde o **Admin** pode fazer upload de PDFs de conteúdo para cada **Inteligência** e **Série**, de forma que os professores do Infantil/Fundamental 1 possam acessar esses materiais na aba Conteúdo.

## Estrutura de Dados

Cada série tem arquivos diferentes, organizados por:
- **Inteligência** (8 inteligências: Linguística, Lógico-Matemática, etc.)
- **Série** (1 a 9, onde 1-5 = Infantil/F1, 6-9 = F2)
- **Semana** (1 a 4, como no sistema atual)

## Alterações no Banco de Dados

### Nova Tabela: `conteudo_inteligencia`

```sql
CREATE TABLE public.conteudo_inteligencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  inteligencia_id integer NOT NULL REFERENCES inteligencias(id) ON DELETE CASCADE,
  serie smallint NOT NULL CHECK (serie >= 1 AND serie <= 9),
  semana smallint NOT NULL CHECK (semana >= 1 AND semana <= 4),
  titulo text,
  descricao text,
  arquivo_nome text NOT NULL,
  arquivo_url text NOT NULL,
  arquivo_tamanho bigint,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(institution_id, inteligencia_id, serie, semana)
);

-- RLS
ALTER TABLE public.conteudo_inteligencia ENABLE ROW LEVEL SECURITY;

-- Admin pode gerenciar
CREATE POLICY "Admin pode gerenciar conteudo_inteligencia"
ON public.conteudo_inteligencia FOR ALL
USING (
  institution_id = public.get_user_institution_id() 
  AND public.has_role(auth.uid(), 'admin')
);

-- Professor pode ver
CREATE POLICY "Professor pode ver conteudo_inteligencia"
ON public.conteudo_inteligencia FOR SELECT
USING (
  institution_id = public.get_user_institution_id() 
  AND public.has_role(auth.uid(), 'professor')
);
```

## Fluxo do Admin

### 1. Nova Página: Gerenciar Conteúdo por Inteligência

**Rota:** `/admin/conteudo`

**Layout:**
```text
┌──────────────────────────────────────────┐
│  ← Voltar            Gerenciar Conteúdo  │
├──────────────────────────────────────────┤
│                                          │
│  [Escudo] Linguística              →     │
│           8 arquivos em 3 séries         │
│                                          │
│  [Escudo] Lógico-Matemática        →     │
│           4 arquivos em 2 séries         │
│                                          │
│  ... (continua com as 8)                 │
│                                          │
└──────────────────────────────────────────┘
```

### 2. Página de Detalhes: Conteúdo por Série

**Rota:** `/admin/conteudo/inteligencia/:id`

**Layout com tabs por série:**
```text
┌──────────────────────────────────────────┐
│  ← Voltar       [Escudo] Linguística     │
├──────────────────────────────────────────┤
│                                          │
│  [ 1º ] [ 2º ] [ 3º ] [ 4º ] [ 5º ]      │  ← Tabs de séries
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  📄 Semana 1                             │
│     [+ Adicionar PDF]                    │
│                                          │
│  📄 Semana 2                             │
│     guia-semana-2.pdf     ⋮              │
│     1.2 MB                               │
│                                          │
│  📄 Semana 3                             │
│     [+ Adicionar PDF]                    │
│                                          │
│  📄 Semana 4                             │
│     [+ Adicionar PDF]                    │
│                                          │
└──────────────────────────────────────────┘
```

## Fluxo do Professor

### Página `ConteudoInteligenciaPage.tsx` Atualizada

Ao acessar uma inteligência, o professor verá:
1. Descrição da inteligência (conteúdo estático existente)
2. Objetivos, Atividades, Sinais (conteúdo estático existente)
3. **Materiais de Apoio** - agora busca do banco baseado na série das turmas do professor

```text
┌──────────────────────────────────────────┐
│  ← Voltar   [Escudo] Linguística         │
├──────────────────────────────────────────┤
│                                          │
│  📋 Sobre esta Inteligência              │
│     [descrição...]                       │
│                                          │
│  🎯 Objetivos da Fase                    │
│     • Objetivo 1                         │
│     • Objetivo 2                         │
│                                          │
│  💡 Atividades Sugeridas                 │
│     1. Atividade 1                       │
│     2. Atividade 2                       │
│                                          │
│  👁 Sinais para Observar                 │
│     • Sinal 1                            │
│     • Sinal 2                            │
│                                          │
├──────────────────────────────────────────┤
│  📁 Materiais de Apoio — 2º ano          │
├──────────────────────────────────────────┤
│                                          │
│  Semana 1                                │
│  ┌────────────────────────────────────┐  │
│  │ 📄 guia-semana-1.pdf     [Ver] [↓] │  │
│  │    1.5 MB                          │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Semana 2                                │
│  ┌────────────────────────────────────┐  │
│  │ 📄 atividades-semana-2.pdf [Ver][↓]│  │
│  │    2.3 MB                          │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Semana 3 · Semana 4                     │
│  (Nenhum material disponível ainda)      │
│                                          │
└──────────────────────────────────────────┘
```

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/admin/ConteudoAdminPage.tsx` | Lista de inteligências para gerenciar |
| `src/pages/admin/ConteudoInteligenciaAdminPage.tsx` | Tabs por série + upload de PDFs por semana |

## Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/App.tsx` | Adicionar rotas `/admin/conteudo` e `/admin/conteudo/inteligencia/:id` |
| `src/pages/professor/ConteudoInteligenciaPage.tsx` | Buscar PDFs do banco baseado na série do professor |
| `src/components/AdminBottomNav.tsx` ou menu lateral | Adicionar link para "Conteúdo" |

## Lógica de Séries para Professor

O professor do Infantil/F1 pode ter turmas de múltiplas séries. A página mostrará:
1. Se o professor tem apenas 1 série → mostra os PDFs dessa série diretamente
2. Se tem múltiplas séries → mostra seletor de série no topo

```typescript
// Buscar séries das turmas do professor
const { data: turmas } = await supabase
  .from('professor_turma')
  .select('turmas(serie)')
  .eq('professor_id', professorId);

const series = [...new Set(turmas.map(t => t.turmas.serie))];
```

## Storage Bucket

Reutilizar bucket existente `fase-conteudos` ou criar novo `inteligencia-conteudos`:
```
inteligencia-conteudos/
  ├── inteligencia-1/
  │   ├── serie-1/
  │   │   ├── semana-1/arquivo.pdf
  │   │   ├── semana-2/arquivo.pdf
  │   ├── serie-2/
  │   │   └── ...
  ├── inteligencia-2/
  │   └── ...
```

## Resumo

1. **Banco**: Nova tabela `conteudo_inteligencia` (inteligência + série + semana)
2. **Admin**: Páginas para gerenciar uploads por inteligência/série
3. **Professor**: Página de inteligência exibe PDFs filtrados pela série das suas turmas
4. **Reuso**: Mesma lógica de upload do `TabConteudo` existente
5. **Flexibilidade**: Cada série pode ter arquivos diferentes para a mesma inteligência
