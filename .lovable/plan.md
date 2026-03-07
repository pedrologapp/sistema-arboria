

## Plano: Integrar logActivity nas ações que faltam

### Diagnóstico

O banco tem apenas **16 logs no total**. O `logActivity` só está integrado em:
- Login/Logout (AuthContext)
- Chat mensagem (CanalChatPage)
- Entrega de missão (MissaoDetalhePage)
- Avaliação de entrega (AvaliarEntregaPage)
- Avatar atualizado (AvatarUpload)

**Faltam integrações em:**
- Registro de observações (CirculoRegistrarPage, CirculoRegistrarMultiplosPage)
- Criação de missões (NovaMissaoPage/EditarMissaoPage)

Além disso, os 14 logs de `observacao_criada` existentes vieram provavelmente de um backfill manual, não do código.

### Solução

**1. Adicionar logActivity em CirculoRegistrarPage.tsx** (após insert de observação com sucesso)
```typescript
logActivity(profile.id, 'observacao_criada', {
  aluno_id: aluno.id,
  aluno_nome: aluno.full_name || aluno.nome,
});
```

**2. Adicionar logActivity em CirculoRegistrarMultiplosPage.tsx** (após insert em massa)
```typescript
logActivity(profile.id, 'observacao_criada', {
  quantidade: observacoes.length,
});
```

**3. Adicionar logActivity em NovaMissaoPage.tsx** (após criação de missão)
```typescript
logActivity(user.id, 'missao_criada', {
  missao_titulo: titulo,
});
```

**4. Opcionalmente: criar trigger no banco** para garantir que TODA observação inserida gere um log automaticamente, sem depender do frontend. Isso seria mais robusto.

### Abordagem recomendada

Integrar via código frontend nos 3 arquivos acima. Rápido e consistente com o padrão já usado no projeto.

