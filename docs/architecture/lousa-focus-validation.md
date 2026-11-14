# Lousa e Modo Foco — revisão de 11/11/2026

A lousa mantém um documento em memória por questão da sessão de resolução. O documento contém os traços, até 100 operações de desfazer/refazer e as preferências de caneta. A bancada e o Foco usam o mesmo documento, com apenas uma instância da ferramenta montada por vez.

## Comportamento corrigido

- Traços são publicados ao terminar o gesto; não há espera de um segundo antes de abrir o Foco.
- Traços de dois pontos continuam sendo linhas. A posição final de `pointerup` é incluída, e a pressão permanece no desenho consolidado e nos redesenhos.
- As amostras de `getCoalescedEvents()` são lidas uma vez, com fallback para o evento normal. Marcador e borracha redesenham uma vez por evento, após incorporar as amostras.
- A borracha considera os segmentos entre pontos e seu caminho percorrido. Apagar vários traços num gesto conta como uma operação; limpar também pode ser desfeito. Uma edição nova invalida o refazer.
- A troca de tema remapeia desenho e histórico. Caneta, cor da paleta, espessura e modo de rejeição de palma continuam disponíveis ao entrar/sair do Foco.
- O desenho maior permanece acessível por rolagem quando a bancada diminui. A exportação para OCR redesenha todos os traços, limitada a 4096 pixels por lado, em vez de copiar somente o recorte visível.
- Redimensionar restaura também o traço em andamento; cancelamento/perda de captura consolida as amostras existentes.
- O painel da questão começa abaixo das ferramentas, mantém a alça acessível ao arrastar/rotacionar e limita questões extensas à área disponível. O texto matemático é memoizado durante o arraste.
- As setas de navegação não interceptam edição em campos de texto. A tela cheia acompanha `fullscreenchange` e é solicitada no próprio overlay.

## Referências usadas

- [MDN — Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas): separar camadas estáticas e dinâmicas. A implementação existente já tinha duas camadas; elas foram mantidas.
- [MDN — getCoalescedEvents](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents): preservar amostras intermediárias de entrada com detecção de suporte.
- [tldraw — History](https://tldraw.dev/sdk-features/history): agrupar interações completas em unidades de desfazer/refazer. Aplicado a cada gesto de borracha e à limpeza.
- [Excalidraw — discussão de redraw](https://github.com/excalidraw/excalidraw/issues/10063): contexto sobre separação de renderização estática/interativa; não foi usado como benchmark nem como prova de ganho de latência.

Notas históricas consultadas: `tablet-spen-bezier-palm-rejection` e `tablet-spen-dual-canvas-120hz`. As alegações históricas de desempenho não substituem medição em hardware.

## Verificação reproduzível

Na pasta `frontend`:

```bash
node --test scripts/test-canvas-document.mjs
node scripts/test-canvas-browser.mjs
npx tsc --noEmit --incremental false
npx eslint components/lousa/SpenSmartCanvas.tsx components/bancada/ImmersiveFocusOverlay.tsx components/bancada/FloatingQuestionHUD.tsx lib/canvas-document.ts
```

O teste de navegador compila os componentes reais com o CSS do produto num ambiente isolado, usa Chrome instalado (`CHROME_PATH` permite outro caminho) e remove os arquivos temporários criados dentro de `frontend`. Não abre contas, banco de dados ou serviços de IA. `CANVAS_TEST_OUTPUT` permite preservar as capturas em um diretório escolhido, preferencialmente no HD.

Cobertura: traço curto e endpoint; desfazer/refazer; passagem imediata normal/Foco; quantidade de canvases; exportação completa; isolamento entre questões; limpeza e borracha reversíveis; tema claro e histórico; arraste e limites do painel; edição de texto sem navegação acidental; amostras agrupadas; espessura por pressão; rejeição de toque; cancelamento; mudança de DPR/tamanho durante escrita; preferências; questão extensa em viewport móvel. Testado em 1280×900, 1024×768 e 390×844, com DPR 1 e 2.

## Limites

O teste de navegador usa eventos sintéticos para simular caneta e toque. Não mede latência real, desempenho em Samsung Internet, rejeição física de palma ou sensação da S-Pen. A verificação correspondente no roadmap continua pendente. Não houve benchmark que permita prometer 120 Hz ou determinada redução de latência.

Os documentos permanecem durante a sessão de resolução em memória. Esta mudança não implementa recuperação após recarregar/fechar a página, nem sincronização na nuvem. A suíte isolada não valida o GeoGebra externo, uma avaliação real de OCR ou o fluxo autenticado completo do resolver. Alterações locais; publicação não faz parte desta verificação.
