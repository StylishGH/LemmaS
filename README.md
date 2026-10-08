<div align="center">
  <h1>Lemmas 🧠📐</h1>
  <p>Uma plataforma de aprendizagem matemática adaptativa que combina Matemática, Inteligência Artificial, Ciência de Dados e repetição espaçada.</p>

  <p align="right">
    <a href="./README.en.md">🇺🇸 English Version</a> &nbsp;|&nbsp; <b>🇧🇷 Versão em Português</b>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-15-black.svg?style=flat-square" alt="Next.js" />
    <img src="https://img.shields.io/badge/FastAPI-0.115-009688.svg?style=flat-square" alt="FastAPI" />
    <img src="https://img.shields.io/badge/PostgreSQL-16-336791.svg?style=flat-square" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Tailwind-v4-06B6D4.svg?style=flat-square" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Python-3.11-blue.svg?style=flat-square" alt="Python" />
  </p>

  <p><strong>Impulsionado pela <a href="#-mathai">MathAI Engine</a></strong></p>
</div>

---

## 🪦 Antes do Lemmas, existia o MathAI

O **Lemmas** nasceu de um projeto chamado **MathAI**.

A ideia original era relativamente simples: criar uma ferramenta de estudos que pudesse aprender com as próprias respostas do aluno, identificar erros, recomendar exercícios e ajudar durante o estudo de Matemática.

Com o tempo, o projeto começou a crescer.

O MathAI deixou de ser apenas uma aplicação de estudos e começou a envolver:

* modelos de linguagem;
* análise das resoluções dos alunos;
* recomendação de exercícios;
* repetição espaçada;
* visão computacional;
* coleta e estruturação de dados;
* modelos de aprendizagem personalizados.

Foi nesse momento que surgiu um problema:

> **MathAI já não descrevia mais o produto.**

Então o **MathAI foi "aposentado" como nome da plataforma**.

E nasceu o **Lemmas**.

O nome MathAI, porém, não morreu completamente.

Ele foi transformado na ideia original que deu origem ao projeto: **uma futura IA especializada em aprendizagem matemática**, responsável por atuar como o cérebro inteligente por trás do Lemmas.

```text
                    MATHAI
                       │
             ┌─────────┴─────────┐
             │                   │
       antigo produto       futura IA
             │                   │
             ▼                   ▼
          LEMMAS              MathAI
        plataforma          cérebro do sistema
```

Assim, o Lemmas é a plataforma.

O MathAI será, no futuro, sua inteligência.

---

# 🧠 O que é o Lemmas?

Lemmas é uma plataforma de aprendizagem matemática adaptativa que combina **Matemática, Inteligência Artificial, Ciência de Dados e repetição espaçada** para construir uma experiência de estudo personalizada.

O objetivo não é simplesmente responder questões.

O Lemmas busca compreender:

* como o aluno resolve problemas;
* onde ele costuma errar;
* quais conceitos domina;
* quais dificuldades persistem;
* como sua memória evolui;
* quais exercícios são mais adequados;
* e quais estratégias de estudo funcionam melhor para ele.

A ideia central é transformar cada interação com a plataforma em uma oportunidade de aprendizagem — tanto para o aluno quanto para o sistema.

---

# 📖 A ideia por trás do projeto

O Lemmas parte de uma premissa simples:

> **Duas pessoas podem errar a mesma questão por motivos completamente diferentes.**

Uma pode não conhecer o conceito.

Outra pode conhecer o conceito, mas cometer um erro algébrico.

Outra pode resolver corretamente, mas ter dificuldade para reconhecer quando aquele conceito deve ser utilizado.

Por isso, o sistema não deve apenas registrar:

```text
Aluno → acertou
Aluno → errou
```

Ele deve buscar compreender:

```text
O que o aluno fez?
Por que provavelmente fez isso?
O que já aconteceu antes?
Como ele respondeu ao feedback?
Esse erro voltou a acontecer?
Qual intervenção ajudou?
```

Essa informação forma a base do modelo de aprendizagem do Lemmas.

---

# 🏗️ Arquitetura

```text
                                    ┌──────────────────────┐
                                    │        ALUNO         │
                                    │                      │
                                    │ questões             │
                                    │ respostas            │
                                    │ imagens              │
                                    │ feedback             │
                                    └──────────┬───────────┘
                                               │
                                               ▼
                              ┌─────────────────────────────┐
                              │          FRONTEND           │
                              │                             │
                              │         Next.js             │
                              │         React               │
                              └──────────────┬──────────────┘
                                             │
                                             ▼
                              ┌─────────────────────────────┐
                              │           BACKEND           │
                              │                             │
                              │           FastAPI           │
                              └──────────────┬──────────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    ▼                        ▼                        ▼
             ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
             │  DATABASE   │         │    MATHAI   │         │    VISION   │
             │             │         │   Gateway   │         │             │
             │ PostgreSQL  │         │             │         │ OCR / Image │
             │ / Supabase  │         └──────┬──────┘         └──────┬──────┘
             └──────┬──────┘                │                       │
                    │                       ▼                       │
                    │                ┌─────────────┐                │
                    │                │   ROUTING   │◄───────────────┘
                    │                └──────┬──────┘
                    │                       │
                    │                       ▼
                    │                    9Router
                    │                       │
                    │             ┌─────────┼─────────┐
                    │             ▼         ▼         ▼
                    │          Modelo A  Modelo B  Modelo C
                    │          principal fallback  fallback
                    │
                    ▼
             ┌────────────────────┐
             │   AI_EVALUATION   │
             │                    │
             │ modelo             │
             │ provider           │
             │ versão             │
             │ prompt             │
             │ timestamp          │
             │ confiança          │
             └──────────┬─────────┘
                        │
                        ▼
                 FEEDBACK DO ALUNO
                        │
                        ▼
                  DATA PIPELINE
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
      DADOS CONFIÁVEIS       DADOS AMBÍGUOS
             │                     │
             ▼                     ▼
          ML / IA              revisão
             │
             ▼
          MATHAI
```

---

# 🤖 MathAI

O **MathAI** é a futura camada de inteligência especializada do Lemmas.

Ele não precisa ser um único modelo.

A arquitetura foi pensada para que o MathAI possa utilizar diferentes modelos e componentes de acordo com a tarefa.

### Possíveis capacidades

* Tutoria matemática;
* correção de resoluções;
* identificação de erros;
* explicação de conceitos;
* geração de questões;
* recomendação de exercícios;
* geração de cartões de revisão;
* análise do histórico do aluno;
* compreensão de imagens e resoluções manuscritas;
* construção de perfis de aprendizagem;
* roteamento inteligente entre diferentes modelos.

O MathAI Gateway funciona como a camada intermediária entre o Lemmas e os modelos utilizados pelo sistema.

---

# 🔀 Model Routing

O Gateway determina **o que a tarefa exige**.

Exemplo:

```text
Questão simples
      ↓
modelo rápido

Questão matemática complexa
      ↓
modelo de raciocínio matemático

Resolução manuscrita
      ↓
modelo multimodal

Avaliação crítica
      ↓
modelo mais forte
```

Depois da escolha, o **MathAI Gateway** cuida da estratégia de acesso: ele abstrai provedores de modelos e suporta tanto provedores diretos quanto infraestruturas de roteamento como o 9Router.

> *The MathAI Gateway abstracts model providers and supports direct providers or routed infrastructure such as 9Router.*

```text
                    MATHAI GATEWAY
                          │
       ┌──────────────────┴──────────────────┐
       ▼                                     ▼
 DIRECT PROVIDERS (Nuvem)              9ROUTER (Opcional)
 ├── Google Gemini (Flash-Lite)         └── Proxy & Pooling Local
 ├── NVIDIA NIM (Nemotron 3.5)
 └── DeepSeek API (Reasoner/V3)
```

Essa separação garante que:
- O **MathAI Gateway** decide *o que a tarefa matemática exige* (rigor axiomático vs. intuição vs. OCR).
- A camada de execução (provedor direto ou roteador de infraestrutura) cuida da disponibilidade e redundância.

A infraestrutura de modelos pode mudar sem que o restante da aplicação precise ser reescrito.

---

# 🗃️ Dados: preservar o que o aluno realmente fez

Uma das principais decisões arquiteturais do Lemmas é separar:

```text
OBSERVED DATA
       ≠
AI INTERPRETATION
       ≠
VALIDATED DATA
```

## Observed Data

Representa aquilo que realmente aconteceu.

```text
resposta original
imagem original
questão
tempo gasto
tentativas anteriores
hints utilizados
feedback do aluno
```

## AI Interpretation

Representa aquilo que o MathAI inferiu.

```text
erro provável
conceito relacionado
dificuldade estimada
nível de domínio
recomendação
confiança
```

## Validated Data

Representa informações que passaram por algum processo de validação.

```text
erro confirmado
conceito confirmado
rótulo revisado
avaliação validada
```

### Regra fundamental

> **O dado original do aluno nunca deve ser sobrescrito pela interpretação da IA.**

Dessa forma, um mesmo dado original pode ser reavaliado por diferentes modelos no futuro.

---

# 🔬 Proveniência das avaliações

Cada avaliação produzida pelo MathAI pode registrar:

```text
attempt_id
model_provider
model_name
model_version
prompt_version
evaluator_version
fallback_level
timestamp
input_hash
output
confidence
```

Isso permite descobrir exatamente de onde uma determinada interpretação veio.

Por exemplo:

```text
Tentativa #92817

Modelo:
DeepSeek X

Versão:
3.2

Prompt:
evaluator_v7

Fallback:
0

Resultado:
erro_de_sinal

Confiança:
0.91
```

Se posteriormente descobrirmos que determinada versão de um modelo apresenta problemas em geometria, podemos identificar exatamente quais avaliações foram produzidas por ela.

---

# 📚 Aprendizagem adaptativa

O objetivo futuro é construir um **Student Model** capaz de representar o estado de aprendizagem de cada estudante.

```text
                       STUDENT
                          │
          ┌───────────────┼────────────────┐
          ▼               ▼                ▼
      conceitos       dificuldades      histórico
          │               │                │
          └───────────────┼────────────────┘
                          ▼
                    STUDENT MODEL
                          │
                 ┌────────┼────────┐
                 ▼        ▼        ▼
              domínio   memória   erros
                          │
                          ▼
                    recomendação
```

O modelo poderá utilizar informações como:

* desempenho por conceito;
* frequência de erros;
* tempo de resolução;
* tentativas;
* revisões;
* retenção;
* feedback;
* dificuldade dos exercícios.

---

# 🔁 Repetição espaçada

O Lemmas possui seu próprio sistema de cartões de revisão.

Os cartões podem ser:

### Gerados pelo MathAI

```text
erro recorrente
      ↓
MathAI identifica padrão
      ↓
sugere cartão
      ↓
aluno edita / aceita / rejeita
```

### Criados pelo aluno

O aluno também pode criar seus próprios cartões.

### Possíveis tipos

```text
Fórmula
Conceito
Reconhecimento
Aplicação
Erro pessoal
Imagem / diagrama
```

O histórico de cada revisão é armazenado para que o sistema possa estimar a retenção e melhorar as próximas revisões.

A integração com o Anki é tratada como **exportação**, enquanto o histórico completo de aprendizagem continua pertencendo ao Lemmas.

---

# 📈 Curva de esquecimento e memória

O sistema de revisão não precisa assumir que existe uma única curva universal de esquecimento.

O projeto poderá estudar e comparar diferentes modelos e abordagens, incluindo:

```text
Ebbinghaus
Exponencial
Lei de potência
Modelos hiperbólicos
Half-Life Regression
FSRS
```

A longo prazo, os próprios dados coletados pelo Lemmas poderão permitir investigar como diferentes padrões de retenção aparecem em diferentes alunos e conceitos.

```text
                    REVISION DATA
                          │
                          ▼
                  RETENTION MODEL
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
      Exponencial      Potência          FSRS
          │               │               │
          └───────────────┼───────────────┘
                          ▼
                    melhor predição
                          │
                          ▼
                   melhor scheduler
```

---

# 🧠 Do aluno para os dados

Cada interação pode gerar uma cadeia de informações:

```text
Questão
   ↓
Tentativa
   ↓
Erro / acerto
   ↓
Análise do MathAI
   ↓
Feedback
   ↓
Revisão
   ↓
Retenção
   ↓
Nova recomendação
```

Com o crescimento da plataforma, essa cadeia pode se transformar em dados para investigação e Machine Learning.

---

# 📊 Data Pipeline

```text
                  DADOS DO ALUNO
                         │
                         ▼
                      RAW DATA
                         │
                         ▼
                 DATA VALIDATION
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
        qualidade    consentimento  deduplicação
             │           │           │
             └───────────┼───────────┘
                         ▼
                  LABEL GENERATION
                         │
             ┌───────────┼───────────┐
             ▼                       ▼
       AI-generated             Human validated
             │                       │
             └───────────┼───────────┘
                         ▼
                       DATASET
                         │
                         ▼
                    ML / STATS
```

Dados ambíguos não devem ser automaticamente utilizados para treinamento.

A ideia é preservar a qualidade e a proveniência dos exemplos antes de utilizá-los em modelos futuros.

---

# 🔬 Pesquisa e Machine Learning

Com dados suficientes, o Lemmas poderá investigar perguntas como:

* Quais tipos de erro aparecem com maior frequência?
* Quais intervenções ajudam cada tipo de aluno?
* Quais cartões apresentam maior retenção?
* Qual intervalo de revisão funciona melhor para determinado conceito?
* Qual modelo de IA é mais preciso para determinado tipo de problema?
* Quais modelos apresentam melhor custo-benefício?
* É possível prever quando determinado conceito provavelmente será esquecido?
* É possível prever qual exercício terá maior benefício para determinado aluno?

O objetivo não é apenas acumular dados.

É transformar dados de aprendizagem em **conhecimento sobre aprendizagem**.

---

# ⚡ Quick Start

## Pré-requisitos

Antes de começar, instale:

* [Git](https://git-scm.com/)
* [Node.js](https://nodejs.org/)
* [Python](https://www.python.org/)
* PostgreSQL ou uma instância do Supabase

## 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/lemmas.git
cd lemmas
```

## 2. Configure o backend

```bash
cd backend

python -m venv .venv
```

### Linux / macOS

```bash
source .venv/bin/activate
```

### Windows

```powershell
.venv\Scripts\activate
```

Instale as dependências:

```bash
pip install -r requirements.txt
```

Crie seu arquivo de ambiente:

```bash
cp .env.example .env
```

Preencha as variáveis necessárias no `.env`, incluindo as credenciais do banco e dos serviços de IA.

Inicie a API:

```bash
uvicorn app.main:app --reload
```

O backend ficará disponível localmente em:

```text
http://localhost:8000
```

A documentação da API pode ser acessada em:

```text
http://localhost:8000/docs
```

## 3. Configure o frontend

Em outro terminal:

```bash
cd frontend
npm install
```

Crie o arquivo de ambiente:

```bash
cp .env.example .env.local
```

Configure a URL da API:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Inicie o frontend:

```bash
npm run dev
```

A aplicação ficará disponível em:

```text
http://localhost:3000
```

## 4. Ambiente local

Com os dois serviços executando:

```text
Browser
   │
   ▼
localhost:3000
   │
   ▼
Next.js
   │
   │ API
   ▼
localhost:8000
   │
   ▼
FastAPI
   │
   ├── PostgreSQL / Supabase
   │
   └── MathAI Gateway
            │
            ▼
         9Router
```

> **Nota:** os nomes das variáveis de ambiente e scripts podem mudar conforme a implementação atual do projeto. O `.env.example` deve ser mantido como a fonte de referência para a configuração local.

---

# 🧪 Evolução planejada

```text
FASE 1
────────────────────────────
MVP
│
├── exercícios
├── tentativas
├── tutor
├── banco de dados
└── MathAI inicial


FASE 2
────────────────────────────
Dados reais
│
├── usuários
├── feedback
├── avaliações de IA
├── revisão espaçada
└── Student Model inicial


FASE 3
────────────────────────────
Inteligência adaptativa
│
├── recomendação
├── model routing
├── análise de erros
└── visão computacional


FASE 4
────────────────────────────
Machine Learning
│
├── modelos de retenção
├── recomendação
├── avaliação de modelos
└── personalização


FASE 5
────────────────────────────
MathAI especializado
│
├── datasets curados
├── fine-tuning
├── modelos especializados
└── melhoria contínua
```

---

# 🏗️ Estrutura do projeto

```text
lemmas/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── repositories/
│   │   ├── services/
│   │   │   ├── mathai/
│   │   │   │   ├── gateway.py
│   │   │   │   ├── tutor.py
│   │   │   │   ├── evaluator.py
│   │   │   │   ├── vision.py
│   │   │   │   └── recommender.py
│   │   │   ├── vision/
│   │   │   ├── recommendation/
│   │   │   └── analytics/
│   │   └── main.py
│   │
│   ├── tests/
│   └── requirements.txt
│
├── data/
├── docs/
├── .env.example
├── .gitignore
├── README.md
└── LICENSE
```

---

# ☁️ Infraestrutura
 
```text
GitHub
   │
   ├──────────────► Vercel (Frontend Next.js)
   │                  │ (chamadas diretas)
   │                  ▼
   │             Google Gemini API
   │
   └──────────────► Render (Backend FastAPI)
                      │
              ┌───────┴───────┬──────────────────────┐
              ▼               ▼                      ▼
          Supabase      Direct Providers       9Router (Opcional)
         PostgreSQL     (NVIDIA / DeepSeek)   (Dev Local ou VPS)
```

A arquitetura foi pensada para começar simples e permitir evolução conforme o projeto ganhar usuários e volume de dados.

---

# 🎯 Visão

O Lemmas não pretende simplesmente colocar uma IA dentro de uma plataforma de exercícios.

A proposta é construir um sistema em que **cada etapa da aprendizagem gere informação útil para personalizar a próxima**.

```text
             APRENDER
                 │
                 ▼
              PRATICAR
                 │
                 ▼
                ERRAR
                 │
                 ▼
              ANALISAR
                 │
                 ▼
               REVISAR
                 │
                 ▼
                MEDIR
                 │
                 ▼
            PERSONALIZAR
                 │
                 └──────────────► APRENDER NOVAMENTE
```

> **Lemmas é a plataforma.**
>
> **MathAI é o cérebro que queremos construir.**

---

# 🚧 Status

Projeto em desenvolvimento.

O Lemmas está sendo desenvolvido como um projeto que une **Matemática, Inteligência Artificial, Ciência de Dados e aprendizagem adaptativa**.

O MathAI, originalmente o nome de todo o projeto, passa a representar a futura inteligência especializada que será construída a partir dessa plataforma e dos dados de aprendizagem coletados com responsabilidade.

---

# 📜 Licença

A definir.

---

# 👨‍💻 Autor

**Guilherme Henrique Mendes**  
Licenciatura em Matemática (UFF/CEDERJ) • Data Science & ML • Python • SQL • IA Aplicada  
[LinkedIn](https://linkedin.com/in/ghmendes02) • [GitHub](https://github.com/StylishGH) • [Email](mailto:ghmendes@id.uff.br)