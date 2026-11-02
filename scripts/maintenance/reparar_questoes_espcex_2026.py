#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
reparar_questoes_espcex_2026.py
Aplica a correção autorizada para as Questões 22916 e 22928 da EsPCEx 2026:
1. Atualiza enunciado e solução em public.questoes no Supabase.
2. Atualiza status para 'resolvido' em public.feedbacks_aluno (IDs 11 e 12).
3. Atualiza status para 'resolvido' no arquivo local tmp/tarefas_curadoria.json.
"""

import json
import urllib.request
from datetime import datetime
from pathlib import Path

SUPABASE_URL = "https://gzlzwqknwfgrsnyvgpnv.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bHp3cWtud2ZncnNueXZncG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MTgzNzcsImV4cCI6MjEwNjk5NDM3N30.L2G9NrtgQM0MzvVJ50tG3S_4eso99INrsl9g2b7sVHI"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# --- DADOS QUESTÃO 22916 ---
ENUNCIADO_22916 = r"""Seja $A = \{x \in \mathbb{R} \mid 0 \le x \le 7\}$. O conjunto imagem da função $f: A \to \mathbb{R}$, tal que:
$$y = f(x) = \big| |2x - 6| - x \big| + x - 3$$
é:

(a) $\{y \in \mathbb{R} \mid 1 \le y \le 3\}$
(b) $\{y \in \mathbb{R} \mid -2 \le y \le 3\}$
(c) $\{y \in \mathbb{R} \mid -1 \le y \le 5\}$
(d) $\{y \in \mathbb{R} \mid 3 \le y \le 5\}$
(e) $\{y \in \mathbb{R} \mid 0 \le y \le 5\}$"""

SOLUCAO_22916 = r"""Para determinar o conjunto imagem da função $f: A \to \mathbb{R}$ com domínio $A = [0, 7]$ e:
$$f(x) = \big| |2x - 6| - x \big| + x - 3$$
analisamos o comportamento dos módulos hierarquicamente (de dentro para fora).

---

### 1. Módulo Interno $|2x - 6|$
A raiz de $2x - 6 = 0$ é $x = 3$. Como $x \in [0, 7]$:
- Se $0 \le x < 3 \implies 2x - 6 < 0 \implies |2x - 6| = 6 - 2x$.
- Se $3 \le x \le 7 \implies 2x - 6 \ge 0 \implies |2x - 6| = 2x - 6$.

---

### 2. Caso 1: $0 \le x < 3$
Substituindo o módulo interno na expressão:
$$|2x - 6| - x = (6 - 2x) - x = 6 - 3x$$
Analisamos agora o sinal de $6 - 3x$ no intervalo $[0, 3)$:
- **Subintervalo $0 \le x \le 2$:** $6 - 3x \ge 0 \implies |6 - 3x| = 6 - 3x$.
  $$f(x) = (6 - 3x) + x - 3 = 3 - 2x$$
  Como $f(x)$ é estritamente decrescente em $[0, 2]$:
  $$f(0) = 3 \quad \text{e} \quad f(2) = 3 - 4 = -1 \implies \operatorname{Im}_1 = [-1, 3]$$

- **Subintervalo $2 < x < 3$:** $6 - 3x < 0 \implies |6 - 3x| = 3x - 6$.
  $$f(x) = (3x - 6) + x - 3 = 4x - 9$$
  Como $f(x)$ é estritamente crescente em $(2, 3)$:
  $$\lim_{x \to 2^+} f(x) = 4(2) - 9 = -1 \quad \text{e} \quad \lim_{x \to 3^-} f(x) = 4(3) - 9 = 3 \implies \operatorname{Im}_2 = (-1, 3)$$

---

### 3. Caso 2: $3 \le x \le 7$
Substituindo o módulo interno na expressão:
$$|2x - 6| - x = (2x - 6) - x = x - 6$$
Analisamos o sinal de $x - 6$ no intervalo $[3, 7]$:
- **Subintervalo $3 \le x \le 6$:** $x - 6 \le 0 \implies |x - 6| = 6 - x$.
  $$f(x) = (6 - x) + x - 3 = 3 \quad (\text{constante})$$
  $$\operatorname{Im}_3 = \{3\}$$

- **Subintervalo $6 < x \le 7$:** $x - 6 > 0 \implies |x - 6| = x - 6$.
  $$f(x) = (x - 6) + x - 3 = 2x - 9$$
  Como $f(x)$ é estritamente crescente em $(6, 7]$:
  $$f(6) = 3 \quad \text{e} \quad f(7) = 2(7) - 9 = 5 \implies \operatorname{Im}_4 = (3, 5]$$

---

### 4. Conclusão e União das Imagens
Reunindo as imagens de todos os subintervalos:
$$\operatorname{Im}(f) = [-1, 3] \cup (-1, 3) \cup \{3\} \cup (3, 5] = [-1, 5]$$
Em notação de conjuntos:
$$\operatorname{Im}(f) = \{y \in \mathbb{R} \mid -1 \le y \le 5\}$$

Portanto, a alternativa correta é a **(C)**."""

# --- DADOS QUESTÃO 22928 ---
ENUNCIADO_22928 = r"""Dada a matriz:
$$M = \begin{bmatrix} \frac{1}{4} & 3 \\ -2 & 8 \end{bmatrix}$$
o maior elemento da matriz inversa de $M$ é:

(a) -2
(b) 2
(c) -4
(d) 1
(e) 4"""

SOLUCAO_22928 = r"""Dada a matriz de ordem 2:
$$M = \begin{bmatrix} \frac{1}{4} & 3 \\ -2 & 8 \end{bmatrix}$$
Deseja-se determinar o maior elemento da sua matriz inversa $M^{-1}$.

---

### 1. Cálculo do Determinante de $M$
Pela fórmula do determinante de ordem $2 \times 2$:
$$\det(M) = \left(\frac{1}{4}\right)(8) - (3)(-2) = 2 - (-6) = 2 + 6 = 8$$
Como $\det(M) = 8 \neq 0$, a matriz $M$ admite inversa.

---

### 2. Cálculo da Matriz Inversa $M^{-1}$
A inversa de uma matriz $2 \times 2$ é dada por:
$$M = \begin{bmatrix} a & b \\ c & d \end{bmatrix} \implies M^{-1} = \frac{1}{\det(M)} \begin{bmatrix} d & -b \\ -c & a \end{bmatrix}$$
Substituindo $a = \frac{1}{4}$, $b = 3$, $c = -2$ e $d = 8$:
$$M^{-1} = \frac{1}{8} \begin{bmatrix} 8 & -3 \\ -(-2) & \frac{1}{4} \end{bmatrix} = \frac{1}{8} \begin{bmatrix} 8 & -3 \\ 2 & \frac{1}{4} \end{bmatrix}$$

Distribuindo o escalar $\frac{1}{8}$:
$$M^{-1} = \begin{bmatrix} \frac{8}{8} & -\frac{3}{8} \\ \frac{2}{8} & \frac{1/4}{8} \end{bmatrix} = \begin{bmatrix} 1 & -\frac{3}{8} \\ \frac{1}{4} & \frac{1}{32} \end{bmatrix}$$

---

### 3. Comparação dos Elementos
Em representação decimal:
- $m'_{11} = 1$
- $m'_{12} = -\frac{3}{8} = -0{,}375$
- $m'_{21} = \frac{1}{4} = 0{,}25$
- $m'_{22} = \frac{1}{32} = 0{,}03125$

Comparando os quatro elementos:
$$-0{,}375 < 0{,}03125 < 0{,}25 < 1$$

O maior elemento de $M^{-1}$ é **$1$**.

Portanto, a alternativa correta é a **(D)**."""

def update_questao(qid, enunciado, solucao, gabarito):
    url = f"{SUPABASE_URL}/rest/v1/questoes?id=eq.{qid}"
    payload = json.dumps({
        "enunciado": enunciado,
        "solucao": solucao,
        "gabarito": gabarito,
        "categoria_banca": "Concurso Militar",
        "tipo_material": "concurso_militar",
    }).encode("utf-8")
    req = urllib.request.Request(url, headers=HEADERS, data=payload, method="PATCH")
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print(f"✅ Questão {qid} atualizada com sucesso no Supabase!")

def update_feedback(fid):
    url = f"{SUPABASE_URL}/rest/v1/feedbacks_aluno?id=eq.{fid}"
    req_get = urllib.request.Request(url, headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
    with urllib.request.urlopen(req_get) as resp:
        data = json.loads(resp.read().decode())
        if not data:
            return
        meta = data[0].get("metadados") or {}
        meta["status"] = "resolvido"
        meta["resolvido_em"] = datetime.now().isoformat()
        
    payload = json.dumps({"metadados": meta}).encode("utf-8")
    req_patch = urllib.request.Request(url, headers=HEADERS, data=payload, method="PATCH")
    with urllib.request.urlopen(req_patch) as resp:
        print(f"✅ Feedback #{fid} atualizado para status 'resolvido' no Supabase!")

def update_local_tasks():
    tasks_file = Path("/mnt/dados/dev/LemmaS/tmp/tarefas_curadoria.json")
    if not tasks_file.exists():
        return
    tasks = json.loads(tasks_file.read_text(encoding="utf-8"))
    agora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    for t in tasks:
        if t.get("questao_id") in (22916, 22928):
            t["status"] = "resolvido"
            t["resolvido_em"] = agora
    tasks_file.write_text(json.dumps(tasks, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"✅ Arquivo local {tasks_file} atualizado!")

def main():
    print("--- ATUALIZANDO QUESTÃO 22916 ---")
    update_questao(22916, ENUNCIADO_22916, SOLUCAO_22916, "C")
    
    print("\n--- ATUALIZANDO QUESTÃO 22928 ---")
    update_questao(22928, ENUNCIADO_22928, SOLUCAO_22928, "D")

    print("\n--- ATUALIZANDO FEEDBACKS NO SUPABASE ---")
    update_feedback(11)
    update_feedback(12)

    print("\n--- ATUALIZANDO FILA LOCAL ---")
    update_local_tasks()

    print("\n🎉 Todas as correções foram aplicadas com integridade total!")

if __name__ == "__main__":
    main()
