# Relatório de Normalização de Dados, Fases e Tradução de Bancas

**Data de Atualização**: 2026-10-14  
**Responsável**: MathAI Engine & LEMMAS Data Governance  

---

## 1. Migração de Nível Olímpico (Fim de "Nível 2" e "Nível 3" como Bancas)

Registros que continham `banca IN ('Nível 2', 'Nível 3')` eram oriundos de scrapes onde o nível da prova foi gravado erroneamente na coluna de banca.
- **Origem Real**: Banco de Questões da OBM / OBMEP.
- **Ação Executada**:
  - `banca IN ('Nível 2', 'Nivel 2')` -> `banca = 'OBM'`, `fase_nivel = 'Nível 2'`.
  - `banca IN ('Nível 3', 'Nivel 3')` -> `banca = 'OBM'`, `fase_nivel = 'Nível 3'`.
- **Resultado na UI**:
  - Os botões/pílulas `Nível 2` e `Nível 3` foram completamente removidos da lista de Bancas.
  - O filtro verde **FASE / NÍVEL OLÍMPICO** agora alimenta e filtra corretamente as 122 questões do Nível 2 e as 59 questões do Nível 3.

---

## 2. Tradução Integral das Bancas Internacionais para Português (PT-BR)

Todas as bancas de competições matemáticas internacionais foram traduzidas para a nomenclatura canônica em português:

| Nome Anterior (Inglês / Estrangeiro) | Nome Canônico em Português (PT-BR) |
|---|---|
| `Romanian Mathematical Olympiad` | **Olimpíada Romena de Matemática** |
| `Ukrainian Mathematical Olympiad` | **Olimpíada Ucraniana de Matemática** |
| `Balkan Mathematical Olympiad` | **Olimpíada Balcânica de Matemática** |
| `Olympiades Françaises` / `Préparation Olympique Française` | **Olimpíadas Francesas de Matemática** |
| `Croatian Mathematical Olympiad` / `Croatia` | **Olimpíada Croata de Matemática** |
| `Saudi Mathematical Olympiad` / `Saudi Booklet` | **Olimpíada Saudita de Matemática** |
| `China Mathematical Olympiad` | **Olimpíada Chinesa de Matemática** |
| `Philippine Mathematical Olympiad` | **Olimpíada Filipina de Matemática** |
| `Irish Mathematical Olympiad` / `IRL_A Booklet` | **Olimpíada Irlandesa de Matemática** |
| `Mongolian Mathematical Olympiad` | **Olimpíada Mongol de Matemática** |
| `Iranian Mathematical Olympiad` | **Olimpíada Iraniana de Matemática** |
| `Belarusian Mathematical Olympiad` | **Olimpíada Bielorrussa de Matemática** |
| `Estonian Mathematical Olympiad` / `Estonian Math Competitions` | **Olimpíada Estoniana de Matemática** |
| `Japanese Mathematical Olympiad` | **Olimpíada Japonesa de Matemática** |
| `Russian Mathematical Olympiad` | **Olimpíada Russa de Matemática** |
| `Canadian Mathematical Olympiad` | **Olimpíada Canadense de Matemática** |
| `Spanish Mathematical Olympiad` | **Olimpíada Espanhola de Matemática** |
| `Italian Mathematical Olympiad` / `Progetto Olimpiadi` | **Olimpíada Italiana de Matemática** |
| `South African Olympiad` / `South-Afrika` | **Olimpíada Sul-Africana de Matemática** |
| `Berkeley Math Circle` | **Círculo Matemático de Berkeley** |
| `Indian Mathematical Olympiad` / `Indija TS` | **Olimpíada Indiana de Matemática** |
| `Bulgarian Mathematical Olympiad` / `Bulgaria` | **Olimpíada Búlgara de Matemática** |
| `Singapore Mathematical Olympiad` | **Olimpíada de Singapura de Matemática** |
| `Macedonian Mathematical Olympiad` | **Olimpíada Macedônia de Matemática** |
| `Middle European Mathematical Olympiad` | **Olimpíada Centro-Europeia de Matemática** |
| `Austrian Mathematical Olympiad` | **Olimpíada Austríaca de Matemática** |
| `Argentine Mathematical Olympiad` / `Argentina` | **Olimpíada Argentina de Matemática** |
| `Dutch Mathematical Olympiad` / `Selectietoets` | **Olimpíada Holandesa de Matemática** |
| `Ibero-American Mathematical Olympiad` | **Olimpíada Ibero-Americana de Matemática** |
| `Hellenic Mathematical Olympiad` | **Olimpíada Grega de Matemática** |
| `Olimpiada Republicană la Matematică` | **Olimpíada da Moldávia de Matemática** |
| `New Zealand Mathematical Olympiad` | **Olimpíada da Nova Zelândia de Matemática** |
| `Slovenian Mathematical Olympiad` / `Slovenija` | **Olimpíada Eslovena de Matemática** |
| `Bay Area Mathematical Olympiad` | **Olimpíada de Bay Area (BAMO)** |

### Siglas Internacionais e Nacionais Mantidas:
- `IMO` (International Mathematical Olympiad)
- `OBM` (Olimpíada Brasileira de Matemática)
- `HMMT` (Harvard-MIT Mathematics Tournament)
- `Baltic Way` (Competição Báltica Internacional)
- `APMO` (Asian Pacific Mathematics Olympiad)
- `USAMO` (USA Mathematical Olympiad)
- `CHKMO` (Olimpíada Checa e Eslovaca)
- `VMO` (Olimpíada do Vietnã)
- `ASU` (Arizona State University Mathematics Contest)
- Militares: `ITA`, `IME`, `AFA`, `EFOMM`, `Escola Naval`, `EsPCEx`, `EEAR`, `EPCAR`, `Colégio Naval`, `ESA`
- Vestibulares & Superior: `ENEM`, `FUVEST`, `UNICAMP`, `CEDERJ`

---

## 3. Matérias Canônicas (11 Grandes Áreas)

- **Cálculo** (Cálculo 1, 2, 3, Vetorial, Geometria Diferencial)
- **Probabilidade e Combinatória** (Análise Combinatória, Probabilidade, Estatística)
- **Geometria Plana** (Geometria, Geometria Plana)
- **Álgebra Linear** (Álgebra Linear, GAAL)
- **Álgebra** (Álgebra, Teoria dos Conjuntos)
- **Teoria dos Números**
- **Polinômios e Complexos**
- **Trigonometria**
- **Geometria Espacial**
- **Geometria Analítica**
- **Matemática Básica** (Matemática Básica, Aritmética)
