"""
Testes Formais de Aceitação da Missão Integrada (LEMMAS & MathAI Engine).

Cobre os 4 critérios fundamentais estabelecidos para auditoria final:
1. AFA 2011 Q17: Rigor matemático da inequação, preservação das 6 figuras do piloto e integridade visual.
2. CTA e Navegação da Bancada: Ativação efetiva de abas, scrollIntoView e separação de responsabilidades.
3. Avaliação e Pontuação: Eliminação de pontuações artificiais ("100% dos Pontos"), 4 vereditos e regra de ouro.
4. Persistência e SM-2: Compatibilidade estrita com public.tentativas e integridade do agendamento espaçado.
"""

import re
import math
from pathlib import Path
import pytest
import numpy as np

ROOT_DIR = Path(__file__).resolve().parent.parent


# ==============================================================================
# CRITÉRIO 1: AFA 2011 Q17 & PRESERVAÇÃO DE ARTEFATOS
# ==============================================================================

def test_criterio_1_inequacao_trigonometrica_analitica_e_numerica():
    """
    Verifica matematicamente a inequação:
    -8 sen^4(x) + 10 sen^2(x) - 3 < 0  <=>  8 u^2 - 10 u + 3 > 0, onde u = sen^2(x)
    Raízes: u = 1/2 e u = 3/4.
    Solução: sen^2(x) < 1/2  OU  sen^2(x) > 3/4
    """
    # 1. Verificação analítica dos coeficientes e discriminante
    a, b, c = 8, -10, 3
    delta = b**2 - 4 * a * c
    assert delta == 4, f"Discriminante deve ser 4, obtido {delta}"
    u1 = (-b - math.sqrt(delta)) / (2 * a)  # 1/2 = 0.5
    u2 = (-b + math.sqrt(delta)) / (2 * a)  # 3/4 = 0.75
    assert math.isclose(u1, 0.5), "Raiz 1 deve ser exatamente 1/2"
    assert math.isclose(u2, 0.75), "Raiz 2 deve ser exatamente 3/4"

    # 2. Teste dos pontos nodais no ciclo trigonométrico
    def f(x):
        s2 = math.sin(x) ** 2
        return -8 * (s2 ** 2) + 10 * s2 - 3

    # (A) Pontos de Inclusão Obrigatória: 0, pi/2, pi, 3pi/2, 2pi
    assert f(0) < 0, "x = 0 deve satisfazer a inequação (f(0) = -3 < 0)"
    assert f(math.pi) < 0, "x = pi deve satisfazer a inequação (f(pi) = -3 < 0)"
    assert f(2 * math.pi) < 0, "x = 2pi deve satisfazer a inequação (f(2pi) = -3 < 0)"
    assert f(math.pi / 2) < 0, "x = pi/2 deve satisfazer a inequação (f(pi/2) = -1 < 0)"
    assert f(3 * math.pi / 2) < 0, "x = 3pi/2 deve satisfazer a inequação (f(3pi/2) = -1 < 0)"

    # (B) Raízes da Equação (Fronteiras Abertas - NÃO podem satisfazer < 0)
    raizes_1_2 = [math.pi / 4, 3 * math.pi / 4, 5 * math.pi / 4, 7 * math.pi / 4]
    for r in raizes_1_2:
        val = f(r)
        assert abs(val) < 1e-12, f"Em {r}, f(x) deve ser 0 (fronteira aberta)"

    raizes_3_4 = [math.pi / 3, 2 * math.pi / 3, 4 * math.pi / 3, 5 * math.pi / 3]
    for r in raizes_3_4:
        val = f(r)
        assert math.isclose(val, 0.0, abs_tol=1e-12), f"Em {r}, f(x) deve ser 0 (fronteira aberta)"
        # Verifica que o ponto é uma raiz (fronteira aberta), portanto f(r) == 0 dentro da precisão float
        assert abs(val) < 1e-12


def test_criterio_1_preservacao_artefatos_anteriores_e_q17():
    """Confirma que todos os 6 recortes anteriores e os artefatos da Q17 estão presentes e válidos."""
    pilot_dir = ROOT_DIR / "data" / "audit" / "reprocessed_figures_pilot"
    
    # 6 recortes anteriores
    anteriores = [
        "eear_2020_mat_q57_reproc.png",
        "eear_2020_mat_q59_reproc.png",
        "militar_afa_2011_q06_reproc.png",
        "militar_afa_2011_q13_reproc.png",
        "militar_afa_2012_q12_reproc.png",
        "militar_afa_2012_q20_reproc.png",
    ]
    for filename in anteriores:
        p = pilot_dir / filename
        assert p.exists(), f"Artefato original {filename} deve ser preservado!"
        assert p.stat().st_size > 1000, f"Arquivo {filename} não pode estar vazio"

    # Artefatos da Q17
    q17_dir = pilot_dir / "afa_2011_q17"
    for filename in ["militar_afa_2011_q17_native.png", "militar_afa_2011_q17_reproc_300dpi.png", "militar_afa_2011_q17_sheet.png", "RELATORIO_Q17.md"]:
        p = q17_dir / filename
        assert p.exists(), f"Artefato da Q17 {filename} deve existir"
        assert p.stat().st_size > 500, f"Arquivo {filename} muito pequeno ou vazio"


# ==============================================================================
# CRITÉRIO 2: CTA E NAVEGAÇÃO DA BANCADA
# ==============================================================================

def test_criterio_2_cta_navegacao_e_ativacao_de_aba():
    """Valida que resolver/page.tsx implementa ativação de estado e montagem real antes do scroll."""
    resolver_file = ROOT_DIR / "frontend" / "app" / "(app)" / "resolver" / "page.tsx"
    assert resolver_file.exists(), "resolver/page.tsx não encontrado"
    content = resolver_file.read_text(encoding="utf-8")

    # 1. Verifica função ativarEIrParaBancada
    assert "const ativarEIrParaBancada = (modo: \"lousa\" | \"geometria\" | \"texto\") => {" in content
    assert "setBancadaModo(modo);" in content
    assert "bancadaRef.current.scrollIntoView({ behavior: \"smooth\", block: \"start\" });" in content

    # 2. Verifica os 3 atalhos no banner de questão discursiva
    assert "ativarEIrParaBancada(\"lousa\")" in content, "Atalho para Lousa ausente"
    assert "ativarEIrParaBancada(\"geometria\")" in content, "Atalho para Geometria ausente"
    assert "ativarEIrParaBancada(\"texto\")" in content, "Atalho para Texto/OCR ausente"

    # 3. Verifica ancoragem no container da bancada
    assert "ref={bancadaRef}" in content, "bancadaRef não está anexado ao container"
    assert "id=\"bancada-resolucao\"" in content


# ==============================================================================
# CRITÉRIO 3: AVALIAÇÃO, PONTUAÇÃO E AUSÊNCIA DE SCORES ARBITRÁRIOS
# ==============================================================================

def test_criterio_3_ausencia_de_pontuacao_arbitraria_e_regra_de_ouro():
    """Garante que '100% dos Pontos', 'Pontuação Parcial' e '0 Pontos' foram eliminados."""
    resolver_file = ROOT_DIR / "frontend" / "app" / "(app)" / "resolver" / "page.tsx"
    content = resolver_file.read_text(encoding="utf-8")

    # 1. Proibição de pontuação quantitativa arbitrária sem rubrica
    assert "100% dos Pontos" not in content, "Proibido exibir '100% dos Pontos' sem rubrica quantitativa!"
    assert "Pontuação Parcial" not in content, "Proibido exibir 'Pontuação Parcial'!"
    assert "0 Pontos" not in content, "Proibido exibir '0 Pontos'!"

    # 2. Presença dos badges qualitativos formais
    assert "Demonstração Validada" in content
    assert "Validação Parcial" in content
    assert "Demonstração Não Validada" in content

    # 3. Preservação textual estrita da mensagem de sem_desenvolvimento
    msg_obrigatoria = (
        "Você indicou o resultado final, mas em questões discursivas é obrigatório "
        "demonstrar o raciocínio (na Lousa, GeoGebra ou Foto/Dedução) para validar os pontos."
    )
    assert msg_obrigatoria in content, "Mensagem obrigatória de sem_desenvolvimento foi alterada!"

    # 4. Regra de ouro: sem_desenvolvimento não grava e não adiciona às respondidas
    assert 'if (rawVeredito === "sem_desenvolvimento") {\n        return;\n      }' in content


# ==============================================================================
# CRITÉRIO 4: PERSISTÊNCIA EM PUBLIC.TENTATIVAS E CICLO SM-2
# ==============================================================================

def test_criterio_4_persistência_e_compatibilidade_com_schema():
    """Valida a rota submit para garantir compatibilidade com public.tentativas e ciclo SM-2."""
    submit_file = ROOT_DIR / "frontend" / "app" / "api" / "questions" / "[id]" / "submit" / "route.ts"
    assert submit_file.exists(), "submit/route.ts não encontrado"
    content = submit_file.read_text(encoding="utf-8")

    # 1. Rejeição explícita de sem_desenvolvimento com 400
    assert 'if (veredito === "sem_desenvolvimento") {' in content
    assert 'status: 400' in content

    # 2. Mapeamento de tipo_erro para o CHECK constraint de public.tentativas
    assert 'tipoErro = acertou ? "nenhum" : (veredito === "parcial" ? "conta_sinal" : "conceitual");' in content
    assert 'acertou = veredito === "aprovado";' in content

    # 3. Chamada e persistência em revisao_espacada (SM-2)
    assert "calcularProximoIntervaloSM2" in content
    assert 'supabase.from("revisao_espacada").upsert' in content
    assert 'onConflict: "aluno_id,item_tipo,item_id"' in content

    # 4. Verificação de que Elo permanece inativo
    assert "registrar_duelo_aluno_questao" not in content, "Elo não pode ser invocado se não existe no banco"
