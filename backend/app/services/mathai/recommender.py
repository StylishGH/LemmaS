"""Motor de Recomendação de Lemas e Questões da Plataforma LEMMAS.

Combina o algoritmo determinístico de repetição espaçada SuperMemo-2 (SM-2)
com o perfil cognitivo do estudante para prescrever:
1. Lemas axiomáticos para sanar deficiências conceituais identificadas.
2. Próximas questões em zona de desenvolvimento proximal (ZDP).
"""

import math
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional


class SM2Calculator:
    """Implementação determinística do algoritmo de repetição espaçada SM-2."""

    @staticmethod
    def calculate(
        quality: int,
        repetition: int = 0,
        interval: int = 1,
        easiness_factor: float = 2.5,
    ) -> Dict[str, Any]:
        """
        Executa uma iteração do SM-2.
        quality: nota de 0 a 5 (0-2: erro; 3: acerto difícil; 4: bom; 5: perfeito).
        """
        quality = max(0, min(5, quality))

        # Atualização do Fator de Facilidade (Easiness Factor)
        ef_delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
        new_ef = max(1.3, easiness_factor + ef_delta)

        if quality < 3:
            # Erro reinicia ciclo de repetição
            new_repetition = 0
            new_interval = 1
        else:
            # Acerto avança repetição
            if repetition == 0:
                new_interval = 1
            elif repetition == 1:
                new_interval = 6
            else:
                new_interval = max(1, math.ceil(interval * new_ef))
            new_repetition = repetition + 1

        next_review = datetime.now(timezone.utc) + timedelta(days=new_interval)

        return {
            "repetition": new_repetition,
            "interval_days": new_interval,
            "easiness_factor": round(new_ef, 3),
            "next_review": next_review.isoformat(),
        }


# Banco inicial de Lemas canônicos
CATALOGO_DE_LEMAS: List[Dict[str, Any]] = [
    {
        "id": "lema_euclides",
        "nome": "Lema de Euclides",
        "topico": "Teoria dos Números",
        "enunciado": r"Se $p$ é um número primo e $p \mid (a \cdot b)$, então $p \mid a$ ou $p \mid b$.",
        "aplicabilidade": "Divisibilidade, congruências modulares e equações diofantinas.",
    },
    {
        "id": "lema_desigualdade_am_gm",
        "nome": "Desigualdade das Médias (AM-GM)",
        "topico": "Álgebra",
        "enunciado": r"Para $a_1, \dots, a_n \ge 0$, temos $\frac{\sum a_i}{n} \ge \sqrt[n]{\prod a_i}$, com igualdade sse $a_1 = \dots = a_n$.",
        "aplicabilidade": "Otimização, mínimos e máximos sem derivadas e provas de desigualdades.",
    },
    {
        "id": "lema_sophie_germain",
        "nome": "Identidade de Sophie Germain",
        "topico": "Álgebra",
        "enunciado": r"$$a^4 + 4b^4 = (a^2 + 2b^2 + 2ab)(a^2 + 2b^2 - 2ab)$$",
        "aplicabilidade": "Fatorações algébricas olímpicas e primalidade de expressões polinomiais.",
    },
    {
        "id": "lema_menelaus",
        "nome": "Teorema/Lema de Menelaus",
        "topico": "Geometria",
        "enunciado": r"Pontos $D, E, F$ sobre as retas dos lados de $\triangle ABC$ são colineares sse $\frac{AF}{FB} \cdot \frac{BD}{DC} \cdot \frac{CE}{EA} = 1$.",
        "aplicabilidade": "Colinearidade e razões de segmentos em geometria plana sintética.",
    },
    {
        "id": "lema_girard",
        "nome": "Relações de Girard",
        "topico": "Polinômios",
        "enunciado": r"Relaciona as somas e produtos de raízes aos coeficientes de um polinômio de grau $n$.",
        "aplicabilidade": "Cálculo de somas simétricas sem resolver a equação polinomial.",
    },
]


class CognitiveRecommender:
    """Motor de recomendação personalizado de lemas e listas de exercícios."""

    def __init__(self) -> None:
        self.sm2 = SM2Calculator()
        self.lemmas_catalog = CATALOGO_DE_LEMAS

    def recommend_lemmas(
        self,
        error_type: Optional[str] = None,
        topic: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Recomenda lemas matemáticos para reforço com base no diagnóstico de erro."""
        if not topic and not error_type:
            return self.lemmas_catalog[:3]

        recommendations = []
        for lema in self.lemmas_catalog:
            # Filtro por tópico
            if topic and topic.lower() in lema["topico"].lower():
                recommendations.append(lema)
            # Filtro por tipo de erro
            elif error_type == "erro_algebraico" and lema["topico"] in ("Álgebra", "Polinômios"):
                recommendations.append(lema)
            elif error_type == "erro_conceitual" and lema["topico"] in ("Teoria dos Números", "Geometria"):
                recommendations.append(lema)

        if not recommendations:
            return self.lemmas_catalog[:2]

        return recommendations

    def process_review_cycle(
        self,
        student_id: str,
        exercise_id: str,
        quality: int,
        current_sm2_state: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Calcula o próximo agendamento de repetição espaçada SM-2."""
        state = current_sm2_state or {}
        rep = state.get("repetition", 0)
        interval = state.get("interval_days", 1)
        ef = state.get("easiness_factor", 2.5)

        new_sm2 = self.sm2.calculate(
            quality=quality,
            repetition=rep,
            interval=interval,
            easiness_factor=ef,
        )

        return {
            "student_id": student_id,
            "exercise_id": exercise_id,
            "sm2_updated": new_sm2,
        }


# Instância global do recomendador
cognitive_recommender = CognitiveRecommender()
