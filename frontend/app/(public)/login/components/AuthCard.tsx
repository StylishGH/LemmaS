"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
  AlertCircle,
  Lock,
  Mail,
  User,
  KeyRound,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { validarRequisitosSenha } from "@/lib/validation";
import { LegalConsentCheckbox } from "@/components/LegalConsentCheckbox";
import "./Signup.css";

export function AuthCard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab inicial a partir da query param: ?tab=signup ou ?tab=signin
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<"signup" | "signin">(
    tabParam === "signin" ? "signin" : "signup"
  );

  useEffect(() => {
    if (tabParam === "signin" || tabParam === "signup") {
      setTab(tabParam);
    }
  }, [tabParam]);

  // Estados dos campos
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [concordaTermos, setConcordaTermos] = useState(true);

  // Estados de submissão e feedback
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Estados de Verificação de Código OTP
  const [aguardandoCodigo, setAguardandoCodigo] = useState(false);
  const [codigoOtp, setCodigoOtp] = useState("");
  const [reenviando, setReenviando] = useState(false);

  const requisitosSenha = validarRequisitosSenha(senha);

  const alternarTab = (novaTab: "signup" | "signin") => {
    setTab(novaTab);
    setErro(null);
    setMensagemSucesso(null);
    setAguardandoCodigo(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", novaTab);
    router.replace(`/login?${params.toString()}`);
  };

  const handleVerificarOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setMensagemSucesso(null);

    const tokenLimpo = codigoOtp.trim();
    if (!tokenLimpo || tokenLimpo.length < 6) {
      setErro("Por favor, digite o código de 6 dígitos recebido no seu e-mail.");
      return;
    }

    setLoading(true);
    try {
      // 1. Tenta validar como confirmação de cadastro (type: 'signup')
      let res = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: tokenLimpo,
        type: "signup",
      });

      // 2. Fallback para token geral de email se o primeiro falhar
      if (res.error) {
        res = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: tokenLimpo,
          type: "email",
        });
      }

      if (res.error) throw res.error;

      if (typeof window !== "undefined") {
        if (nome.trim()) localStorage.setItem("lemmas_user_name", nome.trim());
        localStorage.setItem("lemmas_user_email", email.trim());
      }

      setMensagemSucesso("E-mail verificado com sucesso! Redirecionando para o onboarding...");
      setTimeout(() => {
        router.push("/onboarding");
      }, 800);
    } catch (err: any) {
      setErro(err?.message || "Código inválido ou expirado. Verifique os dígitos e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleReenviarCodigo = async () => {
    setErro(null);
    setMensagemSucesso(null);
    setReenviando(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (error) throw error;
      setMensagemSucesso("Novo código de verificação enviado! Cheque sua caixa de entrada e spam.");
    } catch (err: any) {
      setErro(err?.message || "Não foi possível reenviar o código agora. Tente novamente em instantes.");
    } finally {
      setReenviando(false);
    }
  };

  // Escuta ativa de eventos de autenticação (OAuth, Magic Link, etc.)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        setErro(null);
        setMensagemSucesso("Autenticação concluída! Acessando a plataforma...");
        setTimeout(() => {
          router.push("/onboarding");
        }, 500);
      }
    });

    // Se já houver sessão ativa salva nos cookies/storage
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setErro(null);
        router.push("/onboarding");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    // Se a URL contém access_token no fragmento de hash, o Supabase está processando a sessão; não exibe erro
    if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
      return;
    }

    const errorParam = searchParams.get("error");
    if (errorParam === "oauth_exchange_failed") {
      setErro("Falha ao concluir autenticação com Google. Verifique se o Google Provider está ativado no Supabase ou use email e senha.");
    } else if (errorParam) {
      setErro(`Erro de autenticação: ${errorParam}`);
    }
  }, [searchParams]);

  const handleOAuthGoogle = async () => {
    setErro(null);
    setLoading(true);
    try {
      const redirectUri = `${window.location.origin}/auth/callback?next=/onboarding`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });
      if (error) {
        if (
          error.message?.toLowerCase().includes("provider is not enabled") ||
          error.message?.toLowerCase().includes("unsupported provider")
        ) {
          throw new Error(
            "O login com Google precisa ser ativado no painel do Supabase (Authentication > Providers > Google). Insira o Client ID e Client Secret."
          );
        }
        throw error;
      }
    } catch (err: any) {
      setErro(err?.message || "Erro ao conectar com Google. Tente novamente.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setMensagemSucesso(null);

    if (!email || !email.includes("@")) {
      setErro("Por favor, informe um endereço de e-mail válido.");
      return;
    }

    if (tab === "signup") {
      if (!nome.trim()) {
        setErro("Por favor, informe seu nome completo.");
        return;
      }
      if (!requisitosSenha.valida) {
        setErro("A senha deve cumprir todos os requisitos mínimos de segurança.");
        return;
      }
      if (!concordaTermos) {
        setErro("Você precisa concordar com os Termos de Serviço e Política de Privacidade para criar uma conta.");
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: {
            data: {
              full_name: nome.trim(),
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          },
        });

        if (error) throw error;

        // Armazena temporariamente dados de onboarding no localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("lemmas_user_name", nome.trim());
          localStorage.setItem("lemmas_user_email", email.trim());
        }

        // Se o Supabase já devolveu sessão direta (confirmação desligada)
        if (data?.session) {
          setMensagemSucesso("Conta criada com sucesso! Redirecionando para o onboarding...");
          setTimeout(() => {
            router.push("/onboarding");
          }, 800);
        } else {
          // Confirmação de e-mail ativa: código/link enviado para a caixa de entrada
          setAguardandoCodigo(true);
          setMensagemSucesso(`Enviamos um código de verificação para ${email.trim()}. Digite os 6 dígitos abaixo:`);
        }
      } catch (err: any) {
        setErro(err?.message || "Erro ao criar conta. Tente novamente.");
      } finally {
        setLoading(false);
      }
    } else {
      // Signin tradicional
      if (!senha) {
        setErro("Por favor, digite sua senha.");
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        });

        if (error) throw error;

        setMensagemSucesso("Login realizado com sucesso! Redirecionando...");
        setTimeout(() => {
          router.push("/questoes");
        }, 600);
      } catch (err: any) {
        if (err?.message?.toLowerCase().includes("email not confirmed")) {
          setErro("Seu e-mail ainda não foi confirmado. Digite o código de 6 dígitos enviado para sua caixa de entrada.");
          setAguardandoCodigo(true);
        } else {
          setErro(
            err?.message === "Invalid login credentials"
              ? "E-mail ou senha incorretos. Verifique suas credenciais."
              : err?.message || "Falha ao entrar. Tente novamente."
          );
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="lemmas-signup-container max-w-md mx-auto">
      <div className="lemmas-signup-card border border-amber-500/25 bg-white dark:bg-[#141222] shadow-xl rounded-2xl p-6 sm:p-8 space-y-6">
        {/* Badge do LEMMAS */}
        <div className="lemmas-founder-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-[#d9b452] border border-amber-500/20">
          <Sparkles size={14} /> Plataforma Cognitiva · LEMMAS
        </div>

        {/* Mensagens de Erro ou Sucesso */}
        {erro && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {mensagemSucesso && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
        )}

        {aguardandoCodigo ? (
          /* TELA DE DIGITAÇÃO DO CÓDIGO DE VERIFICAÇÃO */
          <div className="space-y-5 animate-fadeIn">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-[#d9b452] flex items-center justify-center mx-auto">
              <ShieldCheck size={24} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-serif-math font-bold text-slate-900 dark:text-[#f5f0df]">
                Confirmar seu E-mail
              </h3>
              <p className="text-xs text-slate-600 dark:text-[#a9aaa1]">
                Enviamos um código de verificação de 6 dígitos para:
              </p>
              <p className="text-xs font-bold text-amber-600 dark:text-[#d9b452] font-mono">
                {email}
              </p>
            </div>

            <form onSubmit={handleVerificarOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="codigo-otp" className="text-xs font-bold text-slate-700 dark:text-[#d9b452] flex items-center justify-center gap-1.5">
                  <KeyRound size={14} className="text-amber-500" /> Digite o Código de 6 Dígitos
                </label>
                <input
                  type="text"
                  id="codigo-otp"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  value={codigoOtp}
                  onChange={(e) => setCodigoOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.4em] font-mono text-2xl py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || codigoOtp.length < 6}
                className="w-full lemmas-gold-cta py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Verificando...
                  </>
                ) : (
                  <>
                    Validar Código e Acessar <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs">
              <button
                type="button"
                onClick={handleReenviarCodigo}
                disabled={reenviando}
                className="text-slate-600 dark:text-zinc-400 hover:text-amber-500 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw size={13} className={reenviando ? "animate-spin" : ""} />
                <span>{reenviando ? "Reenviando..." : "Não recebeu? Reenviar código"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAguardandoCodigo(false);
                  setErro(null);
                  setMensagemSucesso(null);
                }}
                className="text-amber-600 dark:text-[#d9b452] font-semibold hover:underline cursor-pointer"
              >
                Corrigir e-mail / Voltar
              </button>
            </div>
          </div>
        ) : (
          /* FORMULÁRIO PADRÃO COM GOOGLE E EMAIL/SENHA */
          <>
            {/* Título e Subtítulo */}
            <div className="space-y-1">
              <h2 className="text-2xl font-serif-math font-normal text-slate-900 dark:text-[#f5f0df]">
                {tab === "signup" ? (
                  <>Criar sua conta no <em className="italic text-amber-600 dark:text-[#d9b452]">LEMMAS</em></>
                ) : (
                  <>Acessar sua conta no <em className="italic text-amber-600 dark:text-[#d9b452]">LEMMAS</em></>
                )}
              </h2>
              <p className="text-xs text-slate-600 dark:text-[#a9aaa1]">
                {tab === "signup"
                  ? "Entre rapidamente e calibre seu plano de estudo socrático."
                  : "Bem-vindo de volta! Acesse suas listas de estudo e simulados."}
              </p>
            </div>

            {/* Alternância de Abas (Tabs) */}
            <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => alternarTab("signup")}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  tab === "signup"
                    ? "bg-amber-500 dark:bg-[#d9b452] text-slate-900 shadow-sm"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                }`}
              >
                Cadastrar-se
              </button>
              <button
                type="button"
                onClick={() => alternarTab("signin")}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  tab === "signin"
                    ? "bg-amber-500 dark:bg-[#d9b452] text-slate-900 shadow-sm"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                }`}
              >
                Já tenho conta
              </button>
            </div>

            {/* Botão Google OAuth */}
            <div className="lemmas-oauth-methods">
              <button
                type="button"
                onClick={handleOAuthGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continuar com Google
              </button>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-zinc-800" />
              </div>
              <span className="relative px-3 bg-white dark:bg-[#141222] text-[11px] text-slate-400 font-mono">
                ou credenciais com email
              </span>
            </div>

            {/* Formulário Principal */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === "signup" && (
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-bold text-slate-700 dark:text-[#d9b452] flex items-center gap-1.5">
                    <User size={14} className="text-amber-500" /> Nome Completo
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Carlos Eduardo de Oliveira"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-bold text-slate-700 dark:text-[#d9b452] flex items-center gap-1.5">
                  <Mail size={14} className="text-amber-500" /> Endereço de E-mail
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-bold text-slate-700 dark:text-[#d9b452] flex items-center gap-1.5">
                    <Lock size={14} className="text-amber-500" /> Senha de Acesso
                  </label>
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="text-[11px] text-slate-500 dark:text-zinc-400 hover:text-amber-500 flex items-center gap-1"
                  >
                    {mostrarSenha ? <EyeOff size={13} /> : <Eye size={13} />}
                    {mostrarSenha ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  id="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder={tab === "signup" ? "Crie uma senha forte" : "Sua senha"}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />

                {/* Checklist de Requisitos Mínimos (Aba de Cadastro) */}
                {tab === "signup" && senha.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {requisitosSenha.minimoCaracteres ? (
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle size={13} className="text-slate-400 shrink-0" />
                      )}
                      <span className={requisitosSenha.minimoCaracteres ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-500"}>
                        Mínimo de 8 caracteres
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {requisitosSenha.temNumero ? (
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle size={13} className="text-slate-400 shrink-0" />
                      )}
                      <span className={requisitosSenha.temNumero ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-500"}>
                        Pelo menos 1 número (0-9)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {requisitosSenha.temSimbolo ? (
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle size={13} className="text-slate-400 shrink-0" />
                      )}
                      <span className={requisitosSenha.temSimbolo ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-500"}>
                        Pelo menos 1 símbolo especial (!@#$%)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Aceite Legal Obrigatório (Cadastro) */}
              {tab === "signup" && (
                <LegalConsentCheckbox
                  defaultChecked={concordaTermos}
                  onConsentChange={(aceito) => setConcordaTermos(aceito)}
                />
              )}

              {/* Botão de Submissão */}
              <button
                type="submit"
                disabled={loading}
                className="w-full lemmas-gold-cta py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.01] cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Processando...
                  </>
                ) : tab === "signup" ? (
                  <>
                    Criar Conta Gratuita <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    Entrar na Plataforma <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Rodapé Alternador de Estado */}
            <div className="pt-2 text-center text-xs text-slate-500 dark:text-zinc-400 border-t border-slate-100 dark:border-zinc-800">
              {tab === "signup" ? (
                <p>
                  Já tem uma conta?{" "}
                  <button
                    type="button"
                    onClick={() => alternarTab("signin")}
                    className="text-amber-600 dark:text-[#d9b452] font-bold hover:underline cursor-pointer"
                  >
                    Entrar
                  </button>
                </p>
              ) : (
                <p>
                  Não tem uma conta ainda?{" "}
                  <button
                    type="button"
                    onClick={() => alternarTab("signup")}
                    className="text-amber-600 dark:text-[#d9b452] font-bold hover:underline cursor-pointer"
                  >
                    Cadastre-se gratuitamente
                  </button>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

