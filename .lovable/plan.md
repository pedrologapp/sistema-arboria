

## Plano: Banner de orientação "Observar vs Mapa" na página CirculoRegistrarPage

### O que será feito

Criar um componente `BannerObservarVsMapa` e inseri-lo na página `CirculoRegistrarPage.tsx` entre o header ("Observar") e a seção "POSITIVO".

### Componente novo

**Arquivo**: `src/components/professor/circulo/BannerObservarVsMapa.tsx`

- Estado `visible` inicializado a partir de `localStorage` (chave `arboria_banner_observar_mapa`, default `true`)
- Quando fechado com X: salva `false` no localStorage, mostra botão compacto "💡 Ver orientação: Observar vs Mapa"
- Quando aberto:
  - Card com fundo gradiente sutil (amber/blue, opacidade baixa), borda arredondada, botão X
  - Título: 💡 "Quando usar cada ferramenta?" em amber
  - Grid 2 colunas:
    - Esquerda (borda amber): 👁️ OBSERVAR + texto + tags (Brilhou, Travou, Inovou)
    - Direita (borda blue): 🗺️ MAPA + texto + tags (Geral, Rotina, Padrão)
  - Rodapé escuro: 🎯 regra rápida com destaque em bold para "Observar" e "Mapa"

### Alteração existente

**Arquivo**: `src/pages/professor/circulo/CirculoRegistrarPage.tsx`
- Importar `BannerObservarVsMapa`
- Inserir `<BannerObservarVsMapa />` entre o header (linha 297) e a seção POSITIVO (linha 299)
- Nenhuma outra funcionalidade alterada

