/**
 * Algoritmo SuperMemo-2 (SM-2) puro para repetição espaçada adaptativa.
 * LEMMAS Core - Motor agnóstico de domínio em TypeScript.
 */

export interface ResultadoSM2 {
  repeticoes: number;
  fator_facilidade: number;
  intervalo_dias: number;
  proxima_revisao_data: string;
}

export function calcularProximoIntervaloSM2(
  repeticoesAnteriores: number,
  fatorFacilidadeAnterior: number = 2.5,
  intervaloDiasAnterior: number = 1,
  acertou: boolean = true,
  confiancaOuNota?: number,
  dataReferencia: Date = new Date()
): ResultadoSM2 {
  let ef = Math.max(1.3, fatorFacilidadeAnterior || 2.5);
  let novasRepeticoes: number;
  let novoIntervalo: number;
  let novoEf: number;

  if (acertou) {
    novasRepeticoes = repeticoesAnteriores + 1;
    const nota = confiancaOuNota !== undefined ? Math.max(3, Math.min(5, confiancaOuNota)) : 4;

    if (novasRepeticoes === 1) {
      novoIntervalo = 1;
    } else if (novasRepeticoes === 2) {
      novoIntervalo = 3;
    } else {
      novoIntervalo = Math.max(1, Math.round(intervaloDiasAnterior * ef));
    }

    const deltaQ = 5 - nota;
    novoEf = ef + (0.1 - deltaQ * (0.08 + deltaQ * 0.02));
    novoEf = Math.max(1.3, Number(novoEf.toFixed(2)));
  } else {
    novasRepeticoes = 0;
    novoIntervalo = 1;
    const nota = confiancaOuNota !== undefined ? Math.max(0, Math.min(2, confiancaOuNota)) : 1;
    const deltaQ = 5 - nota;
    novoEf = ef + (0.1 - deltaQ * (0.08 + deltaQ * 0.02));
    novoEf = Math.max(1.3, Number(novoEf.toFixed(2)));
  }

  const proximaData = new Date(dataReferencia);
  proximaData.setDate(proximaData.getDate() + novoIntervalo);
  const proximaStr = proximaData.toISOString().split("T")[0];

  return {
    repeticoes: novasRepeticoes,
    fator_facilidade: novoEf,
    intervalo_dias: novoIntervalo,
    proxima_revisao_data: proximaStr,
  };
}
