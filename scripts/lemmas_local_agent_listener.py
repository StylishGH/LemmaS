#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
lemmas_local_agent_listener.py — Listener Local Autônomo LemmaS (Porta 9099)

Escuta requisições do Muse (via Tailscale 100.99.171.25):
1. Recebe notificações de tarefas de curadoria (POST /tarefa)
2. Despacha imediatamente para auto-resolução em background
3. Estratégia de resolução: Round-Robin entre Antigravity (agy) e Codex, com Fallback automático
4. Emite notificações nativas no desktop do Ubuntu (notify-send)
5. Persiste tarefas e logs de execução em tmp/ para auditoria
6. Retorna health check (GET /health) e status de execução (GET /status_execucao)
"""

import sys
import os
import json
import time
import queue
import threading
import subprocess
from datetime import datetime
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler

# Força UTF-8 e caminhos canônicos
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Garante binários no PATH
EXTRA_PATHS = ["/home/guilherme/.local/bin", "/snap/bin", "/usr/local/bin"]
current_path = os.environ.get("PATH", "")
os.environ["PATH"] = ":".join(EXTRA_PATHS + [p for p in current_path.split(":") if p not in EXTRA_PATHS])
os.environ["HOME"] = "/home/guilherme"

BASE_DIR = Path(__file__).resolve().parent.parent
TMP_DIR = BASE_DIR / "tmp"
LOGS_DIR = TMP_DIR / "logs_curadoria"
TMP_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)

TASKS_FILE = TMP_DIR / "tarefas_curadoria.json"
STATE_FILE = TMP_DIR / "agent_dispatch_state.json"

PORT = int(os.getenv("LEMMAS_LOCAL_PORT", "9099"))
REPO_PATH = str(BASE_DIR)

# Fila thread-safe de tarefas para execução sequencial (evita lock de git e colisão de branches)
task_queue = queue.Queue()
active_execution_lock = threading.Lock()
current_running_task = {"task_id": None, "agent": None, "started_at": None}


def load_tasks() -> list:
    if TASKS_FILE.exists():
        try:
            return json.loads(TASKS_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return []


def save_tasks(tasks: list) -> None:
    try:
        TASKS_FILE.write_text(json.dumps(tasks, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception as e:
        print(f"[Erro] Falha ao salvar tarefas: {e}", file=sys.stderr)


def update_task_in_storage(task_id: str, updates: dict) -> None:
    with active_execution_lock:
        tasks = load_tasks()
        for t in tasks:
            if t.get("id") == task_id:
                t.update(updates)
                break
        save_tasks(tasks)


def load_dispatch_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"last_agent": "codex", "total_dispatched": 0}


def save_dispatch_state(state: dict) -> None:
    try:
        STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception as e:
        print(f"[Erro] Falha ao salvar estado de dispatch: {e}", file=sys.stderr)


def get_next_agent_pair() -> tuple[str, str]:
    """
    Round-robin determinístico entre Antigravity e Codex.
    Retorna (agente_primario, agente_fallback).
    """
    state = load_dispatch_state()
    last = state.get("last_agent", "codex")

    if last == "antigravity":
        primary = "codex"
        fallback = "antigravity"
    else:
        primary = "antigravity"
        fallback = "codex"

    state["last_agent"] = primary
    state["total_dispatched"] = state.get("total_dispatched", 0) + 1
    save_dispatch_state(state)
    return primary, fallback


def trigger_desktop_notification(title: str, body: str, urgency: str = "normal") -> None:
    try:
        subprocess.run(
            ["notify-send", "-u", urgency, "-a", "LemmaS Auto-Agent", title, body],
            timeout=3,
        )
    except Exception as e:
        print(f"[Aviso] Falha ao disparar notify-send: {e}", file=sys.stderr)


def build_agent_prompt(task: dict) -> str:
    qid = task.get("questao_id")
    tipo = task.get("tipo", "curadoria")
    instrucoes = task.get("instrucoes", "Sem instruções adicionais.")
    task_id = task.get("id", f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}")

    branch_name = f"fix/{tipo.replace('_', '-')}-q{qid if qid else 'geral'}-{datetime.now().strftime('%m%d-%H%M')}"

    prompt = f"""Você é um agente autônomo trabalhando no repositório LemmaS (/mnt/dados/dev/LemmaS).
Esta tarefa de manutenção foi autorizada e despachada diretamente pelo usuário Guilherme (via Muse/Tailscale).

=== METADADOS DA TAREFA ===
- ID: {task_id}
- Tipo: {tipo}
- Questão ID: {qid}
- Data de Recebimento: {task.get('recebido_no_pc_em', datetime.now().isoformat())}

=== INSTRUÇÕES OFICIAIS ===
{instrucoes}

=== DIRETRIZES DE EXECUÇÃO OBRIGATÓRIAS ===
1. Local de trabalho: Diretamente em /mnt/dados/dev/LemmaS.
2. Crie uma branch de trabalho dedicada: `{branch_name}`.
3. Não faça push forçado nem comite direto na branch main.
4. Execute exatamente o que as instruções pedem com rigor matemático e sem regressões.
5. Se for alteração de frontend, valide com `npm run build --prefix frontend`. Se backend, rode pytest.
6. Realize o commit semântico na branch criada documentando o que foi corrigido.
7. Deixe seu resumo final indicando a branch, commit e arquivos modificados.
"""
    return prompt


def run_agent_process(agent: str, prompt: str, log_file: Path) -> tuple[bool, str]:
    """
    Executa o agente em modo não-interativo com permissões pré-aprovadas.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    header = f"[{timestamp}] Iniciando resolução via {agent.upper()}\n"
    log_file.write_text(header, encoding="utf-8")

    cmd = []
    if agent == "codex":
        cmd = [
            "/home/guilherme/.local/bin/codex",
            "exec",
            "-C",
            REPO_PATH,
            "--dangerously-bypass-approvals-and-sandbox",
            prompt,
        ]
    elif agent == "antigravity":
        cmd = [
            "/home/guilherme/.local/bin/agy",
            "-p",
            prompt,
            "--dangerously-skip-permissions",
        ]
    else:
        return False, f"Agente desconhecido: {agent}"

    try:
        with open(log_file, "a", encoding="utf-8") as f:
            proc = subprocess.run(
                cmd,
                cwd=REPO_PATH,
                stdout=f,
                stderr=subprocess.STDOUT,
                timeout=900,  # 15 minutos de teto
            )
        success = (proc.returncode == 0)
        output_tail = log_file.read_text(encoding="utf-8", errors="replace")[-1000:]
        return success, output_tail
    except subprocess.TimeoutExpired:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"\n[ERRO] Timeout excedido (900s) para o agente {agent}.\n")
        return False, "Timeout de 15 minutos excedido."
    except Exception as e:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"\n[ERRO] Exceção ao executar {agent}: {e}\n")
        return False, str(e)


def worker_loop():
    """
    Thread permanente que processa a fila de tarefas sequencialmente com Round-Robin e Fallback.
    """
    print("🤖 Worker de resolução autônoma (Round-Robin Antigravity/Codex) pronto.", flush=True)
    while True:
        task = task_queue.get()
        task_id = task.get("id", f"task_{int(time.time())}")
        qid = task.get("questao_id", 0)

        primary_agent, fallback_agent = get_next_agent_pair()
        prompt = build_agent_prompt(task)

        current_running_task["task_id"] = task_id
        current_running_task["agent"] = primary_agent
        current_running_task["started_at"] = datetime.now().isoformat()

        update_task_in_storage(task_id, {
            "status": "em_execucao",
            "agente_primario": primary_agent,
            "agente_fallback": fallback_agent,
            "iniciado_em": datetime.now().isoformat(),
        })

        trigger_desktop_notification(
            f"🚀 [LemmaS] Resolvendo #{qid or task_id}",
            f"Despachado para [{primary_agent.upper()}]. Fallback: [{fallback_agent.upper()}].",
            urgency="normal"
        )

        log_primary = LOGS_DIR / f"{task_id}_{primary_agent}.log"
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Executando {task_id} via {primary_agent}...", flush=True)

        success, preview = run_agent_process(primary_agent, prompt, log_primary)

        if success:
            print(f"✅ {task_id} resolvido com sucesso via {primary_agent}!", flush=True)
            update_task_in_storage(task_id, {
                "status": "concluido",
                "resolvido_por": primary_agent,
                "concluido_em": datetime.now().isoformat(),
                "log_file": str(log_primary),
            })
            trigger_desktop_notification(
                f"✅ [LemmaS] Tarefa Concluída!",
                f"Questão #{qid or task_id} resolvida com sucesso pelo [{primary_agent.upper()}].",
                urgency="normal"
            )
        else:
            print(f"⚠️ {primary_agent} falhou em {task_id}. Acionando fallback para {fallback_agent}...", flush=True)
            current_running_task["agent"] = f"{fallback_agent} (fallback)"
            trigger_desktop_notification(
                f"⚠️ [LemmaS] Fallback Acionado",
                f"{primary_agent.upper()} falhou. Tentando resolver via [{fallback_agent.upper()}]...",
                urgency="critical"
            )

            log_fallback = LOGS_DIR / f"{task_id}_{fallback_agent}_fallback.log"
            fb_success, fb_preview = run_agent_process(fallback_agent, prompt, log_fallback)

            if fb_success:
                print(f"✅ {task_id} resolvido com sucesso via fallback {fallback_agent}!", flush=True)
                update_task_in_storage(task_id, {
                    "status": "concluido_fallback",
                    "resolvido_por": fallback_agent,
                    "concluido_em": datetime.now().isoformat(),
                    "log_file": str(log_fallback),
                })
                trigger_desktop_notification(
                    f"✅ [LemmaS] Resolvido via Fallback!",
                    f"Questão #{qid or task_id} resolvida pelo [{fallback_agent.upper()}].",
                    urgency="normal"
                )
            else:
                print(f"❌ Falha em ambos os agentes para {task_id}.", flush=True)
                update_task_in_storage(task_id, {
                    "status": "falha_execucao",
                    "resolvido_por": None,
                    "erro": f"Primário ({primary_agent}) e Fallback ({fallback_agent}) falharam.",
                    "finalizado_em": datetime.now().isoformat(),
                    "log_primary": str(log_primary),
                    "log_fallback": str(log_fallback),
                })
                trigger_desktop_notification(
                    f"❌ [LemmaS] Falha na Resolução",
                    f"Tarefa #{qid or task_id} falhou no {primary_agent} e no {fallback_agent}. Verifique os logs.",
                    urgency="critical"
                )

        current_running_task["task_id"] = None
        current_running_task["agent"] = None
        current_running_task["started_at"] = None
        task_queue.task_done()


class LocalAgentRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{stamp}] {self.client_address[0]} - {format % args}", flush=True)

    def do_GET(self):
        if self.path in ("/", "/health"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            resp = {
                "status": "online",
                "service": "lemmas-local-agent-listener",
                "authorized_origin": "muse (100.99.171.25)",
                "strategy": "round-robin (antigravity <-> codex) with auto-fallback",
                "queue_size": task_queue.qsize(),
                "currently_running": current_running_task,
                "timestamp": datetime.now().isoformat(),
            }
            self.wfile.write(json.dumps(resp).encode("utf-8"))
            return

        if self.path == "/status_execucao":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            state = load_dispatch_state()
            resp = {
                "queue_size": task_queue.qsize(),
                "currently_running": current_running_task,
                "dispatch_state": state,
                "recent_tasks_count": len(load_tasks()),
            }
            self.wfile.write(json.dumps(resp, indent=2).encode("utf-8"))
            return

        if self.path == "/tarefas":
            tasks = load_tasks()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(tasks, indent=2, ensure_ascii=False).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        if self.path == "/tarefa":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8", errors="replace")
            try:
                task = json.loads(body)
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"JSON inválido: {e}"}).encode("utf-8"))
                return

            qid = task.get("questao_id", 0)
            tipo = task.get("tipo", "curadoria")
            instrucoes = task.get("instrucoes", "Sem instruções adicionais.")
            if not task.get("id"):
                task["id"] = f"task_{tipo}_{qid}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

            task["recebido_no_pc_em"] = datetime.now().isoformat()
            task["status"] = "enfileirada_para_auto_resolucao"

            # Salva na lista histórica
            with active_execution_lock:
                tasks = load_tasks()
                tasks.insert(0, task)
                save_tasks(tasks[:100])

            # Enfileira para execução imediata no worker
            task_queue.put(task)

            # Notifica recebimento imediato
            trigger_desktop_notification(
                f"📥 [Muse/Tailscale] Tarefa #{qid or task['id']} Recebida",
                f"Autorizado pelo usuário. Enfileirado para auto-resolução.",
                urgency="normal"
            )

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            resp = {
                "success": True,
                "message": f"Tarefa para Questão #{qid} recebida e enfileirada para auto-resolução.",
                "task_id": task.get("id"),
                "queue_position": task_queue.qsize(),
                "execution_policy": "round-robin (antigravity / codex) com fallback automático",
            }
            self.wfile.write(json.dumps(resp).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()


def main():
    # Inicia o worker thread de resolução
    worker_thread = threading.Thread(target=worker_loop, daemon=True)
    worker_thread.start()

    server = HTTPServer(("0.0.0.0", PORT), LocalAgentRequestHandler)
    print(f"🟢 LemmaS Local Agent Auto-Resolver ativo na porta {PORT}...", flush=True)
    print(f"📡 Origem autorizada: Muse (via Tailscale)", flush=True)
    print(f"⚡ Estratégia: Round-Robin (Antigravity <-> Codex) com Fallback Automático", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrando listener local...", flush=True)
        server.server_close()


if __name__ == "__main__":
    main()
