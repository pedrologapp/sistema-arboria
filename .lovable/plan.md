
# Plano: Adicionar Campo "segmento" na Tabela Profiles

## Objetivo
Adicionar uma nova coluna `segmento` na tabela `profiles` para categorizar os alunos por nível educacional (infantil, fundamental1, fundamental2).

## Alteracao no Banco de Dados

### Nova Coluna
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `segmento` | text | Nao | Nivel educacional do aluno |

### Valores Esperados
- `infantil` - Educacao Infantil
- `fundamental1` - Ensino Fundamental I (1 ao 5 ano)
- `fundamental2` - Ensino Fundamental II (6 ao 9 ano)

## SQL da Migracao

```sql
ALTER TABLE profiles 
ADD COLUMN segmento text;

COMMENT ON COLUMN profiles.segmento IS 'Segmento educacional: infantil, fundamental1, fundamental2';
```

## Atualizacao na Edge Function sync-alunos-externos

A Edge Function ja recebe `segmento` no payload (conforme interface `AlunoExterno`), mas nao esta salvando no profile. Sera atualizada para incluir o campo nas operacoes de INSERT e UPDATE.

## Resultado Final

### Estrutura do Payload N8N (atualizada)
```json
{
  "alunos": [
    {
      "matricula": "12345",
      "nome": "Joao",
      "sobrenome": "Silva",
      "serie": "6º ano",
      "turma": "A",
      "segmento": "fundamental2",
      "institution_id": "902876e9-b263-4c01-9013-aeef7b6d24e1"
    }
  ]
}
```

## Secao Tecnica

1. **Migracao SQL**: Adicionar coluna `segmento` tipo text na tabela `profiles`
2. **Edge Function**: Atualizar `sync-alunos-externos` para salvar o campo `segmento` tanto na criacao quanto na atualizacao de alunos
3. **Sem necessidade de RLS**: A coluna segue as mesmas politicas ja existentes na tabela `profiles`
