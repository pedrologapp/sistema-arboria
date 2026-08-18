// ============================================================
// SERVICE WORKER DE AUTODESTRUICAO
//
// O app usou vite-plugin-pwa por um periodo e depois desligou (ver o comentario
// no topo do vite.config.ts). Desligar o plugin para de GERAR o service worker,
// mas nao remove o que ja foi instalado: quem abriu o app naquela janela
// continua com um service worker vivo no navegador, servindo um index.html
// precacheado que aponta para bundles que o deploy seguinte apagou.
//
// O sintoma e' este, e ele nao tem cara de cache:
//   Failed to load module script: expected JavaScript but the server responded
//   with MIME type "text/html"
//
// O servidor devolve o index.html para um /assets/index-XXXX.js que nao existe
// mais, o navegador recusa por MIME, e o app simplesmente nao sobe. Recarregar
// com Ctrl+Shift+R nao resolve, porque quem responde e' o service worker, nao o
// cache do navegador.
//
// Este arquivo existe para matar aquele service worker. O navegador busca o
// /sw.js periodicamente para atualizar; ao encontrar este conteudo diferente,
// instala, e este aqui se desregistra, apaga todos os caches e recarrega as
// abas abertas. Depois disso o app volta a ser servido normalmente pela rede.
//
// Nao remover sem antes ter certeza de que nao existe mais nenhum navegador de
// aluno com o service worker antigo instalado. Manter custa alguns bytes.
// ============================================================

self.addEventListener('install', () => {
  // Assume o controle sem esperar as abas antigas fecharem.
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      try {
        const nomes = await caches.keys();
        await Promise.all(nomes.map((n) => caches.delete(n)));
      } catch {
        // cache indisponivel nao pode impedir o desregistro
      }

      await self.registration.unregister();

      // Recarrega o que estiver aberto: sem isto a aba atual continua com o
      // app quebrado ate o aluno fechar e abrir de novo.
      const clientes = await self.clients.matchAll({ type: 'window' });
      clientes.forEach((c) => c.navigate(c.url));
    })(),
  );
});

// Enquanto este service worker viver, tudo vai direto para a rede. Nada de
// responder pelo cache: e' exatamente isso que estamos consertando.
self.addEventListener('fetch', () => {});
