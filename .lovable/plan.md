

## Feed de Observações em Tempo Real na Tela de Monitoramento

### O que será feito

Substituir o placeholder "Mais recursos em breve" na MonitorPage por um **feed cronológico em tempo real** que mostra as observações registradas pelos professores, como um timeline de atividades.

### Como vai funcionar

Cada item do feed mostra:
- **Avatar + nome do professor** que registrou
- **Nome do aluno** observado
- **Sinal** (emoji + label, ex: "🌟 Liderança Espontânea")
- **Valência** (bolinha verde = positiva, vermelha = atenção)
- **Casa do aluno** (emoji/brasão + nome)
- **Tempo relativo** (ex: "há 3 min", "há 2 horas")

O feed carrega as **últimas 50 observações** da instituição e atualiza automaticamente via Supabase Realtime quando novas observações são inseridas.

### Detalhes técnicos

1. **Query**: Buscar da tabela `observacoes` com join em `profiles` (para nome do aluno e do professor) e `sinais` (para emoji/label/valencia), ordenado por `created_at DESC`, limitado a 50 registros, filtrado pela `institution_id` do admin.

2. **Realtime**: Canal Supabase escutando `INSERT` em `observacoes` para adicionar novas entradas no topo do feed sem reload.

3. **UI**: Seção "Atividade Recente" com ícone de timeline, items em lista vertical com bordas sutis, estilo consistente com o dark theme existente (`bg-white/5`, `border-white/10`).

4. **Filtro rápido**: Chips opcionais "Hoje" / "Últimos 7 dias" / "Todas" para controlar o período.

### Arquivos alterados
- `src/pages/admin/MonitorPage.tsx` — adicionar query de observações, canal Realtime e renderizar o feed no lugar do placeholder

