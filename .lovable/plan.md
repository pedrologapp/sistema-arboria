
# Plano: Criar Aba "Conteúdo" para Infantil/Fundamental 1

## Objetivo

Adicionar uma nova aba **Conteúdo** no menu inferior do professor de Infantil e Fundamental 1, que exibe uma lista das 8 inteligências com seus brasões (igual à imagem de referência das missões) + uma opção especial "Conteúdo Geral Arboria" no topo.

## Visão Geral do Layout

```text
┌─────────────────────────────────────────┐
│  📚 Conteúdo                            │
├─────────────────────────────────────────┤
│                                         │
│  🌳 Conteúdo Geral Arboria         →    │
│     Filosofia, metodologia, guias       │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  [Escudo] Linguística              →    │
│           Ver conteúdo da fase          │
│                                         │
│  [Escudo] Lógico-Matemática        →    │
│           Ver conteúdo da fase          │
│                                         │
│  [Escudo] Espacial                 →    │
│           Ver conteúdo da fase          │
│                                         │
│  ... (continua com as 8)                │
│                                         │
└─────────────────────────────────────────┘
```

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/professor/ConteudoPage.tsx` | Página principal da aba Conteúdo (lista das 8 inteligências + Geral) |
| `src/pages/professor/ConteudoInteligenciaPage.tsx` | Página de detalhes do conteúdo de uma inteligência específica |
| `src/pages/professor/ConteudoGeralPage.tsx` | Página de conteúdo geral do Arboria |

## Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/components/professor/ProfessorBottomNavSimplificado.tsx` | Adicionar aba "Conteúdo" com ícone `BookOpen` |
| `src/App.tsx` | Adicionar rotas `/professor/conteudo`, `/professor/conteudo/geral` e `/professor/conteudo/inteligencia/:id` |

## Detalhes de Implementação

### 1. Menu Inferior (`ProfessorBottomNavSimplificado.tsx`)

**Adicionar item de navegação:**
```typescript
const navItems: NavItemConfig[] = [
  { id: 'home', icon: <Home size={20} />, label: 'Home', path: '/professor' },
  { id: 'circulo', icon: <Sparkles size={20} />, label: 'Círculo', path: '/professor/circulo' },
  { id: 'conteudo', icon: <BookOpen size={20} />, label: 'Conteúdo', path: '/professor/conteudo' }, // NOVO
  { id: 'alunos', icon: <Users size={20} />, label: 'Alunos', path: '/professor/alunos' },
];
```

**Atualizar lógica de activeIndex:**
```typescript
if (currentPath === '/professor') return 0;
if (currentPath.startsWith('/professor/circulo')) return 1;
if (currentPath.startsWith('/professor/conteudo')) return 2;  // NOVO
if (currentPath.startsWith('/professor/alunos')) return 3;    // Ajustado
```

### 2. Página Principal (`ConteudoPage.tsx`)

**Estrutura:**
- Header com título "📚 Conteúdo"
- Card especial "Conteúdo Geral Arboria" no topo (verde/emerald)
- Divisor
- Lista das 8 inteligências (mesmo padrão visual da imagem)
  - Usa componente `CasaBrasao` com size="medium"
  - Nome da inteligência
  - Texto "Ver conteúdo da fase"
  - Seta para indicar navegação

**Query para buscar inteligências:**
```typescript
const { data: inteligencias } = useQuery({
  queryKey: ['inteligencias'],
  queryFn: async () => {
    const { data } = await supabase
      .from('inteligencias')
      .select('id, nome, emoji, cor_hex, brasao_url')
      .order('id');
    return data;
  }
});
```

### 3. Página de Conteúdo Geral (`ConteudoGeralPage.tsx`)

**Conteúdo:**
- Header com voltar + "Conteúdo Geral Arboria"
- Seção "Essência do Arboria" (reutilizar estilo do ConteudoModal)
- Seção "Filosofia do Projeto"
- Seção "Como Observar Alunos"
- Seção "Guias para o Professor"
- Links para PDFs/materiais de apoio

### 4. Página de Inteligência (`ConteudoInteligenciaPage.tsx`)

**Conteúdo:**
- Header com voltar + brasão + nome da inteligência
- Seção "Descrição da Fase"
- Seção "Objetivos"
- Seção "Atividades Sugeridas"
- Seção "Sinais para Observar" (lista dos sinais relacionados)
- Materiais de apoio (PDFs por semana)

### 5. Rotas (`App.tsx`)

**Adicionar:**
```typescript
// Aba Conteúdo (Infantil/F1)
<Route path="/professor/conteudo" element={
  <ProfessorProtectedRoute>
    <ProfessorLayout>
      <ConteudoPage />
    </ProfessorLayout>
  </ProfessorProtectedRoute>
} />
<Route path="/professor/conteudo/geral" element={
  <ProfessorProtectedRoute>
    <ProfessorLayout>
      <ConteudoGeralPage />
    </ProfessorLayout>
  </ProfessorProtectedRoute>
} />
<Route path="/professor/conteudo/inteligencia/:inteligenciaId" element={
  <ProfessorProtectedRoute>
    <ProfessorLayout>
      <ConteudoInteligenciaPage />
    </ProfessorLayout>
  </ProfessorProtectedRoute>
} />
```

## Layout Visual da Lista de Inteligências

Cada item segue o padrão da imagem:
```typescript
<button className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 
  text-left transition-colors flex items-center justify-between">
  <div className="flex items-center gap-3">
    <CasaBrasao 
      brasaoUrl={inteligencia.brasao_url}
      emoji={inteligencia.emoji}
      nome={inteligencia.nome}
      size="medium"  // 56px como na imagem
    />
    <div>
      <p className="text-white font-medium">{inteligencia.nome}</p>
      <p className="text-white/40 text-xs">Ver conteúdo da fase</p>
    </div>
  </div>
  <ChevronRight className="text-white/30" />
</button>
```

## Card Especial "Conteúdo Geral"

Destaque visual diferenciado:
```typescript
<button 
  onClick={() => navigate('/professor/conteudo/geral')}
  className="w-full p-4 rounded-xl text-left transition-colors
    bg-gradient-to-r from-emerald-500/20 to-emerald-500/10
    border border-emerald-500/30 hover:border-emerald-500/50
    hover:bg-emerald-500/20"
>
  <div className="flex items-center gap-3">
    <div className="w-14 h-14 rounded-xl bg-emerald-500/20 
      flex items-center justify-center">
      <TreePine className="w-7 h-7 text-emerald-400" />
    </div>
    <div className="flex-1">
      <p className="text-white font-semibold">Conteúdo Geral Arboria</p>
      <p className="text-white/50 text-sm">Filosofia, metodologia, guias</p>
    </div>
    <ChevronRight className="text-emerald-400/50" />
  </div>
</button>
```

## Fluxo de Navegação

```text
Menu Inferior
    │
    ▼
📚 Conteúdo (ConteudoPage)
    │
    ├── 🌳 Conteúdo Geral Arboria → ConteudoGeralPage
    │       └── Filosofia, metodologia, guias para professor
    │
    ├── [Linguística] → ConteudoInteligenciaPage/1
    │       └── Descrição, objetivos, atividades, sinais
    │
    ├── [Lógico-Matemática] → ConteudoInteligenciaPage/2
    │       └── ...
    │
    └── ... (demais inteligências)
```

## Resumo

1. **Nova aba no menu**: `Conteúdo` entre `Círculo` e `Alunos`
2. **Página principal**: Lista as 8 inteligências com brasões + opção geral no topo
3. **Páginas de detalhes**: Conteúdo específico por inteligência ou geral
4. **Visual**: Replica o layout da imagem de referência (brasões de 56px, textos descritivos)
5. **Exclusivo para Infantil/F1**: Usa o BottomNav simplificado

