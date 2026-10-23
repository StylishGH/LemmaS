"""Tutor Socrático em 5 Níveis da MathAI Engine.

Implementa a pedagogia socrática progressiva para conduzir o estudante à reflexão autônoma:
- Nível 1 (Dados & Foco): Atenção aos dados do enunciado e significado sem entregar fórmulas.
- Nível 2 (Conceito & Lema): Sugere qual teorema, lema ou propriedade conecta as informações.
- Nível 3 (Primeiro Passo): Orienta a montagem da primeira equação ou construção auxiliar.
- Nível 4 (Estruturação Intermediária): Passos intermediários do cálculo, deixando o arremate final.
- Nível 5 (Resolução Completa): Demonstração integral passo a passo até o gabarito.
"""

import logging
import re
from typing import Any, Dict, List, Optional
from app.services.mathai.gateway import mathai_gateway
from app.services.mathai.hint_cache import (
    hint_cache_service,
    compute_content_hash,
    compute_cache_key,
    is_individualized_request,
    validate_hint_for_cache,
    PROMPT_STRATEGY_VERSION,
)

logger = logging.getLogger(__name__)

PROMPT_SISTEMA_SOCRATICO = r"""Você é o Tutor Socrático da plataforma LEMMAS (MathAI Engine), especializado no Método de Pólya para conduzir estudantes de matemática (nível superior e concursos militares) a raciocinar por conta própria.

GUARDRAIL ESTRITO DE RESTRIÇÃO NEGATIVA (NÍVEIS 1 A 4):
- É ESTRITAMENTE PROIBIDO revelar a alternativa correta (A, B, C, D, E) ou vazar o valor numérico/algébrico final do gabarito nos Níveis 1, 2, 3 e 4. O estudante deve construir a dedução ativamente.
- Nível 1: PROIBIDO citar fórmulas, nomes de teoremas ou fazer contas. Máximo de 2 a 3 frases, termina obrigatoriamente com pergunta.
- Nível 2: PROIBIDO substituir números na fórmula ou montar a equação pronta. Termina obrigatoriamente com pergunta.
- Nível 3: PROIBIDO resolver a equação ou passar da metade do problema. Apenas ensine a largada.
- Nível 4: PROIBIDO calcular o resultado final ou indicar a alternativa certa. Pare antes do arremate final.
- Nível 5 (Rendição Pedagógica): Apresente a resolução completa, rigorosa e passo a passo em LaTeX, destacando o Lema central e chegando na resposta final.

DIRETRIZES MANDATÓRIAS DE NOTAÇÃO MATEMÁTICA E LATEX:
- Toda e qualquer expressão, símbolo, incógnita, número algébrico ou fórmula matemática DEVE estar rigorosamente delimitada por $...$ (para matemática em linha, ex: $x = 2$, $\sen(x)$) ou $$...$$ (para equações destacadas em bloco).
- NUNCA use delimitadores \( ou \[. Use SEMPRE $ e $$.
- NUNCA escreva fórmulas matemáticas ou variáveis isoladas em texto puro sem os delimitadores $...$.
- Em português brasileiro, adote notação padrão: \sen para seno e \tg para tangente.
- ATENÇÃO CRÍTICA A FUNÇÕES TRIGONOMÉTRICAS E RELAÇÕES: Jamais escreva tg(\theta), sen(x) ou \theta = \alpha - \beta em texto puro. Fórmulas e relações trigonométricas DEVEM estar 100% delimitadas por $...$, ex: $\operatorname{tg}(\theta) = \operatorname{tg}(\alpha - \beta)$, $\operatorname{tg}(\alpha)$ e $\theta = \alpha - \beta$.

Seja encorajador, rigoroso e extremamente didático."""


def auto_wrap_latex_in_backend(text: str) -> str:
    """Higieniza e auto-envolve expressões matemáticas soltas retornadas pela IA."""
    if not text:
        return ""

    trig_names = r"(?:tg|sen|cossec|cosec|cotg|arcsen|arctg|tan|sin|cos|sec|cot|arccos|arctan)"
    trig_pt = r"(?:tg|sen|cossec|cosec|cotg|arcsen|arctg)"

    def apply_outside_math(s, fn):
        parts = re.split(r"(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$)", s)
        res = []
        for p in parts:
            if p.startswith("$"):
                res.append(p)
            else:
                res.append(fn(p))
        return "".join(res)

    res = text

    # 1. Equações completas com funções trigonométricas ou comandos com contrabarra
    # Ex: tg(\theta ) = tg(\alpha - \beta ) ou \theta =\alpha -\beta
    eq_regex = re.compile(
        r"(^|[\s([{:;])"
        r"((?:\\?" + trig_names + r"\s*\([^)]*\)|\\(?:[a-zA-Z]+)|[a-zA-Z0-9_{}^]+)"
        r"(?:\s*[-+*/]\s*(?:\\?" + trig_names + r"\s*\([^)]*\)|\\(?:[a-zA-Z]+)|[a-zA-Z0-9_{}^]+))*"
        r"\s*=\s*"
        r"(?:\\?" + trig_names + r"\s*\([^)]*\)|\\(?:[a-zA-Z]+)|[a-zA-Z0-9_{}^]+)"
        r"(?:\s*[-+*/]\s*(?:\\?" + trig_names + r"\s*\([^)]*\)|\\(?:[a-zA-Z]+)|[a-zA-Z0-9_{}^]+))*)"
        r"($|[\s)\]},;:?!])"
    )

    def wrap_eq(m):
        prefix = m.group(1)
        match = m.group(2)
        suffix = m.group(3)
        if "\\" in match or "(" in match or re.search(r"\b" + trig_names + r"\b", match):
            clean = re.sub(r"\b(" + trig_pt + r")\b", r"\\operatorname{\1}", match)
            clean = clean.replace("$", "").strip()
            return f"{prefix}${clean}${suffix}"
        return m.group(0)

    res = apply_outside_math(res, lambda chunk: eq_regex.sub(wrap_eq, chunk))

    # 2. Funções trigonométricas isoladas com argumento entre parênteses: tg(\alpha ), tg(\beta ), sen(x)
    trig_call_regex = re.compile(
        r"(^|[\s([{:;])"
        r"((?:\\?" + trig_names + r")\s*\([^)]+\))"
        r"($|[\s)\]},;:?!])"
    )

    def wrap_trig(m):
        prefix = m.group(1)
        match = m.group(2)
        suffix = m.group(3)
        clean = re.sub(r"\b(" + trig_pt + r")\b", r"\\operatorname{\1}", match)
        clean = clean.replace("$", "").strip()
        return f"{prefix}${clean}${suffix}"

    res = apply_outside_math(res, lambda chunk: trig_call_regex.sub(wrap_trig, chunk))

    # 3. Letras gregas soltas no texto puro (fora de $)
    greek_regex = re.compile(
        r"(?<!\$)\\((?:omega|alpha|beta|gamma|delta|theta|pi|lambda|sigma|mu|phi|tau|rho|"
        r"Gamma|Delta|Theta|Lambda|Sigma|Omega|Psi|Phi|cap|cup|notin|subset|subseteq))\b(?!\$)"
    )
    res = apply_outside_math(res, lambda chunk: greek_regex.sub(r"$\\\1$", chunk))

    return res


def is_valid_commented_solution(sol: Optional[str]) -> bool:
    """Verifica se uma solução é uma resolução comentada autêntica e não apenas a letra do gabarito ou vazia."""
    if not sol:
        return False
    text = str(sol).strip()
    if len(text) < 15:
        return False
    # Descarta se for apenas a letra da alternativa ou indicação curta de gabarito
    if re.match(r"^\s*(\(?[a-eA-E]\)?|(?:resposta|gabarito|letra|opção|opcao)\s*:?\s*\(?[a-eA-E]\)?)\s*$", text, re.IGNORECASE):
        return False
    # Descarta se for apenas um número isolado
    if re.match(r"^\s*-?\d+(?:[.,]\d+)?\s*$", text):
        return False
    return True


class SocraticTutor:
    """Motor de tutoria socrática escalonada em 5 níveis adaptado a preferências pedagógicas."""

    def __init__(self) -> None:
        self.gateway = mathai_gateway
        self.hint_cache = hint_cache_service

    def generate_hint(
        self,
        exercise: Dict[str, Any],
        level: int = 1,
        pedagogical_preference: Optional[str] = None,
        foco_concurso: Optional[str] = None,
        motivacoes: Optional[List[str]] = None,
        use_cache: bool = True,
        tentativas_anteriores: Optional[Any] = None,
        student_draft: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Gera uma dica socrática de nível 1 a 5 modulada ativamente pela preferência pedagógica e contexto do estudante."""
        level = max(1, min(5, int(level)))
        allowed_preferences = {"conceitual", "rigor_formal", "aplicado_ml", "competitivo"}
        pref = str(pedagogical_preference).strip().lower() if pedagogical_preference else "conceitual"
        if pref not in allowed_preferences:
            pref = "conceitual"

        enunciado = exercise.get("enunciado", "").strip()
        topico = exercise.get("topico", "Matemática")
        materia = exercise.get("materia", "Matemática")
        gabarito = exercise.get("gabarito", "")
        solucao = exercise.get("solucao", "")
        estrategias = exercise.get("estrategias_esperadas", [])
        lemas = exercise.get("lemas_associados", [])

        # Identificador estável, hash de conteúdo e chave lógica determinística do cache
        content_hash = compute_content_hash(enunciado, solucao, gabarito)
        stable_id, questao_id = self.hint_cache.resolve_stable_exercise_id(exercise, content_hash)
        cache_key = compute_cache_key(stable_id, level, pref, content_hash, PROMPT_STRATEGY_VERSION)

        # Regra Crítica: Dicas individualizadas nunca usam nem poluem o cache base compartilhado
        is_personal = is_individualized_request(
            exercise,
            {"tentativas_anteriores": tentativas_anteriores, "student_draft": student_draft}
        )

        if use_cache and not is_personal:
            cached_data = self.hint_cache.get_cached_hint(cache_key)
            if cached_data and cached_data.get("hint_text"):
                logger.info(f"[SocraticTutor] Cache HIT para {stable_id} (Nível {level}, modo {pref}).")
                return {
                    "level": level,
                    "hint_text": cached_data["hint_text"],
                    "exercise_id": stable_id,
                    "model_used": cached_data.get("model_used", "socratic-engine"),
                    "provider": cached_data.get("provider", "cached"),
                    "latency_ms": 0.0,
                    "input_hash": cached_data.get("cache_key", cache_key),
                    "cached": True,
                    "cache_key": cache_key,
                }

        # Nível 5: Se existir resolução comentada oficial no banco, utiliza diretamente
        if level == 5 and is_valid_commented_solution(solucao):
            logger.info(f"[SocraticTutor] Resolução comentada oficial encontrada para {stable_id}.")
            return {
                "level": 5,
                "hint_text": f"💡 **Nível 5 — Resolução Comentada Oficial:**\n\n{solucao.strip()}",
                "exercise_id": stable_id,
                "model_used": "Gabarito Comentado Oficial",
                "provider": "banco_questoes",
                "latency_ms": 0.0,
                "input_hash": content_hash,
                "cached": False,
                "cache_key": cache_key,
            }

        # Diretrizes pedagógicas ativas por modo
        diretrizes_modo = {
            "conceitual": (
                "DIRETRIZ PEDAGÓGICA (CONCEITUAL):\n"
                "- Comece pela intuição geométrica ou numérica e pelo significado físico/prático.\n"
                "- Use exemplos pertinentes e analogias fundamentadas.\n"
                "- Explique por que o conceito funciona antes de formalizar ou calcular."
            ),
            "rigor_formal": (
                "DIRETRIZ PEDAGÓGICA (RIGOR FORMAL):\n"
                "- Identifique com rigor definições axiomáticas, hipóteses e condições de aplicação dos teoremas.\n"
                "- Exija justificativas dedutivas formais para cada passo.\n"
                "- Utilize notação matemática formal e precisa em LaTeX ($...$ e $$...$$)."
            ),
            "aplicado_ml": (
                "DIRETRIZ PEDAGÓGICA (APLICADO A CIÊNCIA DE DADOS & MACHINE LEARNING):\n"
                "- Conecte os conceitos matemáticos a algoritmos, dados ou Machine Learning quando houver relação legítima "
                "(ex: espaços vetoriais a representações de dados, autovalores ao PCA, gradientes/derivadas à otimização, probabilidade a modelos preditivos).\n"
                "- Não force analogias espúrias; mantenha o rigor matemático da questão."
            ),
            "competitivo": (
                "DIRETRIZ PEDAGÓGICA (COMPETITIVO & EFICIÊNCIA EM PROVAS):\n"
                "- Destaque observações decisivas ('pulo do gato'), propriedades invariantes e simetrias.\n"
                "- Aponte atalhos de resolução, padrões típicos de bancas e técnicas de eliminação e verificação de coerência.\n"
                "- Priorize economia de tempo sem perder a fundamentação."
            ),
        }

        # Instruções de nível socrático moduladas pelo modo pedagógico com guardrails negativos estritos
        instrucoes_nivel = {
            1: {
                "conceitual": (
                    "- NÍVEL 1 — INTUIÇÃO & LEITURA DE HIPÓTESES (DADOS & INTUIÇÃO):\n"
                    "  * Instrução: Faça o aluno perceber um detalhe crucial do enunciado (uma simetria, uma condição de existência, uma propriedade da figura) através de uma pergunta instigante sobre o significado intuitivo dos dados. Máximo de 2 a 3 frases, terminando obrigatoriamente com uma pergunta reflexiva.\n"
                    "  * Guardrail: É ESTRITAMENTE PROIBIDO citar fórmulas, nomes de teoremas, fazer qualquer conta ou vazar o gabarito."
                ),
                "rigor_formal": (
                    "- NÍVEL 1 — INTUIÇÃO & LEITURA DE HIPÓTESES (HIPÓTESES & DOMÍNIO):\n"
                    "  * Instrução: Conduza o aluno a identificar com rigor axiomático as hipóteses, o domínio e restrições fundamentais do enunciado através de uma pergunta provocativa. Máximo de 2 a 3 frases, terminando com uma pergunta.\n"
                    "  * Guardrail: É ESTRITAMENTE PROIBIDO citar fórmulas prontas, nomes de teoremas finais, fazer contas ou vazar o gabarito."
                ),
                "aplicado_ml": (
                    "- NÍVEL 1 — INTUIÇÃO & LEITURA DE HIPÓTESES (VARIÁVEIS & ENTRADAS):\n"
                    "  * Instrução: Mapeie as grandezas dadas como variáveis e entradas do sistema, provocando o aluno a notar como as restrições estruturais delimitam os dados. Máximo de 2 a 3 frases, terminando com uma pergunta.\n"
                    "  * Guardrail: É ESTRITAMENTE PROIBIDO citar fórmulas, nomes de teoremas, fazer contas ou vazar o gabarito."
                ),
                "competitivo": (
                    "- NÍVEL 1 — INTUIÇÃO & LEITURA DE HIPÓTESES (DADOS CRÍTICOS & RESTRIÇÕES - OBSERVAÇÃO CRÍTICA DE PROVA):\n"
                    "  * Instrução: Chame a atenção para a informação crucial, simetria ou restrição oculta do enunciado que a maioria dos candidatos deixa passar, instigando o aluno com uma pergunta de observação crítica. Máximo de 2 a 3 frases, terminando com uma pergunta.\n"
                    "  * Guardrail: É ESTRITAMENTE PROIBIDO citar fórmulas, nomes de teoremas, fazer contas ou vazar o gabarito."
                ),
            },
            2: {
                "conceitual": (
                    "- NÍVEL 2 — IDENTIFICAÇÃO DO LEMA / TEOREMA CHAVE (CONCEITO & LEMA):\n"
                    "  * Instrução: Indique qual área/teorema ou lema matemático destrava esse tipo de problema e pergunte ao aluno como ele enunciaria essa relação conceitual para os elementos da questão. Termine com uma pergunta.\n"
                    "  * Guardrail: É ESTRITAMENTE PROIBIDO substituir os números do enunciado na fórmula, montar a equação pronta ou vazar o gabarito."
                ),
                "rigor_formal": (
                    "- NÍVEL 2 — IDENTIFICAÇÃO DO LEMA / TEOREMA CHAVE (TEOREMA & AXIOMA):\n"
                    "  * Instrução: Enuncie o teorema ou lema axiomático correspondente, explicitando suas hipóteses fundamentais, e pergunte ao aluno como formalizar a relação para este caso. Termine com uma pergunta.\n"
                    "  * Guardrail: É ESTRITAMENTE PROIBIDO substituir números na fórmula, montar a equação pronta ou vazar o gabarito."
                ),
                "aplicado_ml": (
                    "- NÍVEL 2 — IDENTIFICAÇÃO DO LEMA / TEOREMA CHAVE (PRINCÍPIO MATEMÁTICO/COMPUTACIONAL):\n"
                    "  * Instrução: Apresente o lema ou teorema chave que fundamenta o algoritmo de resolução analítica e pergunte ao aluno como mapear os termos do problema nessa estrutura. Termine com uma pergunta.\n"
                    "  * Guardrail: É ESTRITAMENTE PROIBIDO substituir valores numéricos na fórmula, montar a equação pronta ou vazar o gabarito."
                ),
                "competitivo": (
                    "- NÍVEL 2 — IDENTIFICAÇÃO DO LEMA / TEOREMA CHAVE (GATILHO DE RESOLUÇÃO RÁPIDA & LEMA DA BANCA):\n"
                    "  * Instrução: Revele o lema estratégico ou padrão de banca que desmonta a questão e pergunte qual relação ele estabelece entre as grandezas dadas. Termine com uma pergunta.\n"
                    "  * Guardrail: É ESTRITAMENTE PROIBIDO substituir os números do enunciado na fórmula, montar a equação pronta ou vazar o gabarito."
                ),
            },
            3: {
                "conceitual": (
                    "- NÍVEL 3 — O PRIMEIRO PASSO / CONSTRUÇÃO AUXILIAR (PRIMEIRO PASSO INTUITIVO):\n"
                    "  * Instrução: Ensine apenas como dar a largada (qual traço auxiliar desenhar na geometria, qual substituição de variável fazer na álgebra ou como armar a primeira linha do raciocínio no papel) e peça para o aluno desenvolver a partir daí.\n"
                    "  * Guardrail: É ESTRITAMENTE PROIBIDO resolver a equação, passar da metade do problema ou vazar o gabarito."
                ),
                "rigor_formal": (
                    "- NÍVEL 3 — O PRIMEIRO PASSO / CONSTRUÇÃO AUXILIAR (RELAÇÃO FORMAL NO PAPEL):\n"
                    "  * Instrução: Instrua a escrita da primeira linha de dedução formal rigorosa no papel (ex: 'Seja $x \\in ...$'), preparando o início da demonstração, e peça para o aluno dar o passo seguinte.\n"
                    "  * Guardrail: É ESTRITAMENTE PROIBIDO resolver a equação, avançar além da metade ou vazar o gabarito."
                ),
                "aplicado_ml": (
                    "- NÍVEL 3 — O PRIMEIRO PASSO / CONSTRUÇÃO AUXILIAR (FORMULAÇÃO ANALÍTICA):\n"
                    "  * Instrução: Escreva a primeira relação matemática estruturada (algébrica ou matricial) no papel, preparando o desenvolvimento analítico, e peça ao aluno para prosseguir.\n"
                    "  * Guardrail: É ESTRITAMENTE PROIBIDO resolver a equação, passar da metade do problema ou vazar o gabarito."
                ),
                "competitivo": (
                    "- NÍVEL 3 — O PRIMEIRO PASSO / CONSTRUÇÃO AUXILIAR (EQUAÇÃO OTIMIZADA NO RASCUNHO):\n"
                    "  * Instrução: Oriente a montagem da equação na forma mais direta e simplificada no rascunho para economizar tempo, deixando o desenvolvimento para o aluno.\n"
                    "  * Guardrail: É ESTRITAMENTE PROIBIDO resolver a equação, avançar além da metade ou vazar o gabarito."
                ),
            },
            4: {
                "conceitual": (
                    "- NÍVEL 4 — DESTRAVAMENTO DO GARGALO (ESTRUTURAÇÃO CONCEITUAL INTERMEDIÁRIA):\n"
                    "  * Instrução: Mostre a relação algébrica/geométrica intermediária que resolve o gargalo principal da questão, mas pare ANTES do cálculo final. Deixe o arremate numérico/algébrico exclusivamente para o aluno.\n"
                    "  * Guardrail: É ESTRITAMENTE PROIBIDO mencionar o resultado final (gabarito) ou dizer qual alternativa (A, B, C, D, E) está certa."
                ),
                "rigor_formal": (
                    "- NÍVEL 4 — DESTRAVAMENTO DO GARGALO (MANIPULAÇÃO AXIOMÁTICA INTERMEDIÁRIA):\n"
                    "  * Instrução: Desenvolva as passagens dedutivas intermediárias até a penúltima etapa, explicitando as propriedades de passagem e deixando o arremate final para o aluno.\n"
                    "  * Guardrail: É ESTRITAMENTE PROIBIDO mencionar o resultado final (gabarito) ou dizer qual alternativa (A, B, C, D, E) está certa."
                ),
                "aplicado_ml": (
                    "- NÍVEL 4 — DESTRAVAMENTO DO GARGALO (DESENVOLVIMENTO ANALÍTICO INTERMEDIÁRIO):\n"
                    "  * Instrução: Desenvolva os passos intermediários do cálculo, evidenciando propriedades de simplificação ou ortogonalidade, parando exatamente antes da conclusão numérica.\n"
                    "  * Guardrail: É ESTRITAMENTE PROIBIDO mencionar o resultado final (gabarito) ou dizer qual alternativa (A, B, C, D, E) está certa."
                ),
                "competitivo": (
                    "- NÍVEL 4 — DESTRAVAMENTO DO GARGALO (SIMPLIFICAÇÃO ÁGIL & PULO DO GATO):\n"
                    "  * Instrução: Mostre a simplificação crítica intermediária que quebra a pegadinha da banca, mas pare antes da conta final. Deixe a última linha para o aluno fechar.\n"
                    "  * Guardrail: É ESTRITAMENTE PROIBIDO mencionar o resultado final (gabarito) ou dizer qual alternativa (A, B, C, D, E) está certa."
                ),
            },
            5: {
                "conceitual": (
                    f"- NÍVEL 5 — RESOLUÇÃO COMPLETA (RENDIÇÃO PEDAGÓGICA):\n"
                    f"  * Instrução: Como o aluno desistiu da tentativa e solicitou o Nível 5, apresente a resolução completa, rigorosa, didática e passo a passo em LaTeX impecável ($...$ e $$...$$), destacando o Lema central utilizado e chegando claramente na resposta final ({gabarito}). Sintetize a harmonia conceitual e o significado do resultado."
                ),
                "rigor_formal": (
                    f"- NÍVEL 5 — RESOLUÇÃO COMPLETA (RENDIÇÃO PEDAGÓGICA - DEMONSTRAÇÃO AXIOMÁTICA):\n"
                    f"  * Instrução: Como o aluno desistiu da tentativa e solicitou o Nível 5, apresente a demonstração rigorosa e integral passo a passo até o gabarito oficial ({gabarito}) em LaTeX impecável, justificando formalmente cada passagem dedutiva e o Lema central utilizado."
                ),
                "aplicado_ml": (
                    f"- NÍVEL 5 — RESOLUÇÃO COMPLETA (RENDIÇÃO PEDAGÓGICA - PERSPECTIVA ANALÍTICA):\n"
                    f"  * Instrução: Como o aluno desistiu da tentativa e solicitou o Nível 5, apresente a dedução formal completa em LaTeX impecável até o gabarito ({gabarito}), destacando o Lema central e comentando a relevância do método na modelagem matemática."
                ),
                "competitivo": (
                    f"- NÍVEL 5 — RESOLUÇÃO COMPLETA (RENDIÇÃO PEDAGÓGICA - RESOLUÇÃO DEFINITIVA & CONFERÊNCIA):\n"
                    f"  * Instrução: Como o aluno desistiu da tentativa e solicitou o Nível 5, apresente a resolução definitiva, limpa e ágil até o gabarito ({gabarito}) em LaTeX impecável, destacando o Lema central e acrescentando uma rápida conferência de prova contra os distratores."
                ),
            },
        }

        contexto_aluno_prompt = ""
        if foco_concurso or motivacoes:
            meta_parts = []
            if foco_concurso:
                meta_parts.append(f"Foco de Estudo / Banca Alvo: {foco_concurso}")
            if motivacoes:
                meta_parts.append(f"Objetivos de Carreira / Área: {', '.join(motivacoes)}")
            contexto_aluno_prompt = (
                "\n\nCONTEXTO E OBJETIVO ESPECÍFICO DO ESTUDANTE:\n"
                + "\n".join(f"- {p}" for p in meta_parts)
                + "\nAdapte o vocabulário, o tom didático e a motivação das reflexões socráticas para preparar o estudante diretamente para esse objetivo (ex: se o objetivo for docência/Licenciatura, destaque o rigor da justificativa didática; se for ITA/militar, destaque a disciplina dedutiva e a visão estratégica)."
            )

        solucao_prompt = f"SOLUÇÃO OFICIAL DE REFERÊNCIA: {solucao}\n" if solucao else ""
        user_prompt = f"""Gere uma DICA SOCRÁTICA DE NÍVEL {level} DE 5 para a seguinte questão:

MATÉRIA: {materia}
TÓPICO: {topico}
GABARITO OFICIAL: {gabarito}
{solucao_prompt}MODO PEDAGÓGICO: {pref}
ESTRATÉGIAS/LEMAS: {estrategias} {lemas}

ENUNCIADO DA QUESTÃO:
{enunciado}

{diretrizes_modo.get(pref, diretrizes_modo['conceitual'])}
{contexto_aluno_prompt}

DIRETRIZ ESPECÍFICA DO NÍVEL {level}:
{instrucoes_nivel[level][pref]}

Responda em tom encorajador e direto, mantendo o rigor em LaTeX ($...$ e $$...$$)."""

        messages = [{"role": "user", "content": user_prompt}]

        res = self.gateway.execute_completion(
            messages=messages,
            system_prompt=PROMPT_SISTEMA_SOCRATICO,
            temperature=0.3,
            max_tokens=1024,
            json_output=False,
            task_type="socratic_hint",
            total_budget_seconds=16.0,
        )

        content = res.get("content", "").strip()
        if content:
            content = auto_wrap_latex_in_backend(content)
        provider = res.get("provider", "fallback")
        status_res = res.get("status", "")
        model_used = res.get("model_used", "socratic-engine")

        # Verifica se um provedor real respondeu com sucesso
        is_failed = provider in ("fallback", "none", "unavailable") or status_res in ("fallback", "failed", "unavailable", "error")
        ai_succeeded = bool(content and not is_failed)

        if not ai_succeeded:
            logger.warning(
                "[SocraticTutor] Falha na geração por IA para exercício %s (Nível %d). Provedores indisponíveis.",
                stable_id,
                level,
            )
            # Para Nível 5: se não há solução comentada e a IA falhou, nunca apresentar só a letra do gabarito como resolução
            if level == 5:
                gabarito_info = f" (Gabarito oficial: Alternativa {gabarito.strip()})" if gabarito and str(gabarito).strip() else ""
                error_msg = f"A resolução comentada detalhada está temporariamente indisponível (falha nos provedores de IA).{gabarito_info}"
            else:
                error_msg = "O Tutor Socrático está temporariamente indisponível. Nenhum provedor de IA respondeu a tempo."

            return {
                "level": level,
                "hint_text": self._get_fallback_hint(exercise, level, pref),
                "exercise_id": stable_id,
                "model_used": "LEMMAS Contingência",
                "provider": "fallback",
                "latency_ms": res.get("latency_ms", 0.0),
                "input_hash": res.get("input_hash", ""),
                "cached": False,
                "cache_key": cache_key,
                "status": "unavailable",
                "error": error_msg,
            }

        # Validação adicional para Nível 5 gerado por IA: nunca aceitar resposta que seja apenas a letra do gabarito
        if level == 5 and not is_valid_commented_solution(content):
            logger.warning("[SocraticTutor] Nível 5 gerado foi descartado por ser apenas letra ou insuficiente: %s", content[:50])
            gabarito_info = f" (Gabarito oficial: Alternativa {gabarito.strip()})" if gabarito and str(gabarito).strip() else ""
            error_msg = f"A resolução gerada pela IA foi insuficiente ou continha apenas a letra.{gabarito_info}"
            return {
                "level": 5,
                "hint_text": self._get_fallback_hint(exercise, level, pref),
                "exercise_id": stable_id,
                "model_used": "LEMMAS Contingência",
                "provider": "fallback",
                "latency_ms": res.get("latency_ms", 0.0),
                "input_hash": res.get("input_hash", ""),
                "cached": False,
                "cache_key": cache_key,
                "status": "unavailable",
                "error": error_msg,
            }

        # Validação e persistência no cache apenas para dicas-base legítimas
        if use_cache and not is_personal:
            is_valid, reject_reason = validate_hint_for_cache(
                content, level=level, gabarito=gabarito, provider=provider
            )
            if is_valid:
                self.hint_cache.save_cached_hint(
                    cache_key=cache_key,
                    exercise_id=stable_id,
                    questao_id=questao_id,
                    level=level,
                    pedagogical_preference=pref,
                    content_hash=content_hash,
                    hint_text=content,
                    model_used=model_used,
                    provider=provider,
                    latency_ms=res.get("latency_ms", 0.0),
                    metadata={"prompt_version": PROMPT_STRATEGY_VERSION, "foco": foco_concurso},
                    prompt_version=PROMPT_STRATEGY_VERSION,
                )
            else:
                logger.info(f"[SocraticTutor] Dica descartada para cache: {reject_reason}")

        return {
            "level": level,
            "hint_text": content,
            "exercise_id": stable_id,
            "model_used": model_used,
            "provider": provider,
            "latency_ms": res.get("latency_ms", 0.0),
            "input_hash": res.get("input_hash", ""),
            "cached": False,
            "cache_key": cache_key,
            "status": "completed",
        }

    def _get_fallback_hint(self, exercise: Dict[str, Any], level: int, pref: str = "conceitual") -> str:
        """Dicas pedagógicas determinísticas de contingência adaptadas por preferência."""
        raw_topico = exercise.get("topico", "")
        # Remove nomes de autores, competições ou países salvos indevidamente no campo tópico
        if not raw_topico or re.search(r"mold[aá]via|denis|sidorov|olympiad|author|contest|[a-z]+,\s*[a-z]+", str(raw_topico), re.IGNORECASE):
            topico = exercise.get("materia", "Matemática")
        else:
            topico = raw_topico
        solucao = exercise.get("solucao", "")
        gabarito = exercise.get("gabarito", "")
        
        # Determine if we have a real solution (from solucao) or just gabarito
        has_real_solucao = bool(solucao and str(solucao).strip() and is_valid_commented_solution(solucao))
        has_gabarito = bool(gabarito and str(gabarito).strip())
        
        if has_real_solucao:
            res_oficial = solucao.strip()
            res_oficial_source = "solucao"
        elif has_gabarito:
            res_oficial = "Solução não disponível via fallback - consulte o material de estudo para a resolução completa"
            res_oficial_source = "gabarito_only"
        else:
            res_oficial = "A resolução formal completa demonstra que a tese se sustenta diretamente a partir das hipóteses."
            res_oficial_source = "default"
        
        fallback_by_pref = {
            "conceitual": {
                1: f"💡 **Nível 1 — Intuição & Leitura de Hipóteses (Intuição e Dados)**: Você identificou quais são os símbolos, conectivos e notações essenciais desta questão de **{topico}**? (Ex: quantificadores como $\\forall$ e $\\exists$, pertinência $\\in$, ou conectivos como $\\implies$). O que cada um deles expressa intuitivamente antes de calcular?",
                2: f"💡 **Nível 2 — Identificação do Lema / Teorema Chave**: Qual teorema ou lema clássico conecta as grandezas dadas em **{topico}**? Como você enunciaria essa propriedade para os elementos do enunciado antes de armar as equações?",
                3: f"💡 **Nível 3 — O Primeiro Passo / Construção Auxiliar**: Vamos começar a escrever no rascunho! Escreva a primeira proposição formal ou equação inicial traduzindo as hipóteses de **{topico}** (ex: comece com 'Seja $x \\in ...$' ou trace o elemento auxiliar inicial).",
                4: f"💡 **Nível 4 — Destravamento do Gargalo**: Atente para a relação intermediária crucial que resolve o gargalo em **{topico}**, deixando apenas a linha final de cálculo para você concluir.",
                5: f"💡 **Nível 5 — Resolução Completa (Rendição Pedagógica)**:\n\n{res_oficial}",
            },
            "rigor_formal": {
                1: f"💡 **Nível 1 — Intuição & Leitura de Hipóteses (Hipóteses e Domínio)**: Identifique os quantificadores formais e notações de corpos/anéis envolvidos em **{topico}**. Como formalizar o domínio e as hipóteses do enunciado?",
                2: f"💡 **Nível 2 — Identificação do Lema / Teorema Chave (Teorema & Axioma)**: Enuncie o lema fundamental ou critério axiomático aplicável a **{topico}**, explicitando suas hipóteses necessárias.",
                3: f"💡 **Nível 3 — O Primeiro Passo / Construção Auxiliar (Primeiro Passo Axiomático)**: Escreva no papel a primeira linha da dedução formal: declare o elemento genérico 'Seja $x \\in \\mathbb{{R}}$...' e estabeleça a premissa $P(x)$.",
                4: f"💡 **Nível 4 — Destravamento do Gargalo (Manipulação Dedutiva Intermediária)**: Desenvolva a implicação formal intermediária, explicitando cada axioma de passagem em **{topico}** antes do passo conclusivo.",
                5: f"💡 **Nível 5 — Resolução Completa (Rendição Pedagógica - Demonstração Axiomática)**:\n\n{res_oficial}",
            },
            "aplicado_ml": {
                1: f"💡 **Nível 1 — Intuição & Leitura de Hipóteses (Variáveis e Entradas)**: Mapeie as variáveis, entradas e matrizes do enunciado de **{topico}**, associando cada símbolo à sua dimensão e papel funcional no sistema.",
                2: f"💡 **Nível 2 — Identificação do Lema / Teorema Chave (Princípio Analítico)**: Qual princípio estrutural (ex: ortogonalidade, convexidade, fatoração) viabiliza a solução computacional deste problema de **{topico}**?",
                3: f"💡 **Nível 3 — O Primeiro Passo / Construção Auxiliar (Modelagem Inicial)**: Escreva a formulação matemática inicial no papel, expressando a função objetivo ou relação analítica que modela as hipóteses.",
                4: f"💡 **Nível 4 — Destravamento do Gargalo (Passos Intermediários do Cálculo)**: Desenvolva as operações analíticas intermediárias explorando propriedades de simetria ou posto, preparando o arremate.",
                5: f"💡 **Nível 5 — Resolução Completa (Rendição Pedagógica - Perspectiva Analítica)**:\n\n{res_oficial}",
            },
            "competitivo": {
                1: f"💡 **Nível 1 — Intuição & Leitura de Hipóteses (Observação Crítica de Prova)**: Destaque a notação-chave e a restrição oculta do enunciado em **{topico}** que elimina de cara os caminhos prolixos.",
                2: f"💡 **Nível 2 — Identificação do Lema / Teorema Chave (Gatilho da Banca)**: Identifique o lema estratégico da banca que desmonta a questão e verifique qual relação direta ele impõe aos termos.",
                3: f"💡 **Nível 3 — O Primeiro Passo / Construção Auxiliar (Largada Otimizada)**: Escreva a primeira igualdade na forma mais simplificada e direta possível para ganhar tempo de prova.",
                4: f"💡 **Nível 4 — Destravamento do Gargalo (Pulo do Gato da Banca)**: Use o atalho de resolução que quebra a pegadinha e verifique rapidamente contra os distratores da prova.",
                5: f"💡 **Nível 5 — Resolução Completa (Rendição Pedagógica - Resolução Definitiva)**:\n\n{res_oficial}",
            }
        }
        
        modo_dict = fallback_by_pref.get(pref, fallback_by_pref["conceitual"])
        return modo_dict.get(level, f"💡 **Nível {level}**: Desenvolva o raciocínio formal a partir das hipóteses da questão.")


# Instância global do tutor
socratic_tutor = SocraticTutor()
