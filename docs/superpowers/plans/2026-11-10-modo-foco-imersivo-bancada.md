# Modo Foco Imersivo (Bancada Lousa & GeoGebra) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o "Modo Foco Imersivo" como um recurso opt-in (Modo Plus) para a Lousa (S-Pen / Giz) e GeoGebra, permitindo que a ferramenta de desenho/escrita ocupe a tela inteira com um HUD flutuante da questão (minimizável com `-`, suporte a KaTeX, alternativas clicáveis e avaliação inline com MathAI Engine).

**Architecture:** Componente modular `FloatingQuestionHUD` desacoplado, orquestrado por um `ImmersiveFocusOverlay` que renderiza a bancada ativa em `fixed inset-0 z-50` com sincronização transparente de estado com a página de resolução (`resolver/page.tsx`). O layout padrão e os fluxos existentes permanecem 100% inalterados quando o modo imersivo não está ativado.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide React, KaTeX (`MathText`).

---

## Global Constraints

- **Zero Regressão / 100% Aditivo:** O modo foco é puramente opt-in. A interface padrão do `/resolver` não deve sofrer alterações de layout quando o modo não estiver ativo.
- **Preservação Estrita de Estado:** Entrar e sair do Modo Foco não pode resetar ou apagar os traços da lousa (`lousaStrokes`), imagens (`imageFiles`) nem construções do GeoGebra (`geometricCommands`).
- **Compatibilidade KaTeX e Imagens:** O HUD flutuante deve renderizar fórmulas matemáticas em LaTeX via `<MathText />` e figuras de enunciado sem quebras de layout.
- **Responsividade e Touch:** Suporte a toque, caneta (S-Pen stylus) e mouse sem interceptar cliques indevidos na lousa quando o HUD estiver minimizado.

---

## Review Focus

1. **Minimização do HUD:** Quando o HUD está minimizado (`-`), ele deve encolher para uma pílula compacta sem bloquear a área de escrita da lousa.
2. **Sincronização de Alternativas:** Se o aluno selecionar uma alternativa dentro do HUD flutuante, a seleção deve refletir no estado global da questão.
3. **Avaliação MathAI Inline:** O disparo da avaliação discursiva pelo HUD deve invocar `submeterResolucaoDiscursiva` e exibir o veredito (Aprovado / Parcial / Incorreto) diretamente no HUD.
4. **Resolução de Tela / Redimensionamento:** Ao alternar para o modo imersivo, o canvas da lousa e o GeoGebra devem se ajustar suavemente à altura total da viewport.
5. **Escape / Fechamento Limpo:** O aluno pode fechar o modo foco via botão `✕` ou tecla `Escape` sem perder nenhum dado.

---

### Task 1: Componente `FloatingQuestionHUD`

**Files:**
- Create: `frontend/components/bancada/FloatingQuestionHUD.tsx`

- [x] Criar interface de props: `question` (objeto da questão), `currentIndex`, `totalQuestions`, `selectedAnswer`, `onSelectAnswer`, `onEvaluate`, `isEvaluating`, `evaluationResult`, `onClose`.
- [x] Implementar estado `isMinimized` com alternância suave entre card expandido e pílula flutuante compacta (`[ 📌 Q. 14 — EPCAR 2024 (Expandir) ]`).
- [x] Implementar renderização do enunciado com `MathText`, figuras auxiliares e lista de alternativas clicáveis (A, B, C, D, E).
- [x] Adicionar botão de ação *"⚡ Avaliar com MathAI"* e painel de veredito com feedback socrático.
- [x] Adicionar controle de opacidade ou arraste para conforto visual sobre a lousa.

---

### Task 2: Componente `ImmersiveFocusOverlay`

**Files:**
- Create: `frontend/components/bancada/ImmersiveFocusOverlay.tsx`

- [x] Criar container `fixed inset-0 z-50 bg-[#0a0914] flex flex-col`.
- [x] Implementar barra superior com título do modo foco, seletor rápido de motor (Lousa S-Pen 120Hz vs Lousa Giz vs GeoGebra) e botão `✕ Sair do Modo Foco`.
- [x] Renderizar a bancada ativa em área expandida (`flex-1 w-full h-full relative`).
- [x] Sobrepor o `FloatingQuestionHUD` com posicionamento absoluto no canto superior direito.
- [x] Capturar tecla `Escape` para fechar o modo foco com segurança.

---

### Task 3: Integração Opt-in no `resolver/page.tsx`

**Files:**
- Modify: `frontend/app/(app)/resolver/page.tsx`

- [x] Adicionar estado `modoFocoAtivo: boolean` (inicializado como `false`).
- [x] Adicionar botão opt-in `✨ Modo Foco Imersivo (Tela Cheia + HUD)` na barra da bancada.
- [x] Renderizar condicionalmente `<ImmersiveFocusOverlay />` quando `modoFocoAtivo === true`, passando os mesmos handlers e estados (`lousaStrokes`, `geometricCommands`, `submeterResolucaoDiscursiva`).
- [x] Garantir que sair do modo foco atualize `modoFocoAtivo = false` sem resetar estados.

---

### Task 4: Verificação e Validação Ponta a Ponta

- [x] Executar typechecking com `npx tsc --noEmit`.
- [x] Testar abertura e fechamento do Modo Foco Imersivo.
- [x] Testar minimização e expansão do `FloatingQuestionHUD`.
- [x] Verificar integridade dos traços na Lousa e comandos no GeoGebra após entrar e sair do modo foco.
