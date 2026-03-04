

## Plano: Adicionar banner "Observar vs Mapa" na página Mapa de Desenvolvimento

### Alteração

**Arquivo**: `src/pages/professor/MapaDesenvolvimentoPage.tsx`

- Importar `BannerObservarVsMapa` de `@/components/professor/circulo/BannerObservarVsMapa`
- Inserir `<BannerObservarVsMapa />` logo após o header (linha 364), antes dos seletores de série/turma

O componente já existe e compartilha o mesmo estado de localStorage, então se o professor já fechou no "Observar", estará fechado aqui também (e vice-versa). Nenhuma outra alteração necessária.

