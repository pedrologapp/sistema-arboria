import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// Service Worker (vite-plugin-pwa) temporariamente desativado — config do workbox
// não estava encontrando os assets pra precache. Revisitar num passo focado.
// import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // A divisao manual de chunks foi REMOVIDA em 18/08/2026, com o app fora do ar.
  //
  // O que acontecia: 'vendor' recebia react e react-dom, e 'ui' recebia
  // framer-motion, lucide-react e sonner, que dependem de react. Listar pacotes
  // por nome nao garante ORDEM de inicializacao entre os pedacos, e bastou o
  // grafo de imports mudar para o react-dom passar a executar antes do react. O
  // erro no navegador era este, e a tela ficava preta sem mais nenhuma pista:
  //
  //   Cannot read properties of undefined
  //   (reading '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED')
  //
  // Sem manualChunks, o Rollup calcula os pedacos a partir do grafo real e a
  // ordem sai correta por construcao. Se um dia valer a pena voltar a dividir,
  // tem que ser por FUNCAO, mantendo react e tudo que depende dele no mesmo
  // pedaco, e a mudanca precisa ser testada com `npm run preview` antes de
  // subir: em desenvolvimento este defeito nao aparece, porque o Vite serve os
  // modulos sem empacotar.
  build: {},
});
