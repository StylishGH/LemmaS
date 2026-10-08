"""Tutor Socrático em 5 Níveis da MathAI Engine.

Implementa a pedagogia socrática progressiva para conduzir o estudante à reflexão autônoma:
- Nível 1 (Dados & Foco): Atenção aos dados do enunciado e significado sem entregar fórmulas.
- Nível 2 (Conceito & Lema): Sugere qual teorema, lema ou propriedade conecta as informações.
- Nível 3 (Primeiro Passo): Orienta a montagem da primeira equação ou construção auxiliar.
- Nível 4 (Estruturação Intermediária): Passos intermediários do cálculo, deixando o arremate final.
- Nível 5 (Resolução Completa): Demonstração integral passo a passo até o gabarito.
"""

from typing import Any, Dict, Optional
from app.services.mathai.gateway import mathai_gateway

PROMPT_SISTEMA_SOCRATICO = r"""Você é o Tutor Socrático da plataforma LEMMAS (MathAI Engine).
Sua missão é ajudar estudantes de matemática (nível superior e concursos militares) a raciocinar por conta própria.
NUNCA entregue a resposta final nos níveis 1 a 4.
Utilize sempre notação LaTeX matemática delimitada por $...$ (inline) ou $$...$$ (bloco).
Seja encorajador, rigoroso e extremamente didático."""


class SocraticTutor:
    """Motor de tutoria socrática escalonada em 5 níveis."""

    def __init__(self) -> None:
        self.gateway = mathai_gateway

    def generate_hint(
        self,
        exercise: Dict[str, Any],
        level: int = 1,
    ) -> Dict[str, Any]:
        """Gera uma dica socrática de nível 1 a 5 para uma determinada questão."""
        # Limita o nível rigorosamente entre 1 e 5
        level = max(1, min(5, int(level)))

        enunciado = exercise.get("enunciado", "").strip()
        topico = exercise.get("topico", "Matemática")
        gabarito = exercise.get("gabarito", "")
        estrategias = exercise.get("estrategias_esperadas", [])
        lemas = exercise.get("lemas_associados", [])

        user_prompt = f"""Gere uma DICA SOCRÁTICA DE NÍVEL {level} DE 5 para a seguinte questão:

TÓPICO: {topico}
GABARITO OFICIAL: {gabarito}
ESTRATÉGIAS/LEMAS: {estrategias} {lemas}

ENUNCIADO DA QUESTÃO:
{enunciado}

DIRETRIZ OBRIGATÓRIA PARA O NÍVEL {level}:
"""
        if level == 1:
            user_prompt += (
                "- NÍVEL 1 (DADOS & OBSERVAÇÃO): Pergunte ao estudante quais são as grandezas e hipóteses dadas. "
                "Chame a atenção para restrições de domínio ou simetrias. NÃO cite nenhuma fórmula nem teorema."
            )
        elif level == 2:
            user_prompt += (
                "- NÍVEL 2 (CONCEITO & LEMA): Sugira qual lema, teorema ou definição teórica se aplica aqui "
                "(ex: 'Considere a desigualdade triangular' ou 'Lembre-se da relação de Girard'). NÃO monte a equação ainda."
            )
        elif level == 3:
            user_prompt += (
                "- NÍVEL 3 (PRIMEIRO PASSO): Diga qual é a primeira relação algébrica concreta ou reta auxiliar "
                "que deve ser escrita no papel para iniciar o desenvolvimento."
            )
        elif level == 4:
            user_prompt += (
                "- NÍVEL 4 (ESTRUTURAÇÃO): Desenvolva os cálculos intermediários da passagem principal, "
                "deixando exatamente a etapa de simplificação/conclusão final para o estudante deduzir."
            )
        else:  # level == 5
            user_prompt += (
                f"- NÍVEL 5 (DEMONSTRAÇÃO COMPLETA): Apresente a dedução formal passo a passo até atingir "
                f"o gabarito oficial ({gabarito}), destacando o lema axiomático que justificou cada passagem."
            )

        user_prompt += "\n\nResponda em tom encorajador e direto, com notação LaTeX limpa ($...$)."

        messages = [{"role": "user", "content": user_prompt}]

        res = self.gateway.execute_completion(
            messages=messages,
            system_prompt=PROMPT_SISTEMA_SOCRATICO,
            temperature=0.3,
            max_tokens=1024,
            json_output=False,
        )

        content = res.get("content", "").strip()

        # Fallback local determinístico se o modelo estiver em contingência
        if not content or res.get("provider") == "fallback":
            content = self._get_fallback_hint(exercise, level)

        return {
            "level": level,
            "hint_text": content,
            "exercise_id": exercise.get("id"),
            "model_used": res.get("model_used", "socratic-rule-based"),
            "provider": res.get("provider", "fallback"),
            "latency_ms": res.get("latency_ms", 0.0),
            "input_hash": res.get("input_hash", ""),
        }

    def _get_fallback_hint(self, exercise: Dict[str, Any], level: int) -> str:
        """Dicas pedagógicas determinísticas de contingência."""
        topico = exercise.get("topico", "este tema")
        gabarito = exercise.get("gabarito", "")
        fallback_map = {
            1: f"💡 **Nível 1 (Identificação de Dados)**: Observe atentamente o que a questão fornece e o que pede em relação a **{topico}**. Quais são as grandezas conhecidas e desconhecidas?",
            2: f"💡 **Nível 2 (Conceito Chave)**: Pense em qual definição formal ou lema canônico conecta essas grandezas em **{topico}**.",
            3: "💡 **Nível 3 (Equacionamento Inicial)**: Escreva a relação fundamental isolando a incógnita principal em uma primeira igualdade.",
            4: "💡 **Nível 4 (Passos Intermediários)**: Desenvolva as simplificações algébricas e substitua os coeficientes conhecidos.",
            5: f"💡 **Nível 5 (Resolução Completa)**: A resposta formal converge para **{gabarito}**. Verifique a solução completa desenvolvendo cada membro da equação.",
        }
        return fallback_map.get(level, "Revise os axiomas fundamentais da questão.")


# Instância global do tutor
socratic_tutor = SocraticTutor()
