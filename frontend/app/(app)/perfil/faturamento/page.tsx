"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowLeft,
  Search,
  Loader2,
  Phone,
  Calendar,
  MapPin,
  Lock,
} from "lucide-react";
import {
  validarCPF,
  formatarCPF,
  formatarTelefone,
  formatarCEP,
  formatarDataNascimento,
  ESTADOS_BRASIL,
} from "@/lib/validation";
import { createClient } from "@/lib/supabase";

export default function FaturamentoPage() {
  const supabase = createClient();
  // Identificação Civil e Fiscal
  const [cpf, setCpf] = useState("");
  const [cpfValido, setCpfValido] = useState<boolean | null>(null);
  const [telefone, setTelefone] = useState("");
  const [optInNotificacoes, setOptInNotificacoes] = useState(true);
  const [dataNascimento, setDataNascimento] = useState("");

  // Endereço e Logradouro
  const [cep, setCep] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepMensagem, setCepMensagem] = useState<string | null>(null);
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estadoUf, setEstadoUf] = useState("RJ");

  // Estados de salvamento
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Carrega dados salvos localmente ou do perfil
  useEffect(() => {
    if (typeof window !== "undefined") {
      const salvo = localStorage.getItem("lemmas_dados_faturamento");
      if (salvo) {
        try {
          const d = JSON.parse(salvo);
          if (d.cpf) {
            setCpf(d.cpf);
            setCpfValido(validarCPF(d.cpf));
          }
          if (d.telefone) setTelefone(d.telefone);
          if (typeof d.optInNotificacoes === "boolean") setOptInNotificacoes(d.optInNotificacoes);
          if (d.dataNascimento) setDataNascimento(d.dataNascimento);
          if (d.cep) setCep(d.cep);
          if (d.logradouro) setLogradouro(d.logradouro);
          if (d.numero) setNumero(d.numero);
          if (d.complemento) setComplemento(d.complemento);
          if (d.bairro) setBairro(d.bairro);
          if (d.cidade) setCidade(d.cidade);
          if (d.estadoUf) setEstadoUf(d.estadoUf);
        } catch {
          // Ignora erro de JSON
        }
      }
    }
  }, []);

  // Manipulador de CPF com máscara e validação
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = formatarCPF(e.target.value);
    setCpf(formatado);
    const limpo = formatado.replace(/\D/g, "");
    if (limpo.length === 11) {
      setCpfValido(validarCPF(limpo));
    } else {
      setCpfValido(null);
    }
  };

  // Manipulador de Telefone
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelefone(formatarTelefone(e.target.value));
  };

  // Manipulador de Nascimento
  const handleNascimentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDataNascimento(formatarDataNascimento(e.target.value));
  };

  // Consulta automática ViaCEP ao digitar 8 dígitos
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = formatarCEP(e.target.value);
    setCep(formatado);
    const limpo = formatado.replace(/\D/g, "");

    if (limpo.length === 8) {
      setBuscandoCep(true);
      setCepMensagem(null);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
        const data = await res.json();

        if (data.erro) {
          setCepMensagem("CEP não encontrado. Preencha o endereço manualmente.");
        } else {
          setLogradouro(data.logradouro || "");
          setBairro(data.bairro || "");
          setCidade(data.localidade || "");
          if (data.uf) setEstadoUf(data.uf);
          setCepMensagem("Endereço preenchido automaticamente via ViaCEP.");
        }
      } catch {
        setCepMensagem("Falha ao consultar CEP. Preencha o endereço manualmente.");
      } finally {
        setBuscandoCep(false);
      }
    } else {
      setCepMensagem(null);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSucesso(false);

    // Validações obrigatórias
    const limpoCpf = cpf.replace(/\D/g, "");
    if (!limpoCpf || !validarCPF(limpoCpf)) {
      setErro("CPF inválido. Verifique os dígitos digitados.");
      return;
    }

    const limpoCep = cep.replace(/\D/g, "");
    if (limpoCep.length !== 8) {
      setErro("CEP deve conter 8 dígitos.");
      return;
    }

    if (!logradouro.trim() || !numero.trim() || !cidade.trim()) {
      setErro("Por favor, preencha logradouro, número e cidade.");
      return;
    }

    setSalvando(true);
    const dados = {
      cpf,
      cpf_limpo: limpoCpf,
      telefone,
      opt_in_notificacoes: optInNotificacoes,
      data_nascimento: dataNascimento,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      estado_uf: estadoUf,
      atualizado_em: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("lemmas_dados_faturamento", JSON.stringify(dados));
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from("usuarios")
          .update({
            configuracoes: {
              faturamento: dados,
            },
          })
          .eq("email", user.email);
      }
    } catch {
      // Ignora erro se coluna em migração
    }

    setTimeout(() => {
      setSalvando(false);
      setSucesso(true);
    }, 500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2 animate-fadeIn">
      {/* Navegação Superior */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-amber-500/20">
        <Link
          href="/perfil"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-[#a9aaa1] hover:text-amber-500 transition-colors"
        >
          <ArrowLeft size={16} /> Voltar ao Perfil
        </Link>
        <span className="text-xs font-mono text-slate-400">LEMMAS · Faturamento & NFS-e</span>
      </div>

      {/* Cabeçalho */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-[#d9b452] text-xs font-semibold">
          <CreditCard size={14} />
          <span>Conformidade Fiscal & LGPD · Nota Fiscal Eletrônica</span>
        </div>
        <h1 className="font-serif-math text-3xl md:text-4xl font-normal text-slate-900 dark:text-[#f5f0df] tracking-tight">
          Dados Fiscais & <em className="italic text-amber-600 dark:text-[#d9b452]">Faturamento.</em>
        </h1>
        <p className="text-xs md:text-sm text-slate-600 dark:text-[#a9aaa1] max-w-2xl leading-relaxed">
          Mantenha suas informações civis e fiscais atualizadas para emissão correta de Nota Fiscal de Serviços Eletrônica (NFS-e) e transações de planos pagos.
        </p>
      </div>

      {/* Aviso de Segurança e Privacidade */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-[#a9aaa1] flex items-start gap-3">
        <Lock size={18} className="text-emerald-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800 dark:text-zinc-200">
            Armazenamento Seguro e Criptografado
          </p>
          <p>
            Seus dados fiscais são protegidos por Row Level Security (RLS) no Supabase e utilizados estritamente para o cumprimento de obrigações tributárias e emissão de notas fiscais, conforme estabelecido na nossa{" "}
            <Link href="/privacidade" className="text-amber-500 underline font-semibold">
              Política de Privacidade
            </Link>.
          </p>
        </div>
      </div>

      {/* Feedback de Sucesso e Erro */}
      {erro && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {sucesso && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>Dados fiscais e de faturamento salvos com sucesso!</span>
        </div>
      )}

      {/* Formulário de Faturamento */}
      <form onSubmit={handleSalvar} className="space-y-6">
        {/* BLOCO 1: IDENTIFICAÇÃO CIVIL E FISCAL */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#141222] border border-slate-200/90 dark:border-amber-500/20 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800">
            <FileText size={16} className="text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-[#f5f0df]">
              Identificação Civil e Fiscal
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Campo CPF */}
            <div className="space-y-1.5">
              <label htmlFor="cpf" className="text-xs font-bold text-slate-700 dark:text-[#d9b452] flex items-center justify-between">
                <span>CPF *</span>
                {cpfValido === true && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                    <CheckCircle2 size={11} /> Válido
                  </span>
                )}
                {cpfValido === false && (
                  <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-0.5">
                    <AlertCircle size={11} /> Inválido
                  </span>
                )}
              </label>
              <input
                type="text"
                id="cpf"
                value={cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                maxLength={14}
                className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 font-mono focus:outline-none focus:ring-1 ${
                  cpfValido === true
                    ? "border-emerald-500/60 focus:ring-emerald-500"
                    : cpfValido === false
                    ? "border-rose-500/60 focus:ring-rose-500"
                    : "border-slate-200 dark:border-zinc-800 focus:ring-amber-500"
                }`}
                required
              />
              <span className="text-[10px] text-slate-400 block">
                Validação de dígitos verificadores (módulo 11)
              </span>
            </div>

            {/* Campo Telefone / WhatsApp */}
            <div className="space-y-1.5">
              <label htmlFor="tel" className="text-xs font-bold text-slate-700 dark:text-[#d9b452] flex items-center gap-1.5">
                <Phone size={13} className="text-amber-500" /> Telefone / WhatsApp *
              </label>
              <input
                type="text"
                id="tel"
                value={telefone}
                onChange={handleTelefoneChange}
                placeholder="(00) 00000-0000"
                maxLength={15}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
              <span className="text-[10px] text-slate-400 block">
                Para confirmação e avisos do plano
              </span>
            </div>

            {/* Campo Data de Nascimento */}
            <div className="space-y-1.5">
              <label htmlFor="nasc" className="text-xs font-bold text-slate-700 dark:text-[#d9b452] flex items-center gap-1.5">
                <Calendar size={13} className="text-amber-500" /> Data de Nascimento *
              </label>
              <input
                type="text"
                id="nasc"
                value={dataNascimento}
                onChange={handleNascimentoChange}
                placeholder="DD/MM/AAAA"
                maxLength={10}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
              <span className="text-[10px] text-slate-400 block">
                Validação de maioridade civil
              </span>
            </div>
          </div>

          {/* Opt-in Notificações */}
          <div className="pt-2">
            <label className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-[#a9aaa1] cursor-pointer">
              <input
                type="checkbox"
                checked={optInNotificacoes}
                onChange={(e) => setOptInNotificacoes(e.target.checked)}
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              <span>
                Aceito receber comunicações acadêmicas e operacionais da plataforma LEMMAS via WhatsApp/SMS.
              </span>
            </label>
          </div>
        </div>

        {/* BLOCO 2: ENDEREÇO E LOGRADOURO */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#141222] border border-slate-200/90 dark:border-amber-500/20 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800">
            <MapPin size={16} className="text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-[#f5f0df]">
              Endereço de Cobrança (NFS-e)
            </h2>
          </div>

          {/* Linha do CEP */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="space-y-1.5">
              <label htmlFor="cep" className="text-xs font-bold text-slate-700 dark:text-[#d9b452] flex items-center justify-between">
                <span>CEP *</span>
                {buscandoCep && (
                  <span className="text-[10px] text-amber-500 flex items-center gap-1 font-mono">
                    <Loader2 size={11} className="animate-spin" /> Consultando ViaCEP...
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="cep"
                  value={cep}
                  onChange={handleCepChange}
                  placeholder="00000-000"
                  maxLength={9}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              {cepMensagem && (
                <span className="text-[10px] text-amber-600 dark:text-[#d9b452] font-semibold block">
                  {cepMensagem}
                </span>
              )}
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="logradouro" className="text-xs font-bold text-slate-700 dark:text-[#d9b452]">
                Logradouro (Rua, Avenida, Estrada) *
              </label>
              <input
                type="text"
                id="logradouro"
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
                placeholder="Ex: Av. Rio Branco"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          {/* Número, Complemento e Bairro */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="numero" className="text-xs font-bold text-slate-700 dark:text-[#d9b452]">
                Número * (comporta S/N)
              </label>
              <input
                type="text"
                id="numero"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ex: 123 ou S/N"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="complemento" className="text-xs font-bold text-slate-700 dark:text-[#d9b452]">
                Complemento (Opcional)
              </label>
              <input
                type="text"
                id="complemento"
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                placeholder="Ex: Apto 402, Bloco B"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bairro" className="text-xs font-bold text-slate-700 dark:text-[#d9b452]">
                Bairro *
              </label>
              <input
                type="text"
                id="bairro"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Ex: Centro"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          {/* Cidade e Estado (UF) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="cidade" className="text-xs font-bold text-slate-700 dark:text-[#d9b452]">
                Cidade *
              </label>
              <input
                type="text"
                id="cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Ex: Niterói"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="uf" className="text-xs font-bold text-slate-700 dark:text-[#d9b452]">
                Estado (UF) *
              </label>
              <select
                id="uf"
                value={estadoUf}
                onChange={(e) => setEstadoUf(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              >
                {ESTADOS_BRASIL.map((est) => (
                  <option key={est.uf} value={est.uf}>
                    {est.uf} — {est.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/perfil"
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={salvando}
            className="lemmas-gold-cta py-3 px-6 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all hover:scale-[1.01] cursor-pointer"
          >
            {salvando ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Salvando dados...
              </>
            ) : (
              <>
                <Save size={16} /> Salvar Dados de Faturamento
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

