"""Serviço de Cache Inteligente e Persistente para Dicas Socráticas do LEMMAS.

Arquitetura e Princípios Epistêmicos:
- Armazena dicas-base compartilháveis (níveis 1 a 5) moduladas por perfil pedagógico.
- Preserva a personalização: JAMAIS reutiliza para outros alunos respostas que dependem
  de rascunho, justificativa, histórico individual de erros ou dados comportamentais.
- Chave lógica determinística que invalida o cache automaticamente se o enunciado,
  solução ou gabarito forem corrigidos ou atualizados.
- Idempotência e tolerância a concorrência com chave única e upsert atômico.
- Graceful degradation: falhas de persistência ou rede com o banco nunca descartam
  uma resposta válida gerada pela IA nem quebram o fluxo de tutoria.
"""

from datetime import datetime, timezone
import logging
import re
from typing import Any, Dict, Optional, Tuple

from app.core.config import get_supabase_client
from app.core.security import compute_sha256

logger = logging.getLogger(__name__)

PROMPT_STRATEGY_VERSION = "v1.0-socratic"

# Padrões que identificam respostas genéricas ou de erro que NÃO devem ser armazenadas
INVALID_HINT_PATTERNS = [
    r"não foi possível gerar",
    r"erro interno",
    r"erro de conexão",
    r"serviço indisponível",
    r"indispon[íi]vel",
    r"timeout",
    r"jsondecodeerror",
    r"desenvolva o raciocínio formal a partir das hipóteses",
    r"identifique os dados centrais",
]


def normalize_math_text(text: Optional[str]) -> str:
    """Normaliza texto removendo espaços redundantes e quebras de linha espúrias."""
    if not text:
        return ""
    # Remove espaços repetidos e uniformiza quebras de linha
    normalized = re.sub(r"\r\n|\r", "\n", str(text).strip())
    normalized = re.sub(r"[ \t]+", " ", normalized)
    return normalized


def compute_content_hash(
    enunciado: str,
    solucao: Optional[str] = "",
    gabarito: Optional[str] = "",
) -> str:
    """Gera hash SHA-256 canônico do conteúdo da questão (enunciado + solução + gabarito).
    
    Qualquer alteração ou errata de texto/fórmula invalida o cache automaticamente.
    """
    clean_enunciado = normalize_math_text(enunciado)
    clean_solucao = normalize_math_text(solucao)
    clean_gabarito = normalize_math_text(gabarito)
    canonical_repr = f"ENUNCIADO:{clean_enunciado}||SOLUCAO:{clean_solucao}||GABARITO:{clean_gabarito}"
    return compute_sha256(canonical_repr)


def compute_cache_key(
    exercise_id: str,
    level: int,
    pedagogical_preference: str,
    content_hash: str,
    prompt_version: str = PROMPT_STRATEGY_VERSION,
) -> str:
    """Calcula a chave única determinística para a dica socrática base."""
    clean_exercise_id = str(exercise_id).strip()
    clean_pref = str(pedagogical_preference).strip().lower()
    logical_tuple = (
        f"EXERCISE:{clean_exercise_id}::LEVEL:{level}::PREF:{clean_pref}::"
        f"PROMPT:{prompt_version}::HASH:{content_hash}"
    )
    return compute_sha256(logical_tuple)


def is_individualized_request(
    exercise: Dict[str, Any],
    payload_data: Optional[Dict[str, Any]] = None,
) -> bool:
    """Verifica se a solicitação possui dados individuais do estudante.
    
    Regra Crítica: Dicas que dependem de rascunho, erros pessoais ou tentativas
    anteriores NUNCA devem ser salvas no cache compartilhado universal nem servidas dele.
    """
    contexts = [exercise, payload_data or {}]
    for ctx in contexts:
        # 1. Rascunho / Justificativa textual individual
        justificativa = ctx.get("justificativa") or ctx.get("justificativa_texto") or ctx.get("rascunho")
        if justificativa and str(justificativa).strip():
            return True

        # 2. Imagem de rascunho em caderno ou tablet
        if ctx.get("imagem_base64") or ctx.get("imagem_resolucao_path"):
            return True

        # 3. Histórico de tentativas do estudante na questão
        tentativas = ctx.get("tentativas_anteriores") or ctx.get("previous_attempts")
        if tentativas:
            if isinstance(tentativas, (list, dict)) and len(tentativas) > 0:
                return True
            if isinstance(tentativas, str) and str(tentativas).strip():
                return True

        # 4. Erros específicos do aluno
        if ctx.get("tipo_erro_aluno") or ctx.get("erros_recentes"):
            return True

    return False


def validate_hint_for_cache(
    hint_text: str,
    level: int,
    gabarito: Optional[str] = "",
    provider: Optional[str] = "",
) -> Tuple[bool, Optional[str]]:
    """Valida se o texto gerado possui integridade pedagógica suficiente para ser compartilhado em cache.
    
    Retorna (valido, motivo_rejeicao).
    """
    if not hint_text or not isinstance(hint_text, str):
        return False, "Texto da dica vazio ou inválido."

    cleaned = hint_text.strip()
    if len(cleaned) < 25:
        return False, "Texto da dica muito curto para ter valor pedagógico socrático."

    # Não armazena saídas de contingência emergencial determinística como se fossem dicas de IA geradas
    if provider and ("fallback" in provider.lower() or "emergency" in provider.lower()):
        return False, f"Provedor '{provider}' é contingência e não deve ser persistido como IA."

    # Verifica se contém mensagens de erro de sistema
    for pattern in INVALID_HINT_PATTERNS:
        if re.search(pattern, cleaned, re.IGNORECASE):
            return False, f"Detectado padrão genérico ou de erro no texto: '{pattern}'"

    # Guardrail Socrático: Níveis 1 a 4 não devem vazar explicitamente a resposta final
    if 1 <= level <= 4 and gabarito:
        clean_gab = str(gabarito).strip()
        # Se for alternativa de múltipla escolha (A, B, C, D, E)
        if re.fullmatch(r"^[A-Ea-e]$", clean_gab):
            if re.search(rf"\b(?:gabarito|resposta|alternativa)\s*(?:correta|certa|oficial)?\s*(?:é|e|:)?\s*\(?{clean_gab}\)?\b", cleaned, re.IGNORECASE):
                return False, f"Dica de Nível {level} vazou o gabarito final ({clean_gab})."

    return True, None


class HintCacheService:
    """Serviço de gerenciamento do cache persistente de dicas socráticas no Supabase."""

    def __init__(self, supabase_client_getter=get_supabase_client) -> None:
        self.get_client = supabase_client_getter

    def resolve_stable_exercise_id(self, exercise: Dict[str, Any], content_hash: str) -> Tuple[str, Optional[int]]:
        """Determina o identificador estável da questão sem inventar chaves arbitrárias.
        
        - Se possuir ID numérico referente a public.questoes, preserva-o.
        - Se for questão avulsa (ad-hoc) sem ID no acervo, usa 'adhoc:<content_hash[:16]>'.
        """
        raw_id = exercise.get("id") or exercise.get("exercise_id") or exercise.get("questao_id")
        if raw_id is not None and str(raw_id).strip() and str(raw_id).strip() not in ("adhoc", "adhoc-exercise", "None"):
            clean_str_id = str(raw_id).strip()
            try:
                # Se for número inteiro, pode ser mapeado para questao_id (FK em questoes)
                numeric_id = int(clean_str_id)
                return str(numeric_id), numeric_id
            except ValueError:
                # ID em formato string estável (ex: UUID ou identificador de catálogo)
                return clean_str_id, None

        # Estratégia segura para questões sem identificador estável no banco:
        # Usa hash dos primeiros 16 caracteres hexadecimais do conteúdo único
        adhoc_id = f"adhoc:{content_hash[:16]}"
        return adhoc_id, None

    def get_cached_hint(
        self,
        cache_key: str,
    ) -> Optional[Dict[str, Any]]:
        """Recupera dica-base do cache pelo cache_key. Retorna None em caso de miss ou falha."""
        client = self.get_client()
        if not client:
            return None

        try:
            res = client.table("socratic_hint_cache").select(
                "id, cache_key, exercise_id, level, pedagogical_preference, hint_text, model_used, provider, hit_count, created_at"
            ).eq("cache_key", cache_key).limit(1).execute()

            if res.data and len(res.data) > 0:
                row = res.data[0]
                # Incrementa hit_count de forma não-bloqueante
                try:
                    client.table("socratic_hint_cache").update({
                        "hit_count": (row.get("hit_count") or 1) + 1,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }).eq("id", row["id"]).execute()
                except Exception:
                    pass

                return row
            return None
        except Exception as err:
            logger.warning(f"[HintCache] Falha ao consultar cache para {cache_key}: {err}")
            return None

    def save_cached_hint(
        self,
        cache_key: str,
        exercise_id: str,
        questao_id: Optional[int],
        level: int,
        pedagogical_preference: str,
        content_hash: str,
        hint_text: str,
        model_used: str,
        provider: str,
        latency_ms: float = 0.0,
        metadata: Optional[Dict[str, Any]] = None,
        prompt_version: str = PROMPT_STRATEGY_VERSION,
    ) -> bool:
        """Persiste a dica socrática no banco de forma atômica, tratando concorrência com upsert."""
        client = self.get_client()
        if not client:
            logger.info("[HintCache] Supabase não disponível no ambiente, bypass de persistência.")
            return False

        payload = {
            "cache_key": cache_key,
            "exercise_id": exercise_id,
            "questao_id": questao_id,
            "level": level,
            "pedagogical_preference": pedagogical_preference,
            "prompt_version": prompt_version,
            "content_hash": content_hash,
            "hint_text": hint_text,
            "model_used": model_used,
            "provider": provider,
            "latency_ms": latency_ms,
            "hit_count": 1,
            "metadata": metadata or {},
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        try:
            # Upsert on_conflict garante que duas requisições simultâneas não gerem erro de duplicidade
            client.table("socratic_hint_cache").upsert(
                payload,
                on_conflict="cache_key",
            ).execute()
            logger.info(f"[HintCache] Dica persistida com sucesso no cache para {exercise_id} (Nível {level}, {pedagogical_preference}).")
            return True
        except Exception as err:
            logger.error(f"[HintCache] Erro de persistência no Supabase para {cache_key}: {err}", exc_info=True)
            return False


# Instância singleton global do serviço de cache
hint_cache_service = HintCacheService()
