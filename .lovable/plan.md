

# Plano: Pop-up de Aviso de Sugestão Ativa ao Registrar Observação

## Objetivo

Criar um modal de aviso que aparece quando o professor tenta registrar uma nova observação para um aluno que já está com status "Precisam de você" (alerta ativo de atenção).

---

## Layout do Modal (Conforme Referência)

O modal seguirá exatamente o layout da imagem:

```text
┌────────────────────────────────────────────────────┐
│ ⚠️ Já existem sugestões para [Nome]               │
│                                                    │
│ ┌──────────────────────────────────────────────┐  │
│ │ "Texto acontecendo..."                       │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ Ações sugeridas:                                   │
│ • [ALTA] Conversa individual                      │
│ • [MÉDIA] Verificar com família                   │
│                                                    │
│ ┌────────────────────────────────────────────────┐ │
│ │ 📋 Registrar minha ação                       │ │  ← Ação Principal (azul)
│ └────────────────────────────────────────────────┘ │
│                                                    │
│ ┌──────────────────┐  ┌────────────────────────┐  │
│ │ 👁 Ver detalhes  │  │ ➕ Nova observação     │  │  ← Ações Secundárias
│ └──────────────────┘  └────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

### 1. CRIAR: `src/components/professor/SugestaoAtivaModal.tsx`

```typescript
import { AlertTriangle, ClipboardCheck, Eye, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AcaoSugerida {
  titulo: string;
  prioridade?: 'alta' | 'media' | 'baixa' | string;
}

interface SugestaoAtivaModalProps {
  isOpen: boolean;
  onClose: () => void;
  nomeAluno: string;
  textoAcontecendo: string;
  acoesSugeridas?: AcaoSugerida[];
  onRegistrarAcao: () => void;
  onRegistrarObservacao: () => void;
  onVerDetalhes?: () => void;
}

const SugestaoAtivaModal = ({
  isOpen,
  onClose,
  nomeAluno,
  textoAcontecendo,
  acoesSugeridas = [],
  onRegistrarAcao,
  onRegistrarObservacao,
  onVerDetalhes
}: SugestaoAtivaModalProps) => {
  
  // Mapear prioridade para badge colorido
  const getPrioridadeBadge = (prioridade?: string) => {
    switch (prioridade?.toLowerCase()) {
      case 'alta':
        return <span className="text-red-400 font-semibold text-xs">[ALTA]</span>;
      case 'media':
      case 'média':
        return <span className="text-amber-400 font-semibold text-xs">[MÉDIA]</span>;
      case 'baixa':
        return <span className="text-green-400 font-semibold text-xs">[BAIXA]</span>;
      default:
        return null;
    }
  };

  const handleRegistrarAcao = () => {
    onClose();
    onRegistrarAcao();
  };

  const handleRegistrarObservacao = () => {
    onClose();
    onRegistrarObservacao();
  };

  const handleVerDetalhes = () => {
    onClose();
    onVerDetalhes?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a2e] border-white/10 max-w-[90vw] sm:max-w-md p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 pb-3 border-b border-white/10">
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-5 h-5" strokeWidth={2} />
            <span className="text-base font-medium">Já existem sugestões para {nomeAluno}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Texto acontecendo */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-white/80 text-sm leading-relaxed">
              "{textoAcontecendo}"
            </p>
          </div>

          {/* Ações sugeridas */}
          {acoesSugeridas.length > 0 && (
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider mb-2">
                Ações sugeridas:
              </p>
              <ul className="space-y-1.5">
                {acoesSugeridas.slice(0, 3).map((acao, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-white/80">
                    <span className="text-white/40 mt-0.5">•</span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      {getPrioridadeBadge(acao.prioridade)}
                      <span>{acao.titulo}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Divider e Botões */}
          <div className="border-t border-white/10 pt-3 space-y-3">
            {/* Ação principal - Registrar minha ação (largura total) */}
            <button
              onClick={handleRegistrarAcao}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <ClipboardCheck className="w-4 h-4" strokeWidth={1.5} />
              <span>Registrar minha ação</span>
            </button>

            {/* Ações secundárias - lado a lado */}
            <div className="grid grid-cols-2 gap-2">
              {/* Ver detalhes */}
              <button
                onClick={handleVerDetalhes}
                className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm transition-colors flex items-center justify-center gap-2 hover:bg-white/10"
              >
                <Eye className="w-4 h-4" strokeWidth={1.5} />
                <span>Ver detalhes</span>
              </button>

              {/* Nova observação */}
              <button
                onClick={handleRegistrarObservacao}
                className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm transition-colors flex items-center justify-center gap-2 hover:bg-white/10"
              >
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                <span>Nova observação</span>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SugestaoAtivaModal;
```

---

### 2. MODIFICAR: `src/pages/professor/PerfilAlunoPage.tsx`

**Adicionar import:**
```typescript
import SugestaoAtivaModal from '@/components/professor/SugestaoAtivaModal';
```

**Adicionar estado (após linha 150):**
```typescript
// Estado para modal de sugestão ativa
const [modalSugestaoAtiva, setModalSugestaoAtiva] = useState(false);
```

**Modificar `handleRegistrarObservacao` (linha 184-187):**
```typescript
const handleRegistrarObservacao = () => {
  // Se tem alerta de atenção ativo, mostrar modal de aviso primeiro
  if (aluno.alertaAtivo?.tipo === 'precisa_atencao') {
    setModalSugestaoAtiva(true);
  } else {
    navigate(`/professor/circulo/aluno/${id}`);
  }
};
```

**Adicionar handlers (após handleVerHistorico):**
```typescript
const handleContinuarParaObservacao = () => {
  setModalSugestaoAtiva(false);
  navigate(`/professor/circulo/aluno/${id}`);
};

const handleAbrirRegistrarAcao = () => {
  setModalSugestaoAtiva(false);
  setModalRegistrarOpen(true);
};

const handleVerDetalhes = () => {
  setModalSugestaoAtiva(false);
  // Scroll para o card de feedback ou manter na página
};
```

**Adicionar componente no JSX (após RegistrarConversaModal):**
```tsx
{/* Modal de Sugestão Ativa */}
<SugestaoAtivaModal
  isOpen={modalSugestaoAtiva}
  onClose={() => setModalSugestaoAtiva(false)}
  nomeAluno={primeiroNome}
  textoAcontecendo={aluno.alertaAtivo?.textoAcontecendo || 'Este aluno precisa de atenção.'}
  acoesSugeridas={aluno.alertaAtivo?.acoesSugeridas?.slice(0, 3).map(a => ({
    titulo: a.titulo,
    prioridade: a.prioridade
  }))}
  onRegistrarAcao={handleAbrirRegistrarAcao}
  onRegistrarObservacao={handleContinuarParaObservacao}
  onVerDetalhes={handleVerDetalhes}
/>
```

---

### 3. MODIFICAR: `src/pages/professor/PerfilAlunoPageSimplificado.tsx`

Aplicar as mesmas alterações para consistência:

**Adicionar import:**
```typescript
import SugestaoAtivaModal from '@/components/professor/SugestaoAtivaModal';
```

**Adicionar estado:**
```typescript
const [modalSugestaoAtiva, setModalSugestaoAtiva] = useState(false);
```

**Modificar `handleRegistrarObservacao`:**
```typescript
const handleRegistrarObservacao = () => {
  if (aluno.alertaAtivo?.tipo === 'precisa_atencao') {
    setModalSugestaoAtiva(true);
  } else {
    navigate(`/professor/circulo/aluno/${id}`);
  }
};
```

**Adicionar handlers e componente modal (mesmo padrão da página principal).**

---

## Responsividade Mobile

O modal é projetado para ser 100% responsivo:

| Propriedade | Mobile | Desktop |
|-------------|--------|---------|
| Largura máxima | `max-w-[90vw]` | `sm:max-w-md` |
| Padding | `p-4` | `p-4` |
| Botões secundários | `grid-cols-2` | `grid-cols-2` |
| Texto | `text-sm` | `text-sm` |

- O `DialogContent` usa Radix UI que automaticamente centraliza e adiciona animações
- Em telas muito pequenas (<360px), os botões secundários mantêm layout lado a lado com texto compacto
- O texto do "acontecendo" tem `leading-relaxed` para melhor legibilidade mobile

---

## Fluxo Completo

```text
Professor clica em "Registrar Observação"
            │
            ▼
┌─────────────────────────────────────────┐
│ aluno.alertaAtivo.tipo === 'precisa_atencao'?
└─────────────────────────────────────────┘
            │
    ┌───────┴────────┐
    │                │
   SIM              NÃO
    │                │
    ▼                ▼
Abre Modal       Navega direto
de Aviso         para Círculo
    │
    ├─→ [Registrar minha ação] → Fecha modal → Abre RegistrarAcaoModal
    │
    ├─→ [Ver detalhes] → Fecha modal → Scroll para card de feedback
    │
    └─→ [Nova observação] → Fecha modal → Navega para CirculoRegistrarPage
```

---

## Resumo de Alterações

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/professor/SugestaoAtivaModal.tsx` | **Criar** | Novo componente de modal responsivo |
| `src/pages/professor/PerfilAlunoPage.tsx` | **Modificar** | Adicionar lógica de interceptação |
| `src/pages/professor/PerfilAlunoPageSimplificado.tsx` | **Modificar** | Mesma lógica para consistência |

