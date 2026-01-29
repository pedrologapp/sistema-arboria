
# Plano: Gestão de Professores com Vínculo por Segmento + Tabela de Visão Geral

## Contexto

O sistema possui 3 segmentos educacionais com regras distintas:

| Segmento | Vínculo do Professor | Tabela |
|----------|---------------------|--------|
| **Fundamental 2** | Casa (mentor) | `professor_casa` |
| **Infantil** | Turma(s) específica(s) | `professor_turma` |
| **Fundamental 1** | Turma(s) específica(s) | `professor_turma` |

### Séries por Segmento (dados atuais)

| Segmento | Séries |
|----------|--------|
| Infantil | Maternalzinho(2), Maternal(3), Grupo IV, Grupo V |
| Fundamental 1 | 1º Ano, 2º Ano, 3º Ano, 4º Ano, 5º Ano |
| Fundamental 2 | 6º Ano, 7º Ano, 8º Ano, 9º Ano |

## Mudanças Necessárias

### 1. Atualizar Modal de Adicionar Professor

**Arquivo:** `src/components/admin/ModalAdicionarUsuario.tsx`

Quando segmento = Infantil ou Fundamental 1:
- Exibir multi-select de turmas (agrupadas por série)
- Buscar turmas da tabela `turmas` filtradas pelo segmento

```typescript
// Novo estado
const [turmasSelecionadas, setTurmasSelecionadas] = useState<string[]>([]);

// Buscar turmas disponíveis
const { data: turmasDisponiveis } = useQuery({
  queryKey: ['turmas-por-segmento', segmento, institutionId],
  queryFn: async () => {
    // Mapear séries para cada segmento
    const seriesPorSegmento = {
      infantil: [2, 3, 4, 5],      // Maternal 2, 3, Grupo IV, V
      fundamental1: [1, 2, 3, 4, 5],
      fundamental2: [6, 7, 8, 9]
    };
    
    const series = seriesPorSegmento[segmento] || [];
    
    const { data } = await supabase
      .from('turmas')
      .select('id, nome, serie, turma_letra')
      .eq('institution_id', institutionId)
      .in('serie', series)
      .order('serie')
      .order('turma_letra');
    
    return data || [];
  },
  enabled: segmento !== 'fundamental2'
});
```

UI de seleção múltipla:
```tsx
{segmento !== 'fundamental2' && (
  <div>
    <label className="block text-sm text-white/60 mb-1.5">
      Turmas Vinculadas
    </label>
    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
      {turmasDisponiveis?.map(turma => (
        <button
          key={turma.id}
          onClick={() => toggleTurma(turma.id)}
          className={`p-2 rounded-lg border text-sm ${
            turmasSelecionadas.includes(turma.id)
              ? 'bg-white/20 border-white text-white'
              : 'bg-white/5 border-white/10 text-white/60'
          }`}
        >
          {turma.nome}
        </button>
      ))}
    </div>
  </div>
)}
```

Enviar `turma_ids` no body da edge function:
```typescript
if (segmento !== 'fundamental2') {
  body.turma_ids = turmasSelecionadas;
}
```

---

### 2. Atualizar Página de Perfil do Professor

**Arquivo:** `src/pages/admin/PerfilProfessorAdminPage.tsx`

#### 2.1 Adicionar campo de Segmento
- Mostrar/editar segmento do professor
- Quando mudar segmento, limpar vínculos anteriores

#### 2.2 Exibição condicional baseada no segmento

**Para Fundamental 2:**
- Manter campo "Casa (Mentor)" existente
- Checkbox "É mentor principal"

**Para Infantil / Fundamental 1:**
- Mostrar lista de turmas vinculadas
- Permitir adicionar/remover turmas
- Multi-select agrupado por série

#### 2.3 Buscar dados do professor

```typescript
// Buscar segmento
const { data: professorProfile } = useQuery({
  queryKey: ['professor-profile', id],
  queryFn: async () => {
    const { data } = await supabase
      .from('profiles')
      .select('segmento')
      .eq('id', id)
      .single();
    return data;
  }
});

// Buscar turmas vinculadas (se não for F2)
const { data: turmasVinculadas } = useQuery({
  queryKey: ['professor-turmas', id],
  queryFn: async () => {
    const { data } = await supabase
      .from('professor_turma')
      .select(`
        turma_id,
        turmas (id, nome, serie, turma_letra)
      `)
      .eq('professor_id', id)
      .eq('ativo', true);
    return data?.map(v => v.turmas) || [];
  },
  enabled: professorProfile?.segmento !== 'fundamental2'
});
```

#### 2.4 Salvar alterações de turmas

```typescript
// Ao salvar, se segmento != fundamental2
if (segmento !== 'fundamental2') {
  // Desativar vínculos antigos
  await supabase
    .from('professor_turma')
    .update({ ativo: false })
    .eq('professor_id', id);
  
  // Criar novos vínculos
  const novosVinculos = turmasSelecionadas.map(turmaId => ({
    professor_id: id,
    turma_id: turmaId,
    institution_id: institutionId,
    ano_letivo: new Date().getFullYear(),
    ativo: true
  }));
  
  await supabase.from('professor_turma').upsert(novosVinculos, {
    onConflict: 'professor_id,turma_id,ano_letivo'
  });
}
```

---

### 3. Adicionar Tabela de Visão Geral na Aba Professores

**Arquivo:** `src/pages/admin/PessoasPage.tsx`

Criar uma tabela estilo Excel mostrando:
- Todas as turmas organizadas por segmento/série
- Status: COM professor (nome) ou SEM professor
- Cores visuais para identificação rápida

#### 3.1 Buscar dados da tabela

```typescript
const { data: quadroTurmas } = useQuery({
  queryKey: ['quadro-turmas-professores', institutionId],
  queryFn: async () => {
    const { data } = await supabase
      .from('turmas')
      .select(`
        id, nome, serie, turma_letra,
        professor_turma (
          professor_id,
          profiles:professor_id (full_name)
        )
      `)
      .eq('institution_id', institutionId)
      .eq('professor_turma.ativo', true)
      .order('serie')
      .order('turma_letra');
    
    // Também buscar professor_casa para F2
    const { data: casasMentor } = await supabase
      .from('professor_casa')
      .select(`
        casa_id,
        professor_id,
        profiles:professor_id (full_name),
        inteligencias:casa_id (nome)
      `)
      .eq('institution_id', institutionId)
      .eq('ativo', true);
    
    return { turmas: data, casas: casasMentor };
  }
});
```

#### 3.2 Componente TabelaVisaoGeral

Nova seção na aba Professores:

```tsx
{/* Visão Geral - Turmas x Professores */}
<div className="mt-6">
  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
    <TableIcon className="w-4 h-4" />
    Visão Geral: Turmas e Professores
  </h3>
  
  {/* Segmento tabs */}
  <div className="flex gap-2 mb-4">
    <button onClick={() => setSegmentoVisao('infantil')}>Infantil</button>
    <button onClick={() => setSegmentoVisao('fundamental1')}>Fund. I</button>
    <button onClick={() => setSegmentoVisao('fundamental2')}>Fund. II</button>
  </div>
  
  {/* Tabela tipo Excel */}
  <div className="overflow-x-auto">
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-white/5">
          <th className="p-2 text-left text-white/60 text-xs">TURMA</th>
          <th className="p-2 text-left text-white/60 text-xs">PROFESSOR</th>
          <th className="p-2 text-center text-white/60 text-xs">STATUS</th>
        </tr>
      </thead>
      <tbody>
        {turmasFiltradas.map(turma => (
          <tr key={turma.id} className="border-t border-white/10">
            <td className="p-2 text-white text-sm">{turma.nome}</td>
            <td className="p-2 text-white/80 text-sm">
              {turma.professor_nome || '-'}
            </td>
            <td className="p-2 text-center">
              {turma.professor_id ? (
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                  ✓ Atribuído
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                  Sem professor
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  
  {/* Resumo */}
  <div className="mt-4 flex gap-4 text-sm">
    <span className="text-green-400">{comProfessor} turmas atribuídas</span>
    <span className="text-red-400">{semProfessor} turmas sem professor</span>
  </div>
</div>
```

#### 3.3 Para Fundamental 2 (Casas)

Tabela diferente mostrando Casas x Mentores:

```tsx
{segmentoVisao === 'fundamental2' && (
  <table>
    <thead>
      <tr>
        <th>CASA</th>
        <th>MENTOR</th>
        <th>STATUS</th>
      </tr>
    </thead>
    <tbody>
      {casas.map(casa => {
        const mentor = mentoresPorCasa[casa.id];
        return (
          <tr key={casa.id}>
            <td>{casa.emoji} {casa.nome}</td>
            <td>{mentor?.full_name || '-'}</td>
            <td>{mentor ? '✓ Atribuído' : 'Sem mentor'}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
)}
```

---

## Resumo de Arquivos

### Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/components/admin/ModalAdicionarUsuario.tsx` | Multi-select de turmas para Infantil/F1 |
| `src/pages/admin/PerfilProfessorAdminPage.tsx` | Campo segmento + gestão de turmas/casa |
| `src/pages/admin/PessoasPage.tsx` | Tabela de visão geral turmas x professores |

---

## Fluxo de Uso

### Criar Professor Infantil/F1
1. Admin clica "Adicionar Professor"
2. Preenche nome, email
3. Seleciona segmento: "Infantil"
4. Sistema exibe turmas disponíveis: Maternal 2 A, Maternal 2 B, Grupo IV A...
5. Admin seleciona turmas: "Grupo IV A", "Grupo IV B"
6. Professor é criado com vínculos na `professor_turma`

### Editar Professor Existente
1. Admin clica no professor na lista
2. Abre página de perfil
3. Vê segmento atual e turmas/casa vinculadas
4. Pode alterar turmas ou casa
5. Salva alterações

### Visualizar Quadro Geral
1. Admin vai na aba "Professores"
2. Vê lista de professores + tabela de visão geral
3. Seleciona segmento: "Infantil"
4. Vê todas as turmas do Infantil com status
5. Identifica rapidamente quais turmas estão sem professor

---

## Resultado Visual

### Tabela Visão Geral (Infantil)

```text
┌─────────────────┬──────────────────┬────────────┐
│ TURMA           │ PROFESSOR        │ STATUS     │
├─────────────────┼──────────────────┼────────────┤
│ Maternalzinho A │ Maria Santos     │ ✓ Atribuído│
│ Maternalzinho B │ -                │ ⚠ Sem prof │
│ Maternal A      │ João Silva       │ ✓ Atribuído│
│ Maternal B      │ João Silva       │ ✓ Atribuído│
│ Grupo IV A      │ -                │ ⚠ Sem prof │
│ Grupo IV B      │ Ana Costa        │ ✓ Atribuído│
│ Grupo V A       │ -                │ ⚠ Sem prof │
│ Grupo V B       │ -                │ ⚠ Sem prof │
└─────────────────┴──────────────────┴────────────┘

Resumo: 4 turmas atribuídas | 4 turmas sem professor
```

### Tabela Visão Geral (Fundamental 2 - Casas)

```text
┌────────────────────┬──────────────────┬────────────┐
│ CASA               │ MENTOR           │ STATUS     │
├────────────────────┼──────────────────┼────────────┤
│ 📖 Linguística     │ Julianeide Gomes │ ✓ Atribuído│
│ 🧮 Lógico-Matemát. │ -                │ ⚠ Sem mentor│
│ 🎵 Musical         │ -                │ ⚠ Sem mentor│
│ ...                │ ...              │ ...        │
│ 🧘 Intrapessoal    │ Oceni Arboria    │ ✓ Atribuído│
└────────────────────┴──────────────────┴────────────┘

Resumo: 2 casas atribuídas | 6 casas sem mentor
```
