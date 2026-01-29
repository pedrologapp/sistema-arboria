

# Plano: Calendário de Fases para Professor e Admin

## Objetivo

Criar uma visualização de calendário anual que mostra as 8 fases distribuídas ao longo do ano, permitindo que professores visualizem e administradores editem o cronograma.

---

## Visão Geral

### Para o Professor (Dashboard)
- Nova opção "Calendário" abaixo de "Conteúdo" nas Ações Rápidas
- Abre um modal/drawer com visualização por meses
- Mostra as 8 fases como barras coloridas sobre os meses/semanas
- Apenas visualização (somente leitura)

### Para o Admin (Página de Fases)
- Adicionar um botão/aba "Ver Calendário" na página de Fases
- Modal com visualização do ano completo
- Cada fase aparece como um bloco com as datas
- Clique na fase redireciona para editar

---

## Componente: CalendarioFasesModal

Componente reutilizável que exibe o calendário visual das fases.

### Props
```typescript
interface CalendarioFasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  fases: FaseComDatas[];
  anoLetivo: number;
  onFaseClick?: (faseId: string) => void; // Opcional - para admin editar
  modoEdicao?: boolean; // false = professor, true = admin
}

interface FaseComDatas {
  id: string;
  numero_fase: number;
  data_inicio: string;
  data_fim: string;
  inteligencia: {
    nome: string;
    cor_hex: string | null;
    emoji: string | null;
  };
  ativo?: boolean;
}
```

### Layout Visual (Mobile-First)

```text
┌──────────────────────────────────────────┐
│  ✕                Calendário 2026        │
├──────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ FEV                                │  │
│  │ ████████████ Linguística           │  │
│  │ S1   S2   S3   S4                  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ MAR                                │  │
│  │ ████████████ Musical               │  │
│  │ S1   S2   S3   S4                  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ ABR                                │  │
│  │ ████████████ Espacial              │  │
│  │ S1   S2   S3   S4                  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ... (scroll para outros meses)          │
│                                          │
└──────────────────────────────────────────┘
```

### Detalhes de Cada Fase no Calendário

```text
┌─────────────────────────────────────────┐
│  1  │ 🔤 Linguística         ← em andamento (borda verde)
│     │ 03/02 - 28/02
│     │ ▓▓▓▓▓▓▓▓░░░░░░░░ Sem 2 de 4
└─────────────────────────────────────────┘
```

- Número da fase no canto
- Emoji + Nome da inteligência
- Período (data início - data fim)
- Barra de progresso da semana atual (se ativa)
- Cor de fundo baseada na cor_hex da inteligência

---

## Integração no Professor Dashboard

### Arquivo: `ProfessorDashboardSimplificado.tsx`

Adicionar nova ação rápida após "Conteúdo":

```typescript
const quickActions = [
  // ... ações existentes ...
  { 
    icon: <CalendarDays size={24} />, 
    label: 'Calendário', 
    path: null,
    description: 'Ver fases do ano letivo',
    isModal: true,
    modalType: 'calendario'
  },
];
```

### Buscar Todas as Fases do Ano

Nova query no dashboard para buscar as 8 fases do segmento/instituição:

```typescript
const { data: fasesAno } = useQuery({
  queryKey: ['fases-ano', profile?.institution_id, profile?.segmento],
  queryFn: async () => {
    const { data } = await supabase
      .from('fases')
      .select(`
        id, numero_fase, data_inicio, data_fim, ativo,
        inteligencias!fases_inteligencia_id_fkey (
          nome, cor_hex, emoji
        )
      `)
      .eq('institution_id', profile.institution_id)
      .eq('segmento', profile.segmento)
      .eq('ano_letivo', new Date().getFullYear())
      .order('numero_fase');
    return data;
  },
  enabled: !!profile?.institution_id && !!profile?.segmento
});
```

---

## Integração no Admin (Página de Fases)

### Arquivo: `FasesPage.tsx`

Adicionar botão no header:

```typescript
<div className="flex items-center justify-between mt-4">
  <Select ... /> {/* Seletor de ano existente */}
  
  <Button
    variant="outline"
    onClick={() => setShowCalendario(true)}
    className="gap-2"
  >
    <CalendarDays className="w-4 h-4" />
    Ver Calendário
  </Button>
</div>
```

No modal do admin, ao clicar em uma fase, redireciona para `/admin/fases/:id`.

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/professor/CalendarioFasesModal.tsx` | Modal principal com visualização do calendário |

## Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/pages/professor/ProfessorDashboardSimplificado.tsx` | Adicionar botão "Calendário" e query de fases |
| `src/pages/admin/FasesPage.tsx` | Adicionar botão "Ver Calendário" e integrar modal |

---

## Dados já Disponíveis

A tabela `fases` já contém tudo necessário:
- `data_inicio` e `data_fim` para cada fase
- `inteligencia_id` → join com `inteligencias` para nome, cor e emoji
- `ativo` para destacar a fase atual
- Filtros por `institution_id`, `segmento` e `ano_letivo`

O admin **já configura** as fases na página existente `/admin/fases/nova`. O calendário apenas **visualiza** o que já foi configurado.

---

## Comportamento por Papel

| Papel | Ação |
|-------|------|
| Professor | Visualiza o calendário (somente leitura) |
| Admin | Visualiza e clica para editar datas na página de detalhes |

---

## Considerações Técnicas

1. **Scroll suave**: Lista vertical de meses com scroll
2. **Fase ativa destacada**: Borda verde + indicador de semana atual
3. **Fases futuras**: Opacidade reduzida
4. **Fases passadas**: Estilo "concluída" (azul/cinza)
5. **Responsividade**: Mobile-first, cards empilhados

