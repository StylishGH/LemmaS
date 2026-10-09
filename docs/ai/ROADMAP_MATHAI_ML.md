# Roadmap de Machine Learning & Data Science — MathAI Engine & LEMMAS

> **Status:** Arquivado para implementação futura após consolidação das prioridades de carreira (Estudo de SQL Analítico e Envio de Currículos para vagas Júnior de Dados/ML).

---

## 1. Visão Geral da Arquitetura Pedagógica

O **MathAI Engine** atua como o cérebro cognitivo da plataforma **LEMMAS**, operando através de quatro pilares complementares e desacoplados:

1. **Agendador Determinístico (FSRS-v4 / SM-2)**:
   - Responde: **Quando** o aluno deve revisar um lema ou habilidade matemática?
   - Modela a curva de retenção de memória com base na estabilidade ($S$) e dificuldade intrínseca ($D$).
2. **Recuperador & Seletor de Exercícios (Retrieval & Ranking)**:
   - Responde: **Qual** exercício apresentar para a revisão?
   - Em vez de repetir cegamente a mesma questão (que avalia apenas decoreba), recupera exercícios isomórficos ou do mesmo lema/subtópico.
3. **Tutor Cognitivo & Avaliador Socrático**:
   - Responde: **Como** avaliar o raciocínio e fornecer dicas progressivas?
   - Combina modelos especializados (NVIDIA Nemotron para rigor axiomático, DeepSeek para intuição e Gemini Flash-Lite para latência baixa e OCR multimodal de cadernos).
4. **Base de Telemetria & Mandamento Epistêmico**:
   - $$\mathbf{RAW\ DATA\ (Observed)} \neq \mathbf{AI\ INTERPRETATION} \neq \mathbf{VALIDATED\ LABEL}$$
   - Armazena todas as tentativas, tempos de resposta e intervenções com hash SHA-256 e auditoria estrita.

---

## 2. Trilha Progressiva de Machine Learning (Para Implementação Futura)

### Fase 1: Telemetria e Dados Relacionais (CONCLUÍDO)
- 288 questões 100% categorizadas e normalizadas no Supabase (EFOMM, CEDERJ, ESA).
- Modelagem das tabelas `tentativas`, `avaliacoes_ia`, `flashcards`, `perfil_aluno_topico`.
- Filtros multidimensionais dinâmicos no frontend.

### Fase 2: Modelagem Tabular & Teoria de Resposta ao Item (IRT)
- **Objetivo:** Calcular a dificuldade empírica $b_j$ de cada questão e o nível de proficiência $\theta_i$ de cada estudante.
- **Modelo de Rasch (1-PL):**
  $$P(Y_{ij} = 1 \mid \theta_i, b_j) = \frac{1}{1 + e^{-(\theta_i - b_j)}}$$
- **Ferramentas:** Python (`scipy.optimize`, `scikit-learn`, `statsmodels`).
- **Valor para o Portfólio:** Estatística aplicada e modelagem preditiva clássica de dados tabulares.

### Fase 3: Embeddings de Enunciados & Busca Vetorial (`pgvector`)
- **Decisão Técnica Crucial:** **NÃO treinar modelos de embedding do zero.** Utilizar modelos abertos consolidados de última geração na indústria:
  - `BAAI/bge-m3` ou `sentence-transformers/all-mpnet-base-v2` (locais via Hugging Face).
  - Embeddings gerenciados (OpenAI `text-embedding-3-small` ou Voyage AI).
- **Armazenamento:** Extensão `pgvector` nativa no PostgreSQL do Supabase.
- **Caso de Uso:** Encontrar exercícios com estrutura matemática equivalente para alimentar o recomendador quando o agendador FSRS acionar uma revisão.

### Fase 4: Learning to Rank (LTR) & Calibração do FSRS
- **Ranking Preditivo:** Ordenar questões candidatas maximizando a zona de desenvolvimento proximal (XGBoost / LightGBM com função objetivo de ranking).
- **Calibração do FSRS:** Ajuste fino dos 17 parâmetros de peso do FSRS-v4 por aluno usando otimização numérica via SciPy / PyTorch.

### Fase 5: Fine-Tuning de SLM Pedagógico
- Ajuste fino supervisionado (SFT) de um Small Language Model local (ex: Qwen 2.5 7B Math) usando pares auditados de intervenção socrática extraídos da telemetria real do LEMMAS.
