```markdown
# ESPECIFICAÇÃO DE IMPLEMENTAÇÃO E RESILIÊNCIA DO ECOSSISTEMA IA
> **Artefato de Execução Autônoma para o Google Antigravity**[cite: 1]  
> **Target:** Alethe Orchestrator + Hermes Integration + 9Router + Docker ai-memory[cite: 1]  
> **Engenheiro:** Guilherme Henrique Mendes[cite: 1]  
> **Data:** 15 de Outubro de 2026[cite: 1]  
> **Objetivo:** Implementar persistência transacional (WAL anti-crash), auto-healing de tokens MCP, sanitização de comandos PTY no Windows, fechamento automático de sessão e particionamento de memória em índice roteador[cite: 1].

---

## 1. Diagnóstico dos Pontos de Falha Atuais

1. **Amnésia por Fechamento/Crash do Terminal PTY:** A persistência atual é *End-of-Task*[cite: 1]. Se o Alethe fechar uma aba ou o terminal morrer antes da retomada do Antigravity (Passo 6), o buffer de execução na Camada 5 é destruído e o estado é perdido[cite: 1].
2. **Invalidação de Argumentos no Windows:** Strings multilinhas enviadas ao `alethe_delegate` disparam o erro `batch file arguments are invalid` no interpretador de lote do Windows[cite: 1].
3. **Desconexão por Rotação de Token:** O Alethe gera um `nanoid(32)` na porta `9123` a cada reinicialização, exigindo intervenção manual via `scan_token.py` para atualizar `.alethe_orch_token`[cite: 1].
4. **Degradação de Janela de Contexto no Boot:** O `SHARED-MEMORY.md` monolítico tende a crescer indefinidamente com logs e lições, inflando o custo de tokens logo no início da sessão do Antigravity[cite: 1].
5. **Fechamento Manual de Sessão:** A gravação no `ai-memory` (porta `49374`) e no Obsidian depende de chamadas explícitas e manuais ao final do fluxo[cite: 1].

---

## 2. Componente 1: Motor Transacional Anti-Crash (`checkpoint_wal.py`)

* **Caminho:** `C:\Users\guigu\teamwork_projects\alethe_hermes_integration\checkpoint_wal.py`[cite: 1]
* **Função:** Implementar *Write-Ahead Logging* (WAL) em arquivo JSONL local com `os.fsync` para persistência imediata em disco, prevenindo amnésia caso o terminal PTY seja encerrado abruptamente[cite: 1].

```python
import json
import os
import time
from pathlib import Path

# Diretório de persistência transacional rápida no disco local
WAL_DIR = Path(r"D:\dev\alethe-agents\.wal_checkpoints")
WAL_DIR.mkdir(parents=True, exist_ok=True)

class SessionWAL:
    """
    Gerenciador de Write-Ahead Logging para terminais do Alethe.
    Garante sobrevivência a crashes, quedas de processo e fechamento de abas.
    """
    def __init__(self, agent_profile: str = "hermes-workers"):
        self.agent_profile = agent_profile
        self.state_file = WAL_DIR / f"state_{agent_profile}.json"
        self.log_file = WAL_DIR / f"history_{agent_profile}.jsonl"

    def start_or_resume_task(self, task_goal: str) -> str:
        """
        Inicia o rastreio da tarefa. Se a tarefa anterior terminou em crash,
        devolve o bloco de recuperação pronto para reidratar o LLM.
        """
        recovery_context = self.get_crash_recovery_prompt()
        
        state = {
            "agent": self.agent_profile,
            "task_goal": task_goal,
            "status": "WORKING",
            "start_time": time.strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        self._write_atomic_json(self.state_file, state)
        self.append_step("TASK_START", {"goal": task_goal})
        return recovery_context

    def append_step(self, step_type: str, data: dict):
        """
        Escreve o passo em disco com flush forçado via fsync.
        """
        entry = {
            "ts": time.strftime("%H:%M:%S"),
            "type": step_type,
            "data": data
        }
        with open(self.log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
            f.flush()
            os.fsync(f.fileno())

        if self.state_file.exists():
            try:
                state = json.loads(self.state_file.read_text(encoding="utf-8"))
                state["updated_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
                self._write_atomic_json(self.state_file, state)
            except Exception:
                pass

    def mark_completed(self, final_summary: str = ""):
        """Marca o estado da sessão como concluído com sucesso."""
        if self.state_file.exists():
            state = json.loads(self.state_file.read_text(encoding="utf-8"))
            state["status"] = "COMPLETED"
            state["summary"] = final_summary
            state["updated_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
            self._write_atomic_json(self.state_file, state)
        
        if self.log_file.exists():
            archive = WAL_DIR / f"archive_{self.agent_profile}_{int(time.time())}.jsonl"
            self.log_file.rename(archive)

    def get_crash_recovery_prompt(self, max_steps: int = 10) -> str:
        """
        Inspeciona se a última sessão caiu em status WORKING e sintetiza
        os últimos passos executados para recontextualização imediata.
        """
        if not self.state_file.exists() or not self.log_file.exists():
            return ""

        try:
            state = json.loads(self.state_file.read_text(encoding="utf-8"))
        except Exception:
            return ""

        if state.get("status") != "WORKING":
            return ""

        lines = self.log_file.read_text(encoding="utf-8").strip().splitlines()
        recent_lines = lines[-max_steps:] if len(lines) > max_steps else lines

        history = []
        for line in recent_lines:
            item = json.loads(line)
            data_str = json.dumps(item["data"], ensure_ascii=False)
            if len(data_str) > 500:
                data_str = data_str[:500] + "... [TRUNCADO]"
            history.append(f"- [{item['ts']}] ({item['type']}) {data_str}")

        return (
            "===========================================================\n"
            "⚠️ RECUPERAÇÃO AUTOMÁTICA DE ESTADO (CRASH RECOVERY ATIVO)\n"
            f"O terminal anterior da sessão '{self.agent_profile}' morreu antes de concluir.\n"
            f"Objetivo original: {state.get('task_goal')}\n"
            "Últimos eventos gravados no disco antes da interrupção:\n"
            + "\n".join(history) + "\n"
            "DIRETRIZ OBRIGATÓRIA: Não refaça passos já completados com sucesso.\n"
            "Continue exatamente a partir do próximo comando pendente.\n"
            "===========================================================\n"
        )

    @staticmethod
    def _write_atomic_json(path: Path, data: dict):
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp.replace(path)

```

---

## 3. Componente 2: Sanitização PTY e Auto-Healing de Token (`safe_delegate.py`)

* **Caminho:** `C:\Users\guigu\teamwork_projects\alethe_hermes_integration\safe_delegate.py`

* **Função:** Resolver os erros de argumentos batch no Windows via empacotamento em PowerShell temporário e interceptar códigos HTTP 401/403 para renovar automaticamente o token `nanoid(32)` na porta `9123`.



```python
import base64
import os
import subprocess
import tempfile
from pathlib import Path
import httpx

INTEGRATION_DIR = Path(__file__).parent
TOKEN_FILE = INTEGRATION_DIR / ".alethe_orch_token"
SCAN_SCRIPT = INTEGRATION_DIR / "scan_token.py"
ALETHE_MCP_URL = "[http://127.0.0.1:9123](http://127.0.0.1:9123)"

def get_or_refresh_token(force_refresh: bool = False) -> str:
    """Recupera o token ativo ou dispara o scanner se rotacionou."""
    if force_refresh or not TOKEN_FILE.exists():
        subprocess.run(["python", str(SCAN_SCRIPT)], check=True, capture_output=True)
    return TOKEN_FILE.read_text(encoding="utf-8").strip()

def sanitize_windows_pty_command(command: str) -> str:
    """
    Higieniza comandos multilinhas para o terminal PTY do Windows.
    Comandos com quebras de linha são gravados em arquivo .ps1 temporário em UTF-8.
    """
    if "\n" not in command and len(command) < 180 and "&" not in command:
        return command

    tmp_dir = Path(tempfile.gettempdir()) / "alethe_dispatch"
    tmp_dir.mkdir(exist_ok=True)
    task_script = tmp_dir / "isolated_task.ps1"
    
    # Injeta cabeçalho para forçar UTF-8 no console do PowerShell filho
    full_script = (
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8\n"
        "$OutputEncoding = [System.Text.Encoding]::UTF8\n"
        f"{command}\n"
    )
    task_script.write_text(full_script, encoding="utf-8")
    return f'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "{task_script}"'

def dispatch_to_alethe(endpoint: str, payload: dict) -> dict:
    """
    Despacha payloads HTTP para o Alethe com suporte a auto-healing de autenticação.
    """
    token = get_or_refresh_token(force_refresh=False)
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    if "command" in payload:
        payload["command"] = sanitize_windows_pty_command(payload["command"])

    try:
        resp = httpx.post(f"{ALETHE_MCP_URL}/{endpoint}", json=payload, headers=headers, timeout=20.0)
        if resp.status_code in (401, 403):
            # Token rotacionou: renova e retenta
            token = get_or_refresh_token(force_refresh=True)
            headers["Authorization"] = f"Bearer {token}"
            resp = httpx.post(f"{ALETHE_MCP_URL}/{endpoint}", json=payload, headers=headers, timeout=20.0)
        resp.raise_for_status()
        return resp.json()
    except httpx.ConnectError:
        raise RuntimeError("Alethe Orchestrator offline na porta 9123.")

```

---

## 4. Componente 3: Integração dos Serviços no Servidor MCP (`alethe_hermes_mcp.py`)

* **Caminho:** `C:\Users\guigu\teamwork_projects\alethe_hermes_integration\alethe_hermes_mcp.py`

* **Função:** Atualizar o despachador de ferramentas do Antigravity para registrar transações no WAL, ativar espelhamento contínuo de terminal via `Tee-Object` e expor a ferramenta `alethe_resume`.



```python
import sys
import io
from pathlib import Path
from checkpoint_wal import SessionWAL
from safe_delegate import dispatch_to_alethe

# Garante saída compatível com consoles Windows (cp1252)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

wal_planner = SessionWAL("hermes-planner")
wal_workers = SessionWAL("hermes-workers")
LIVE_LOG = Path(r"D:\dev\alethe-agents\.wal_checkpoints\live_pty_out.log")

def hermes_think(prompt: str, profile: str = "hermes-planner") -> str:
    """
    Processa prompts analíticos registrando checkpoints antes e depois da inferência.
    """
    wal = wal_planner if profile == "hermes-planner" else wal_workers
    recovery_data = wal.start_or_resume_task(task_goal=prompt[:250])
    
    if recovery_data:
        prompt = f"{recovery_data}\n\nInstrução Atual:\n{prompt}"
        
    wal.append_step("INFERENCE_CALL", {"prompt_preview": prompt[:400], "profile": profile})
    
    # Chamada ao motor de inferência via 9Router (localhost:20128)
    response = execute_inference_via_9router(prompt, profile=profile)
    
    wal.append_step("INFERENCE_SUCCESS", {"response_preview": response[:400]})
    return response

def alethe_execute(command: str, profile: str = "hermes-workers") -> dict:
    """
    Executa comandos no terminal PTY do Alethe espelhando saída ao vivo em live_pty_out.log.
    """
    wal = wal_workers if profile == "hermes-workers" else wal_planner
    wal.append_step("CMD_DISPATCH", {"command": command})

    # Gravação espelhada em tempo real para sobreviver à morte da janela
    wrapped_command = f"{command} 2>&1 | Tee-Object -FilePath '{LIVE_LOG}'"
    
    payload = {"command": wrapped_command, "profile": profile}
    result = dispatch_to_alethe("api/pty/execute", payload)
    
    wal.append_step("CMD_FINISHED", {"status": "ok", "result_summary": str(result)[:300]})
    return result

def alethe_resume(profile: str = "hermes-workers") -> str:
    """
    Ferramenta MCP: Recupera o fio da meada após crash do terminal ou fechamento de aba.
    """
    wal = wal_workers if profile == "hermes-workers" else wal_planner
    recovery_text = wal.get_crash_recovery_prompt(max_steps=12)
    
    tail_text = ""
    if LIVE_LOG.exists():
        lines = LIVE_LOG.read_text(encoding="utf-8", errors="ignore").splitlines()
        tail_text = "\nÚltimas linhas emitidas no Terminal PTY:\n" + "\n".join(lines[-25:])

    if not recovery_text and not tail_text:
        return "Nenhum estado interrompido encontrado. Última sessão finalizada de forma limpa."
        
    return f"{recovery_text}\n{tail_text}"

```

---

## 5. Componente 4: Fechamento de Sessão e Consolidação Automática (`end_of_session_sync.py`)

* **Caminho:** `C:\Users\guigu\teamwork_projects\alethe_hermes_integration\end_of_session_sync.py`

* **Função:** Destilar o histórico do terminal ao final dos trabalhos usando o modelo rápido da NVIDIA NIM via 9Router a custo zero, sincronizar o `ai-memory` (porta `49374`) e atualizar o `SPRINT_HOJE.md`.



```python
import sys
import io
import httpx
from datetime import datetime
from pathlib import Path
from checkpoint_wal import SessionWAL

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

NINEROUTER_URL = "http://localhost:20128/v1/chat/completions"
AI_MEMORY_URL = "[http://127.0.0.1:49374](http://127.0.0.1:49374)"
SPRINT_FILE = Path(r"D:\Memoria\Memória\SPRINT_HOJE.md")

def summarize_with_nemotron(raw_data: str) -> str:
    """Gera resumo estruturado via Nemotron 30B sem queimar tokens do Gemini."""
    prompt = (
        "Você é o consolidador de estado do ecossistema. Analise os registros da sessão e gere "
        "um resumo estrito em Markdown (máximo 12 linhas):\n"
        "1. Conquistas e tarefas concluídas.\n"
        "2. Falhas, bugs ou advertências técnicas encontradas.\n"
        "3. Estado atual das prioridades e ponto de partida para a próxima sessão.\n\n"
        f"Registros brutos:\n{raw_data}"
    )
    payload = {
        "model": "nvidia/nemotron-3.5-lightning-30b-a3b",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1
    }
    headers = {"Authorization": "Bearer sk-cb-local", "Content-Type": "application/json"}
    resp = httpx.post(NINEROUTER_URL, json=payload, headers=headers, timeout=30.0)
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]

def run_sync(notes: str = ""):
    live_log = Path(r"D:\dev\alethe-agents\.wal_checkpoints\live_pty_out.log")
    combined_notes = notes
    if live_log.exists():
        combined_notes += "\nLogs PTY:\n" + "\n".join(live_log.read_text(encoding="utf-8", errors="ignore").splitlines()[-50:])

    if not combined_notes.strip():
        print("Nenhum registro para consolidar.")
        return

    print("⚡ Consolidando sessão via 9Router (Nemotron 30B - Custo Zero)...")
    summary = summarize_with_nemotron(combined_notes)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    # 1. Atualização do marcador diário no Obsidian
    sprint_content = f"# Sprint Diária - {timestamp}\n\n{summary}\n"
    SPRINT_FILE.parent.mkdir(parents=True, exist_ok=True)
    SPRINT_FILE.write_text(sprint_content, encoding="utf-8")
    print(f"✅ SPRINT_HOJE.md atualizado em {SPRINT_FILE}")

    # 2. Persistência semântica no Docker ai-memory (Porta 49374)
    try:
        httpx.post(
            f"{AI_MEMORY_URL}/mcp",
            json={
                "method": "tools/call",
                "params": {
                    "name": "memory_write_page",
                    "arguments": {
                        "title": f"Handoff_{datetime.now().strftime('%Y_%m_%d_%H%M')}",
                        "content": summary
                    }
                }
            },
            timeout=8.0
        )
        print("✅ Gravação realizada com sucesso no container ai-memory (49374).")
    except Exception as e:
        print(f"⚠️ Aviso: Falha ao contatar container ai-memory: {e}")

    # 3. Fecha o ciclo no WAL
    SessionWAL("hermes-workers").mark_completed(summary)
    SessionWAL("hermes-planner").mark_completed(summary)
    print("✅ Checkpoint transacional marcado como COMPLETED.")

if __name__ == "__main__":
    cli_notes = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else ""
    run_sync(cli_notes)

```

---

## 6. Componente 5: Reestruturação da Memória Operacional Canônica

### 6.1 Novo Índice Roteador Canônico

* **Caminho:** `D:\dev\alethe-agents\SHARED-MEMORY.md`

* **Regra:** Limitar a ~40 linhas para não poluir a janela de contexto do Antigravity no boot.



```markdown
# SHARED-MEMORY (Índice Canônico de Alta Densidade)
> **Princípio:** Regras ativas obrigatórias de 1 linha. Detalhes técnicos ficam nos arquivos especializados.

## 1. Regras Operacionais Globais (Obrigatórias em toda sessão)
- [EXEC-WIN] Nunca passe comandos multilinhas literais no PTY; delegue via `safe_delegate.py`[cite: 1].
- [CONSOLE-UTF8] Scripts Python no Windows devem inicializar `sys.stdout` com encoding `utf-8`[cite: 1].
- [PTY-CRASH] Em caso de reabertura de terminal, invoque `alethe_resume` para recuperar o estado.
- [HERMES-SPEED] Mantenha `moa.enabled: false` nos perfis do Hermes[cite: 1].
- [ROUTER-AUTH] Conexões `provider: custom` exigem token fictício no 9Router (`api_key: sk-cb...`)[cite: 1].

## 2. Mapa Topológico de Consulta Sob Demanda (Leia apenas se a tarefa demandar)
- Tarefas de UI, Rust ou Tauri: `D:\dev\alethe-agents\docs\memory_tauri.md`
- Pipelines Scikit-Learn, SQL e Métricas: `D:\Memoria\Memória\LemmaS-Obsidian-Vault\LemmaS-Vault\04-MathAI-e-Dados\padroes_codigo_ml.md`[cite: 1]
- Prioridades Imediatas do Dia: `D:\Memoria\Memória\SPRINT_HOJE.md`

```

### 6.2 Estrutura do Painel Diário

* **Caminho:** `D:\Memoria\Memória\SPRINT_HOJE.md`

```markdown
# Sprint Diária - Foco Único e Imediato
> **Meta Estratégica:** Vaga Júnior em Ciência de Dados / Machine Learning[cite: 1].

## 1. Meta Principal de Hoje (P0)
- [ ] Executar 1 teste técnico / case de ML ou refatorar pipeline de portfólio.

## 2. Tarefas Acadêmicas / UFF (P1)
- [ ] Extração de teoremas de Álgebra Linear / Cálculo III para cards no Anki[cite: 1].

## 3. Estado Atual da Sessão Anterior
- (Atualizado automaticamente por `end_of_session_sync.py`)

```

---

## 7. Componente 6: Script Unificado de Boot (`boot_ecossistema.ps1`)

* **Caminho:** `D:\dev\boot_ecossistema.ps1`
* **Função:** Orquestrar subida do 9Router, container Docker `ai-memory`, Alethe Orchestrator e sincronização do token rotativo em comando único.



```powershell
$ErrorActionPreference = "Continue"
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  INICIALIZANDO ECOSSISTEMA DISTRIBUÍDO DE IA (BOOT 1-CLIQUE)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. 9Router Gateway (Porta 20128)
$routerConn = Get-NetTCPConnection -LocalPort 20128 -State Listen -ErrorAction SilentlyContinue
if (-not $routerConn) {
    Write-Host "[1/4] 9Router offline. Iniciando processo..." -ForegroundColor Yellow
    Start-Process "cmd.exe" -ArgumentList "/c start 9router" -WindowStyle Minimized
    Start-Sleep -Seconds 3
} else {
    Write-Host "[1/4] 9Router ATIVO (localhost:20128)." -ForegroundColor Green
}

# 2. Docker Container ai-memory (Porta 49374)
$dockerMem = docker ps --filter "name=ai-memory" --filter "status=running" -q
if (-not $dockerMem) {
    Write-Host "[2/4] Subindo container Docker ai-memory..." -ForegroundColor Yellow
    docker start ai-memory | Out-Null
    Start-Sleep -Seconds 2
} else {
    Write-Host "[2/4] Container Docker ai-memory ATIVO (Porta 49374)." -ForegroundColor Green
}

# 3. Alethe Orchestrator (Porta 9123)
$aletheConn = Get-NetTCPConnection -LocalPort 9123 -State Listen -ErrorAction SilentlyContinue
if (-not $aletheConn) {
    Write-Host "[3/4] Inicializando Alethe Orchestrator (npm run app)..." -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "cd D:\dev\alethe-agents; npm run app"
    
    $attempts = 0
    while (-not (Get-NetTCPConnection -LocalPort 9123 -State Listen -ErrorAction SilentlyContinue) -and ($attempts -lt 25)) {
        Start-Sleep -Seconds 1
        $attempts++
    }
} else {
    Write-Host "[3/4] Alethe Orchestrator ATIVO (Porta 9123)." -ForegroundColor Green
}

# 4. Sincronização do Token Rotativo MCP
Write-Host "[4/4] Sincronizando token MCP dinâmico (.alethe_orch_token)..." -ForegroundColor Yellow
Set-Location "C:\Users\guigu\teamwork_projects\alethe_hermes_integration"
python scan_token.py

Write-Host "`n>>> ECOSSISTEMA PRONTO PARA OPERAÇÃO COM RESILIÊNCIA ATIVA <<<" -ForegroundColor Cyan

```

---

