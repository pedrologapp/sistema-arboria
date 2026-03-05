

## Plano: Mostrar Fase e Semana no Dashboard do Professor (F2)

### Problema
O dashboard do professor não exibe de forma clara qual fase está ativa e em qual semana. A informação existe no `ProfessorContext` (`faseAtual.inteligencia.nome` e `faseAtual.semana_atual`) mas não é mostrada no card principal.

### Alteração

**Arquivo**: `src/pages/professor/ProfessorDashboard.tsx`

Adicionar um card de fase/semana dentro do card da casa (abaixo do título "Mentora"), similar ao que já existe na `HomePage` do aluno:

```text
┌────────────────────────┐
│     [Brasão Casa]      │
│   Casa Linguística     │
│      Mentora           │
│                        │
│  ┌──────────────────┐  │
│  │ Fase: Musical     │  │  ← novo sub-card
│  │ Semana 2 de 4    │  │
│  └──────────────────┘  │
└────────────────────────┘
```

O sub-card usará a cor da fase ativa (`faseAtual.inteligencia.cor_hex`) como destaque, com fundo sutil e borda, exatamente no mesmo padrão do card de fase do aluno.

### Arquivos alterados
- `src/pages/professor/ProfessorDashboard.tsx` — adicionar bloco de fase/semana dentro do card da casa

