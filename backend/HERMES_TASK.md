# Tarefa para Hermes: Sistema de Flashcards, Proveniência e FSRS no LEMMAS

## 1. Contexto e Filosofia
O LEMMAS não gera flashcards cegamente para cada questão. O MathAI detecta padrões de erros importantes em tentativas e sugere cartões em uma **Caixa de Entrada (Inbox)**, onde o estudante pode **aceitar, editar ou descartar**.
Além disso, o estudante pode criar seus próprios cartões.
O agendamento utiliza o algoritmo **FSRS (Free Spaced Repetition Scheduler)** preservando todo o histórico de revisões em `card_reviews`. O LEMMAS é a fonte da verdade, e o Anki é apenas um destino de exportação.

## 2. Tipos de Cartão (Taxonomia)
- `formula`: Fórmula matemática bruta (recuperação direta)
- `concept`: Conceito / Teorema (ex: "Quando duas retas são perpendiculares?")
- `recognition`: Reconhecimento de técnica (ex: "Qual ferramenta usar aqui? -> Semelhança de triângulos")
- `application`: Aplicação direta (resolução rápida de equação/passo)
- `error_recall`: Erro personalizado do próprio aluno (ex: "Você cometeu o erro: 2x + 4 = 10 -> 2x = 14. Onde errou?")
- `diagram`: Imagem ou diagrama geométrico

## 3. O que Implementar no Backend

### A. Modelos (`backend/app/models/flashcard.py`)
- Enum `CardType`: `formula`, `concept`, `recognition`, `application`, `error_recall`, `diagram`
- Enum `CardSourceType`: `ai_generated`, `student_created`, `teacher_created`, `imported_anki`
- Enum `CardStatus`: `inbox_pending`, `approved`, `discarded`
- Enum `ReviewRating`: `again` (1), `hard` (2), `good` (3), `easy` (4)
- Model `Flashcard`:
  - `id`: int / str
  - `student_id`: int
  - `card_type`: CardType
  - `front`: str (Markdown/LaTeX)
  - `back`: str (Markdown/LaTeX)
  - `source_type`: CardSourceType
  - `source_id`: Optional[int] (ex: attempt_id)
  - `concept_id`: Optional[int]
  - `status`: CardStatus (default `inbox_pending` se IA, `approved` se aluno)
  - `generator_model`: Optional[str]
  - `generator_prompt_version`: Optional[str]
  - `student_edited`: bool (default False)
  - `fsrs_stability`: float (default 2.0)
  - `fsrs_difficulty`: float (default 5.0)
  - `fsrs_reps`: int (default 0)
  - `fsrs_lapses`: int (default 0)
  - `fsrs_state`: str (default "new" / "learning" / "review")
  - `due_date`: str / datetime
  - `created_at`: datetime
- Model `CardReview`:
  - `id`: int
  - `card_id`: int
  - `student_id`: int
  - `reviewed_at`: datetime
  - `rating`: ReviewRating
  - `response_time_ms`: Optional[int]
  - `was_correct`: bool
  - `scheduler`: str (default "FSRS-v4")
  - `scheduler_version`: str
  - `previous_interval`: int
  - `new_interval`: int

### B. Schemas (`backend/app/schemas/flashcard.py`)
- `FlashcardCreateRequest`
- `FlashcardInboxActionRequest` (action: "approve" | "edit" | "discard", front?: str, back?: str)
- `FlashcardReviewRequest` (rating: ReviewRating, response_time_ms?: int)
- `FlashcardResponse`
- `FlashcardInboxResponse`

### C. Serviço FSRS & Geração (`backend/app/services/mathai/flashcards.py`)
- `calcular_proximo_intervalo_fsrs(stability, difficulty, reps, rating, elapsed_days)`:
  - Implementação FSRS matemática determinística para calcular nova estabilidade ($S$), dificuldade ($D$) e próximo intervalo ($I = S \cdot \ln(0.9) / \ln(R)$).
- `sugerir_cartao_de_tentativa(tentativa, diagnostico_ia)`:
  - Cria um flashcard de `error_recall` ou `concept` na caixa de entrada pendente.
- `exportar_deck_anki(cards)`:
  - Gera formato de exportação Anki (TSV compatível com campos Front, Back, Tags, Type, Source).

### D. Rotas API (`backend/app/api/routes/flashcards.py`)
- `GET /api/flashcards/inbox`: listar cartões com `status = inbox_pending` do aluno.
- `POST /api/flashcards/inbox/{card_id}/action`: aprovar, editar ou descartar.
- `POST /api/flashcards/`: criação manual pelo estudante.
- `GET /api/flashcards/due`: listar cartões para revisar hoje.
- `POST /api/flashcards/{card_id}/review`: registrar revisão com FSRS e gravar em `card_reviews`.
- `GET /api/flashcards/export/anki`: download do deck formatado para Anki.
- Registrar o router em `backend/app/main.py`.

### E. Script SQL (`data/schemas/03_flashcards_and_fsrs.sql`)
- DDL das tabelas `flashcards` e `card_reviews` com chaves estrangeiras, índices e RLS.
