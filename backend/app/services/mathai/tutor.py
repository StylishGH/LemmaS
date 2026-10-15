"""Tutor Socrático em 5 Níveis da MathAI Engine.

Implementa a pedagogia socrática progressiva para conduzir o estudante à reflexão autônoma:
- Nível 1 (Dados & Foco): Atenção aos dados do enunciado e significado sem entregar fórmulas.
- Nível 2 (Conceito & Lema): Sugere qual teorema, lema ou propriedade conecta as informações.
- Nível 3 (Primeiro Passo): Orienta a montagem da primeira equação ou construção auxiliar.
- Nível 4 (Estruturação Intermediária): Passos intermediários do cálculo, deixando o arremate final.
- Nível 5 (Resolução Completa): Demonstração integral passo a passo até o gabarito.
"""

from typing import Any, Dict, List, Optional
from app.services.mathai.gateway import mathai_gateway

PROMPT_SISTEMA_SOCRATICO = r"""Você é o Tutor Socrático da plataforma LEMMAS (MathAI Engine).
Sua missão é ajudar estudantes de matemática (nível superior e concursos militares) a raciocinar por conta própria.
NUNCA entregue a resposta final nos níveis 1 a 4.

DIRETRIZES MANDATÓRIAS DE NOTAÇÃO MATEMÁTICA E LATEX:
- Toda e qualquer expressão, símbolo, incógnita, número algébrico ou fórmula matemática DEVE estar rigorosamente delimitada por $...$ (para matemática em linha, ex: $x = 2$, $\sen(x)$) ou $$...$$ (para equações destacadas em bloco).
- NUNCA use delimitadores \( ou \[. Use SEMPRE $ e $$.
- NUNCA escreva fórmulas matemáticas ou variáveis isoladas em texto puro sem os delimitadores $...$.
- Em português brasileiro, adote notação padrão: \sen para seno e \tg para tangente.

Seja encorajador, rigoroso e extremamente didático."""


class SocraticTutor:
    """Motor de tutoria socrática escalonada em 5 níveis adaptado a preferências pedagógicas."""

    def __init__(self) -> None:
        self.gateway = mathai_gateway

    def generate_hint(
        self,
        exercise: Dict[str, Any],
        level: int = 1,
        pedagogical_preference: Optional[str] = None,
        foco_concurso: Optional[str] = None,
        motivacoes: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Gera uma dica socrática de nível 1 a 5 modulada ativamente pela preferência pedagógica e contexto do estudante."""
        level = max(1, min(5, int(level)))
        allowed_preferences = {"conceitual", "rigor_formal", "aplicado_ml", "competitivo"}
        pref = str(pedagogical_preference).strip().lower() if pedagogical_preference else "conceitual"
        if pref not in allowed_preferences:
            pref = "conceitual"

        enunciado = exercise.get("enunciado", "").strip()
        topico = exercise.get("topico", "Matemática")
        gabarito = exercise.get("gabarito", "")
        estrategias = exercise.get("estrategias_esperadas", [])
        lemas = exercise.get("lemas_associados", [])

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

        # Instruções de nível socrático moduladas pelo modo pedagógico
        instrucoes_nivel = {
            1: {
                "conceitual": (
                    "- NÍVEL 1 (DADOS & INTUIÇÃO): Pergunte ao estudante o que as grandezas representam intuitivamente no problema. "
                    "Chame a atenção para o significado dos dados e simetrias sem citar fórmulas."
                ),
                "rigor_formal": (
                    "- NÍVEL 1 (HIPÓTESES & DOMÍNIO): Exija a identificação rigorosa das variáveis, hipóteses do enunciado, "
                    "domínio e condições de contorno. NÃO cite o teorema final de resolução."
                ),
                "aplicado_ml": (
                    "- NÍVEL 1 (VARIÁVEIS & ESTRUTURA): Mapeie as grandezas dadas como variáveis do sistema, distinguindo "
                    "entradas, parâmetros e restrições estruturais."
                ),
                "competitivo": (
                    "- NÍVEL 1 (DADOS CRÍTICOS & RESTRIÇÕES): Chame a atenção imediata para a informação crucial ou restrição oculta "
                    "do enunciado que a maioria dos candidatos deixa passar."
                ),
            },
            2: {
                "conceitual": (
                    "- NÍVEL 2 (CONCEITO & LEMA): Explique a intuição que une essas grandezas: por que determinado lema ou propriedade "
                    "se aplica aqui? NÃO monte a equação ainda."
                ),
                "rigor_formal": (
                    "- NÍVEL 2 (TEOREMA & AXIOMA): Enuncie com precisão axiomática o lema, teorema ou definição formal que fundamenta "
                    "a relação necessária (ex: Girard, AM-GM, Menelaus), explicitando suas hipóteses."
                ),
                "aplicado_ml": (
                    "- NÍVEL 2 (PRINCÍPIO MATEMÁTICO/COMPUTACIONAL): Apresente o lema ou teorema conectando-o à sua utilidade "
                    "em formulações analíticas ou métodos computacionais."
                ),
                "competitivo": (
                    "- NÍVEL 2 (GATILHO DE RESOLUÇÃO RÁPIDA): Revele o lema estratégico ou padrão de banca que desmonta a questão "
                    "em poucas passagens, alertando contra caminhos prolixos."
                ),
            },
            3: {
                "conceitual": (
                    "- NÍVEL 3 (PRIMEIRO PASSO INTUITIVO): Oriente a montagem da primeira equação ou representação visual, "
                    "esclarecendo o significado concreto de cada membro da igualdade."
                ),
                "rigor_formal": (
                    "- NÍVEL 3 (RELAÇÃO FORMAL NO PAPEL): Defina a primeira igualdade algébrica formal rigorosa a ser escrita "
                    "no papel, justificando cada termo pela hipótese ou axioma correspondente."
                ),
                "aplicado_ml": (
                    "- NÍVEL 3 (FORMULAÇÃO ANALÍTICA): Escreva a primeira relação matemática estruturada (algébrica ou matricial) "
                    "que prepara o desenvolvimento da solução."
                ),
                "competitivo": (
                    "- NÍVEL 3 (EQUAÇÃO OTIMIZADA): Instrua a montagem da equação na forma mais simplificada e direta possível, "
                    "evitando etapas intermediárias desnecessárias para economizar tempo."
                ),
            },
            4: {
                "conceitual": (
                    "- NÍVEL 4 (ESTRUTURAÇÃO CONCEITUAL): Desenvolva os cálculos intermediários conectando a intuição à álgebra, "
                    "deixando exatamente o passo conclusivo para o estudante deduzir."
                ),
                "rigor_formal": (
                    "- NÍVEL 4 (MANIPULAÇÃO AXIOMÁTICA): Desenvolva as passagens dedutivas intermediárias explicitando cada "
                    "propriedade operatória, deixando o arremate final para o estudante."
                ),
                "aplicado_ml": (
                    "- NÍVEL 4 (DESENVOLVIMENTO ANALÍTICO): Desenvolva os passos intermediários do cálculo, evidenciando propriedades "
                    "de simetria, ortogonalidade ou simplificação matricial."
                ),
                "competitivo": (
                    "- NÍVEL 4 (SIMPLIFICAÇÃO ÁGIL): Execute a simplificação dos coeficientes com atalhos operatórios seguros, "
                    "deixando apenas o cálculo final do gabarito para o aluno fechar."
                ),
            },
            5: {
                "conceitual": (
                    f"- NÍVEL 5 (DEMONSTRAÇÃO INTEGRAL & SÍNTESE): Apresente a resolução completa passo a passo até o "
                    f"gabarito oficial ({gabarito}), sintetizando a harmonia conceitual e o significado do resultado."
                ),
                "rigor_formal": (
                    f"- NÍVEL 5 (DEMONSTRAÇÃO AXIOMÁTICA COMPLETA): Apresente a demonstração rigorosa e integral passo a passo "
                    f"até o gabarito oficial ({gabarito}), justificando formalmente cada passagem dedutiva."
                ),
                "aplicado_ml": (
                    f"- NÍVEL 5 (RESOLUÇÃO & PERSPECTIVA APLICADA): Apresente a dedução formal completa até o gabarito ({gabarito}), "
                    f"comentando brevemente a relevância do método na modelagem matemática."
                ),
                "competitivo": (
                    f"- NÍVEL 5 (RESOLUÇÃO EFICIENTE & CONFERÊNCIA): Apresente a resolução definitiva e limpa até o gabarito ({gabarito}), "
                    f"acrescentando uma rápida conferência de coerência de prova (ex: análise dimensional ou caso particular)."
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

        user_prompt = f"""Gere uma DICA SOCRÁTICA DE NÍVEL {level} DE 5 para a seguinte questão:

TÓPICO: {topico}
GABARITO OFICIAL: {gabarito}
MODO PEDAGÓGICO: {pref}
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
        )

        content = res.get("content", "").strip()

        # Fallback determinístico caso o modelo não retorne ou caia em contingência
        if not content or res.get("provider") == "fallback":
            content = self._get_fallback_hint(exercise, level, pref)

        return {
            "level": level,
            "hint_text": content,
            "exercise_id": exercise.get("id"),
            "model_used": res.get("model_used", "socratic-rule-based"),
            "provider": res.get("provider", "fallback"),
            "latency_ms": res.get("latency_ms", 0.0),
            "input_hash": res.get("input_hash", ""),
        }

    def _get_fallback_hint(self, exercise: Dict[str, Any], level: int, pref: str = "conceitual") -> str:
        """Dicas pedagógicas determinísticas de contingência adaptadas por preferência."""
        topico = exercise.get("topico", "este tema")
        gabarito = exercise.get("gabarito", "")

        fallback_by_pref = {
            "conceitual": {
                1: f"💡 **Nível 1 (Intuição e Dados)**: Observe o que a questão descreve em **{topico}**. O que cada número ou grandeza representa antes de aplicar qualquer fórmula?",
                2: f"💡 **Nível 2 (Conceito Chave)**: Pense na intuição do lema fundamental que rege **{topico}**. Por que essa propriedade se mantém verdadeira?",
                3: "💡 **Nível 3 (Primeiro Passo)**: Escreva a primeira igualdade traduzindo a intuição para a linguagem matemática.",
                4: "💡 **Nível 4 (Passos Intermediários)**: Simplifique os termos conhecidos, mantendo o foco no significado de cada membro da equação.",
                5: f"💡 **Nível 5 (Resolução Completa)**: A dedução converge para **{gabarito}**. Verifique a solução completa desenvolvendo cada membro da equação com clareza conceitual.",
            },
            "rigor_formal": {
                1: f"💡 **Nível 1 (Hipóteses e Domínio)**: Enuncie com precisão as hipóteses dadas e as restrições de domínio das variáveis em **{topico}**.",
                2: f"💡 **Nível 2 (Teorema Axiomático)**: Identifique qual axioma ou teorema formal de **{topico}** possui hipóteses compatíveis com o problema.",
                3: "💡 **Nível 3 (Relação Dedutiva Inicial)**: Escreva a primeira igualdade formal fundamentada diretamente nas hipóteses.",
                4: "💡 **Nível 4 (Manipulação Axiomática)**: Desenvolva as passagens algébricas aplicando as propriedades de corpos e anéis matemáticos.",
                5: f"💡 **Nível 5 (Demonstração Completa)**: A tese culmina formalmente em **{gabarito}**. Cada passo decorre dos axiomas fundamentais.",
            },
            "aplicado_ml": {
                1: f"💡 **Nível 1 (Variáveis e Entradas)**: Interprete as grandezas dadas em **{topico}** como variáveis de entrada e parâmetros estruturais do sistema.",
                2: f"💡 **Nível 2 (Fundamento Estrutural)**: Identifique a propriedade matemática de **{topico}** que rege transformações ou restrições em espaços de dados.",
                3: "💡 **Nível 3 (Formulação Algébrica)**: Formule a equação matricial ou analítica inicial para expressar o problema.",
                4: "💡 **Nível 4 (Passos Analíticos)**: Execute as operações intermediárias explorando propriedades de simetria ou ortogonalidade.",
                5: f"💡 **Nível 5 (Resolução e Modelagem)**: A solução analítica converge para **{gabarito}**, validando a consistência dos parâmetros.",
            },
            "competitivo": {
                1: f"💡 **Nível 1 (Observação Crítica de Prova)**: Destaque a restrição ou valor-chave do enunciado em **{topico}** que elimina caminhos trabalhosos.",
                2: f"💡 **Nível 2 (Gatilho Estratégico)**: Lembre-se do lema ou padrão clássico de prova que resolve problemas de **{topico}** em poucas linhas.",
                3: "💡 **Nível 3 (Equação Direta)**: Monte a equação na forma mais simplificada, cortando etapas intermediárias redundantes.",
                4: "💡 **Nível 4 (Simplificação Ágil)**: Simplifique os coeficientes e descarte termos nulos para acelerar a conclusão.",
                5: f"💡 **Nível 5 (Resolução Definitiva)**: O gabarito oficial é **{gabarito}**. Faça uma verificação rápida por análise dimensional ou caso extremo.",
            },
        }

        modo_dict = fallback_by_pref.get(pref, fallback_by_pref["conceitual"])
        return modo_dict.get(level, "Revise os axiomas fundamentais da questão.")


# Instância global do tutor
socratic_tutor = SocraticTutor()
