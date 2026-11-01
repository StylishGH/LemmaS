#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix_escola_naval_latex.py - Corrige o LaTeX das questões da Escola Naval 2026
sem risco de interpolação de variáveis ou PID do Bash ($$, $B, etc).
"""

import json
import urllib.request

SUPABASE_URL = "https://gzlzwqknwfgrsnyvgpnv.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bHp3cWtud2ZncnNueXZncG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MTgzNzcsImV4cCI6MjEwNjk5NDM3N30.L2G9NrtgQM0MzvVJ50tG3S_4eso99INrsl9g2b7sVHI"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# 1. Definição precisa da Questão 22968 (Q17)
ENUNCIADO_22968 = r"""Seja $B$ uma matriz quadrada de ordem $n$ e $I_n$ a matriz identidade de ordem $n$, tal que:
$$B \cdot \overline{B} = \overline{B} \cdot B = \det(B) \cdot I_n$$
em que $\overline{B}$ é a matriz adjunta de $B$. Existe um teorema em Matemática que envolve a estrutura matemática acima. Um aspirante para prová-lo enuncia que:
$$B \cdot \overline{B} = (b_{ik})$$
Daí, por produto de matrizes, temos:
$$b_{ik} = \sum_{j=1}^n a_{ij} \cdot \overline{B}_{jk} = \sum_{j=1}^n a_{ij} \cdot A_{kj}$$
logo:
$$\text{se } i = k \implies b_{ik} = \det(B) \quad (1)$$
$$\text{se } i \neq k \implies b_{ik} = 0 \quad (2)$$

Sendo assim, considerando que o aspirante tenha enunciado e feito a demonstração do teorema corretamente, os teoremas das condições (1) e (2) são, respectivamente, os teoremas de:

(a) Chió e Laplace
(b) Laplace e Cauchy
(c) Cramer e Laplace
(d) Cauchy e Laplace
(e) Chió e Binet"""

SOLUCAO_22968 = r"""A condição (1) afirma que a soma dos produtos dos elementos de uma linha pelos seus respectivos cofatores é igual ao determinante da matriz:
$$\sum_{j=1}^n a_{ij} A_{ij} = \det(B)$$
Este é o clássico **Teorema de Laplace** para o desenvolvimento de determinantes.

A condição (2) afirma que a soma dos produtos dos elementos de uma linha pelos cofatores de uma linha paralela distinta é igual a zero:
$$\sum_{j=1}^n a_{ij} A_{kj} = 0 \quad (i \neq k)$$
Este é o **Teorema de Cauchy** (ou Teorema de Jacobi/Laplace complementar sobre filas paralelas).

Portanto, os teoremas das condições (1) e (2) são, respectivamente, os teoremas de **Laplace e Cauchy** (Alternativa B)."""

def update_questao(qid: int, data: dict):
    url = f"{SUPABASE_URL}/rest/v1/questoes?id=eq.{qid}"
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, headers=HEADERS, data=payload, method="PATCH")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def check_all_escola_naval_2026():
    url = f"{SUPABASE_URL}/rest/v1/questoes?ano=eq.2026&banca=eq.Escola%20Naval&select=id,mathnet_id,enunciado,gabarito"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        questoes = json.loads(resp.read().decode())
    
    print(f"Total questões Escola Naval 2026: {len(questoes)}")
    corrompidas = []
    for q in questoes:
        enunc = q.get("enunciado") or ""
        # Procura se há dígitos estranhos colados em fórmulas ou delimitadores vazios
        if "285" in enunc or "284" in enunc or "283" in enunc or "text{" in enunc and "\\text{" not in enunc:
            corrompidas.append(q["id"])
            print(f"ALERTA: Questão {q['id']} ({q.get('mathnet_id')}) pode estar com resíduo de PID!")
        else:
            print(f"Questão {q['id']} ({q.get('mathnet_id')}): OK")
    return corrompidas

if __name__ == "__main__":
    print("Atualizando Questão 22968 com LaTeX perfeito (raw string)...")
    res = update_questao(22968, {
        "enunciado": ENUNCIADO_22968,
        "solucao": SOLUCAO_22968,
        "gabarito": "B",
    })
    print("Atualizada com sucesso!")
    print("\nVerificando todas as questões da Escola Naval 2026:")
    check_all_escola_naval_2026()
