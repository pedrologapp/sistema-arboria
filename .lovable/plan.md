
# Plano: Adicionar Botão Voltar na Página de Alterar Senha

## Problema

A página `/alterar-senha` não possui um botão de voltar, deixando o usuário sem opção de navegação quando acessa voluntariamente (ex: vindo do perfil de um professor/admin).

## Solução

Adicionar um botão de voltar no canto superior esquerdo do card, usando `navigate(-1)` para retornar à página anterior no histórico.

## Alterações em `AlterarSenha.tsx`

### 1. Importar ícone ArrowLeft

```typescript
import { Lock, Eye, EyeOff, AlertTriangle, ArrowLeft } from 'lucide-react';
```

### 2. Adicionar botão voltar no topo do Card

Posicionar o botão de forma absoluta no canto superior esquerdo do card:

```typescript
<Card className="w-full max-w-md bg-white/5 border-white/10 relative">
  {/* Botão Voltar */}
  <button
    onClick={() => navigate(-1)}
    className="absolute top-4 left-4 p-2 rounded-full hover:bg-white/10 transition-colors"
  >
    <ArrowLeft className="w-5 h-5 text-white/60" />
  </button>
  
  <CardHeader className="text-center">
    {/* ... resto do header */}
  </CardHeader>
  {/* ... */}
</Card>
```

## Resultado Visual

```text
┌──────────────────────────────────────────┐
│  ←                                       │  ← Botão voltar
│                                          │
│              ⚠️                          │
│                                          │
│         Altere sua Senha                 │
│  Por segurança, você precisa criar...    │
│                                          │
│  Nova Senha                              │
│  ┌────────────────────────────────────┐  │
│  │ 🔒 Mínimo 6 caracteres          👁 │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Confirmar Nova Senha                    │
│  ┌────────────────────────────────────┐  │
│  │ 🔒 Repita a nova senha          👁 │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │        Salvar Nova Senha           │  │
│  └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

## Arquivo a Modificar

- `src/pages/AlterarSenha.tsx`

## Comportamento

- `navigate(-1)` volta para a página anterior no histórico do navegador
- Funciona corretamente vindo de qualquer origem (admin, professor, configurações)
- Estilo consistente com outros botões de voltar do sistema (hover com bg-white/10)
