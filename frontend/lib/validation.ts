// Utilitários de Formatação e Validação para Conformidade Legal e Dados Fiscais (LEMMAS)

/**
 * Validação algorítmica de CPF (módulo 11 com os dois dígitos verificadores).
 */
export function validarCPF(cpf: string): boolean {
  const limpo = cpf.replace(/\D/g, "");
  if (limpo.length !== 11) return false;
  // Bloqueia CPFs com todos os dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(limpo)) return false;

  // Primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(limpo.charAt(i), 10) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo.charAt(9), 10)) return false;

  // Segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(limpo.charAt(i), 10) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo.charAt(10), 10)) return false;

  return true;
}

/**
 * Aplica máscara de CPF: 000.000.000-00
 */
export function formatarCPF(valor: string): string {
  const limpo = valor.replace(/\D/g, "").slice(0, 11);
  if (limpo.length <= 3) return limpo;
  if (limpo.length <= 6) return `${limpo.slice(0, 3)}.${limpo.slice(3)}`;
  if (limpo.length <= 9) return `${limpo.slice(0, 3)}.${limpo.slice(3, 6)}.${limpo.slice(6)}`;
  return `${limpo.slice(0, 3)}.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-${limpo.slice(9, 11)}`;
}

/**
 * Aplica máscara de Telefone / WhatsApp: (00) 00000-0000 ou (00) 0000-0000
 */
export function formatarTelefone(valor: string): string {
  const limpo = valor.replace(/\D/g, "").slice(0, 11);
  if (limpo.length <= 2) return limpo.length ? `(${limpo}` : "";
  if (limpo.length <= 6) return `(${limpo.slice(0, 2)}) ${limpo.slice(2)}`;
  if (limpo.length <= 10) return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 6)}-${limpo.slice(6)}`;
  return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7, 11)}`;
}

/**
 * Aplica máscara de CEP: 00000-000
 */
export function formatarCEP(valor: string): string {
  const limpo = valor.replace(/\D/g, "").slice(0, 8);
  if (limpo.length <= 5) return limpo;
  return `${limpo.slice(0, 5)}-${limpo.slice(5, 8)}`;
}

/**
 * Aplica máscara de Data de Nascimento: DD/MM/AAAA
 */
export function formatarDataNascimento(valor: string): string {
  const limpo = valor.replace(/\D/g, "").slice(0, 8);
  if (limpo.length <= 2) return limpo;
  if (limpo.length <= 4) return `${limpo.slice(0, 2)}/${limpo.slice(2)}`;
  return `${limpo.slice(0, 2)}/${limpo.slice(2, 4)}/${limpo.slice(4, 8)}`;
}

/**
 * Validação de requisitos de senha:
 * - Pelo menos 8 caracteres
 * - Pelo menos 1 número
 * - Pelo menos 1 símbolo especial
 */
export interface RequisitosSenha {
  minimoCaracteres: boolean;
  temNumero: boolean;
  temSimbolo: boolean;
  valida: boolean;
}

export function validarRequisitosSenha(senha: string): RequisitosSenha {
  const minimoCaracteres = senha.length >= 8;
  const temNumero = /\d/.test(senha);
  const temSimbolo = /[!@#$%^&*(),.?":{}|<>_\-+=[\]/\\]/.test(senha);
  return {
    minimoCaracteres,
    temNumero,
    temSimbolo,
    valida: minimoCaracteres && temNumero && temSimbolo,
  };
}

/**
 * Lista dos 26 estados brasileiros + Distrito Federal
 */
export const ESTADOS_BRASIL = [
  { uf: "AC", nome: "Acre" },
  { uf: "AL", nome: "Alagoas" },
  { uf: "AP", nome: "Amapá" },
  { uf: "AM", nome: "Amazonas" },
  { uf: "BA", nome: "Bahia" },
  { uf: "CE", nome: "Ceará" },
  { uf: "DF", nome: "Distrito Federal" },
  { uf: "ES", nome: "Espírito Santo" },
  { uf: "GO", nome: "Goiás" },
  { uf: "MA", nome: "Maranhão" },
  { uf: "MT", nome: "Mato Grosso" },
  { uf: "MS", nome: "Mato Grosso do Sul" },
  { uf: "MG", nome: "Minas Gerais" },
  { uf: "PA", nome: "Pará" },
  { uf: "PB", nome: "Paraíba" },
  { uf: "PR", nome: "Paraná" },
  { uf: "PE", nome: "Pernambuco" },
  { uf: "PI", nome: "Piauí" },
  { uf: "RJ", nome: "Rio de Janeiro" },
  { uf: "RN", nome: "Rio Grande do Norte" },
  { uf: "RS", nome: "Rio Grande do Sul" },
  { uf: "RO", nome: "Rondônia" },
  { uf: "RR", nome: "Roraima" },
  { uf: "SC", nome: "Santa Catarina" },
  { uf: "SP", nome: "São Paulo" },
  { uf: "SE", nome: "Sergipe" },
  { uf: "TO", nome: "Tocantins" },
];
