"""Suíte de Testes Automatizados do Cache Inteligente do Tutor Socrático (MathAI Engine).

Testa rigorosamente:
1. Primeira solicitação gera e persiste a dica no cache (cached: False).
2. Segunda solicitação idêntica consome o cache persistente (cached: True), sem acionar o Gateway.
3. Perfis pedagógicos ou níveis socráticos distintos geram chaves distintas e não se misturam.
4. Alterações no enunciado, gabarito ou solução geram novo content_hash e invalidam o cache obsoleto.
5. Respostas genéricas, vazias, inválidas ou de contingência NÃO são gravadas no cache.
6. Falha de conexão ou indisponibilidade do banco de dados não derruba o tutor (graceful degradation).
7. Requisições concorrentes simultâneas com a mesma chave tratam conflito sem duplicar entradas.
8. Dados individuais do estudante (rascunho, tentativas anteriores, erros) NUNCA são salvos no cache compartilhado universal.
9. Questões avulsas sem ID estável adotam hash seguro ('adhoc:<hash>') sem inventar chaves arbitrárias.
"""

from concurrent.futures import ThreadPoolExecutor
import copy
import threading
from typing import Any, Dict, List, Optional
import pytest

from app.services.mathai.hint_cache import (
    HintCacheService,
    compute_content_hash,
    compute_cache_key,
    is_individualized_request,
    validate_hint_for_cache,
    PROMPT_STRATEGY_VERSION,
)
from app.services.mathai.tutor import SocraticTutor


class MockSupabaseTable:
    """Simulador thread-safe em memória da tabela public.socratic_hint_cache do Supabase."""

    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.rows: Dict[str, Dict[str, Any]] = {}
        self.should_fail: bool = False

    def select(self, *args, **kwargs):
        if self.should_fail:
            raise ConnectionError("Supabase connection timed out (Simulated Outage)")
        return self

    def eq(self, column: str, value: Any):
        self._filter_col = column
        self._filter_val = value
        return self

    def limit(self, count: int):
        return self

    def execute(self):
        if self.should_fail:
            raise ConnectionError("Supabase connection timed out (Simulated Outage)")
        with self.lock:
            if hasattr(self, "_filter_col") and self._filter_col == "cache_key":
                key = self._filter_val
                if key in self.rows:
                    return type("SupabaseResponse", (), {"data": [copy.deepcopy(self.rows[key])]})()
                return type("SupabaseResponse", (), {"data": []})()
            return type("SupabaseResponse", (), {"data": list(self.rows.values())})()

    def update(self, update_dict: Dict[str, Any]):
        if self.should_fail:
            raise ConnectionError("Supabase connection timed out (Simulated Outage)")
        self._pending_update = update_dict
        return self

    def upsert(self, data: Dict[str, Any], on_conflict: str = "cache_key"):
        if self.should_fail:
            raise ConnectionError("Supabase connection timed out (Simulated Outage)")
        with self.lock:
            key = data.get(on_conflict)
            if not key:
                raise ValueError("Missing conflict key")
            if key in self.rows:
                # Simula comportamento ON CONFLICT DO UPDATE
                existing = self.rows[key]
                existing["hit_count"] = existing.get("hit_count", 1) + 1
                existing["updated_at"] = data.get("updated_at")
            else:
                entry = copy.deepcopy(data)
                entry["id"] = len(self.rows) + 1
                self.rows[key] = entry
            return self


class MockSupabaseClient:
    """Mock do cliente Supabase expondo a interface table()."""

    def __init__(self, table_instance: MockSupabaseTable) -> None:
        self._table = table_instance

    def table(self, table_name: str):
        if table_name == "socratic_hint_cache":
            return self._table
        raise ValueError(f"Tabela desconhecida: {table_name}")


class MockGateway:
    """Mock do MathAI Gateway para controle e inspeção de chamadas de inferência."""

    def __init__(self, return_content: str = "Dica pedagógica socrática sobre o ponto $P$. O que ocorre no triângulo?") -> None:
        self.call_count = 0
        self.return_content = return_content
        self.should_raise = False
        self.provider = "mock-nemotron"
        self.model_used = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"

    def execute_completion(self, messages, system_prompt, **kwargs):
        self.call_count += 1
        if self.should_raise:
            raise RuntimeError("Gateway LLM NÃO deveria ter sido acionado (esperava-se acerto no cache)!")
        return {
            "content": self.return_content,
            "model_used": self.model_used,
            "provider": self.provider,
            "latency_ms": 250.0,
            "input_hash": "mock-input-hash",
        }


# ==============================================================================
# TESTES DE UNIDADE E INTEGRAÇÃO DO CACHE
# ==============================================================================

@pytest.fixture
def cache_env():
    """Configura ambiente isolado com tutor e banco mockado."""
    mock_table = MockSupabaseTable()
    mock_client = MockSupabaseClient(mock_table)
    cache_service = HintCacheService(supabase_client_getter=lambda: mock_client)
    mock_gw = MockGateway()

    tutor = SocraticTutor()
    tutor.gateway = mock_gw
    tutor.hint_cache = cache_service

    return {
        "tutor": tutor,
        "table": mock_table,
        "gateway": mock_gw,
        "service": cache_service,
    }


def test_first_request_generates_and_persists_hint(cache_env):
    """1. Primeira solicitação executa o Gateway, valida e persiste com cached: False."""
    tutor = cache_env["tutor"]
    table = cache_env["table"]
    gw = cache_env["gateway"]

    questao = {
        "id": 105,
        "enunciado": "Seja $ABC$ um triângulo retângulo em $A$ com hipotenusa $BC = 10$. Calcule a área máxima.",
        "topico": "Geometria Plana",
        "materia": "Matemática",
        "gabarito": "25",
        "solucao": "Por desigualdade das médias, $S = \\frac{1}{2}ab \\le 25$.",
    }

    res = tutor.generate_hint(questao, level=1, pedagogical_preference="conceitual")

    # Verificações de saída
    assert res["cached"] is False
    assert gw.call_count == 1
    assert "triângulo" in res["hint_text"]
    assert res["exercise_id"] == "105"

    # Verificação no banco de dados persistido
    with table.lock:
        assert len(table.rows) == 1
        cache_key = res["cache_key"]
        saved_row = table.rows[cache_key]
        assert saved_row["exercise_id"] == "105"
        assert saved_row["questao_id"] == 105
        assert saved_row["level"] == 1
        assert saved_row["pedagogical_preference"] == "conceitual"
        assert saved_row["hit_count"] == 1
        assert saved_row["hint_text"] == res["hint_text"]


def test_second_equivalent_request_uses_cache(cache_env):
    """2. Segunda solicitação idêntica retorna do cache com cached: True sem chamar IA."""
    tutor = cache_env["tutor"]
    gw = cache_env["gateway"]

    questao = {
        "id": 105,
        "enunciado": "Seja $ABC$ um triângulo retângulo em $A$ com hipotenusa $BC = 10$. Calcule a área máxima.",
        "topico": "Geometria Plana",
        "gabarito": "25",
        "solucao": "Por desigualdade das médias, $S \\le 25$.",
    }

    # 1ª chamada: Gera e salva
    res1 = tutor.generate_hint(questao, level=1, pedagogical_preference="conceitual")
    assert res1["cached"] is False
    assert gw.call_count == 1

    # Trava o gateway para levantar erro caso seja acionado indevidamente
    gw.should_raise = True

    # 2ª chamada: Deve retornar do cache imediatamente
    res2 = tutor.generate_hint(questao, level=1, pedagogical_preference="conceitual")
    assert res2["cached"] is True
    assert res2["provider"] in ("cached", "mock-nemotron")
    assert res2["latency_ms"] == 0.0
    assert res2["hint_text"] == res1["hint_text"]
    assert res2["cache_key"] == res1["cache_key"]
    assert gw.call_count == 1  # Chamada de IA mantida em 1!


def test_different_profiles_or_levels_do_not_share_entries(cache_env):
    """3. Níveis socráticos ou modos pedagógicos distintos geram entradas isoladas."""
    tutor = cache_env["tutor"]
    table = cache_env["table"]
    gw = cache_env["gateway"]

    questao = {
        "id": 200,
        "enunciado": "Resolva a congruência linear $3x \\equiv 5 \\pmod{7}$.",
        "gabarito": "x = 4",
    }

    # Nível 1 Conceitual
    res_l1_c = tutor.generate_hint(questao, level=1, pedagogical_preference="conceitual")
    # Nível 2 Conceitual
    res_l2_c = tutor.generate_hint(questao, level=2, pedagogical_preference="conceitual")
    # Nível 1 Rigor Formal
    res_l1_f = tutor.generate_hint(questao, level=1, pedagogical_preference="rigor_formal")
    # Nível 1 Competitivo
    res_l1_comp = tutor.generate_hint(questao, level=1, pedagogical_preference="competitivo")

    # Todas devem ter sido geradas separadamente
    assert gw.call_count == 4
    keys = {res_l1_c["cache_key"], res_l2_c["cache_key"], res_l1_f["cache_key"], res_l1_comp["cache_key"]}
    assert len(keys) == 4, "Chaves de cache devem ser estritamente únicas por (nível, preferência)!"

    with table.lock:
        assert len(table.rows) == 4


def test_content_mutation_invalidates_cache(cache_env):
    """4. Mudanças no enunciado ou solução alteram o content_hash e invalidam cache obsoleto."""
    tutor = cache_env["tutor"]
    gw = cache_env["gateway"]

    questao_original = {
        "id": 300,
        "enunciado": "Seja f(x) = x^2 - 4x + 3. Encontre as raízes.",
        "gabarito": "1 e 3",
        "solucao": "Fatorando (x-1)(x-3) = 0.",
    }

    res_original = tutor.generate_hint(questao_original, level=1)
    assert res_original["cached"] is False
    assert gw.call_count == 1

    # Questão com errata de texto no enunciado
    questao_corrigida = copy.deepcopy(questao_original)
    questao_corrigida["enunciado"] = "Seja f(x) = x^2 - 4x + 4. Encontre as raízes reais."
    questao_corrigida["gabarito"] = "2"
    questao_corrigida["solucao"] = "Trinômio quadrado perfeito (x-2)^2 = 0."

    res_corrigida = tutor.generate_hint(questao_corrigida, level=1)
    # Deve ser novo miss de cache e gerar nova entrada
    assert res_corrigida["cached"] is False
    assert gw.call_count == 2
    assert res_corrigida["cache_key"] != res_original["cache_key"]


def test_generic_or_invalid_responses_are_not_cached(cache_env):
    """5. Respostas com mensagens de erro, vazamento de gabarito ou contingência são rejeitadas do cache."""
    table = cache_env["table"]

    # 1. Resposta curta demais
    val1, _ = validate_hint_for_cache("Curta", level=1)
    assert val1 is False

    # 2. Resposta contendo erro de conexão
    val2, _ = validate_hint_for_cache("Ocorreu um erro interno de conexão com a API", level=1)
    assert val2 is False

    # 3. Provedor de contingência
    val3, _ = validate_hint_for_cache("Dica legítima e bem formulada com $x=2$", level=1, provider="lemmas-emergency")
    assert val3 is False

    # 4. Vazamento explícito de alternativa no Nível 2
    val4, _ = validate_hint_for_cache("Para resolver, veja que a alternativa correta é B.", level=2, gabarito="B")
    assert val4 is False

    # 5. Dica legítima no Nível 2 que NÃO vaza gabarito
    val5, _ = validate_hint_for_cache("Qual relação métrica conecta a altura $h$ à projeção dos catetos?", level=2, gabarito="B", provider="gemini-flash-lite")
    assert val5 is True

    # Nenhuma entrada espúria no banco
    with table.lock:
        assert len(table.rows) == 0


def test_database_failure_does_not_crash_tutor(cache_env):
    """6. Falha total no Supabase não derruba a tutoria; entrega dica com cached: False e registra log."""
    tutor = cache_env["tutor"]
    table = cache_env["table"]
    gw = cache_env["gateway"]

    # Simula queda de rede / Supabase indisponível
    table.should_fail = True

    questao = {
        "id": 404,
        "enunciado": "Calcule a integral $\\int x e^x dx$.",
        "gabarito": "(x-1)e^x + C",
    }

    # Deve executar a geração normalmente sem propagar exceção
    res = tutor.generate_hint(questao, level=1)
    assert res["cached"] is False
    assert "hint_text" in res
    assert gw.call_count == 1


def test_concurrent_simultaneous_requests_no_duplicates(cache_env):
    """7. Requisições simultâneas concorrentes com a mesma chave não geram duplicidade."""
    tutor = cache_env["tutor"]
    table = cache_env["table"]

    questao = {
        "id": 500,
        "enunciado": "Encontre o número de diagonais de um decágono regular.",
        "gabarito": "35",
    }

    def worker():
        return tutor.generate_hint(questao, level=1, pedagogical_preference="conceitual")

    # Dispara 10 threads simultâneas
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(worker) for _ in range(10)]
        results = [f.result() for f in futures]

    assert len(results) == 10
    # Todas as respostas foram bem-sucedidas
    for r in results:
        assert "hint_text" in r

    # O banco de dados deve conter exatamente 1 registro para essa chave única
    with table.lock:
        assert len(table.rows) == 1
        saved = list(table.rows.values())[0]
        assert saved["exercise_id"] == "500"
        assert saved["hit_count"] >= 1


def test_individualized_student_data_never_cached_or_shared(cache_env):
    """8. Regra Crítica: Dicas que contêm rascunho do aluno ou erros pessoais NUNCA são salvas no cache compartilhado."""
    tutor = cache_env["tutor"]
    table = cache_env["table"]
    gw = cache_env["gateway"]

    questao = {
        "id": 600,
        "enunciado": "Determine os pontos de máximo local da função $f(x) = x^3 - 3x$.",
        "gabarito": "x = -1",
    }

    # Aluno A solicita com rascunho pessoal e tentativa prévia
    res_aluno_a = tutor.generate_hint(
        questao,
        level=2,
        student_draft="Derivei e achei $3x^2 - 3 = 0$, mas me confundi se o máximo era 1 ou -1.",
        tentativas_anteriores="x = 1 (Resposta errada anterior do Aluno A)",
    )

    assert res_aluno_a["cached"] is False
    assert gw.call_count == 1

    # Nenhuma entrada deve ter sido salva no cache compartilhado universal
    with table.lock:
        assert len(table.rows) == 0, "Dica individualizada NUNCA deve ser gravada no cache compartilhado!"

    # Aluno B solicita a mesma questão (modo base, sem rascunho pessoal)
    gw.return_content = "💡 Nível 2: Aplique o teste da derivada segunda $f''(x)$ nos pontos críticos."
    res_aluno_b = tutor.generate_hint(questao, level=2)

    assert res_aluno_b["cached"] is False
    assert gw.call_count == 2
    # Aluno B NÃO recebe o rascunho do Aluno A
    assert "Aluno A" not in res_aluno_b["hint_text"]

    # Agora a dica-base do Aluno B foi salva no cache compartilhado
    with table.lock:
        assert len(table.rows) == 1


def test_adhoc_question_without_id_uses_safe_stable_hash(cache_env):
    """9. Questões avulsas sem ID adotam 'adhoc:<content_hash[:16]>' sem poluir FKs."""
    tutor = cache_env["tutor"]
    table = cache_env["table"]

    questao_adhoc = {
        "enunciado": "Problema avulso colado pelo aluno sem cadastro prévio no banco.",
        "gabarito": "42",
    }

    res = tutor.generate_hint(questao_adhoc, level=1)
    assert res["cached"] is False
    assert res["exercise_id"].startswith("adhoc:")

    with table.lock:
        assert len(table.rows) == 1
        saved = list(table.rows.values())[0]
        assert saved["exercise_id"].startswith("adhoc:")
        assert saved["questao_id"] is None  # FK nula segura sem inventar ID inexistente
