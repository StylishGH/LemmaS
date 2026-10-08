# Roteador de IA & Fallbacks — Implementação

> Documentação técnica do sistema de roteamento inteligente multi-provider do MathAI.
> Versão correspondente ao código em `src/ai/router.py`, `src/ai/client.py`, `src/ai/evaluator.py`.

---

## 🎯 Objetivo

Eliminar **vendor lock-in**, garantir **resiliência** (fallback automático), otimizar **custo/latência** por tarefa e manter **observabilidade** total (telemetria por modelo/tarefa).

---

## 🏗️ Arquitetura Geral

```
                         ┌─────────────────────┐
                         │   AI Router Core    │
                         │  (src/ai/router.py) │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
     ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
     │  NVIDIA NIM     │    │  Google Gemini  │    │  Python Deterministic │
     │  (Primary)      │    │  (Vision/Fallback)│  │  (95% Volume)   │
     └────────┬────────┘    └────────┬────────┘    └────────┬────────┘
              │                      │                      │
              └──────────────────────┼──────────────────────┘
                                     ▼
                        ┌─────────────────────────┐
                        │  Telemetry & Logging    │
                        │  (processamento_ia table)│
                        └─────────────────────────┘
```

---

## ⚙️ Lógica de Roteamento por Tarefa

| Tarefa (`task_type`) | Primário | Fallback 1 | Fallback 2 | Critério |
|----------------------|----------|------------|------------|----------|
| `socratic_hint` | NVIDIA Nemotron 3.5 Lightning | DeepSeek v4.1 Flash | Gemini 3.5 Flash-Lite | Latência <1s, cota ilimitada, tom socrático |
| `text_evaluation` | NVIDIA Nemotron 3.5 / DeepSeek v4.1 | Gemini 3.5 Flash-Lite | — | Raciocínio pesado, JSON estruturado |
| `handwritten_ocr` | **Gemini Flash-Lite** | NVIDIA (se multimodal) | — | Melhor OCR matemático manuscrito |
| `latex_translation` | NVIDIA Nemotron / DeepSeek | Gemini Flash-Lite | — | Velocidade + cota |
| `batch_ingestion` | Python puro (95%) → Fila NVIDIA 38 req/min (5%) → Gemini auditoria (<1%) | — | Custo zero, throttle anti-429, quality gate |

---

## 🔄 Fallback Automático

```python
# src/ai/router.py (simplificado)
class AIRouter:
    def __init__(self):
        self.providers = {
            "nvidia": NVIDIAClient(),
            "gemini": GeminiClient(),
        }
        self.routing_table = {
            "socratic_hint": ["nvidia", "gemini"],
            "text_evaluation": ["nvidia", "gemini"],
            "handwritten_ocr": ["gemini", "nvidia"],
            "latex_translation": ["nvidia", "gemini"],
        }
        self.circuit_breakers = {p: CircuitBreaker() for p in self.providers}

    async def execute(self, task_type: str, payload: dict) -> AIResponse:
        for provider_name in self.routing_table[task_type]:
            if self.circuit_breakers[provider_name].is_open():
                continue
            try:
                response = await self.providers[provider_name].call(payload)
                self.circuit_breakers[provider_name].record_success()
                self.log_telemetry(task_type, provider_name, response, success=True)
                return response
            except (TimeoutError, RateLimitError, APIError) as e:
                self.circuit_breakers[provider_name].record_failure()
                self.log_telemetry(task_type, provider_name, error=e, success=False)
                continue
        raise AllProvidersFailedError(f"All providers failed for {task_type}")
```

**Circuit Breaker:** abre após 3 falhas consecutivas, fecha após 30s de sucesso.

---

## 🚦 Throttle & Rate Limiting (NVIDIA NIM)

- **Limite da conta:** 40 RPM (Free Tier verificado via SMS)
- **Margem de segurança:** 38 req/min configurado
- **Implementação:** `asyncio.Semaphore(38)` + janela deslizante de 60s
- **Queue assíncrona:** `asyncio.Queue` para ingestão em lote (MathNet)

```python
# src/ai/client.py
class NVIDIAClient:
    def __init__(self):
        self.semaphore = asyncio.Semaphore(38)
        self.request_times = deque(maxlen=38)

    async def call(self, payload):
        async with self.semaphore:
            now = time.time()
            # Remove requests older than 60s
            while self.request_times and now - self.request_times[0] > 60:
                self.request_times.popleft()
            # If at limit, wait
            if len(self.request_times) >= 38:
                wait_time = 60 - (now - self.request_times[0])
                await asyncio.sleep(wait_time)
            self.request_times.append(time.time())
            return await self._http_call(payload)
```

---

## 📊 Telemetria & Observabilidade

Tabela `processamento_ia` (SQLite/Turso):

```sql
CREATE TABLE processamento_ia (
    id INTEGER PRIMARY KEY SERIAL,
    task_type TEXT NOT NULL,              -- 'socratic_hint', 'text_evaluation', etc.
    provider TEXT NOT NULL,               -- 'nvidia', 'gemini'
    model TEXT NOT NULL,                  -- 'nemotron-3.5-lightning', 'gemini-3.5-flash-lite'
    input_hash TEXT NOT NULL,             -- SHA256 do payload (dedup/análise)
    output_json TEXT,                     -- Resposta bruta da IA
    latency_ms INTEGER,                   -- Latência total
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    success BOOLEAN NOT NULL,
    fallback_used BOOLEAN DEFAULT FALSE,  -- True se não foi o primário
    error_type TEXT,                      -- 'timeout', 'rate_limit', 'api_error', 'validation'
    error_message TEXT,
    validated_by TEXT,                    -- 'human', 'script', 'auto'
    prompt_version TEXT,                  -- Versão do prompt usada
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proc_ia_task_provider ON processamento_ia(task_type, provider);
CREATE INDEX idx_proc_ia_created ON processamento_ia(created_at);
```

**Métricas derivadas (queries úteis):**
```sql
-- Latência média por provider/tarefa (últimas 24h)
SELECT task_type, provider, AVG(latency_ms) as avg_latency
FROM processamento_ia
WHERE created_at > datetime('now', '-1 day')
GROUP BY task_type, provider;

-- Taxa de sucesso por provider
SELECT provider, 
       COUNT(*) as total,
       SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
FROM processamento_ia
GROUP BY provider;

-- Fallback rate
SELECT task_type,
       SUM(CASE WHEN fallback_used THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as fallback_rate
FROM processamento_ia
GROUP BY task_type;
```

---

## 🧪 Validação de Saída da IA

Toda resposta da IA passa por validação **antes** de ir pro banco:

```python
# src/ai/validators.py
def validate_socratic_hint(response: dict) -> bool:
    required = {"dica", "nivel", "proxima_acao"}
    return all(k in response for k in required)

def validate_text_evaluation(response: dict) -> bool:
    required = {"status_resolucao", "passos", "estrategia", "tipo_erro", "confianca"}
    if not all(k in response for k in required):
        return False
    # Valida LaTeX não quebrado
    for passo in response.get("passos", []):
        if "\\" in passo.get("latex", "") and not is_valid_latex(passo["latex"]):
            return False
    return True

def validate_latex_translation(response: dict) -> bool:
    return "latex" in response and is_valid_latex(response["latex"])
```

**Se validação falha:** registra na telemetria, tenta fallback, escala para auditoria humana se necessário.

---

## 🔧 Configuração de Prompts (Versionados)

Prompts ficam em `src/ai/prompts/` com versionamento:

```
src/ai/prompts/
├── v1/
│   ├── socratic_hint.txt
│   ├── text_evaluation.txt
│   ├── handwritten_ocr.txt
│   └── latex_translation.txt
├── v2/
│   └── ... (experimentos A/B)
└── current -> v1  # Symlink ou config
```

Carregamento:
```python
PROMPT_VERSION = "v1"  # Configurável via env
PROMPTS = {
    task: (PROMPTS_DIR / PROMPT_VERSION / f"{task}.txt").read_text()
    for task in TASK_TYPES
}
```

---

## 🚫 Por Que Não 9Router / LiteLLM / Outros Gateways?

| Gateway | Por Que Não No MathAI |
|---------|----------------------|
| **9Router** | Feito para IDEs (Cursor/Cline) — roteia por *modelo*, não por *tarefa*. Não expõe telemetria granular por task_type. |
| **LiteLLM** | Ótimo para unificar API, mas adiciona dependência extra e latência. Nosso router é ~50 linhas, zero deps, controle total. |
| **OpenRouter** | Roteia por custo/latência global, não por especialização de tarefa (ex: visão vs raciocínio). |
| **LangChain/LlamaIndex** | Overhead desnecessário para roteamento simples. Preferimos código próprio auditável. |

**Decisão:** Router próprio = controle total de fallback, throttle, telemetria, validação, versionamento de prompt. Zero vendor lock-in no nível de orquestração.

---

## 📈 Benchmarks Atuais (Produção)

| Métrica | NVIDIA (Nemotron 3.5) | NVIDIA (DeepSeek v4.1) | Gemini Flash-Lite |
|---------|----------------------|------------------------|-------------------|
| **Latência média (socratic_hint)** | **0.94s** | 1.2s | 2.1s |
| **Latência média (text_evaluation)** | 1.1s | 1.3s | 2.3s |
| **Latência média (handwritten_ocr)** | N/A | N/A | **2.5s** |
| **Cota diária** | **Ilimitada** | Ilimitada | 1.500 RPD |
| **RPM** | 40 (throttle 38) | 40 (throttle 38) | 15 |
| **JSON válido rate** | 99.2% | 98.7% | 97.1% |
| **LaTeX válido rate** | 98.9% | 98.3% | 99.5% |

> Medido via `processamento_ia` em produção (Streamlit Cloud), últimos 500 requests por tarefa.

---

## 🗺️ Próximos Passos (AI Layer)

- [ ] **A/B testing de prompts** (v1 vs v2) com telemetria automatizada
- [ ] **Model distillation** — treinar modelo próprio (V6) nos logs de `processamento_ia` validados
- [ ] **Structured outputs** (function calling / JSON mode) onde suportado para eliminar parsing
- [ ] **Caching semântico** — embeddings de perguntas similares → resposta cached (economia API)
- [ ] **Auto-scaling de throttle** — ajustar RPM dinamicamente baseado em taxa de erro 429

---

## 📁 Arquivos Relacionados

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/ai/router.py` | Lógica de roteamento, circuit breaker, fallback |
| `src/ai/client.py` | Clientes HTTP NVIDIA/Gemini, throttle, retry |
| `src/ai/evaluator.py` | Orquestração de alto nível: dicas + avaliação + OCR |
| `src/ai/validators.py` | Validação de saída por task_type |
| `src/ai/prompts/` | Prompts versionados por tarefa |
| `src/database/attempts.py` | Inserção na tabela `processamento_ia` |
| `docs/engineering-challenges.md` | Desafios 01 (429), 02 (JSON/LaTeX), 06 (ground truth) |

---

## 🔗 Referências Externas

- [NVIDIA NIM API Docs](https://docs.nvidia.com/nim/)
- [Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Semantic Caching for LLMs](https://arxiv.org/abs/2310.03348)