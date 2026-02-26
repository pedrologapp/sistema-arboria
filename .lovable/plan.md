

# Painel de Casas — Visão Geral com Membros e Cargos

## Objetivo

Substituir o placeholder "Em breve" da `CasasPage` por uma visão geral funcional das 8 casas, mostrando para cada casa: o professor mentor, a contagem de alunos por série, e os coordenadores/líderes designados.

## Dados disponíveis

- **`inteligencias`**: 8 casas com id, nome, cor_hex, emoji
- **`profiles`**: alunos com casa_id e serie
- **`professor_casa`**: professor mentor de cada casa
- **`cargos_casa`**: coordenadores e líderes (tabela existe, atualmente vazia — será populada via PerfilAlunoAdminPage)

## Alterações

### Arquivo: `src/pages/admin/CasasPage.tsx` (reescrever completo)

1. Buscar as 8 inteligências da tabela `inteligencias`
2. Buscar todos os alunos com `casa_id` (profiles) para contar membros por casa/série
3. Buscar professores mentores da `professor_casa` (ativo = true) com join em profiles para nome
4. Buscar cargos ativos da `cargos_casa` com join em profiles para nome e série

5. Renderizar um grid de 8 cards (um por casa), cada card com:
   - Header colorido com emoji + nome da casa + cor da inteligência
   - Nome do professor mentor (ou "Sem mentor")
   - Total de membros
   - Seção de cargos por série (6º, 7º, 8º → 1 coordenador; 9º → 1 coordenador + 1 líder)
   - Badge visual para coordenador e líder

6. Ao clicar em um card, expandir (accordion) para ver a lista de membros agrupados por série

### Visual esperado (mobile-first)

```text
┌─────────────────────────────┐
│ 🧘 Intrapessoal             │
│ Mentor: Oceni Arboria       │
│ 2 membros                   │
│                             │
│ 6º: Coord. — João Silva     │
│ 7º: Coord. — (vago)         │
│ 8º: Coord. — (vago)         │
│ 9º: Coord. — (vago)         │
│     Líder  — (vago)         │
└─────────────────────────────┘
```

### Queries necessárias (todas via supabase client, RLS já cobre admin)

```typescript
// 1. Inteligências
supabase.from('inteligencias').select('*').order('ordem')

// 2. Contagem de membros por casa
supabase.from('profiles').select('id, casa_id, serie, full_name').not('casa_id', 'is', null)

// 3. Mentores
supabase.from('professor_casa').select('casa_id, professor_id, profiles!professor_casa_professor_id_fkey(full_name)').eq('ativo', true)

// 4. Cargos
supabase.from('cargos_casa').select('casa_id, cargo, aluno_id, profiles!cargos_casa_aluno_id_fkey(full_name, serie)').eq('ativo', true)
```

### Nenhuma migração necessária

Todas as tabelas e políticas RLS já existem.

