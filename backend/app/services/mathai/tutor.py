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
        solucao = exercise.get("solucao", "")
        res_oficial = solucao or gabarito or "A resolução formal completa demonstra que a tese se sustenta diretamente a partir das hipóteses."

        fallback_by_pref = {
            "conceitual": {
                1: f"💡 **Nível 1 (Simbologia, Intuição e Dados)**: Você identificou quais são os símbolos, conectivos e notações essenciais desta questão de **{topico}**? (Ex: quantificadores como $\\forall$ e $\\exists$, pertinência $\\in$, ou conectivos como $\\implies$). O que cada um deles expressa intuitivamente antes de calcular?",
                2: f"💡 **Nível 2 (Primeiro Passo no Papel)**: Vamos começar a escrever no rascunho! Escreva a primeira proposição formal ou equação inicial traduzindo as hipóteses de **{topico}** (ex: comece com 'Seja $x \\in ...$' ou defina a variável principal).",
                3: f"💡 **Nível 3 (Encadeamento Intermediário)**: Agora relacione a primeira hipótese ao próximo passo dedutivo. Que propriedade ou manipulação operatória de **{topico}** conecta o ponto de partida à tese pedida?",
                4: f"💡 **Nível 4 (Pulo do Gato & Pegadinha)**: Atente para a simplificação crítica ou lema decisivo de **{topico}** que destrava a conclusão, cuidando para não cair em divisões por zero ou casos particulares.",
                5: f"💡 **Nível 5 (Resolução Oficial Definitiva)**:\n\n{res_oficial}",
            },
            "rigor_formal": {
                1: f"💡 **Nível 1 (Simbologia, Hipóteses e Domínio)**: Identifique os quantificadores formais e notações de corpos/anéis envolvidos em **{topico}**. Como formalizar o domínio e as hipóteses do enunciado?",
                2: f"💡 **Nível 2 (Primeiro Passo Axiomático)**: Escreva no papel a primeira linha da dedução formal: declare o elemento genérico 'Seja $x \\in \\mathbb{{R}}$...' e estabeleça a premissa $P(x)$.",
                3: f"💡 **Nível 3 (Manipulação Dedutiva)**: Aplique a implicação lógica ou equivalência formal, explicitando cada axioma de passagem em **{topico}**.",
                4: f"💡 **Nível 4 (Lema Decisivo & Restrições)**: Enuncie o lema fundamental ou critério de irredutibilidade/ortogonalidade que viabiliza o encadeamento conclusivo.",
                5: f"💡 **Nível 5 (Demonstração Axiomática Completa)**:\n\n{res_oficial}",
            },
            "aplicado_ml": {
                1: f"💡 **Nível 1 (Notação Vetorial, Variáveis e Entradas)**: Mapeie as variáveis, entradas e matrizes do enunciado de **{topico}**, associando cada símbolo à sua dimensão e papel funcional no sistema.",
                2: f"💡 **Nível 2 (Primeiro Passo da Modelagem)**: Escreva a formulação matemática inicial no papel, expressando a função objetivo ou relação analítica que modela as hipóteses.",
                3: f"💡 **Nível 3 (Passos Intermediários do Cálculo)**: Desenvolva as operações analíticas intermediárias explorando propriedades de simetria, posto ou ortogonalidade.",
                4: f"💡 **Nível 4 (Otimização & Pulo do Gato)**: Identifique o ponto crítico ou fatoração matricial que simplifica a solução sem perda de generalidade.",
                5: f"💡 **Nível 5 (Resolução Analítica Completa)**:\n\n{res_oficial}",
            },
            "competitivo": {
                1: f"💡 **Nível 1 (Simbologia Crítica & Observação Crítica de Prova)**: Destaque a notação-chave e a restrição oculta do enunciado em **{topico}** que elimina de cara os caminhos prolixos.",
                2: f"💡 **Nível 2 (Primeiro Passo Rápido no Rascunho)**: Escreva a primeira igualdade na forma mais simplificada e direta possível para ganhar tempo de prova.",
                3: f"💡 **Nível 3 (Encadeamento Otimizado)**: Aplique o gatilho clássico da banca para avançar direto à relação dos coeficientes sem passos redundantes.",
                4: f"💡 **Nível 4 (Pulo do Gato da Banca)**: Use o atalho de resolução que desmonta a questão e verifique rapidamente contra os distratores da prova.",
                5: f"💡 **Nível 5 (Resolução Definitiva & Conferência)**:\n\n{res_oficial}",
            },
        }

        modo_dict = fallback_by_pref.get(pref, fallback_by_pref["conceitual"])
        return modo_dict.get(level, f"💡 **Nível {level}**: Desenvolva o raciocínio formal a partir das hipóteses da questão.")


# Instância global do tutor
socratic_tutor = SocraticTutor()
