# MathAI 🧠📐

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://python.org)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.38-FF4B4B.svg)](https://streamlit.io)
[![SQLite](https://img.shields.io/badge/SQLite-3.45-003B57.svg)](https://sqlite.org)
[![Turso](https://img.shields.io/badge/Turso-Cloud%20DB-3A86FF.svg)](https://turso.tech)
[![Gemini API](https://img.shields.io/badge/Gemini-API-4285F4.svg)](https://ai.google.dev)
[![NVIDIA NIM](https://img.shields.io/badge/NVIDIA-NIM-76B900.svg)](https://nim.nvidia.com)
[![DeepSeek](https://img.shields.io/badge/DeepSeek-v4.1-FF6B35.svg)](https://deepseek.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Deploy](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://mathia.streamlit.app)

---

## 🚀 Demo Online
**[mathia.streamlit.app](https://mathia.streamlit.app)** — teste a plataforma agora

## 📸 Demo Visual
![MathAI Demo](assets/demo.gif)

---

## 🎯 Objetivo
Construir um tutor adaptativo que evolui um modelo cognitivo de cada aluno a partir de:
- Questões resolvidas, acertos/erros, tempo de resolução
- Estratégias utilizadas, nível de confiança, justificativas
- Resoluções manuscritas (foto/caderno), interações com dicas socráticas

**Visão de longo prazo:** Knowledge Tracing (BKT/DKT), recomendação personalizada, modelos próprios de ML treinados sobre os dados coletados.

---

## 🏗️ Arquitetura de IA — Roteamento Inteligente por Tarefa

O diferencial técnico do MathAI é um **roteador de IA multimodal** que escolhe o melhor modelo para cada tarefa, otimizando latência, custo e qualidade:

```
                            [ Entrada do Aluno / Sistema ]
                                          │
        ┌─────────────────────────────────┼────────────────────────────────┐
        ▼                                 ▼                                ▼
 💡 Dicas Socráticas             📝 Resolução do Aluno             📦 Ingestão em Lote
  (Botão "Revelar Dica")          (Avaliador Cognitivo)            (MathNet / Concursos)
        │                                 │                                │
        │                    ┌────────────┴────────────┐                   │
        │                    ▼                         ▼                   │
        │             [ Apenas Texto ]          [ Foto/Caderno ]           │
        │                    │                         │                   │
        ▼                    ▼                         ▼                   ▼
┌─────────────────────────────────┐           ┌──────────────────┐  ┌──────────────────┐
│      NVIDIA NIM (Primário)      │           │  Google Gemini   │  │   Python Puro    │
│  - Nemotron 3.5 Lightning (1s)  │           │   (Flash-Lite)   │  │   (95% Volume)   │
│  - DeepSeek v4.1 Flash (MoE)    │           │                  │  │                  │
│                                 │           │  OCR Multimodal  │  │   Filtros/Regex  │
│  *Latência < 1s / Cota Ilimitada│           │   de cadernos e  │  │   sem gastar IA  │
└────────────────┬────────────────┘           │    manuscritos   │  └────────┬─────────┘
                 │ (Se der timeout/erro)      └────────┬─────────┘           │ (5% Casos difíceis)
                 ▼                                     │                     ▼
┌─────────────────────────────────┐                    │            ┌──────────────────┐
│      Google Gemini (Fallback)   │◄───────────────────┘            │ Fila NVIDIA NIM  │
│  - gemini-3.5-flash-lite        │                                 │ (Throttling 38   │
│  - gemini-flash-lite-latest     │                                 │  requisições/min)│
└─────────────────────────────────┘                                 └──────────────────┘
```

### Detalhamento por Caso de Uso

#### 1. 💡 Dicas Socráticas (`obter_dica_socratica`)
| Prioridade | Modelo | Justificativa |
|------------|--------|---------------|
| **Primário** | **NVIDIA Nemotron 3.5 Lightning** | Resposta ~0.9s, tom socrático nativo, cota ilimitada |
| **Backup** | **DeepSeek v4.1 Flash (MoE)** | Alternativa robusta via NVIDIA NIM |
| **Fallback** | **Google Gemini 3.5 Flash-Lite** | Se NVIDIA timeout (>12s) ou erro |

#### 2. 🧠 Avaliação Cognitiva (`analisar_resolucao`)

| Tipo de Entrada | Motor Principal | Por que |
|-----------------|-----------------|---------|
| **Texto (justificativa)** | NVIDIA Nemotron 3.5 / DeepSeek v4.1 | Raciocínio pesado, JSON estruturado, velocidade |
| **Foto/Caderno/PDF** | **Google Gemini Flash-Lite** | Melhor OCR multimodal do mercado — lê manuscrito, rasuras, papel amassado → LaTeX direto |

**Fallback unificado:** Gemini assume se NVIDIA falhar em qualquer rota.

#### 3. 📦 Pipeline de Ingestão em Lote (MathNet — *Em Implementação*)
| Fase | Volume | Tecnologia | Controle |
|------|--------|------------|----------|
| **1. Processamento determinístico** | 95% | Python puro (Regex, validação LaTeX, dedup, detecção de idioma) | **Zero custo de IA** |
| **2. Casos ambíguos/idiomas raros** | 5% | Fila NVIDIA NIM (38 req/min — respeita teto de 40 RPM) | Throttling automático anti-429 |
| **3. Auditoria de falhas** | <1% | Gemini Flash-Lite (revisão pontual de LaTeX quebrado) | Quality gate |

### Resumo dos Papéis
| Provedor | Papel no Sistema |
|----------|------------------|
| **NVIDIA NIM** | Motor de volume, velocidade (<1s), raciocínio textual pesado — blinda cota do Gemini |
| **Google Gemini** | Especialista em visão multimodal (olhos para caderno) + auditor de alta fidelidade |
| **Python/Regex** | Camada determinística de 95% do pipeline — custo zero, throughput máximo |

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias |
|--------|-------------|
| **Backend / Orquestração** | Python 3.11, Streamlit 1.38 |
| **Dados / Persistência** | SQLite 3.45 (local) + Turso (cloud sync), Pandas 2.2, NumPy |
| **IA — Texto & Raciocínio** | NVIDIA NIM (Nemotron 3.5, DeepSeek v4.1), Google Gemini 3.5 Flash-Lite |
| **IA — Visão Multimodal** | Google Gemini Flash-Lite (OCR manuscrito → LaTeX) |
| **Frontend / Math Rendering** | Streamlit, KaTeX / LaTeX |
| **CI/CD** | GitHub Actions → Streamlit Cloud (deploy contínuo) |
| **Versionamento / Docs** | Git/GitHub, LaTeX (materiais didáticos) |

---

## ⚡ Como Rodar Localmente

```bash
git clone https://github.com/StylishGH/MathAI.git
cd MathAI
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py
```

> **Variáveis de ambiente necessárias** (configure no `.env` ou secrets do Streamlit Cloud):
> - `NVIDIA_API_KEY` — para NIM (Nemotron/DeepSeek)
> - `GEMINI_API_KEY` — para Gemini Flash-Lite (visão + fallback)
> - `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` — sincronização cloud (opcional local)

---

## 📊 Métricas Atuais do Projeto
- **500+ questões** processadas (EFOMM, ESA, CEDERJ) — *em expansão*
- **Latência média dicas socráticas:** <1s (NVIDIA NIM)
- **Latência avaliação texto:** ~1.2s
- **Latência OCR manuscrito:** ~2.5s (Gemini Flash-Lite)
- **Deploy:** Contínuo via GitHub Actions → Streamlit Cloud
- **Arquitetura:** Offline-first (SQLite local) → Sync Turso (produção)

---

## 📚 Documentação Técnica
- [Arquitetura do Sistema](docs/architecture.md) — modelo de dados, fluxos, decisões
- [Pipeline de Dados](docs/data-pipeline.md) — PDF → ETL → SQLite/Turso
- [Roteador de IA & Fallbacks](docs/ai-router.md) — implementação do roteamento acima
- [Desafios & Decisões](docs/challenges.md) — lições aprendidas

---

## 🗺️ Roadmap
- [ ] **Knowledge Tracing** (BKT/DKT) sobre histórico do aluno
- [ ] **Recomendação personalizada** de questões (bandit / embedding similarity)
- [ ] **Modelos próprios** fine-tuned nos dados coletados (distillation de Nemotron/DeepSeek)
- [ ] **API REST** para integração externa (escolas, plataformas)
- [ ] **Dashboard de analytics** do professor (turmas, heatmaps de lacunas)

---

## 🤝 Contribuição
Issues e PRs bem-vindos! Veja [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 📄 Licença
MIT License — veja [LICENSE](LICENSE).

---

## 👨‍💻 Autor
**Guilherme Henrique Mendes**  
Matemática (UFF/CEDERJ) • Data Science & ML • Python • SQL • IA Aplicada  
[LinkedIn](https://linkedin.com/in/ghmendes02) • [GitHub](https://github.com/StylishGH) • [Email](mailto:ghmendes@id.uff.br)