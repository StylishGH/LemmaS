#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
lemmas_local_agent_listener.py — Listener Local do Antigravity/LemmaS (Porta 9099)

Escuta requisições do Hermes (VM Azure) via Tailscale:
1. Recebe notificações de tarefas de curadoria (POST /tarefa)
2. Dispara notificação nativa no desktop do Ubuntu (notify-send)
3. Persiste a fila de tarefas em tmp/tarefas_curadoria.json para o Antigravity
4. Retorna health check (GET /health) para o Hermes saber se o PC está online
"""

import sys
import os
import json
import subprocess
from datetime import datetime
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler

# Enforce UTF-8
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

BASE_DIR = Path(__file__).resolve().parent.parent
TMP_DIR = BASE_DIR / "tmp"
TMP_DIR.mkdir(parents=True, exist_ok=True)
TASKS_FILE = TMP_DIR / "tarefas_curadoria.json"

PORT = int(os.getenv("LEMMAS_LOCAL_PORT", "9099"))


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


def trigger_desktop_notification(qid: int, tipo: str, instrucoes: str) -> None:
    title = f"🚨 LemmaS Curadoria: Questão #{qid}"
    body = f"[{tipo.upper()}] {instrucoes}\nLink: https://lemmas.com.br/resolver?id={qid}"
    try:
        subprocess.run(
            ["notify-send", "-u", "critical", "-a", "LemmaS Curadoria", title, body],
            timeout=3,
        )
    except Exception as e:
        print(f"[Aviso] Falha ao disparar notify-send: {e}", file=sys.stderr)


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
                "timestamp": datetime.now().isoformat(),
            }
            self.wfile.write(json.dumps(resp).encode("utf-8"))
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

            # Salva na lista
            tasks = load_tasks()
            task["recebido_no_pc_em"] = datetime.now().isoformat()
            tasks.insert(0, task)
            save_tasks(tasks[:100])  # Mantém as 100 mais recentes

            # Dispara alerta visual na tela
            trigger_desktop_notification(qid, tipo, instrucoes)

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            resp = {
                "success": True,
                "message": f"Tarefa para Questão #{qid} recebida e notificada no desktop local.",
                "task_id": task.get("id"),
            }
            self.wfile.write(json.dumps(resp).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()


def main():
    server = HTTPServer(("0.0.0.0", PORT), LocalAgentRequestHandler)
    print(f"🟢 LemmaS Local Agent Listener ativo na porta {PORT}...", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrando listener local...", flush=True)
        server.server_close()


if __name__ == "__main__":
    main()
