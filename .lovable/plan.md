
# Plano: Adicionar Filtro por Segmento na Lista de Alunos

## Contexto

O sistema possui 3 segmentos educacionais:
- **infantil** - Educação Infantil
- **fundamental1** - Ensino Fundamental I  
- **fundamental2** - Ensino Fundamental II (únicos que terão acesso ao sistema)

O administrador precisa filtrar alunos por segmento para gerenciar melhor cada grupo.

## Mudanças Necessárias

### Arquivo: `src/pages/admin/PessoasPage.tsx`

#### 1. Adicionar estado do filtro (linha ~39)
```typescript
const [filtroSegmento, setFiltroSegmento] = useState('');
```

#### 2. Extrair segmentos únicos dos alunos (linha ~225)
```typescript
const segmentosUnicos = [...new Set(alunos?.map(a => a.segmento).filter(Boolean))].sort();
```

#### 3. Adicionar condição de filtro (linha ~211)
```typescript
const matchSegmento = !filtroSegmento || aluno.segmento === filtroSegmento;
return matchBusca && matchSerie && matchTurma && matchCasa && matchSegmento;
```

#### 4. Adicionar select de segmento na UI (antes do filtro de Série)
```tsx
<select
  value={filtroSegmento}
  onChange={(e) => setFiltroSegmento(e.target.value)}
  className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm min-w-[130px]"
>
  <option value="">Segmento</option>
  {segmentosUnicos.map(seg => (
    <option key={seg} value={seg}>
      {seg === 'infantil' ? 'Infantil' : 
       seg === 'fundamental1' ? 'Fund. I' : 
       seg === 'fundamental2' ? 'Fund. II' : seg}
    </option>
  ))}
</select>
```

## Layout dos Filtros (Após Mudança)

```
[Segmento ▼] [Série ▼] [Turma ▼] [Casa ▼]
```

O filtro de Segmento aparecerá primeiro, permitindo filtrar rapidamente por nível educacional antes de refinar por série/turma.

## Comportamento

- Quando selecionar "Infantil": mostra apenas alunos da educação infantil
- Quando selecionar "Fund. I": mostra apenas fundamental 1
- Quando selecionar "Fund. II": mostra apenas fundamental 2 (os que terão acesso)
- Quando limpar o filtro: mostra todos os segmentos

## Arquivos Modificados

| Arquivo | Tipo de Mudança |
|---------|-----------------|
| `src/pages/admin/PessoasPage.tsx` | Adicionar estado, lógica de filtro e componente select |
