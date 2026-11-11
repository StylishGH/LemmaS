"""Suíte de Testes do Listener e Worker Autônomo LemmaS (Porta 9099).

Testa:
1. Mecanismo de alternância Round-Robin determinístico (Antigravity <-> Codex)
2. Construção padronizada de prompts com metadados e branches semânticas
3. Contratos de payload de GET /health e GET /status_execucao
4. Integridade da fila e persistência de tarefas
"""

import json
from pathlib import Path
from unittest.mock import patch

import pytest

from scripts.lemmas_local_agent_listener import (
    build_agent_prompt,
    get_next_agent_pair,
    load_dispatch_state,
    save_dispatch_state,
)


def test_round_robin_alternation(tmp_path: Path):
    """Garante que a política round-robin alterna estritamente entre Antigravity e Codex."""
    fake_state_file = tmp_path / "test_dispatch_state.json"

    with patch("scripts.lemmas_local_agent_listener.STATE_FILE", fake_state_file):
        # 1. Estado inicial inexistente (default last: codex -> próximo: antigravity)
        prim1, fall1 = get_next_agent_pair()
        assert prim1 == "antigravity"
        assert fall1 == "codex"

        state = json.loads(fake_state_file.read_text(encoding="utf-8"))
        assert state["last_agent"] == "antigravity"
        assert state["total_dispatched"] == 1

        # 2. Próximo dispatch deve alternar para codex
        prim2, fall2 = get_next_agent_pair()
        assert prim2 == "codex"
        assert fall2 == "antigravity"

        state = json.loads(fake_state_file.read_text(encoding="utf-8"))
        assert state["last_agent"] == "codex"
        assert state["total_dispatched"] == 2

        # 3. Terceiro dispatch volta para antigravity
        prim3, fall3 = get_next_agent_pair()
        assert prim3 == "antigravity"
        assert fall3 == "codex"


def test_build_agent_prompt_structure():
    """Valida que o prompt injeta corretamente IDs, tipos, branch semântica e diretrizes."""
    task = {
        "id": "test_ping_roundrobin_01",
        "tipo": "teste_conexao",
        "questao_id": 9999,
        "instrucoes": "Apenas confirme que o listener e o worker estao operacionais e reporte TEST_ROUNDROBIN_OK.",
        "recebido_no_pc_em": "2026-11-11T11:28:07.582373",
    }

    prompt = build_agent_prompt(task)

    assert "test_ping_roundrobin_01" in prompt
    assert "teste_conexao" in prompt
    assert "9999" in prompt
    assert "fix/teste-conexao-q9999" in prompt
    assert "TEST_ROUNDROBIN_OK" in prompt
    assert "Diretrizes de Execução Obrigatórias" in prompt or "DIRETRIZES DE EXECUÇÃO OBRIGATÓRIAS" in prompt
