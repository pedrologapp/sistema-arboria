

## Plano: Sincronizar S1/S2/S3/S4 com datas da fase no Supabase

### Problema
Os botões S1-S4 usam `activeFase?.semana_atual || 1` — um campo manual do banco. A semana deve ser **calculada automaticamente** a partir de `data_inicio` da fase e a data atual.

### Solução

**1. Criar função utilitária `calcularSemanaAtualDaFase` em `src/utils/timezone.ts`**

```typescript
export const calcularSemanaAtualDaFase = (dataInicio: string, dataFim: string): number => {
  const agora = agoraBrasil();
  const inicio = parseDataLocal(dataInicio);
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicioData = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());

  if (hoje < inicioData) return 0; // fase não começou

  const diffDias = Math.floor((hoje.getTime() - inicioData.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias <= 6) return 1;
  if (diffDias <= 13) return 2;
  if (diffDias <= 20) return 3;
  return 4; // dia 21+ até data_fim
};
```

**2. Substituir todas as referências a `semana_atual` do banco pela função calculada**

Arquivos afetados (todos os que usam `semana_atual`):
- `src/pages/professor/MapaDesenvolvimentoPage.tsx` — linha 48 (estado inicial) e linha 129 (`semanaAtual`)
- `src/contexts/ProfessorContext.tsx` — onde seta `faseAtual`, calcular semana e incluir no objeto
- `src/contexts/StudentContext.tsx` — mesma lógica
- `src/pages/professor/ProfessorDashboard.tsx` — exibição "Semana X de 4"
- `src/pages/professor/MissoesSeriePage.tsx` — semana atual para missões
- `src/pages/professor/EntregasSeriePage.tsx` — semana para entregas
- `src/pages/aluno/HomePage.tsx`, `src/pages/aluno/MissoesPage.tsx` — exibição do aluno
- `src/components/aluno/StudentHeader.tsx` — header do aluno

**Abordagem centralizada**: Calcular `semana_atual` nos contextos (`ProfessorContext` e `StudentContext`) ao montar o objeto `faseAtual`, usando `calcularSemanaAtualDaFase(data_inicio, data_fim)`. Assim todos os consumidores recebem o valor correto automaticamente, sem alterar cada página individualmente.

**3. Regras de interação nos botões (já implementadas corretamente)**
- Semanas futuras (`s > semanaAtual`): desabilitadas — já funciona
- Semanas passadas: clicáveis para consulta — já funciona
- Semana atual: selecionada por padrão — precisa ajustar o `useState` inicial no MapaDesenvolvimentoPage

### Resultado
A semana ativa será sempre derivada das datas reais da fase, sem depender de campo manual do banco.

